#!/usr/bin/env node

// scripts/build.js - Build script for aria2-ng-extension

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

const BUILD_CONFIG = {
  firefox: {
    name: 'aria2-ng-extension-firefox',
    manifest: 'manifest.json'
  },
  chrome: {
    name: 'aria2-ng-extension-chrome',
    manifest: 'manifest.json'
  }
};

function copyFile(src, dest) {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
}

function copyDirectory(src, dest, ignores = ['.DS_Store', 'Thumbs.db']) {
  if (!fs.existsSync(src)) {
    return;
  }

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const files = fs.readdirSync(src);

  files.forEach(file => {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);

    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      copyDirectory(srcPath, destPath, ignores);
    } else if (!ignores.includes(file)) {
      copyFile(srcPath, destPath);
    }
  });
}

function createZip(sourceDir, outputFile) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputFile);
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    output.on('close', () => {
      console.log(`Created ${outputFile}: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
      resolve();
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

async function build(browser) {
  console.log(`Building for ${browser}...`);

  const config = BUILD_CONFIG[browser];
  const buildDir = path.join(DIST_DIR, config.name);

  // Clear build directory
  if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, { recursive: true });
  }
  fs.mkdirSync(buildDir, { recursive: true });

  // Copy manifest
  copyFile(
    path.join(ROOT_DIR, 'manifest.json'),
    path.join(buildDir, 'manifest.json')
  );

  // Copy background script
  copyDirectory(
    path.join(ROOT_DIR, 'src', 'background'),
    path.join(buildDir)
  );

  // Copy content script
  copyDirectory(
    path.join(ROOT_DIR, 'src', 'content'),
    path.join(buildDir)
  );

  // Copy public files
  copyDirectory(
    path.join(ROOT_DIR, 'public'),
    path.join(buildDir)
  );

  // Replace chrome with browser for Firefox
  if (browser === 'firefox') {
    const jsFiles = [
      'background.js',
      'content.js',
      'options.js',
      'popup.js'
    ];

    jsFiles.forEach(file => {
      const srcPath = path.join(buildDir, file);
      if (fs.existsSync(srcPath)) {
        let content = fs.readFileSync(srcPath, 'utf8');
        content = content.replace(/chrome\./g, 'browser.');
        fs.writeFileSync(srcPath, content);
      }
    });
  }

  // Create zip file
  const zipFile = path.join(DIST_DIR, `${config.name}.zip`);
  await createZip(buildDir, zipFile);

  console.log(`Build completed for ${browser}!`);
  console.log(`Extension files: ${buildDir}`);
  console.log(`Zip file: ${zipFile}`);
}

async function main() {
  const args = process.argv.slice(2);
  const browser = args[0];

  if (!BUILD_CONFIG[browser]) {
    console.error(`Unknown browser: ${browser}`);
    console.error(`Available browsers: ${Object.keys(BUILD_CONFIG).join(', ')}`);
    process.exit(1);
  }

  await build(browser);
}

main().catch(error => {
  console.error('Build error:', error);
  process.exit(1);
});
