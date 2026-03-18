# Aria2-helper

A browser extension that automatically intercepts downloads and sends them to your aria2 server.

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
