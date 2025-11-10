# Testing Guide - Camera Kit Integration

## Prerequisites Checklist

- [ ] Snap Developer Account with Camera Kit access
- [ ] Lens Studio installed
- [ ] Node.js and npm installed
- [ ] QR code marker image (`qr-marker.png` already exists)

## Step 1: Get Camera Kit API Token

1. Go to [Snap Kit Portal](https://kit.snapchat.com/portal/)
2. Sign in with your Snap Developer account
3. Navigate to **Camera Kit** → **My Lenses**
4. Find your **API Token** (or create one if needed)
5. Copy the API token

## Step 2: Create Environment File

Create `frontend/.env.local` (this file is gitignored):

```bash
cd frontend
touch .env.local
```

Add your API token:

```env
VITE_CAMERA_KIT_API_TOKEN=your_actual_api_token_here
VITE_LENS_ID=placeholder_for_now
VITE_LENS_GROUP_ID=placeholder_for_now
```

**Note**: You'll update `VITE_LENS_ID` and `VITE_LENS_GROUP_ID` after creating your Lens.

## Step 3: Install Dependencies

```bash
cd frontend
npm install
```

This installs `@snap/camera-kit` and other dependencies.

## Step 4: Create a Basic Lens (Quick Test)

You have two options:

### Option A: Create Minimal Lens (Recommended for First Test)

1. **Open Lens Studio**
2. **Create New Lens** → Choose **World** template
3. **Add Marker Tracking**:
   - Select **Camera** object in Objects panel
   - Click **Add Component** → **Marker Tracking**
   - Import your `qr-marker.png` from `frontend/public/`
   - Set **Estimated Width** to `0.2` (20cm)
4. **Add Remote API Script**:
   - Create new script: `RemoteAPIController.lua`
   - Add basic handler (see `LENS_SETUP.md` for full script)
   - Attach to Camera object
5. **Publish Lens**:
   - Click **Publish** button
   - Fill in required metadata
   - Submit for review (or use test mode if available)
   - **Copy the Lens ID and Lens Group ID**

### Option B: Test Without Lens First (Basic Functionality)

You can test the app without a Lens to verify:
- Camera Kit initialization
- Camera access
- WebSocket connection
- Session management

The app will show warnings but won't crash.

## Step 5: Update Environment Variables

Once you have Lens ID and Lens Group ID:

```env
VITE_CAMERA_KIT_API_TOKEN=your_actual_api_token_here
VITE_LENS_ID=your_lens_id_here
VITE_LENS_GROUP_ID=your_lens_group_id_here
```

## Step 6: Start Development Server

```bash
cd frontend
npm run dev
```

The app will start on `https://localhost:5173` (or similar).

**Note**: Camera Kit requires HTTPS, so Vite will use HTTPS with a self-signed certificate. Your browser will show a security warning - click "Advanced" → "Proceed anyway" for local testing.

## Step 7: Test Basic Functionality

### Test 1: Camera Kit Initialization

1. Open browser console (F12)
2. Navigate to the app
3. Look for: `"Camera Kit initialized successfully"`
4. If you see errors, check:
   - API token is correct
   - Browser supports Camera Kit (Chrome 95+, Safari 16+)

### Test 2: Session Creation

1. Enter a name (optional)
2. Click **"Create Session"**
3. Verify:
   - Room code appears
   - WebSocket connects (check console for "WebSocket connected")
   - Participant count shows "1 participant"

### Test 3: Camera Access

1. Click **"Start AR Experience"**
2. Browser should prompt for camera permission
3. Grant permission
4. Verify:
   - Camera feed appears
   - Console shows: `"Camera source set successfully"`
   - If Lens is configured: `"Lens applied successfully"`

### Test 4: Marker Tracking (Requires Lens)

1. Print your QR code (`frontend/public/qr-marker.png`) at **20cm x 20cm**
2. Point camera at QR code
3. Verify:
   - Console shows: `"🎯 Marker tracked"`
   - If orientation marker configured: Objects appear in AR
   - Console shows: `"🎯 Marker found! Creating orientation marker via Remote API"`

### Test 5: Multiplayer (Two Devices/Browsers)

1. **Device 1**: Create session, note room code
2. **Device 2**: Join session with room code
3. **Device 1**: Start AR, find QR code
4. **Device 2**: Start AR, find QR code
5. Verify:
   - Both see same orientation marker
   - Participant count shows "2 participants"
   - Player avatars appear (if configured in Lens)

## Step 8: Debug Common Issues

### Issue: "Camera Kit API token not configured"

**Solution**: Check `frontend/.env.local` exists and has correct token

### Issue: "Failed to initialize Camera Kit"

**Solutions**:
- Verify API token is correct
- Check browser console for detailed error
- Ensure browser supports Camera Kit (Chrome 95+, Safari 16+)
- Check Content Security Policy (CSP) if deployed

### Issue: "Failed to load/apply Lens"

**Solutions**:
- Verify Lens ID and Lens Group ID are correct
- Check Lens is published and approved
- Verify Lens is in your Camera Kit account
- Check browser console for Lens loading errors

### Issue: "Marker not tracking"

**Solutions**:
- Verify QR code is printed at correct size (20cm)
- Check Lens has Marker Tracking component configured
- Ensure marker image matches the printed QR code
- Check lighting conditions
- Verify Remote API script is attached to Camera object

### Issue: "Remote API not working"

**Solutions**:
- Check Lens script has `Remote.OnMessage` handler
- Verify event listener in frontend: `addEventListener('remote-api', ...)`
- Check browser console for Remote API errors
- Ensure Lens script is properly attached

### Issue: "WebSocket connection failed"

**Solutions**:
- Check backend is running: `cd backend && npm start`
- Verify WebSocket URL in `useNetworkSync.ts`
- Check firewall/network settings
- For HTTPS frontend, ensure backend uses WSS (secure WebSocket)

## Step 9: Test Backend Connection

Make sure backend is running:

```bash
cd backend
npm install
npm start
```

Backend should start on port 8080 (or PORT from environment).

Test WebSocket connection:
```bash
# In another terminal
curl http://localhost:8080/health
```

Should return: `{"status":"ok","timestamp":...}`

## Step 10: Full Integration Test

### Test Sequence:

1. **Backend Running**: ✅
2. **Frontend Running**: ✅
3. **Create Session**: ✅
4. **Start AR**: ✅
5. **Camera Access**: ✅
6. **Lens Loads**: ✅ (if configured)
7. **Marker Tracking**: ✅ (if Lens configured)
8. **Multiplayer Sync**: ✅ (test with 2 devices)

## Quick Test Script

Run this to verify setup:

```bash
# Check dependencies
cd frontend && npm list @snap/camera-kit

# Check environment file exists
test -f frontend/.env.local && echo "✅ .env.local exists" || echo "❌ Create .env.local"

# Check backend
cd ../backend && npm list ws

# Build frontend (catches TypeScript errors)
cd ../frontend && npm run build
```

## Testing Checklist

- [ ] API token configured
- [ ] Dependencies installed
- [ ] Frontend builds without errors
- [ ] Backend starts successfully
- [ ] Camera Kit initializes
- [ ] Camera access works
- [ ] WebSocket connects
- [ ] Session creation works
- [ ] Session joining works
- [ ] Lens loads (if configured)
- [ ] Marker tracking works (if Lens configured)
- [ ] Multiplayer sync works (2+ devices)

## Next Steps After Basic Testing

1. **Create Full Lens**: Follow `LENS_SETUP.md` to create complete Lens with:
   - Orientation marker (cube + cone)
   - Player avatars
   - Object creation support
   - Remote API handlers

2. **Deploy to Production**:
   - Configure CSP headers on Vercel
   - Set environment variables in Vercel dashboard
   - Deploy backend to DigitalOcean

3. **Test on Mobile**:
   - Deploy to Vercel
   - Test on iOS Safari 16+ or Android Chrome 95+
   - Verify marker tracking on mobile

## Resources

- **Camera Kit Docs**: https://developers.snap.com/camera-kit/integrate-sdk/web/web-configuration
- **Lens Studio Docs**: https://docs.snap.com/lens-studio/
- **Remote API Guide**: See `LENS_SETUP.md`
- **Architecture**: See `ARCHITECTURE.md`

## Need Help?

Check browser console for detailed error messages. Most issues will show helpful error messages there.

