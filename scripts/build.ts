#!/usr/bin/env bun

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as esbuild from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

const BUILD_CONFIG: Record<string, { name: string; manifest: string }> = {
  firefox: {
    name: 'aria2-helper-firefox',
    manifest: 'manifest.json'
  },
  chrome: {
    name: 'aria2-helper-chrome',
    manifest: 'manifest.json'
  }
};

function copyFile(src: string, dest: string): void {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
}

function copyDirectory(src: string, dest: string, ignores: string[] = ['.DS_Store', 'Thumbs.db']): void {
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
    } else {
      const shouldIgnore = ignores.some(ign => file.endsWith(ign));
      if (!shouldIgnore) {
        copyFile(srcPath, destPath);
      }
    }
  });
}

async function compileTypeScript(): Promise<void> {
  const tsFiles = [
    { src: 'src/background/background.ts', out: 'dist/background.js', target: 'esnext' },
    { src: 'src/content/content.ts', out: 'dist/content.js', target: 'esnext' },
    { src: 'public/options.ts', out: 'dist/options.js', target: 'esnext' },
    { src: 'public/popup.ts', out: 'dist/popup.js', target: 'esnext' }
  ];

  await Promise.all(
    tsFiles.map(async ({ src, out, target }) => {
      const srcPath = path.join(ROOT_DIR, src);
      const outPath = path.join(ROOT_DIR, out);

      if (!fs.existsSync(path.dirname(outPath))) {
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
      }

      await esbuild.build({
        entryPoints: [srcPath],
        bundle: true,
        outfile: outPath,
        platform: 'browser',
        target: target,
        format: 'iife',
        minify: false,
        sourcemap: false
      });

      console.log(`Compiled: ${src} -> ${out}`);
    })
  );
}

async function createZip(sourceDir: string, outputFile: string): Promise<void> {
  const { createWriteStream } = await import('fs');
  const archiver = (await import('archiver')).default;

  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputFile);
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    output.on('close', () => {
      console.log(`Created ${outputFile}: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
      resolve();
    });

    archive.on('error', (err: Error) => {
      reject(err);
    });

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

async function build(browser: string): Promise<void> {
  console.log(`Building for ${browser}...`);

  const config = BUILD_CONFIG[browser];
  if (!config) {
    throw new Error(`Unknown browser: ${browser}`);
  }

  const buildDir = path.join(DIST_DIR, config.name);

  if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, { recursive: true });
  }
  fs.mkdirSync(buildDir, { recursive: true });

  console.log('Compiling TypeScript...');
  await compileTypeScript();

  copyFile(
    path.join(ROOT_DIR, 'manifest.json'),
    path.join(buildDir, 'manifest.json')
  );

  copyFile(
    path.join(ROOT_DIR, 'dist', 'background.js'),
    path.join(buildDir, 'background.js')
  );

  copyFile(
    path.join(ROOT_DIR, 'dist', 'content.js'),
    path.join(buildDir, 'content.js')
  );

  copyDirectory(
    path.join(ROOT_DIR, 'public'),
    path.join(buildDir),
    ['.ts']
  );

  copyFile(
    path.join(ROOT_DIR, 'dist', 'options.js'),
    path.join(buildDir, 'options.js')
  );

  copyFile(
    path.join(ROOT_DIR, 'dist', 'popup.js'),
    path.join(buildDir, 'popup.js')
  );

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

  const zipFile = path.join(DIST_DIR, `${config.name}.zip`);
  await createZip(buildDir, zipFile);

  console.log(`Build completed for ${browser}!`);
  console.log(`Extension files: ${buildDir}`);
  console.log(`Zip file: ${zipFile}`);

  const jsFiles = ['background.js', 'content.js', 'options.js', 'popup.js'];
  jsFiles.forEach(file => {
    const jsPath = path.join(ROOT_DIR, 'dist', file);
    if (fs.existsSync(jsPath)) {
      fs.unlinkSync(jsPath);
    }
  });
}

async function main(): Promise<void> {
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
