// background.js - Service Worker for Manifest V3

let aria2 = null;
let settings = null;
let isCapturing = false;
let rpcUrl = null;

const DEFAULT_SETTINGS = {
  rpcHost: 'localhost',
  rpcPort: 6800,
  rpcProtocol: 'http',
  rpcSecret: '',
  autoCapture: true,
  excludedProtocols: ['data:', 'blob:', 'file:'],
  excludedSites: [],
  excludedFileTypes: [],
  minFileSize: 0,
  showNotifications: true
};

const ARIA2_ID = 'aria2-ng-extension-' + Date.now();

async function loadSettings() {
  const stored = await chrome.storage.local.get('settings');
  settings = { ...DEFAULT_SETTINGS, ...stored.settings };
  isCapturing = settings.autoCapture;
  connectToAria2();
  updateContextMenu();
}

async function saveSettings(newSettings) {
  settings = { ...settings, ...newSettings };
  await chrome.storage.local.set({ settings });
  connectToAria2();
  updateContextMenu();
}

function connectToAria2() {
  const protocol = settings.rpcProtocol === 'https' ? 'https' : 'http';
  rpcUrl = `${protocol}://${settings.rpcHost}:${settings.rpcPort}/jsonrpc`;
  console.log('Aria2 RPC URL:', rpcUrl);
}

function sendAria2Request(method, params = []) {
  return new Promise((resolve, reject) => {
    if (!rpcUrl) {
      reject(new Error('Not connected to aria2'));
      return;
    }

    const id = ARIA2_ID + '-' + Math.random().toString(36).substr(2, 9);
    const rpcParams = settings.rpcSecret ? ['token:' + settings.rpcSecret, ...params] : params;
    const body = JSON.stringify({
      jsonrpc: '2.0',
      id: id,
      method: method,
      params: rpcParams
    });

    const xhr = new XMLHttpRequest();
    xhr.open('POST', rpcUrl, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
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
        } catch (e) {
          reject(new Error('Invalid response'));
        }
      } else {
        reject(new Error('HTTP ' + xhr.status));
      }
    };
    
    xhr.onerror = () => reject(new Error('Connection failed'));
    xhr.ontimeout = () => reject(new Error('Request timeout'));
    
    xhr.send(body);
  });
}

function shouldCaptureDownload(downloadItem) {
  if (!settings.autoCapture || !isCapturing) {
    return false;
  }

  try {
    const url = new URL(downloadItem.url);

    if (settings.excludedProtocols.includes(url.protocol)) {
      return false;
    }

    if (settings.excludedSites.some(site => url.hostname.includes(site))) {
      return false;
    }

    const filename = downloadItem.filename || '';
    if (settings.excludedFileTypes.length > 0) {
      const fileExtension = url.pathname.split('.').pop().toLowerCase();
      if (settings.excludedFileTypes.includes(fileExtension)) {
        return false;
      }
    }

    if (settings.minFileSize > 0 && downloadItem.totalBytes > 0) {
      if (downloadItem.totalBytes < settings.minFileSize) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error checking download:', error);
    return false;
  }
}

async function getCookies(url, tabId) {
  try {
    if (tabId) {
      const cookies = await chrome.cookies.getAll({ url });
      return cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
    }
  } catch (error) {
    console.error('Error getting cookies:', error);
  }
  return '';
}

async function addDownloadToAria2(downloadItem, referer, cookies) {
  try {
    // Already cancelled in onCreated, just erase the download record
    await chrome.downloads.erase({ id: downloadItem.id });

    let params = [];

    if (downloadItem.url.match(/\.(torrent|metalink4?)$/i)) {
      // Handle torrent/metalink files
      const response = await fetch(downloadItem.url);
      const blob = await response.blob();
      const base64 = await blobToBase64(blob);

      if (downloadItem.url.endsWith('.torrent')) {
        await sendAria2Request('aria2.addTorrent', [base64, [], {}]);
      } else {
        await sendAria2Request('aria2.addMetalink', [base64, [], {}]);
      }
    } else {
      // Regular URL download
      params = [[downloadItem.url]];

      const options = {};
      if (referer) {
        options.header = [`Referer: ${referer}`];
      }
      if (cookies) {
        options.header = options.header || [];
        options.header.push(`Cookie: ${cookies}`);
      }

      if (downloadItem.filename) {
        options.out = downloadItem.filename.split('/').pop();
      }

      params.push(options);
      await sendAria2Request('aria2.addUri', params);
    }

    if (settings.showNotifications) {
      showNotification(chrome.i18n.getMessage('downloadAdded'));
    }

  } catch (error) {
    console.error('Error adding download to aria2:', error);
    if (settings.showNotifications) {
      showNotification(chrome.i18n.getMessage('downloadError'));
    }
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function showNotification(message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon-48.png',
    title: chrome.i18n.getMessage('extName'),
    message: message
  });
}

function updateContextMenu() {
  chrome.contextMenus.removeAll().then(() => {
    chrome.contextMenus.create({
      title: chrome.i18n.getMessage('extName'),
      id: 'ariang-main',
      contexts: ['link', 'selection']
    });

    chrome.contextMenus.create({
      title: 'Download with Aria2',
      parentId: 'ariang-main',
      id: 'ariang-download',
      contexts: ['link']
    });

    chrome.contextMenus.create({
      title: 'Open AriaNg',
      parentId: 'ariang-main',
      id: 'ariang-open',
      contexts: ['link', 'selection']
    });
  });
}

chrome.downloads.onCreated.addListener(async (downloadItem) => {
  if (!shouldCaptureDownload(downloadItem)) {
    return;
  }

  try {
    // Cancel immediately
    await chrome.downloads.cancel(downloadItem.id);
  } catch (e) {
    // Ignore cancel errors
  }

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];

    const referer = downloadItem.referrer || (tab ? tab.url : '');
    const cookies = await getCookies(downloadItem.url, tab ? tab.id : null);

    await addDownloadToAria2(downloadItem, referer, cookies);
  } catch (error) {
    console.error('Error handling download:', error);
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'ariang-download' || info.menuItemId === 'ariang-main') {
    const url = info.linkUrl;
    if (url) {
      const referer = tab ? tab.url : '';
      const cookies = await getCookies(url, tab ? tab.id : null);

      await addDownloadToAria2({
        url: url,
        id: 0
      }, referer, cookies);
    }
  } else if (info.menuItemId === 'ariang-open') {
    const protocol = settings.rpcProtocol === 'https' ? 'https' : 'http';
    let ariangUrl = `ariang/index.html#!/settings/rpc/set/${protocol}/${settings.rpcHost}/${settings.rpcPort}/jsonrpc`;
    if (settings.rpcSecret) {
      ariangUrl += '/' + btoa(settings.rpcSecret);
    }
    chrome.tabs.create({ url: ariangUrl });
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle_capture_downloads') {
    isCapturing = !isCapturing;
    const message = isCapturing
      ? chrome.i18n.getMessage('captureEnabled')
      : chrome.i18n.getMessage('captureDisabled');
    showNotification(message);
  }
});

chrome.runtime.onInstalled.addListener(() => {
  loadSettings();
  updateContextMenu();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.settings) {
    loadSettings();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getSettings') {
    sendResponse(settings);
  } else if (message.type === 'setSettings') {
    saveSettings(message.settings).then(() => sendResponse({ success: true }));
    return true;
  }
});

loadSettings();
