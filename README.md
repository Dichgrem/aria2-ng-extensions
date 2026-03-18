# AriaNg Download Manager Extension

A browser extension that automatically intercepts downloads and sends them to your aria2 server, with AriaNg UI integrated.

## Features

- **Auto Capture Downloads**: Automatically intercept browser downloads and send them to aria2
- **AriaNg UI**: Integrated AriaNg for full download management
- **No Manual Confirmation**: Downloads are captured automatically (configurable)
- **Protocol Support**: HTTP, HTTPS, WebSocket for aria2 RPC
- **Torrent Support**: Automatically handles .torrent and .metalink files
- **Cookie & Referer Support**: Preserves cookies and referer for authenticated downloads
- **Filters**: Exclude specific protocols, sites, and file types from capture
- **Multi-language**: Support for English and Chinese
- **Manifest V3**: Modern browser extension standard

## Browser Support

- Firefox (Manifest V3) - **Recommended**
- Chrome/Chromium (Manifest V3)
- Edge (Chrome-based)
- Opera (Chrome-based)

## Requirements

- Browser with Manifest V3 support (Firefox 109+, Chrome 88+, Edge 88+)
- aria2 RPC server running (with JSON-RPC support)

## Installation

### Build from Source

```bash
# Install dependencies
bun install

# Download AriaNg
bun run download:ariang

# Build for Firefox (recommended)
bun run build:firefox

# Development mode (with watch)
bun run dev:firefox
```

### Load in Browser

**Firefox** (recommended):
1. Go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `dist/aria2-ng-extension-firefox/manifest.json`

**Chrome/Edge/Opera**:
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist/aria2-ng-extension-firefox` directory

## Quick Start

### 1. Initial Configuration

1. Click the extension icon in your browser toolbar
2. Click "Settings" to open the configuration page
3. Configure your aria2 connection:
   - **RPC Host**: Your aria2 server address (default: localhost)
   - **RPC Port**: Aria2 RPC port (default: 6800)
   - **RPC Protocol**: HTTP or HTTPS
   - **Secret Token**: Your aria2 RPC secret if configured
4. Click "Test Connection" to verify your aria2 setup
5. Click "Save Settings"

### 2. Using the Extension

**Automatic Downloads**:
Once "Auto Capture Downloads" is enabled:
1. Browse to any website
2. Click on any download link
3. The download will be automatically sent to aria2
4. You'll receive a notification when complete

**Manual Downloads**:
- **Context Menu**: Right-click on any link and select "Download with Aria2"
- **Open AriaNg**: Click the extension icon and select "Open AriaNg"
- **Toggle Auto Capture**: Press `Ctrl+Shift+D` to enable/disable auto-capture

**Managing Downloads**:
1. Click the extension icon and select "Open AriaNg"
2. AriaNg provides a full-featured download manager:
   - View all active/completed downloads
   - Pause, resume, or remove individual tasks
   - View download statistics
   - Download task history management

### Keyboard Shortcuts

- **Ctrl+Shift+D** (or **Cmd+Shift+D** on Mac): Toggle auto capture

## aria2 Configuration

### Basic Configuration

Create or edit your aria2 configuration file (typically `~/.aria2/aria2.conf`):

```ini
# Enable JSON-RPC
enable-rpc=true

# Listen on all interfaces
rpc-listen-all=true

# RPC port (default: 6800)
rpc-listen-port=6800

# Optional: set a secret token (RECOMMENDED for security)
rpc-secret=your-secret-token-here

# Additional recommended settings
max-concurrent-downloads=5
continue=true
max-connection-per-server=5
min-split-size=5M
split=10
```

### Starting aria2

```bash
# Start aria2 with your config
aria2c --conf-path=/path/to/aria2.conf

# Or start in daemon mode
aria2c --conf-path=/path/to/aria2.conf -D
```

### Verify aria2 is Running

```bash
# If no secret token
curl http://localhost:6800/jsonrpc -d '{"jsonrpc":"2.0","id":"test","method":"aria2.getVersion"}'

# With secret token
curl http://localhost:6800/jsonrpc -d '{"jsonrpc":"2.0","id":"test","method":"aria2.getVersion","params":["token:your-secret-token"]}'
```

You should see JSON output with aria2 version information.

## Troubleshooting

### Downloads Not Being Captured

- Check that "Auto Capture Downloads" is enabled in settings
- Verify aria2 is running and accessible
- Click "Test Connection" in settings to diagnose connection issues
- Ensure the download doesn't match any exclusion filters

### Can't Connect to aria2

- Verify aria2 is running: Check if aria2 process is active
- Check Host/Port/Protocol settings match your aria2 configuration
- If using a remote aria2 server, check firewall settings
- Verify the RPC secret token is correct (if configured)

### Extension Not Loading

- For Chrome/Edge: Check browser console for errors at `chrome://extensions/`
- For Firefox: Check Browser Console for errors at `Tools > Web Developer > Browser Console`
- Ensure the extension directory is correct and contains all necessary files
