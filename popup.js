document.addEventListener('DOMContentLoaded', function() {
  const connectionStatus = document.getElementById('connection-status');
  const modelName = document.getElementById('model-name');
  const languagePair = document.getElementById('language-pair');
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

  // Open settings page when button is clicked
  settingsBtn.addEventListener('click', function() {
    chrome.runtime.openOptionsPage();
  });
});