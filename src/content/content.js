// content.js - Content script for aria2-ng-extension

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getCookies') {
    // This content script can be used to get cookies from the page context
    sendResponse(true);
  }
});

console.log('AriaNg Download Manager content script loaded');
