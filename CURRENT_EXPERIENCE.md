# Current 3D Experience & QR Marker Guide

## Current 3D Experience

The current AR experience is **minimal** - it's a basic proof-of-concept that demonstrates:

### What You See:
- **Simple Cubes**: When users tap "Place Object", a small **10cm cube** appears
- **Position**: Cubes are placed **30cm in front** and **10cm above** the QR marker
- **Synchronization**: All users see the same cubes in the same real-world location
- **Multiplayer**: Multiple users can place cubes simultaneously

### Current Implementation:
```108:126:frontend/src/App.vue
  const mesh = MeshBuilder.CreateBox(objectId, { size: 0.1 }, scene.value);
  
  if (imageTracking.anchorNode.value) {
    mesh.parent = imageTracking.anchorNode.value;
    mesh.position = offset;
  }
  
  placedObjects.value.set(objectId, mesh);
  
  // Send object creation to network
  const worldPos = imageTracking.getWorldPosition(offset);
  const worldRot = mesh.rotationQuaternion || Quaternion.Identity();
  
  store.networkSync.sendObjectCreate(
    objectId,
    [worldPos.x, worldPos.y, worldPos.z],
    [worldRot.x, worldRot.y, worldRot.z, worldRot.w],
    'cube'
  );
```

### Customization Ideas:
You can enhance the experience by modifying `handlePlaceObject()` in `App.vue`:

1. **Different Shapes**: Use `MeshBuilder.CreateSphere()`, `CreateCylinder()`, etc.
2. **Materials**: Add colors, textures, or lighting
3. **Interactions**: Add click/tap handlers to move or delete objects
4. **Animations**: Make objects rotate, pulse, or move
5. **3D Models**: Load GLTF/GLB models instead of primitive shapes

## QR Code Marker

### ✅ QR Code Generated!
A QR marker has been created at `frontend/public/qr-marker.png`

### Printing Instructions:

1. **Size**: Print at **minimum 20cm x 20cm** (8" x 8")
   - Larger is better for tracking stability
   - WebXR image tracking expects real-world size

2. **Print Quality**:
   - Use high-quality printer
   - Ensure sharp, clear edges
   - High contrast (black squares on white background)

3. **Placement**:
   - Flat, stable surface
   - Good lighting (avoid shadows)
   - Consistent orientation (mark one corner as "top")
   - Avoid reflective surfaces

4. **Orientation**:
   - Ensure all users place the QR code the same way
   - Consider marking which edge is "forward" (+Z axis)

### Regenerating QR Code:
```bash
cd frontend
npm run generate-qr
```

### Alternative: Online QR Generators
You can also use online tools like:
- https://www.qr-code-generator.com/
- https://www.qrcode-monkey.com/
- Just ensure the QR code pattern stays consistent (same data generates same pattern)

### Testing:
1. Print the QR code
2. Place it on a table
3. Start your AR session
4. Point device camera at the QR code
5. System should detect it and anchor content

## Next Steps to Enhance Experience

1. **Add Materials**: Color the cubes
2. **Load Models**: Use GLTF models instead of cubes
3. **Add Physics**: Make objects interactable
4. **UI Improvements**: Add object selection/deletion
5. **More Object Types**: Different shapes, sizes, colors

See `frontend/src/App.vue` `handlePlaceObject()` function to customize!
