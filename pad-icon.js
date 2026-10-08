import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function padIcon() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  const tempPath = path.join(__dirname, 'assets', 'icon_temp.png');
  
  try {
    // Resize the image to be smaller (e.g., 70% of 1024 = 716) and place it on a transparent 1024x1024 background
    await sharp(iconPath)
      .resize(716, 716, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .extend({
        top: 154,
        bottom: 154,
        left: 154,
        right: 154,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toFile(tempPath);
      
    // Overwrite original
    import('fs').then(fs => {
        fs.renameSync(tempPath, iconPath);
        console.log('Icon padded successfully!');
    });
  } catch (error) {
    console.error('Error padding icon:', error);
  }
}

padIcon();
