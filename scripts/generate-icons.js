const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgFile = path.join(__dirname, '../assets/swiclogo.svg');

async function generate() {
  console.log('Reading SVG:', svgFile);
  
  const svgBuffer = fs.readFileSync(svgFile);

  // 1. App Icon (1024x1024) - Centered with padding
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 13, g: 27, b: 42, alpha: 1 } // #0D1B2A
    }
  })
  .composite([
    {
      input: svgBuffer,
      gravity: 'center'
    }
  ])
  .png()
  .toFile(path.join(__dirname, '../assets/icon.png'));
  console.log('Created icon.png');

  // 2. Splash Icon (1242x2436, but let's just make the logo itself bigger for Expo's contain resizeMode)
  await sharp(svgBuffer)
    .resize(800) // Much larger for splash
    .png()
    .toFile(path.join(__dirname, '../assets/splash-icon.png'));
  console.log('Created splash-icon.png');

  // 3. Android Adaptive Foreground (108x108 in scale, actually Expo likes 1024x1024 with transparent bg)
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
  .composite([
    {
      input: svgBuffer,
      gravity: 'center'
    }
  ])
  .png()
  .toFile(path.join(__dirname, '../assets/android-icon-foreground.png'));
  console.log('Created android-icon-foreground.png');

  // 4. Android Adaptive Background
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 13, g: 27, b: 42, alpha: 1 } // #0D1B2A
    }
  })
  .png()
  .toFile(path.join(__dirname, '../assets/android-icon-background.png'));
  console.log('Created android-icon-background.png');

}

generate().catch(console.error);
