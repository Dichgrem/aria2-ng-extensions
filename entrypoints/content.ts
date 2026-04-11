// WXT auto-imports: browser

export default defineContentScript({
	matches: ["<all_urls>"],
	runAt: "document_start",
	main() {
		browser.runtime.onMessage.addListener((request, _sender, sendResponse) => {
			if (request.action === "getCookies") {
				sendResponse(true);
			}
		});

		console.log("Aria2-helper content script loaded");
	},
});
