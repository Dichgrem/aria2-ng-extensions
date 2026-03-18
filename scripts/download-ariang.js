#!/usr/bin/env node

// scripts/download-ariang.js - Download latest AriaNg

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.join(__dirname, '..');
const ARIANG_DIR = path.join(ROOT_DIR, 'public', 'ariang');

const ARIANG_DOWNLOAD_URL = 'https://github.com/mayswind/AriaNg/releases/download/1.3.13/AriaNg-1.3.13-AllInOne.zip';

async function downloadFile(url, dest) {
  console.log(`Downloading ${url}...`);

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);

    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, {
      headers: {
        'User-Agent': 'aria2-ng-extension'
      }
    }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        console.log(`Redirecting to ${redirectUrl}...`);
        file.close();
        fs.unlinkSync(dest);
        downloadFile(redirectUrl, dest).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Download failed with status ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log('Download completed');
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function extractZip(zipPath, destDir) {
  console.log(`Extracting ${zipPath} to ${destDir}...`);

  try {
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(destDir, true);
    console.log('Extraction completed');
  } catch (error) {
    throw new Error(`Failed to extract zip: ${error.message}`);
  }
}

async function downloadAriaNg() {
  const tempDir = path.join(ROOT_DIR, '.tmp');
  const zipPath = path.join(tempDir, 'ariang.zip');

  try {
    // Create temp directory
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Create AriaNg directory
    if (!fs.existsSync(ARIANG_DIR)) {
      fs.mkdirSync(ARIANG_DIR, { recursive: true });
    }

    // Download AriaNg
    await downloadFile(ARIANG_DOWNLOAD_URL, zipPath);

    // Extract
    await extractZip(zipPath, ARIANG_DIR);

    // Clean up
    fs.unlinkSync(zipPath);

    // Find the extracted index.html
    const files = fs.readdirSync(ARIANG_DIR);
    const indexFile = files.find(f => f.endsWith('.html'));

    if (indexFile && indexFile !== 'index.html') {
      // Rename to index.html if needed
      fs.renameSync(
        path.join(ARIANG_DIR, indexFile),
        path.join(ARIANG_DIR, 'index.html')
      );
    }

    console.log('AriaNg downloaded and integrated successfully!');
    console.log(`Files are in: ${ARIANG_DIR}`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  downloadAriaNg();
}

export default downloadAriaNg;