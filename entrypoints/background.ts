// WXT auto-imports: browser

interface Settings {
	rpcHost: string;
	rpcPort: number;
	rpcProtocol: string;
	rpcSecret: string;
	showNotifications: boolean;
}

interface DownloadItem {
	id: number;
	url: string;
	filename?: string;
	totalBytes?: number;
	referer?: string;
}

const DEFAULT_SETTINGS: Settings = {
	rpcHost: "localhost",
	rpcPort: 6800,
	rpcProtocol: "http",
	rpcSecret: "",
	showNotifications: true,
};

const ARIA2_ID = `aria2-ng-extension-${Date.now()}`;

let settings: Settings = { ...DEFAULT_SETTINGS };
let rpcUrl: string | null = null;

async function loadSettings(): Promise<void> {
	const stored = await browser.storage.local.get("settings");
	settings = stored.settings
		? { ...DEFAULT_SETTINGS, ...stored.settings }
		: DEFAULT_SETTINGS;
	connectToAria2();
	updateContextMenu();
}

async function saveSettings(newSettings: Partial<Settings>): Promise<void> {
	settings = { ...settings, ...newSettings };
	await browser.storage.local.set({ settings });
	connectToAria2();
	updateContextMenu();
}

function connectToAria2(): void {
	const protocol = settings.rpcProtocol === "https" ? "https" : "http";
	rpcUrl = `${protocol}://${settings.rpcHost}:${settings.rpcPort}/jsonrpc`;
	console.log("Aria2 RPC URL:", rpcUrl);
}

function sendAria2Request(
	method: string,
	params: unknown[] = [],
): Promise<unknown> {
	return new Promise((resolve, reject) => {
		if (!rpcUrl) {
			reject(new Error("Not connected to aria2"));
			return;
		}

		const id = `${ARIA2_ID}-${Math.random().toString(36).substr(2, 9)}`;
		const rpcParams = settings.rpcSecret
			? [`token:${settings.rpcSecret}`, ...params]
			: params;
		const body = JSON.stringify({
			jsonrpc: "2.0",
			id: id,
			method: method,
			params: rpcParams,
		});

		const xhr = new XMLHttpRequest();
		xhr.open("POST", rpcUrl, true);
		xhr.setRequestHeader("Content-Type", "application/json");
		xhr.timeout = 30000;

		xhr.onload = () => {
			if (xhr.status >= 200 && xhr.status < 300) {
				try {
					const data = JSON.parse(xhr.responseText);
					if (data.error) {
						reject(new Error(data.error.message));
					} else {
						resolve(data.result);
					}
				} catch (_e) {
					reject(new Error("Invalid response"));
				}
			} else {
				reject(new Error(`HTTP ${xhr.status}`));
			}
		};

		xhr.onerror = () => reject(new Error("Connection failed"));
		xhr.ontimeout = () => reject(new Error("Request timeout"));

		xhr.send(body);
	});
}

async function getCookies(url: string, tabId?: number): Promise<string> {
	try {
		if (tabId) {
			const cookies = await browser.cookies.getAll({ url });
			return cookies
				.map(
					(cookie: browser.cookies.Cookie) => `${cookie.name}=${cookie.value}`,
				)
				.join("; ");
		}
	} catch (error) {
		console.error("Error getting cookies:", error);
	}
	return "";
}

async function addDownloadToAria2(
	downloadItem: DownloadItem,
	referer: string,
	cookies: string,
): Promise<void> {
	try {
		await browser.downloads.erase({ id: downloadItem.id });

		let params: unknown[] = [];

		if (downloadItem.url.match(/\.(torrent|metalink4?)$/i)) {
			const response = await fetch(downloadItem.url);
			const blob = await response.blob();
			const base64 = await blobToBase64(blob);

			if (downloadItem.url.endsWith(".torrent")) {
				await sendAria2Request("aria2.addTorrent", [base64, [], {}]);
			} else {
				await sendAria2Request("aria2.addMetalink", [base64, [], {}]);
			}
		} else {
			params = [[downloadItem.url]];

			const options: Record<string, unknown> = {};
			if (referer) {
				options.header = [`Referer: ${referer}`];
			}
			if (cookies) {
				options.header = options.header || [];
				(options.header as string[]).push(`Cookie: ${cookies}`);
			}

			if (downloadItem.filename) {
				options.out = downloadItem.filename.split("/").pop();
			}

			params.push(options);
			await sendAria2Request("aria2.addUri", params);
		}

		if (settings.showNotifications) {
			showNotification(browser.i18n.getMessage("downloadAdded"));
		}
	} catch (error) {
		console.error("Error adding download to aria2:", error);
		if (settings.showNotifications) {
			showNotification(browser.i18n.getMessage("downloadError"));
		}
	}
}

