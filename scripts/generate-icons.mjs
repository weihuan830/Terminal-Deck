import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const assetsDir = path.join(__dirname, '..', 'assets', 'icons');
const svgPath = path.join(assetsDir, 'icon.svg');

async function generateIcons() {
  console.log('Generating icons...');

  // Read SVG
  const svgBuffer = fs.readFileSync(svgPath);

  // Generate PNG at 256x256
  const png256 = await sharp(svgBuffer)
    .resize(256, 256)
    .png()
    .toBuffer();

  const png256Path = path.join(assetsDir, 'icon-256.png');
  fs.writeFileSync(png256Path, png256);
  console.log('Created icon-256.png');

  // Generate multiple sizes for ICO
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngBuffers = [];

  for (const size of sizes) {
    const pngBuffer = await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toBuffer();
    pngBuffers.push(pngBuffer);

    // Also save individual PNGs
    const pngPath = path.join(assetsDir, `icon-${size}.png`);
    fs.writeFileSync(pngPath, pngBuffer);
    console.log(`Created icon-${size}.png`);
  }

  // Generate ICO from PNG buffers
  const icoBuffer = await pngToIco(pngBuffers);
  const icoPath = path.join(assetsDir, 'icon.ico');
  fs.writeFileSync(icoPath, icoBuffer);
  console.log('Created icon.ico');

  // Copy 256 as main icon.png for Linux
  fs.copyFileSync(png256Path, path.join(assetsDir, 'icon.png'));
  console.log('Created icon.png');

  console.log('\nAll icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
