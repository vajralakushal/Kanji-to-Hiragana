console.log("Background script loaded", new Date().toISOString());

chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed/updated");
});

chrome.action.onClicked.addListener((tab) => {
  console.log("Extension icon clicked");
});