/**
 * Ollama Translator Content Script
 * This script runs in the context of web pages and handles:
 * 1. Text selection detection
 * 2. Showing translation buttons
 * 3. Requesting translations from the background script
 * 4. Displaying translation results
 */

// Global elements
let translateButton = null;
let resultBox = null;
let selectedText = '';
let isTranslating = false;
let isTranslatingPage = false;
let isPaused = false;
let translationController = null;

// Settings
let settings = {
  ollamaEndpoint: '',
  ollamaModel: '',
  sourceLanguage: '',
  targetLanguage: '',
  targetLanguage: '',
  translationPrompt: ''
};

// Load settings when the content script initializes
chrome.storage.sync.get([
  'ollamaEndpoint', 
  'ollamaModel', 
  'sourceLanguage', 
  'targetLanguage',
  'translationPrompt',
  'autoTranslate'
], function(result) {
  settings = { ...settings, ...result };
});

// Listen for setting changes
chrome.storage.onChanged.addListener(function(changes) {
  for (let key in changes) {
    if (key in settings) {
      settings[key] = changes[key].newValue;
    }
  }
});

// Initialize the content script
function init() {
  // Create translation button
  translateButton = document.createElement('button');
  translateButton.className = 'ollama-translate-button';
  translateButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m5 8 6 6"></path>
      <path d="m4 14 6-6 2-3"></path>
      <path d="M2 5h12"></path>
      <path d="M7 2h1"></path>
      <path d="m22 22-5-10-5 10"></path>
      <path d="M14 18h6"></path>
    </svg>
    Translate
  `;
  translateButton.addEventListener('click', handleTranslate);
  document.body.appendChild(translateButton);

  // Listen for text selections
  document.addEventListener('mouseup', handleTextSelection);
  document.addEventListener('keyup', handleTextSelection);

  // Close translation result when clicking elsewhere
  document.addEventListener('click', function(e) {
    if (resultBox && 
        e.target !== resultBox && 
        !resultBox.contains(e.target) &&
        e.target !== translateButton && 
        !translateButton.contains(e.target)) {
      removeResultBox();
    }
  });
}

// Handle text selection events
function handleTextSelection(e) {
  const selection = window.getSelection();
  selectedText = selection.toString().trim();

  if (selectedText.length > 0) {
    // Get selection coordinates
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // Position the translate button near the selection
    const buttonWidth = 100; // Approximate width of the button
    const buttonX = rect.left + rect.width / 2 - buttonWidth / 2;
    const buttonY = rect.bottom + window.scrollY + 8; // 8px below the selection
    
    translateButton.style.left = `${Math.max(10, buttonX)}px`;
    translateButton.style.top = `${buttonY}px`;
    
    // Show the button with animation
    setTimeout(() => {
      translateButton.classList.add('show');
    }, 10);

    // Auto-translate if enabled
    if (settings.autoTranslate) {
      handleTranslate();
    }
  } else {
    // Hide the button if no text is selected
    translateButton.classList.remove('show');
  }
}

// Handle translate button click
function handleTranslate() {
  if (!selectedText) return;
  
  // Check if settings are configured
  if (!settings.ollamaEndpoint || !settings.ollamaModel) {
    showError('Ollama API not configured. Please check the extension settings.');
    return;
  }

  // Prevent multiple translation requests
  if (isTranslating) {
    return;
  }

  isTranslating = true;
  
  // Show loading state
  translateButton.innerHTML = '<span class="ollama-translation-loading"></span>';
  translateButton.classList.add('translating');
  
  // Create or update result box
  if (!resultBox) {
    resultBox = document.createElement('div');
    resultBox.className = 'ollama-translation-result';
    resultBox.innerHTML = `
      <div class="result-header">
        <span class="result-title">${settings.sourceLanguage} → ${settings.targetLanguage}</span>
        <button class="result-close">×</button>
      </div>
      <div class="result-content">Translating...</div>
    `;
    
    // Position the result box
    const buttonRect = translateButton.getBoundingClientRect();
    resultBox.style.left = `${buttonRect.left}px`;
    resultBox.style.top = `${buttonRect.bottom + window.scrollY + 10}px`; // 10px below the button
    
    document.body.appendChild(resultBox);
    
    // Add event listener to close button
    const closeButton = resultBox.querySelector('.result-close');
    closeButton.addEventListener('click', removeResultBox);
  } else {
    resultBox.querySelector('.result-content').textContent = 'Translating...';
  }
  
  // Show the result box with animation
  setTimeout(() => {
    resultBox.classList.add('show');
  }, 10);
  
  // Send message to background script for translation
  chrome.runtime.sendMessage({
    action: 'translate',
    text: selectedText,
    source: settings.sourceLanguage,
    target: settings.targetLanguage,
    model: settings.ollamaModel,
    endpoint: settings.ollamaEndpoint,
    prompt: settings.translationPrompt
  }, function(response) {
    isTranslating = false;
    translateButton.classList.remove('translating');
    
    // Reset translate button
    translateButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m5 8 6 6"></path>
        <path d="m4 14 6-6 2-3"></path>
        <path d="M2 5h12"></path>
        <path d="M7 2h1"></path>
        <path d="m22 22-5-10-5 10"></path>
        <path d="M14 18h6"></path>
      </svg>
      Translate
    `;
    
    // Update result content
    if (response && response.success) {
      resultBox.querySelector('.result-content').textContent = response.translation;
    } else {
      const errorMessage = response?.error || 'Translation failed. Please try again.';
      resultBox.querySelector('.result-content').innerHTML = `
        <span class="ollama-error">${errorMessage}</span>
      `;
    }
  });
}

