#!/usr/bin/env bun

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';

const ROOT_DIR = path.join(import.meta.dir, '..');
const ARIANG_DIR = path.join(ROOT_DIR, 'public', 'ariang');

const ARIANG_DOWNLOAD_URL = 'https://github.com/mayswind/AriaNg/releases/download/1.3.13/AriaNg-1.3.13.zip';

async function downloadFile(url: string, dest: string): Promise<void> {
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
        if (!redirectUrl) {
          reject(new Error('No redirect location found'));
          return;
        }
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

async function extractZip(zipPath: string, destDir: string): Promise<void> {
  console.log(`Extracting ${zipPath} to ${destDir}...`);

  const { default: AdmZip } = await import('adm-zip');

  try {
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(destDir, true);
    console.log('Extraction completed');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to extract zip: ${message}`);
  }
}

async function downloadAriaNg(): Promise<void> {
  const tempDir = path.join(ROOT_DIR, '.tmp');
  const zipPath = path.join(tempDir, 'ariang.zip');

  try {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    if (!fs.existsSync(ARIANG_DIR)) {
      fs.mkdirSync(ARIANG_DIR, { recursive: true });
    }

    await downloadFile(ARIANG_DOWNLOAD_URL, zipPath);

    await extractZip(zipPath, ARIANG_DIR);

    fs.unlinkSync(zipPath);

    const files = fs.readdirSync(ARIANG_DIR);
    const indexFile = files.find(f => f.endsWith('.html'));

    if (indexFile && indexFile !== 'index.html') {
      fs.renameSync(
        path.join(ARIANG_DIR, indexFile),
        path.join(ARIANG_DIR, 'index.html')
      );
    }

    console.log('AriaNg downloaded and integrated successfully!');
    console.log(`Files are in: ${ARIANG_DIR}`);

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error:', message);
    process.exit(1);
  }
}

downloadAriaNg();
