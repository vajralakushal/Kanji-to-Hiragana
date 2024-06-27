import { convertKanjiToHiragana } from './convert';

console.log("Content script loaded");

// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   console.log("Message received in content script:", request);
//   if (request.action === "convert") {
//     // Call your conversion function here
//     convertKanjiToHiragana();
//     sendResponse({status: "Conversion started"});
//   }
//   return true;  // Will respond asynchronously
// });

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received in content script:", request);
  if (request.action === "convert") {
    convertKanjiToHiragana()
      .then(() => sendResponse({status: "Conversion completed"}))
      .catch((error) => sendResponse({status: "Error", error: error.message}));
    return true; // Indicates that the response is sent asynchronously
  }
});

// Your convertKanjiToHiragana function and other logic here
