console.log("Popup script starting"),document.addEventListener("DOMContentLoaded",(function(){console.log("DOM content loaded");var o=document.getElementById("convertButton");o?(console.log("Convert button found"),o.addEventListener("click",(function(){console.log("Convert button clicked"),chrome.tabs.query({active:!0,currentWindow:!0},(function(o){o&&o.length>0?(console.log("Active tab found:",o[0].id),chrome.tabs.sendMessage(o[0].id,{action:"convert"},(function(o){chrome.runtime.lastError?console.error("Error:",chrome.runtime.lastError.message):console.log("Response received:",o)}))):console.error("No active tab found")}))}))):console.error("Convert button not found in the DOM")}));