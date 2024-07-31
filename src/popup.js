console.log("Popup script starting");

let isConverted = false;
let isFuriganaAdded = false;

document.addEventListener('DOMContentLoaded', () => {
  const convertButton = document.getElementById('convertButton');
  const furiganaButton = document.getElementById('furiganaButton');
  
  convertButton.addEventListener('click', () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      const action = isConverted ? "revert" : "convert";
      chrome.tabs.sendMessage(tabs[0].id, {action: action}, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error:", chrome.runtime.lastError.message);
        } else {
          console.log("Response received:", response);
          isConverted = !isConverted;
          convertButton.textContent = isConverted ? "Convert Hiragana to Kanji" : "Convert Kanji to Hiragana";
        }
      });
    });
  });

  furiganaButton.addEventListener('click', () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      const action = isFuriganaAdded ? "removeFurigana" : "addFurigana";
      chrome.tabs.sendMessage(tabs[0].id, {action: action}, (response) => {
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
});
