const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createIco(srcPath, destPath) {
  const sizes = [16, 32, 48];
  const pngBuffers = await Promise.all(
    sizes.map((s) => sharp(srcPath).resize(s, s, { fit: 'cover' }).png().toBuffer())
  );

  // Header: 6 bytes
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = ICO
  header.writeUInt16LE(sizes.length, 4); // count

  const entries = [];
  let offset = 6 + sizes.length * 16;

  for (let i = 0; i < sizes.length; i++) {
    const s = sizes[i];
    const buf = pngBuffers[i];
    const entry = Buffer.alloc(16);
    entry.writeUInt8(s === 256 ? 0 : s, 0);
    entry.writeUInt8(s === 256 ? 0 : s, 1);
    entry.writeUInt8(0, 2); // color palette count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(buf.length, 8); // size
    entry.writeUInt32LE(offset, 12); // offset
    entries.push(entry);
    offset += buf.length;
  }

  const finalIco = Buffer.concat([header, ...entries, ...pngBuffers]);
  fs.writeFileSync(destPath, finalIco);
}

async function findSourceLogo(explicitPath) {
  if (explicitPath && fs.existsSync(explicitPath)) {
    return explicitPath;
  }

  const rootDir = path.join(__dirname, '..');
  const uploadsDir = path.join(rootDir, 'public', 'uploads');

  // Try reading from MongoDB setting first
  try {
    const envFile = path.join(rootDir, '.env');
    if (fs.existsSync(envFile)) {
      const envText = fs.readFileSync(envFile, 'utf8');
      const line = envText.split('\n').find((l) => l.startsWith('MONGODB_URI='));
      if (line) {
        const uri = line.substring(line.indexOf('=') + 1).trim();
        const mongoose = require('mongoose');
        const conn = await mongoose.createConnection(uri).asPromise();
        const SettingModel = conn.model('Setting', new mongoose.Schema({ key: String, value: mongoose.Schema.Types.Mixed }));
        const doc = await SettingModel.findOne({ key: 'theme_settings' });
        await conn.close();

        const candidateUrl = doc?.value?.pageTitles?.faviconUrl || doc?.value?.pageTitles?.logoUrl;
        if (candidateUrl) {
          const cleanRel = candidateUrl.replace(/^\//, '');
          const abs = path.join(rootDir, 'public', cleanRel);
          if (fs.existsSync(abs)) {
            console.log('Found source logo from theme_settings:', candidateUrl);
            return abs;
          }
        }
      }
    }
  } catch (dbErr) {
    console.warn('Could not read from MongoDB setting directly:', dbErr.message);
  }

  // Fallback: look for 1792208205278-123456789.jpg or latest 1024x1024 in public/uploads
  if (fs.existsSync(uploadsDir)) {
    const target = path.join(uploadsDir, '1792208205278-123456789.jpg');
    if (fs.existsSync(target)) {
      return target;
    }
    const files = fs.readdirSync(uploadsDir).filter((f) => f.endsWith('.jpg') || f.endsWith('.png'));
    if (files.length > 0) {
      files.sort((a, b) => b.localeCompare(a));
      return path.join(uploadsDir, files[0]);
    }
  }

  return null;
}

async function generateIcons(customSourcePath) {
  const rootDir = path.join(__dirname, '..');
  const pubDir = path.join(rootDir, 'public');
  const appDir = path.join(rootDir, 'src', 'app');

  const source = await findSourceLogo(customSourcePath);
  if (!source || !fs.existsSync(source)) {
    console.error('Source logo not found for PWA icon generation');
    return false;
  }

  console.log('Generating PWA & Favicon assets from:', source);

  // 1. icon-192.png
  await sharp(source)
    .resize(192, 192, { fit: 'cover' })
    .png()
    .toFile(path.join(pubDir, 'icon-192.png'));
  console.log('✓ Created public/icon-192.png');

  // 2. icon-512.png
  await sharp(source)
    .resize(512, 512, { fit: 'cover' })
    .png()
    .toFile(path.join(pubDir, 'icon-512.png'));
  console.log('✓ Created public/icon-512.png');

  // 3. icon-maskable.png (with 10% padding for Android adaptive icons safe zone)
  const innerSize = Math.round(512 * 0.8);
  const padding = Math.round((512 - innerSize) / 2);
  const resizedInner = await sharp(source)
    .resize(innerSize, innerSize, { fit: 'contain', background: { r: 9, g: 10, b: 15, alpha: 1 } })
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 9, g: 10, b: 15, alpha: 1 },
    },
  })
    .composite([{ input: resizedInner, top: padding, left: padding }])
    .png()
    .toFile(path.join(pubDir, 'icon-maskable.png'));
  console.log('✓ Created public/icon-maskable.png');

  // 4. apple-touch-icon.png (180x180)
  await sharp(source)
    .resize(180, 180, { fit: 'cover' })
    .png()
    .toFile(path.join(pubDir, 'apple-touch-icon.png'));
  console.log('✓ Created public/apple-touch-icon.png');

  // 5. favicon-32x32.png and favicon-16x16.png
  await sharp(source)
    .resize(32, 32, { fit: 'cover' })
    .png()
    .toFile(path.join(pubDir, 'favicon-32x32.png'));
  console.log('✓ Created public/favicon-32x32.png');

  await sharp(source)
    .resize(16, 16, { fit: 'cover' })
    .png()
    .toFile(path.join(pubDir, 'favicon-16x16.png'));
  console.log('✓ Created public/favicon-16x16.png');

  // 6. Multi-resolution favicon.ico for public/
  await createIco(source, path.join(pubDir, 'favicon.ico'));
  console.log('✓ Created public/favicon.ico');

  console.log('All PWA & Favicon assets successfully generated!');
  return true;
}

if (require.main === module) {
  const arg = process.argv[2];
  generateIcons(arg).catch(console.error);
}

module.exports = { generateIcons, createIco };
