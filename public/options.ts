interface Settings {
  rpcHost: string;
  rpcPort: number;
  rpcProtocol: string;
  rpcSecret: string;
  showNotifications: boolean;
}

const defaultSettings: Settings = {
  rpcHost: 'localhost',
  rpcPort: 6800,
  rpcProtocol: 'http',
  rpcSecret: '',
  showNotifications: true
};

const getEl = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

async function loadSettings(): Promise<void> {
  const stored = await chrome.storage.local.get('settings');
  const settings: Settings = stored.settings ? { ...defaultSettings, ...stored.settings } : defaultSettings;

  getEl<HTMLInputElement>('rpcHost').value = settings.rpcHost;
  getEl<HTMLInputElement>('rpcPort').value = settings.rpcPort.toString();
  getEl<HTMLSelectElement>('rpcProtocol').value = settings.rpcProtocol;
  getEl<HTMLInputElement>('rpcSecret').value = settings.rpcSecret || '';
  getEl<HTMLInputElement>('showNotifications').checked = settings.showNotifications;

  testConnection();
}

async function saveSettings(): Promise<void> {
  const settings: Settings = {
    rpcHost: getEl<HTMLInputElement>('rpcHost').value.trim() || 'localhost',
    rpcPort: parseInt(getEl<HTMLInputElement>('rpcPort').value) || 6800,
    rpcProtocol: getEl<HTMLSelectElement>('rpcProtocol').value,
    rpcSecret: getEl<HTMLInputElement>('rpcSecret').value,
    showNotifications: getEl<HTMLInputElement>('showNotifications').checked
  };

  try {
    await chrome.storage.local.set({ settings });
    showStatus('Settings saved successfully!', 'success');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    showStatus('Failed to save settings: ' + message, 'error');
  }
}

async function testConnection(): Promise<void> {
  const rpcHost = getEl<HTMLInputElement>('rpcHost').value.trim() || 'localhost';
  const rpcPort = getEl<HTMLInputElement>('rpcPort').value || '6800';
  const rpcProtocol = getEl<HTMLSelectElement>('rpcProtocol').value;
  const rpcSecret = getEl<HTMLInputElement>('rpcSecret').value;

  const connectionStatus = getEl<HTMLDivElement>('connectionStatus');
  connectionStatus.textContent = 'Connecting...';
  connectionStatus.className = 'connection-status';

  try {
    const httpProtocol = rpcProtocol === 'https' ? 'https' : 'http';
    const rpcUrl = `${httpProtocol}://${rpcHost}:${rpcPort}/jsonrpc`;

    const rpcParams = rpcSecret ? ['token:' + rpcSecret] : [];
    
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', rpcUrl, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.timeout = 10000;
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.error) {
              reject(new Error(data.error.message));
            } else {
              resolve();
            }
          } catch (e) {
            reject(new Error('Invalid response'));
          }
        } else {
          reject(new Error('HTTP ' + xhr.status));
        }
      };
      
      xhr.onerror = () => reject(new Error('Connection failed'));
      xhr.ontimeout = () => reject(new Error('Connection timeout'));
      
      xhr.send(JSON.stringify({
        jsonrpc: '2.0',
        id: 'test-' + Date.now(),
        method: 'aria2.getVersion',
        params: rpcParams
      }));
    });

    connectionStatus.textContent = 'Connected';
    connectionStatus.className = 'connection-status connected';
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    connectionStatus.textContent = 'Failed: ' + message;
    connectionStatus.className = 'connection-status';
  }
}

function showStatus(message: string, type: string): void {
  const status = getEl<HTMLDivElement>('status');
  status.textContent = message;
  status.className = 'status ' + type;
  status.style.display = 'block';

  setTimeout(() => {
    status.style.display = 'none';
  }, 3000);
}

getEl<HTMLButtonElement>('saveSettings').addEventListener('click', saveSettings);
getEl<HTMLButtonElement>('testConnection').addEventListener('click', testConnection);

loadSettings();

export {};
