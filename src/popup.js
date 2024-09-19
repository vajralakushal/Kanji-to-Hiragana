import { /*toggleKanjiHiragana,*/ toggleFurigana } from './convert';

//let isKanjiConverted = false;
let isFuriganaAdded = false;
let isAnkiEnabled = false;
let selectedDeck = '';

document.addEventListener('DOMContentLoaded', () => {
  //const convertButton = document.getElementById('convertButton');
  const furiganaButton = document.getElementById('furiganaButton');
  const ankiIntegrationCheckbox = document.getElementById('ankiIntegration');
  const ankiDeckSelect = document.getElementById('ankiDeck');

  // Load saved settings
  chrome.storage.sync.get(['ankiEnabled', 'selectedDeck'], (result) => {
    isAnkiEnabled = result.ankiEnabled || false;
    selectedDeck = result.selectedDeck || '';
    ankiIntegrationCheckbox.checked = isAnkiEnabled;
    ankiDeckSelect.style.display = isAnkiEnabled ? 'block' : 'none';
    if (isAnkiEnabled) {
      loadAnkiDecks();
    }
  });

  /*convertButton.addEventListener('click', () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      const action = isKanjiConverted ? "revert" : "convert";
      chrome.tabs.sendMessage(tabs[0].id, {
        action: action,
        ankiEnabled: isAnkiEnabled,
        selectedDeck: selectedDeck
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error:", chrome.runtime.lastError.message);
        } else {
          console.log("Response received:", response);
          isKanjiConverted = !isKanjiConverted;
          convertButton.textContent = isKanjiConverted ? "Revert to Kanji" : "Convert Kanji to Hiragana";
        }
      });
    });
  });
  */

  furiganaButton.addEventListener('click', () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      const action = isFuriganaAdded ? "removeFurigana" : "addFurigana";
      chrome.tabs.sendMessage(tabs[0].id, {
        action: action,
        ankiEnabled: isAnkiEnabled,
        selectedDeck: selectedDeck
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error:", chrome.runtime.lastError.message);
        } else {
          console.log("Response received:", response);
          isFuriganaAdded = !isFuriganaAdded;
          furiganaButton.textContent = isFuriganaAdded ? "Remove Furigana" : "Add Furigana";
        }
      });
    });
  });

  ankiIntegrationCheckbox.addEventListener('change', (e) => {
    isAnkiEnabled = e.target.checked;
    ankiDeckSelect.style.display = isAnkiEnabled ? 'block' : 'none';
    if (isAnkiEnabled) {
      loadAnkiDecks();
    }
    chrome.storage.sync.set({ ankiEnabled: isAnkiEnabled });
  });

  ankiDeckSelect.addEventListener('change', (e) => {
    selectedDeck = e.target.value;
    chrome.storage.sync.set({ selectedDeck: selectedDeck });
  });
});

function loadAnkiDecks() {
  fetch('http://localhost:8765', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'deckNames',
      version: 6
    }),
  })
  .then(response => response.json())
  .then(data => {
    const ankiDeckSelect = document.getElementById('ankiDeck');
    ankiDeckSelect.innerHTML = '<option value="">Select Anki Deck</option>';
    data.result.forEach(deck => {
      const option = document.createElement('option');
      option.value = deck;
      option.textContent = deck;
      ankiDeckSelect.appendChild(option);
    });
    ankiDeckSelect.value = selectedDeck;
  })
  .catch(error => console.error('Error:', error));
}