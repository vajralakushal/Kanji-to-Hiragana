console.log("Popup script starting");

let isConverted = false;

document.addEventListener('DOMContentLoaded', () => {
  const convertButton = document.getElementById('convertButton');
  
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
});

// document.addEventListener('DOMContentLoaded', () => {
//   console.log("DOM content loaded");
  
//   const convertButton = document.getElementById('convertButton');
  
//   if (convertButton) {
//     console.log("Convert button found");
    
//     convertButton.addEventListener('click', () => {
//       console.log("Convert button clicked");
      
//       chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
//         if (tabs && tabs.length > 0) {
//           console.log("Active tab found:", tabs[0].id);
          
//           chrome.tabs.sendMessage(tabs[0].id, {action: "convert"}, (response) => {
//             if (chrome.runtime.lastError) {
//               console.error("Error:", chrome.runtime.lastError.message);
//             } else {
//               console.log("Response received:", response);
//             }
//           });
//         } else {
//           console.error("No active tab found");
//         }
//       });
//     });
//   } else {
//     console.error("Convert button not found in the DOM");
//   }
// });
