# QR Code Marker Instructions

## 📱 QR Code Details

The QR code marker (`frontend/public/qr-marker.png`) is now configured to:

- **URL**: https://web-ar-colocation.vercel.app/
- **Size**: 512x512 pixels
- **Error Correction**: High (Level H) - better for AR tracking
- **Margin**: 10 pixels

## 🖨️ Printing Instructions

1. **Print Size**: Print at approximately **20cm x 20cm** (8" x 8")
2. **Material**: Use matte paper (reduces glare)
3. **Placement**: Place on a flat surface with good lighting
4. **Measurement**: After printing, **measure the actual size** of the QR code

## ⚙️ Configuring Physical Size

If your printed QR code is NOT 20cm:

1. Open `frontend/src/App.vue`
2. Find line ~83: `const qrPhysicalSize = 0.2;`
3. Update to your actual size in meters (e.g., 0.15 for 15cm)

```javascript
const qrPhysicalSize = 0.15; // 15cm - MEASURE YOUR ACTUAL QR CODE SIZE
```

This is critical for accurate 6DOF pose estimation!

## 🎯 How It Works

1. **User scans QR code** with their camera (or manually navigates to the URL)
2. **QR code serves dual purpose**:
   - Acts as a **clickable link** to launch the app
   - Acts as an **AR tracking marker** for spatial anchoring
3. **WebXR Image Tracking** detects the QR code in AR mode
4. **PnP algorithm** extracts full 6DOF pose (position + rotation)
5. **All 3D objects** are anchored relative to the QR code
6. **Multiple users** see the same objects in the same physical location

## 🔍 Visual Markers in AR

When the QR code is detected, you'll see:

1. **Green sphere** - Marks the exact center of the QR code (world origin)
2. **Blue cube + yellow cone** - Orientation marker 15cm above QR
   - Blue cube: main marker
   - Yellow cone: points in +Z direction (forward)
3. **Pink sphere + yellow cone** - Other players' avatars
   - Pink sphere: player's head position
   - Yellow cone: direction they're facing
   - Gray base: ground position marker

## 🧪 Testing

1. Print the QR code
2. Open https://web-ar-colocation.vercel.app/ on an AR-capable device
3. Create or join a room
4. Tap "Start AR Experience"
5. Point camera at the QR code
6. When detected, you'll see the orientation marker appear

## 📐 Coordinate System

- **Origin**: Center of QR code
- **+Y**: Up (perpendicular to QR surface)
- **+Z**: Forward (yellow cone direction)
- **+X**: Right (when facing +Z)

## 🔧 Troubleshooting

**QR not detecting:**
- Ensure good lighting
- Keep camera steady
- Try moving closer/further
- Check QR isn't reflective or distorted

**Objects at wrong distance:**
- Measure and update `qrPhysicalSize` in code
- Rebuild and redeploy

**QR link not working:**
- Verify URL: https://web-ar-colocation.vercel.app/
- Check QR code image is not corrupted
- Try regenerating with: `curl -o frontend/public/qr-marker.png "https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=https://web-ar-colocation.vercel.app/&format=png&margin=10&ecc=H"`

