// WXT auto-imports: browser

interface Settings {
	enabled: boolean;
	rpcHost: string;
	rpcPort: number;
	rpcProtocol: string;
	rpcSecret: string;
}

const getEl = <T extends HTMLElement>(id: string): T =>
	document.getElementById(id) as T;

document.addEventListener("DOMContentLoaded", async () => {
	const toggleBtn = getEl<HTMLButtonElement>("toggleEnabled");
	const openAriangBtn = getEl<HTMLButtonElement>("openAriang");
	const openSettingsBtn = getEl<HTMLButtonElement>("openSettings");

	const stored = (await browser.storage.local.get("settings")) as {
		settings?: Settings;
	};
	const settings: Settings = stored.settings ?? {
		enabled: true,
		rpcHost: "localhost",
		rpcPort: 6800,
		rpcProtocol: "http",
		rpcSecret: "",
	};

	updateToggleUI(settings.enabled);

	toggleBtn.addEventListener("click", async () => {
		const newEnabled = !settings.enabled;
		settings.enabled = newEnabled;
		await browser.storage.local.set({ settings });
		updateToggleUI(newEnabled);
	});

	openAriangBtn.addEventListener("click", () => {
		const protocol = settings.rpcProtocol === "https" ? "https" : "http";
		let ariangUrl = browser.runtime.getURL(
			`/ariang/index.html#!/settings/rpc/set/${protocol}/${settings.rpcHost || "localhost"}/${settings.rpcPort || 6800}/jsonrpc`,
		);
		if (settings.rpcSecret) {
			ariangUrl += `/${btoa(settings.rpcSecret)}`;
		}
		browser.tabs.create({ url: ariangUrl });
		window.close();
	});

	openSettingsBtn.addEventListener("click", () => {
		browser.runtime.openOptionsPage();
		window.close();
	});

	function updateToggleUI(enabled: boolean): void {
		toggleBtn.textContent = enabled ? "Intercepting: ON" : "Intercepting: OFF";
		toggleBtn.className = enabled ? "btn btn-active" : "btn btn-inactive";
	}
});
