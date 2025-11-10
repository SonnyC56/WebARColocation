# Lens Studio Setup Guide

This guide explains how to create a Lens in Lens Studio that supports marker tracking and Remote API communication for the co-located AR experience.

## Prerequisites

1. **Lens Studio** installed (download from [lensstudio.snapchat.com](https://lensstudio.snapchat.com))
2. **Snap Developer Account** with Camera Kit access
3. **QR Marker Image** (`qr-marker.png`) - already in `frontend/public/`

## Step 1: Create New Lens Project

1. Open Lens Studio
2. Create a new Lens project
3. Choose "World" template (for back camera AR)

## Step 2: Configure Marker Tracking

### Add Marker Tracking Component

1. In the **Objects Panel**, select the **Camera** object
2. In the **Inspector Panel**, click **Add Component**
3. Select **Marker Tracking** component
4. Configure the marker:
   - **Marker Image**: Import your `qr-marker.png` file
   - **Estimated Width**: Set to `0.2` (20cm) - match your printed QR size
   - **Tracking Mode**: Set to "Continuous" for real-time tracking

### Set Up Marker Tracking Script

Create a new script to handle marker tracking events:

1. In **Resources Panel**, right-click → **New** → **Script**
2. Name it `MarkerTrackingController`
3. Add this script to the **Camera** object

**Script Template:**

```lua
-- MarkerTrackingController.lua
local MarkerTracking = require('MarkerTracking')

local markerTracking = MarkerTracking:Create()
local marker = markerTracking:GetMarker(0) -- First marker

-- Track when marker is found
marker:OnFound(function()
    print("Marker found!")
    -- Send event to frontend via Remote API
    local remoteApi = require('Remote')
    remoteApi:Send({
        type = "MARKER_FOUND",
        position = {0, 0, 0}, -- Will be updated with actual transform
        rotation = {0, 0, 0, 1}
    })
end)

-- Track marker updates
marker:OnUpdated(function()
    local transform = marker:GetTransform()
    local position = transform:GetPosition()
    local rotation = transform:GetRotation()
    
    -- Send update to frontend
    local remoteApi = require('Remote')
    remoteApi:Send({
        type = "MARKER_UPDATED",
        position = {position.x, position.y, position.z},
        rotation = {rotation.x, rotation.y, rotation.z, rotation.w}
    })
end)

-- Track when marker is lost
marker:OnLost(function()
    print("Marker lost")
    local remoteApi = require('Remote')
    remoteApi:Send({
        type = "MARKER_LOST"
    })
end)
```

## Step 3: Create 3D Objects

### Orientation Marker (Cube + Cone)

1. **Create Cube**:
   - Right-click in Objects Panel → **3D Object** → **Cube**
   - Name: `OrientationCube`
   - Position: `(0, 0.15, 0)` - 15cm above marker
   - Scale: `(0.1, 0.1, 0.1)` - 10cm cube
   - Material: Blue color

2. **Create Cone**:
   - Right-click → **3D Object** → **Cone**
   - Name: `OrientationCone`
   - Position: `(0, 0.15, 0.11)` - Forward from cube
   - Rotation: `(90, 0, 0)` - Point forward (+Z)
   - Scale: `(0.06, 0.12, 0.06)` - 6cm base, 12cm height
   - Material: Yellow/Orange color

3. **Create Anchor Marker**:
   - Right-click → **3D Object** → **Sphere**
   - Name: `AnchorMarker`
   - Position: `(0, 0, 0)` - At marker center
   - Scale: `(0.03, 0.03, 0.03)` - 3cm sphere
   - Material: Green color

4. **Parent Objects to Marker**:
   - Select all three objects
   - Drag them under the Marker Tracking component's tracked object
   - This ensures they move with the marker

5. **Hide by Default**:
   - Set all objects to `enabled = false` initially
   - Show them when marker is found via script

### Player Avatar Template

Create a template for player avatars (will be instantiated dynamically):

1. **Create Avatar Root** (Empty Object):
   - Name: `PlayerAvatarTemplate`
   - Set `enabled = false` (template, not visible)

2. **Create Avatar Head**:
   - Sphere, diameter 0.15m
   - Position: `(0, 0.15, 0)`
   - Material: Pink/Magenta

3. **Create Direction Cone**:
   - Cone pointing forward
   - Position: `(0, 0.15, 0.15)`
   - Material: Yellow

4. **Create Base**:
   - Cylinder at ground level
   - Position: `(0, 0.01, 0)`
   - Material: Gray

## Step 4: Set Up Remote API Communication

### Create Remote API Controller Script

1. Create new script: `RemoteAPIController.lua`
2. Add to Camera object

**Script Template:**

```lua
-- RemoteAPIController.lua
local Remote = require('Remote')

-- Listen for messages from frontend
Remote.OnMessage(function(message)
    local msgType = message.type
    
    if msgType == "START_MARKER_TRACKING" then
        -- Start tracking (already configured in Marker Tracking component)
        print("Marker tracking started")
        
    elseif msgType == "SHOW_ORIENTATION_MARKER" then
        -- Show orientation marker objects
        local cube = script:GetSceneObject("OrientationCube")
        local cone = script:GetSceneObject("OrientationCone")
        local marker = script:GetSceneObject("AnchorMarker")
        if cube then cube:SetEnabled(true) end
        if cone then cone:SetEnabled(true) end
        if marker then marker:SetEnabled(true) end
        
    elseif msgType == "HIDE_ORIENTATION_MARKER" then
        -- Hide orientation marker
        local cube = script:GetSceneObject("OrientationCube")
        local cone = script:GetSceneObject("OrientationCone")
        local marker = script:GetSceneObject("AnchorMarker")
        if cube then cube:SetEnabled(false) end
        if cone then cone:SetEnabled(false) end
        if marker then marker:SetEnabled(false) end
        
    elseif msgType == "CREATE_PLAYER_AVATAR" then
        -- Create avatar for player
        local userId = message.userId
        local position = message.position
        local rotation = message.rotation
        -- Instantiate avatar template at position
        -- (Implementation depends on Lens Studio version)
        
    elseif msgType == "UPDATE_PLAYER_POSE" then
        -- Update player avatar position/rotation
        local userId = message.userId
        local position = message.position
        local rotation = message.rotation
        -- Update avatar transform
        
    elseif msgType == "REMOVE_PLAYER_AVATAR" then
        -- Remove player avatar
        local userId = message.userId
        -- Destroy avatar instance
        
    elseif msgType == "CREATE_OBJECT" then
        -- Create 3D object
        local objectId = message.objectId
        local position = message.position
        local rotation = message.rotation
        -- Create object at position
        
    elseif msgType == "UPDATE_OBJECT" then
        -- Update object position/rotation
        local objectId = message.objectId
        local position = message.position
        local rotation = message.rotation
        -- Update object transform
        
    elseif msgType == "REQUEST_CAMERA_POSE" then
        -- Send camera pose back to frontend
        local camera = script:GetSceneObject("Camera")
        local transform = camera:GetTransform()
        local position = transform:GetPosition()
        local rotation = transform:GetRotation()
        
        Remote.Send({
            type = "CAMERA_POSE_UPDATE",
            position = {position.x, position.y, position.z},
            rotation = {rotation.x, rotation.y, rotation.z, rotation.w}
        })
    end
end)
```

## Step 5: Configure Camera

1. Select **Camera** object
2. Set **Render Target** to "Live" (for user view)
3. Ensure **Back Camera** is selected (for world AR)

## Step 6: Test in Lens Studio

1. Click **Preview** button
2. Point camera at QR code
3. Verify marker tracking works
4. Check Remote API messages in console

## Step 7: Publish Lens

1. Click **Publish** button
2. Fill in Lens metadata (name, description, etc.)
3. Submit for review (if required)
4. Once published, note the **Lens ID** and **Lens Group ID**

## Step 8: Configure Frontend

Add the Lens IDs to your `.env` file:

```env
VITE_LENS_ID=your_lens_id_here
VITE_LENS_GROUP_ID=your_lens_group_id_here
```

## Remote API Message Reference

### Frontend → Lens Messages

- `START_MARKER_TRACKING` - Start tracking QR marker
- `STOP_MARKER_TRACKING` - Stop tracking
- `SHOW_ORIENTATION_MARKER` - Show orientation marker objects
- `HIDE_ORIENTATION_MARKER` - Hide orientation marker
- `CREATE_PLAYER_AVATAR` - Create avatar for player
- `UPDATE_PLAYER_POSE` - Update player avatar position/rotation
- `REMOVE_PLAYER_AVATAR` - Remove player avatar
- `CREATE_OBJECT` - Create 3D object
- `UPDATE_OBJECT` - Update object position/rotation
- `REQUEST_CAMERA_POSE` - Request current camera pose

### Lens → Frontend Messages

- `MARKER_FOUND` - Marker detected
- `MARKER_UPDATED` - Marker position/rotation updated
- `MARKER_LOST` - Marker lost
- `CAMERA_POSE_UPDATE` - Camera pose data

## Coordinate System

- **Origin**: Center of QR marker
- **+Y**: Up (perpendicular to marker surface)
- **+Z**: Forward (away from camera when marker is flat)
- **+X**: Right (when facing +Z)

All positions are in meters (e.g., 0.15 = 15cm).

## Troubleshooting

### Marker Not Tracking
- Ensure marker image has high contrast
- Check marker size matches estimated width
- Verify marker is well-lit
- Try adjusting marker tracking sensitivity

### Remote API Not Working
- Check Lens Studio console for errors
- Verify Remote API script is attached to Camera object
- Ensure message types match between frontend and Lens

### Objects Not Appearing
- Verify objects are parented to marker tracking object
- Check object enabled state
- Verify positions are correct (in meters)

## Resources

- [Lens Studio Documentation](https://docs.snap.com/lens-studio/)
- [Marker Tracking Guide](https://docs.snap.com/lens-studio/references/guides/ar-tracking/world/marker-tracking)
- [Remote API Documentation](https://docs.snap.com/lens-studio/references/guides/scripting/remote-api)
- [Camera Kit Web SDK Docs](https://developers.snap.com/camera-kit/integrate-sdk/web/web-configuration)