function blobToBase64(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => {
			const dataUrl = reader.result as string;
			const base64 = dataUrl.split(",")[1];
			resolve(base64);
		};
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
}

function showNotification(message: string): void {
	browser.notifications.create({
		type: "basic",
		iconUrl: "/icons/icon-48.png",
		title: browser.i18n.getMessage("extName"),
		message: message,
	});
}

function updateContextMenu(): void {
	browser.contextMenus.removeAll().then(() => {
		browser.contextMenus.create({
			title: browser.i18n.getMessage("extName"),
			id: "ariang-main",
			contexts: ["link", "selection"],
		});

		browser.contextMenus.create({
			title: "Download with Aria2",
			parentId: "ariang-main",
			id: "ariang-download",
			contexts: ["link"],
		});

		browser.contextMenus.create({
			title: "Open Aria2",
			parentId: "ariang-main",
			id: "ariang-open",
			contexts: ["link", "selection"],
		});
	});
}

function setupEventListeners(): void {
	browser.downloads.onCreated.addListener(
		async (downloadItem: browser.downloads.DownloadItem) => {
			try {
				await browser.downloads.cancel(downloadItem.id);
			} catch (_e) {
				// Ignore cancel errors
			}

			try {
				const tabs = await browser.tabs.query({
					active: true,
					currentWindow: true,
				});
				const tab = tabs[0];

				const referer = downloadItem.referrer || tab?.url || "";
				const cookies = await getCookies(downloadItem.url, tab?.id);

				await addDownloadToAria2(
					{
						id: downloadItem.id,
						url: downloadItem.url,
						filename: downloadItem.filename,
						totalBytes: downloadItem.totalBytes,
						referer: downloadItem.referrer,
					},
					referer,
					cookies,
				);
			} catch (error) {
				console.error("Error handling download:", error);
			}
		},
	);

	browser.contextMenus.onClicked.addListener(
		async (info: browser.contextMenus.OnClickData, tab?: browser.tabs.Tab) => {
			if (
				info.menuItemId === "ariang-download" ||
				info.menuItemId === "ariang-main"
			) {
				const url = info.linkUrl;
				if (url) {
					const referer = tab?.url || "";
					const cookies = await getCookies(url, tab?.id);

					await addDownloadToAria2(
						{
							url: url,
							id: 0,
						},
						referer,
						cookies,
					);
				}
			} else if (info.menuItemId === "ariang-open") {
				const protocol = settings.rpcProtocol === "https" ? "https" : "http";
				let ariangUrl = browser.runtime.getURL(
					`/ariang/index.html#!/settings/rpc/set/${protocol}/${settings.rpcHost}/${settings.rpcPort}/jsonrpc`,
				);
				if (settings.rpcSecret) {
					ariangUrl += `/${btoa(settings.rpcSecret)}`;
				}
				browser.tabs.create({ url: ariangUrl });
			}
		},
	);

	browser.runtime.onInstalled.addListener(() => {
		loadSettings();
		updateContextMenu();
	});

	browser.storage.onChanged.addListener(
		(
			changes: browser.storage.StorageAreaSyncOnChangedChangesType,
			area: string,
		) => {
			if (area === "local" && changes.settings) {
				loadSettings();
			}
		},
	);

	browser.runtime.onMessage.addListener(
		(
			message: { type: string; settings?: Partial<Settings> },
			_sender: browser.runtime.MessageSender,
			sendResponse: (response?: unknown) => void,
		) => {
			if (message.type === "getSettings") {
				sendResponse(settings);
			} else if (message.type === "setSettings" && message.settings) {
				saveSettings(message.settings).then(() =>
					sendResponse({ success: true }),
				);
				return true;
			}
		},
	);
}

export default defineBackground({
	main() {
		setupEventListeners();
		loadSettings();
	},
});