// Remove the translation result box
function removeResultBox() {
  if (resultBox) {
    resultBox.classList.remove('show');
    setTimeout(() => {
      if (resultBox && resultBox.parentNode) {
        resultBox.parentNode.removeChild(resultBox);
        resultBox = null;
      }
    }, 200); // Match the transition duration
  }
}

// Show error message in a result box
function showError(message) {
  if (!resultBox) {
    resultBox = document.createElement('div');
    resultBox.className = 'ollama-translation-result';
    document.body.appendChild(resultBox);
    
    // Position near the translate button
    const buttonRect = translateButton.getBoundingClientRect();
    resultBox.style.left = `${buttonRect.left}px`;
    resultBox.style.top = `${buttonRect.bottom + window.scrollY + 10}px`;
  }
  
  resultBox.innerHTML = `
    <div class="result-header">
      <span class="result-title">Error</span>
      <button class="result-close">×</button>
    </div>
    <div class="result-content">
      <span class="ollama-error">${message}</span>
    </div>
  `;
  
  // Add event listener to close button
  const closeButton = resultBox.querySelector('.result-close');
  closeButton.addEventListener('click', removeResultBox);
  
  // Show the result box with animation
  setTimeout(() => {
    resultBox.classList.add('show');
  }, 10);
}

// Handle full page translation
async function translateFullPage() {
  if (isTranslatingPage) return;
  
  isTranslatingPage = true;
  isPaused = false;
  translationController = new AbortController();

  // Create progress bar
  const progressBar = document.createElement('div');
  progressBar.className = 'ollama-translation-progress';
  document.body.appendChild(progressBar);

  // Create controls
  const controls = document.createElement('div');
  controls.className = 'ollama-translation-controls';
  controls.innerHTML = `
    <span class="status">Translating...</span>
    <div class="control-buttons">
    <button id="pauseTranslation">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
      Pause
    </button>
    <button id="stopTranslation" class="stop-button">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
      Stop
    </button>
    </div>
  `;
  document.body.appendChild(controls);

  const pauseButton = document.getElementById('pauseTranslation');
  const stopButton = document.getElementById('stopTranslation');
  pauseButton.addEventListener('click', toggleTranslation);
  stopButton.addEventListener('click', () => {
    cleanupTranslation();
    // Remove all translated text
    document.querySelectorAll('.ollama-translated-text').forEach(el => el.remove());
  });

  try {
    // Get all text nodes that are not in scripts, styles, or already translated
    const textNodes = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          // Skip if parent is script, style, or already translated
          if (
            node.parentElement?.tagName === 'SCRIPT' ||
            node.parentElement?.tagName === 'STYLE' ||
            node.parentElement?.classList.contains('ollama-translated-text')
          ) {
            return NodeFilter.FILTER_REJECT;
          }
          // Accept if node has meaningful text
          return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      }
    );

    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }

    // Process text nodes in chunks
    const chunkSize = 5;
    for (let i = 0; i < textNodes.length; i += chunkSize) {
      // Check if translation was aborted
      if (translationController.signal.aborted) {
        break;
      }

      // Wait if paused
      while (isPaused && !translationController.signal.aborted) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const chunk = textNodes.slice(i, i + chunkSize);
      const texts = chunk.map(node => node.textContent.trim());

      // Update progress bar
      progressBar.style.transform = `scaleX(${(i + 1) / textNodes.length})`;

      // Translate chunk
      const translations = await Promise.all(
        texts.map(text =>
          new Promise(resolve => {
            chrome.runtime.sendMessage({
              action: 'translate',
              text: text,
              source: settings.sourceLanguage,
              target: settings.targetLanguage,
              model: settings.ollamaModel,
              endpoint: settings.ollamaEndpoint,
              prompt: settings.translationPrompt
            }, response => {
              resolve(response.success ? response.translation : null);
            });
          })
        )
      );

      // Insert translations
      chunk.forEach((node, index) => {
        if (translations[index]) {
          const translationSpan = document.createElement('div');
          translationSpan.className = 'ollama-translated-text';
          translationSpan.textContent = translations[index];
          node.parentNode.insertBefore(translationSpan, node.nextSibling);
          
          // Trigger animation
          setTimeout(() => {
            translationSpan.classList.add('show');
          }, 10);
        }
      });

      // Small delay between chunks to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } catch (error) {
    console.error('Full page translation error:', error);
  } finally {
    cleanupTranslation();
  }
}

// Toggle translation pause/resume
function toggleTranslation() {
  isPaused = !isPaused;
  const pauseButton = document.getElementById('pauseTranslation');
  const statusSpan = document.querySelector('.ollama-translation-controls .status');
  
  if (isPaused) {
    pauseButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
      Resume
    `;
    statusSpan.textContent = 'Paused';
  } else {
    pauseButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
      Pause
    `;
    statusSpan.textContent = 'Translating...';
  }
}

// Cleanup translation UI elements
function cleanupTranslation() {
  if (translationController) {
    translationController.abort();
    translationController = null;
  }

  const progressBar = document.querySelector('.ollama-translation-progress');
  if (progressBar) {
    progressBar.remove();
  }

  const controls = document.querySelector('.ollama-translation-controls');
  if (controls) {
    controls.remove();
  }

  if (isTranslatingPage) {
    isTranslatingPage = false;
    isPaused = false;
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'translateFullPage') {
    if (isTranslatingPage) {
      cleanupTranslation();
    } else {
      translateFullPage();
    }
  }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (isTranslatingPage) {
    cleanupTranslation();
  }
});

// Initialize when the DOM is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}