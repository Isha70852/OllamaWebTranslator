/**
 * Ollama Translator Background Script
 * This script handles API calls to the Ollama service
 */

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'translate') {
    translateText(request, sendResponse);
    return true; // Indicates that the response will be sent asynchronously
  }
});

/**
 * Translate text using Ollama API
 * @param {Object} request - Contains text, source language, target language, and API details
 * @param {Function} sendResponse - Callback to send result back to content script
 */
async function translateText(request, sendResponse) {
  try {
    const { text, source, target, model, endpoint, prompt: customPrompt } = request;
    
    // Validate required parameters
    if (!text || !source || !target || !model || !endpoint) {
      throw new Error('Missing required parameters');
    }
    
    // Format the endpoint URL
    let apiUrl = endpoint;
    if (!apiUrl.endsWith('/api/generate')) {
      apiUrl = apiUrl.endsWith('/api') 
        ? `${apiUrl}/generate`
        : `${apiUrl}/api/generate`;
    }
    
    // Create prompt for translation
    const prompt = customPrompt 
      ? createCustomPrompt(customPrompt, text, source, target)
      : createTranslationPrompt(text, source, target);
    
    console.log('Sending request to:', apiUrl);
    
    // Call Ollama API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false
      })
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', errorText);
      throw new Error(`HTTP error! Status: ${response.status}. ${errorText}`);
    }
    
    const data = await response.json();
    console.log('API Response:', data);
    
    if (!data.response) {
      throw new Error('Invalid response from Ollama API');
    }
    
    // Extract and clean up translation from model response
    const translation = cleanupTranslation(data.response);
    
    console.log('Cleaned translation:', translation);
    
    sendResponse({ 
      success: true, 
      translation: translation 
    });
  } catch (error) {
    console.error('Translation error:', error);
    
    sendResponse({ 
      success: false, 
      error: error.message || 'Translation failed' 
    });
  }
}

/**
 * Create a clear prompt for the translation model
 */
function createTranslationPrompt(text, sourceLanguage, targetLanguage) {
  return `You are a translator. Translate the following ${sourceLanguage} text to ${targetLanguage}. Only return the translation, no explanations:
  
"${text}"`;
}

/**
 * Create a prompt using the custom template
 */
function createCustomPrompt(template, text, sourceLanguage, targetLanguage) {
  return template
    .replace(/{text}/g, text)
    .replace(/{source}/g, sourceLanguage)
    .replace(/{target}/g, targetLanguage);
}

/**
 * Clean up the translation result from the model
 * Removes any prefixes, explanations, or formatting issues
 */
function cleanupTranslation(text) {
  // Remove any "Translation:" prefix
  let cleaned = text.replace(/^(Translation:|Translated text:|Result:)/i, '').trim();
  
  // Remove quotes if the model added them
  cleaned = cleaned.replace(/^["'](.+)["']$/s, '$1');
  
  // Remove additional explanations that might follow the translation
  const explanationMarkers = [
    'Note:', 
    'Explanation:', 
    'Additional information:',
    'I have translated',
    'This translates to'
  ];
  
  for (const marker of explanationMarkers) {
    const index = cleaned.indexOf(marker);
    if (index > 0) {
      cleaned = cleaned.substring(0, index).trim();
    }
  }
  
  return cleaned;
}