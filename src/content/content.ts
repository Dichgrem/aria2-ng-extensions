chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'getCookies') {
    sendResponse(true);
  }
});

console.log('Aria2-helper content script loaded');
