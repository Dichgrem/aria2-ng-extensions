// Simple script to create placeholder icons

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [16, 48, 128];

sizes.forEach(size => {
  const iconPath = path.join(__dirname, '../public/icons', `icon-${size}.svg`);
  
  // Create a simple SVG icon
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" rx="${size * 0.1875}" fill="url(#grad)"/>
    <text x="${size/2}" y="${size * 0.65}" font-family="Arial, sans-serif" font-size="${size * 0.35}" font-weight="bold" fill="white" text-anchor="middle">A2</text>
  </svg>`;

  fs.writeFileSync(iconPath, svg);
  console.log(`Created ${iconPath}`);
});

console.log('\nNote: For production, convert SVG files to PNG format.');
console.log('SVG icons are supported by most modern browsers.');
