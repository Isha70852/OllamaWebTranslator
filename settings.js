document.addEventListener('DOMContentLoaded', function() {
  const settingsForm = document.getElementById('settings-form');
  const ollamaEndpoint = document.getElementById('ollama-endpoint');
  const ollamaModel = document.getElementById('ollama-model');
  const sourceLanguage = document.getElementById('source-language');
  const targetLanguage = document.getElementById('target-language');
  const translationPrompt = document.getElementById('translation-prompt');
  const autoTranslate = document.getElementById('auto-translate');
  const saveBtn = document.getElementById('save-btn');
  const testConnectionBtn = document.getElementById('test-connection-btn');
  const statusMessage = document.getElementById('status-message');

  // Load saved settings
  chrome.storage.sync.get([
    'ollamaEndpoint', 
    'ollamaModel', 
    'sourceLanguage', 
    'targetLanguage',
    'translationPrompt',
    'autoTranslate'
  ], function(result) {
    if (result.ollamaEndpoint) ollamaEndpoint.value = result.ollamaEndpoint;
    if (result.ollamaModel) ollamaModel.value = result.ollamaModel;
    if (result.sourceLanguage) sourceLanguage.value = result.sourceLanguage;
    if (result.targetLanguage) targetLanguage.value = result.targetLanguage;
    if (result.translationPrompt) {
      translationPrompt.value = result.translationPrompt;
    } else {
      translationPrompt.value = 'You are a translator. Translate the following {source} text to {target}. Only return the translation, no explanations:\n\n"{text}"';
    }
    if (result.autoTranslate) autoTranslate.checked = result.autoTranslate;
  });

  // Save settings
  settingsForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Validate form
    if (!ollamaEndpoint.value || !ollamaModel.value || !sourceLanguage.value || !targetLanguage.value) {
      showStatus('Please fill in all required fields', 'error');
      return;
    }
    
    // Save to Chrome storage
    chrome.storage.sync.set({
      ollamaEndpoint: ollamaEndpoint.value,
      ollamaModel: ollamaModel.value,
      sourceLanguage: sourceLanguage.value,
      targetLanguage: targetLanguage.value,
      translationPrompt: translationPrompt.value,
      autoTranslate: autoTranslate.checked
    }, function() {
      showStatus('Settings saved successfully!', 'success');
    });
  });

  // Test connection to Ollama
  testConnectionBtn.addEventListener('click', function() {
    if (!ollamaEndpoint.value || !ollamaModel.value) {
      showStatus('Please enter Ollama endpoint and model name', 'error');
      return;
    }
    
    showStatus('Testing connection...', 'pending');
    
    // Create a test API request
    const endpoint = ollamaEndpoint.value.endsWith('/api') 
      ? ollamaEndpoint.value 
      : `${ollamaEndpoint.value}/api`;
    
    const apiUrl = `${endpoint}/generate`;
    
    fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: ollamaModel.value,
        prompt: 'Hello, this is a test.',
        stream: false
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      showStatus('Connection successful! Ollama API is working.', 'success');
    })
    .catch(error => {
      showStatus(`Connection failed: ${error.message}. Make sure Ollama is running and the model is available.`, 'error');
    });
  });

  // Display status message
  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = 'status-message';
    
    if (type === 'success') {
      statusMessage.classList.add('success');
    } else if (type === 'error') {
      statusMessage.classList.add('error');
    }
    
    // Auto-hide success messages after 3 seconds
    if (type === 'success') {
      setTimeout(() => {
        statusMessage.classList.remove('success');
      }, 3000);
    }
  }
});