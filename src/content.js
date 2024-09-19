import { /*toggleKanjiHiragana,*/ toggleFurigana} from './convert';

console.log("Content script loaded");

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received in content script:", request);
  /*if (request.action === "convert" || request.action === "revert") {
    toggleKanjiHiragana()
      .then(() => sendResponse({status: isConverted ? "Conversion completed" : "Reverted to original"}))
      .catch((error) => sendResponse({status: "Error", error: error.message}));
    return true; // Indicates that the response is sent asynchronously
  } else
  */if (request.action === "addFurigana" || request.action === "removeFurigana") {
    toggleFurigana()
      .then(() => sendResponse({status: "Operation completed"}))
      .catch((error) => sendResponse({status: "Error", error: error.message}));
    return true; // Indicates that the response is sent asynchronously
  }
});


