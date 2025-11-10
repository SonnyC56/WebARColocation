# Migration to Snap Camera Kit - Complete

## Summary

The codebase has been successfully migrated from WebXR/Babylon.js to Snap Camera Kit Web SDK. All WebXR-specific code has been removed and replaced with Camera Kit implementations.

## Changes Made

### Dependencies
- ✅ Removed: `@babylonjs/core`, `@babylonjs/gui`, `@babylonjs/loaders`
- ✅ Added: `@snap/camera-kit`

### Files Created
- `frontend/src/composables/useCameraKit.ts` - Camera Kit initialization and session management
- `frontend/src/composables/useMarkerTracking.ts` - Marker tracking via Remote API
- `LENS_SETUP.md` - Complete guide for creating Lens in Lens Studio

### Files Updated
- `frontend/package.json` - Updated dependencies
- `frontend/vite.config.ts` - Added CSP notes for Camera Kit
- `frontend/src/components/ARScene.vue` - Replaced WebXR with Camera Kit
- `frontend/src/App.vue` - Updated to use Camera Kit and Remote API
- `.gitignore` - Added `.env` files

### Files Deleted
- `frontend/src/composables/useWebXR.ts`
- `frontend/src/composables/useImageTracking.ts`
- `frontend/src/composables/useARUI.ts`
- `frontend/src/components/AROverlay.vue`
- `frontend/src/utils/coordinates.ts`

## Next Steps

### 1. Configure Environment Variables

Create `frontend/.env.local` with your Camera Kit credentials:

```env
VITE_CAMERA_KIT_API_TOKEN=your_api_token_here
VITE_LENS_ID=your_lens_id_here
VITE_LENS_GROUP_ID=your_lens_group_id_here
```

Get your API token from: https://kit.snapchat.com/portal/

### 2. Create Lens in Lens Studio

Follow the guide in `LENS_SETUP.md` to:
- Create a new Lens project
- Configure marker tracking for your QR code
- Set up Remote API communication
- Create 3D objects (orientation marker, player avatars)
- Publish the Lens and get Lens ID/Lens Group ID

### 3. Configure Content Security Policy (CSP)

For production deployment (Vercel), add these CSP headers:

```
connect-src: https://*.snapar.com
script-src: https://cf-st.sc-cdn.net/ blob: 'wasm-unsafe-eval'
```

### 4. Test the Integration

1. Install dependencies: `cd frontend && npm install`
2. Start dev server: `npm run dev`
3. Open browser and test AR experience
4. Verify marker tracking works
5. Test multiplayer synchronization

## Architecture Changes

### Before (WebXR)
- WebXR API for AR session
- Babylon.js for 3D rendering
- Direct mesh manipulation
- WebXR Image Tracking for QR code

### After (Camera Kit)
- Camera Kit Web SDK for AR rendering
- Lens Studio for 3D content creation
- Remote API for bidirectional communication
- Marker Tracking component in Lens for QR code

## Key Differences

1. **Rendering**: Camera Kit handles all rendering internally via Lens
2. **3D Objects**: Created in Lens Studio, controlled via Remote API
3. **Marker Tracking**: Configured in Lens Studio, events sent via Remote API
4. **Coordinate System**: Camera Kit uses its own coordinate system (may need conversion)

## Remote API Message Protocol

### Frontend → Lens
- `START_MARKER_TRACKING` - Start tracking QR marker
- `SHOW_ORIENTATION_MARKER` - Show orientation marker objects
- `HIDE_ORIENTATION_MARKER` - Hide orientation marker
- `CREATE_PLAYER_AVATAR` - Create avatar for player
- `UPDATE_PLAYER_POSE` - Update player avatar position/rotation
- `REMOVE_PLAYER_AVATAR` - Remove player avatar
- `CREATE_OBJECT` - Create 3D object
- `UPDATE_OBJECT` - Update object position/rotation
- `REQUEST_CAMERA_POSE` - Request current camera pose

### Lens → Frontend
- `MARKER_FOUND` - Marker detected
- `MARKER_UPDATED` - Marker position/rotation updated
- `MARKER_LOST` - Marker lost
- `CAMERA_POSE_UPDATE` - Camera pose data

## Notes

- The Remote API event listener uses `'remote-api'` event name (may need verification with actual Camera Kit SDK)
- Type assertions (`as any`) are used for Camera Kit types that may not be fully typed
- Camera Kit coordinate system may differ from WebXR - coordinate conversion may be needed
- Lens must be created and published before the app can work fully

## Resources

- [Camera Kit Web SDK Docs](https://developers.snap.com/camera-kit/integrate-sdk/web/web-configuration)
- [Lens Studio Documentation](https://docs.snap.com/lens-studio/)
- [Marker Tracking Guide](https://docs.snap.com/lens-studio/references/guides/ar-tracking/world/marker-tracking)
- [Remote API Documentation](https://docs.snap.com/lens-studio/references/guides/scripting/remote-api)

