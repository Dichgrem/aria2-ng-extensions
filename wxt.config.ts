import { defineConfig } from "wxt";

export default defineConfig({
	manifest: {
		name: "__MSG_extName__",
		description: "__MSG_extDescription__",
		default_locale: "en",
		permissions: [
			"contextMenus",
			"cookies",
			"downloads",
			"notifications",
			"storage",
			"tabs",
		],
		host_permissions: ["<all_urls>"],
		browser_specific_settings: {
			gecko: {
				id: "aria2-helper@github.com",
				strict_min_version: "140.0",
				data_collection_permissions: {
					required: ["none"],
					optional: [],
				},
			},
		},
		icons: {
			"16": "icons/icon-16.png",
			"48": "icons/icon-48.png",
			"128": "icons/icon-128.png",
		},
		action: {
			default_popup: "popup.html",
			default_title: "__MSG_extName__",
			default_icon: {
				"16": "icons/icon-16.png",
				"48": "icons/icon-48.png",
				"128": "icons/icon-128.png",
			},
		},
		options_ui: {
			page: "options.html",
			open_in_tab: true,
		},
		homepage_url: "https://github.com/Dichgrem/aria2-helper",
	},
	publicDir: "public",
	webExt: {
		startUrls: ["https://github.com/Dichgrem/aria2-helper"],
	},
});
