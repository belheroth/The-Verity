const fs = require('fs');
const path = require('path');

function createIcoFromPngs(pngFiles, outputPath) {
  const pngBuffers = pngFiles.map(file => {
    const buffer = fs.readFileSync(file.path);
    return {
      width: file.width,
      height: file.height,
      buffer
    };
  });

  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const totalHeaderSize = headerSize + count * dirEntrySize;

  let currentOffset = totalHeaderSize;
  const dirEntries = [];

  for (const item of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(item.width >= 256 ? 0 : item.width, 0);   // width (0 = 256)
    entry.writeUInt8(item.height >= 256 ? 0 : item.height, 1); // height (0 = 256)
    entry.writeUInt8(0, 2);                                   // color count (0 = >= 8bpp)
    entry.writeUInt8(0, 3);                                   // reserved
    entry.writeUInt16LE(1, 4);                                // color planes
    entry.writeUInt16LE(32, 6);                               // bits per pixel
    entry.writeUInt32LE(item.buffer.length, 8);               // image data size
    entry.writeUInt32LE(currentOffset, 12);                   // offset
    dirEntries.push(entry);
    currentOffset += item.buffer.length;
  }

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);     // reserved (must be 0)
  header.writeUInt16LE(1, 2);     // resource type: 1 = ICO
  header.writeUInt16LE(count, 4); // number of images

  const finalBuffer = Buffer.concat([
    header,
    ...dirEntries,
    ...pngBuffers.map(p => p.buffer)
  ]);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, finalBuffer);
  console.log(`Created ICO: ${outputPath} (${finalBuffer.length} bytes, ${count} frames)`);
}

const assetsDir = path.join(__dirname, '..', 'electron', 'assets');
const buildDir = path.join(__dirname, '..', 'build');
const frontendPublic = path.join(__dirname, '..', 'frontend', 'public');

const iconSizes = [
  { width: 256, height: 256, path: path.join(assetsDir, 'icon-256.png') },
  { width: 128, height: 128, path: path.join(assetsDir, 'icon-128.png') },
  { width: 64, height: 64, path: path.join(assetsDir, 'icon-64.png') },
  { width: 48, height: 48, path: path.join(assetsDir, 'icon-48.png') },
  { width: 32, height: 32, path: path.join(assetsDir, 'icon-32.png') },
  { width: 16, height: 16, path: path.join(assetsDir, 'icon-16.png') },
];

createIcoFromPngs(iconSizes, path.join(assetsDir, 'icon.ico'));
createIcoFromPngs(iconSizes, path.join(buildDir, 'icon.ico'));
createIcoFromPngs(
  iconSizes.filter(s => s.width <= 64),
  path.join(frontendPublic, 'favicon.ico')
);

// Create crisp, scalable SVG favicon for modern browsers and tabs
const svgFavicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="100%" height="100%">
  <defs>
    <linearGradient id="vGrad" x1="20%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%" stop-color="#34d399" />
      <stop offset="50%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#047857" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000000" flood-opacity="0.45" />
      <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#10b981" flood-opacity="0.4" />
    </filter>
  </defs>
  <text x="60" y="103" 
        text-anchor="middle" 
        font-family="Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
        font-weight="900" 
        font-style="italic" 
        font-size="116" 
        fill="url(#vGrad)"
        filter="url(#glow)">V</text>
</svg>`;

fs.writeFileSync(path.join(frontendPublic, 'favicon.svg'), svgFavicon, 'utf-8');
console.log('Created SVG favicon in frontend/public/favicon.svg');
