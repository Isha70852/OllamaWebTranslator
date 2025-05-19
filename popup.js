document.addEventListener('DOMContentLoaded', function() {
  const connectionStatus = document.getElementById('connection-status');
  const modelName = document.getElementById('model-name');
  const languagePair = document.getElementById('language-pair');
  const translatePageBtn = document.getElementById('translate-page-btn');
  const settingsBtn = document.getElementById('settings-btn');

  // Load and display saved settings
  chrome.storage.sync.get(['ollamaModel', 'ollamaEndpoint', 'sourceLanguage', 'targetLanguage'], function(result) {
    if (result.ollamaEndpoint && result.ollamaModel) {
      connectionStatus.textContent = 'Configured';
      connectionStatus.style.color = '#16a34a'; // Success green
      modelName.textContent = result.ollamaModel;
      
      if (result.sourceLanguage && result.targetLanguage) {
        languagePair.textContent = `${result.sourceLanguage} → ${result.targetLanguage}`;
      } else {
        languagePair.textContent = 'Not set';
      }
    } else {
      connectionStatus.textContent = 'Not configured';
      connectionStatus.style.color = '#ef4444'; // Error red
    }
  });

  // Handle full page translation
  translatePageBtn.addEventListener('click', async function() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'translateFullPage' });
    }
  });

  // Open settings page when button is clicked
  settingsBtn.addEventListener('click', function() {
    chrome.runtime.openOptionsPage();
  });
});