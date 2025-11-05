// Script to generate QR code marker for AR tracking
// Run with: node generate-qr-marker.js

import QRCode from 'qrcode';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Generate QR code with sufficient error correction and size
const outputPath = join(__dirname, 'public', 'qr-marker.png');

// Use a static URL or identifier - this will be the marker pattern
// The actual content doesn't matter much for tracking, but consistency is key
const qrData = 'AR-COLOCATION-MARKER-2024';

QRCode.toFile(
  outputPath,
  qrData,
  {
    errorCorrectionLevel: 'H', // Highest error correction for better tracking
    type: 'png',
    width: 1000, // High resolution for better tracking
    margin: 4, // White border around QR code
    color: {
      dark: '#000000', // Black squares
      light: '#FFFFFF' // White background
    }
  },
  (err) => {
    if (err) {
      console.error('Error generating QR code:', err);
    } else {
      console.log('✅ QR code marker generated successfully!');
      console.log(`📍 Location: ${outputPath}`);
      console.log('\n📋 Next steps:');
      console.log('1. Print this QR code at least 20cm x 20cm (8" x 8")');
      console.log('2. Place it on a flat surface with good lighting');
      console.log('3. Ensure it has a consistent orientation');
      console.log('4. Test AR tracking by pointing your device at it');
    }
  }
);
