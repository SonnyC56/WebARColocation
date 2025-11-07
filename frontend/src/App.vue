<template>
  <div id="app">
    <!-- Session UI (shown when not in AR) -->
    <SessionUI v-if="!isInARMode" @start-ar="handleStartAR" />
    
    <!-- AR Scene (always mounted, shown when in AR mode) -->
    <div :class="{ 'ar-container': isInARMode, 'ar-hidden': !isInARMode }">
      <ARScene
        ref="arSceneRef"
        @engine-ready="handleEngineReady"
        @ar-entered="handleAREntered"
        @ar-exited="handleARExited"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import SessionUI from './components/SessionUI.vue';
import ARScene from './components/ARScene.vue';
import { useSessionStore } from './stores/session';
import { useImageTracking } from './composables/useImageTracking';
// import { useARUI } from './composables/useARUI';
// import type { DebugInfo } from './composables/useARUI';
import { Mesh, MeshBuilder, Vector3, Quaternion, StandardMaterial, Color3 } from '@babylonjs/core';
import type { Scene, Engine } from '@babylonjs/core';

const store = useSessionStore();
const arSceneRef = ref<InstanceType<typeof ARScene> | null>(null);
const isInARMode = ref(false);
const anchorFound = ref(false);
const scene = ref<Scene | null>(null);
const engine = ref<Engine | null>(null);
const placedObjects = ref<Map<string, Mesh>>(new Map());
const playerAvatars = ref<Map<string, Mesh>>(new Map()); // Track player avatar meshes
const lastError = ref<string | null>(null);
const trackingInitialized = ref(false);

let imageTracking: ReturnType<typeof useImageTracking> | null = null;
// let arUI: ReturnType<typeof useARUI> | null = null; // UI disabled

// Debug info computed property - currently unused but kept for future debugging
// const debugInfo = computed<DebugInfo>(() => ({
//   webxrSupported: arSceneRef.value?.isSupported || false,
//   arActive: isInARMode.value && (arSceneRef.value?.isInAR || false),
//   trackingInitialized: trackingInitialized.value,
//   anchorFound: anchorFound.value,
//   networkConnected: store.networkSync.connected,
//   roomId: store.roomId,
//   objectCount: placedObjects.value.size,
//   lastError: lastError.value,
// }));

const handleStartAR = async () => {
  if (!arSceneRef.value) return;
  
  // Enter AR mode
  const entered = await arSceneRef.value.enterAR();
  if (entered) {
    isInARMode.value = true;
  }
};

const handleEngineReady = (eng: Engine, scn: Scene) => {
  engine.value = eng;
  scene.value = scn;
  
  // UI disabled - focusing on 3D objects only
  // arUI = useARUI(scene as any);
  // if (arUI) {
  //   arUI.initializeGUI();
  // }
  
  // Initialize image tracking
  if (scn && arSceneRef.value?.xrExperience) {
    imageTracking = useImageTracking(
      scene as any,
      ref(arSceneRef.value.xrExperience) as any
    );
    
    // Initialize QR tracking with physical size
    // IMPORTANT: Measure your printed QR code! The size must be accurate for correct 6DOF pose estimation
    const qrPhysicalSize = 0.2; // 20cm - MEASURE YOUR ACTUAL QR CODE SIZE
    console.log(`📏 Initializing QR tracking with physical size: ${qrPhysicalSize}m (${qrPhysicalSize * 100}cm)`);
    console.log('📏 ⚠️ If objects appear at wrong distances, measure and update the QR code size!');
    
    imageTracking.initializeImageTracking('/qr-marker.png', qrPhysicalSize).then((success) => {
      trackingInitialized.value = success;
      if (success) {
        console.log('✅ Image tracking initialized - WebXR will solve PnP to get full 6DOF pose');
        lastError.value = null;
      } else {
        lastError.value = 'Failed to initialize image tracking';
        console.error('❌ Image tracking init failed');
      }
    }).catch((err: any) => {
      trackingInitialized.value = false;
      lastError.value = `Image tracking error: ${err.message}`;
      console.error('❌ Image tracking initialization error:', err);
    });
    
    // Watch for anchor tracking state
    watch(() => imageTracking?.isTracking.value, (tracking) => {
      const wasFound = anchorFound.value;
      anchorFound.value = tracking || false;
      
      if (anchorFound.value && !wasFound) {
                // Create orientation marker when anchor is first found (attached to anchor)
                if (scene.value && imageTracking?.anchorNode.value) {
                  setTimeout(() => {
                    try {
                      // Clean up existing markers
                      const existingCube = scene.value!.getMeshByName('orientation-cube');
                      const existingCone = scene.value!.getMeshByName('orientation-cone');
                      const existingMarker = scene.value!.getMeshByName('anchor-marker');
                      if (existingCube) existingCube.dispose();
                      if (existingCone) existingCone.dispose();
                      if (existingMarker) existingMarker.dispose();
                      
                      // Create orientation marker: cube with cone pointing in +Z direction
                      const cube = MeshBuilder.CreateBox('orientation-cube', { size: 0.1 }, scene.value as any);
                      cube.parent = imageTracking!.anchorNode.value as any;
                      cube.position = new Vector3(0, 0.15, 0); // 15cm above QR
                      
                      const cubeMat = new StandardMaterial('cube-mat', scene.value as any);
                      cubeMat.diffuseColor = new Color3(0.2, 0.6, 1); // Blue
                      cubeMat.emissiveColor = new Color3(0.1, 0.3, 0.5);
                      cubeMat.specularColor = new Color3(0, 0, 0);
                      cube.material = cubeMat;
                      
                      // Create cone pointing in +Z direction (forward)
                      const cone = MeshBuilder.CreateCylinder('orientation-cone', { 
                        diameterTop: 0,
                        diameterBottom: 0.06,
                        height: 0.12,
                        tessellation: 8
                      }, scene.value as any);
                      cone.parent = imageTracking!.anchorNode.value as any;
                      // Position cone on the +Z side of cube
                      cone.position = new Vector3(0, 0.15, 0.11); // 15cm up, 11cm forward (5cm from cube face + 6cm cone length)
                      cone.rotation = new Vector3(Math.PI / 2, 0, 0); // Point forward
                      
                      const coneMat = new StandardMaterial('cone-mat', scene.value as any);
                      coneMat.diffuseColor = new Color3(1, 0.8, 0); // Yellow/Orange
                      coneMat.emissiveColor = new Color3(0.5, 0.4, 0);
                      coneMat.specularColor = new Color3(0, 0, 0);
                      cone.material = coneMat;
                      
                      // Small green sphere at QR origin for reference
                      const anchorMarker = MeshBuilder.CreateSphere('anchor-marker', { diameter: 0.03 }, scene.value as any);
                      anchorMarker.parent = imageTracking!.anchorNode.value as any;
                      anchorMarker.position = Vector3.Zero();
                      const markerMat = new StandardMaterial('marker-mat', scene.value as any);
                      markerMat.diffuseColor = new Color3(0, 1, 0);
                      markerMat.emissiveColor = new Color3(0, 0.5, 0);
                      anchorMarker.material = markerMat;
                      
                      console.log('✅ Orientation marker created (blue cube + yellow cone pointing +Z)');
                      console.log('   Position: 15cm above QR, cone points forward');
                      console.log('   Green sphere marks QR center');
                    } catch (err: any) {
                      console.error('Failed to create orientation marker:', err);
                      lastError.value = `Marker error: ${err.message}`;
                    }
                  }, 500);
                }
      }
              
              // UI disabled for now
      
      if (tracking && imageTracking?.anchorNode.value) {
        // Send anchor found event
        const position = imageTracking.anchorNode.value.position;
        const rotation = imageTracking.anchorNode.value.rotationQuaternion || Quaternion.Identity();
        
        store.networkSync.sendAnchorFound(
          [position.x, position.y, position.z],
          [rotation.x, rotation.y, rotation.z, rotation.w]
        );
        
        // Start sending our player pose updates (every 100ms)
        startPlayerPoseUpdates();
      }
    });
  }
  
  // Set up network message handlers
  setupNetworkHandlers();
};

// Send player pose updates to network
let playerPoseInterval: number | null = null;
const startPlayerPoseUpdates = () => {
  if (playerPoseInterval) return; // Already running
  
  playerPoseInterval = window.setInterval(() => {
    if (!arSceneRef.value?.xrExperience || !anchorFound.value) return;
    
    try {
      const xr = arSceneRef.value.xrExperience;
      const baseExperience = xr.baseExperience;
      const camera = xr.input.xrCamera;
      
      if (camera && baseExperience.state === 2) { // IN_SESSION
        const position = camera.position;
        const rotation = camera.rotationQuaternion || Quaternion.Identity();
        
        // Send pose relative to world origin (anchor)
        store.networkSync.sendPlayerPose(
          [position.x, position.y, position.z],
          [rotation.x, rotation.y, rotation.z, rotation.w]
        );
      }
    } catch (error) {
      console.warn('Failed to send player pose:', error);
    }
  }, 100); // 10 updates per second
  
  console.log('🎮 Started sending player pose updates');
};

const stopPlayerPoseUpdates = () => {
  if (playerPoseInterval) {
    clearInterval(playerPoseInterval);
    playerPoseInterval = null;
    console.log('🎮 Stopped sending player pose updates');
  }
};

const handleAREntered = () => {
  console.log('AR entered');
  lastError.value = null;
  
  // Set camera to focus at close range for QR detection (single attempt, no cycling)
  triggerCameraFocus();
  
  // UI disabled
  // Test object (cube + cone) will be created when anchor is found (see watch handler above)
};

const handleARExited = () => {
  console.log('AR exited');
  isInARMode.value = false;
  stopPlayerPoseUpdates();
  
  // Clean up all player avatars
  playerAvatars.value.forEach((avatar) => {
    avatar.dispose();
  });
  playerAvatars.value.clear();
};

// UI control handlers - currently unused, kept for future use
// const handlePlaceObject = () => {
//   if (!scene.value || !imageTracking?.anchorNode.value) return;
//   
//   // Place a simple cube at the anchor position (offset forward)
//   const objectId = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
//   const offset = new Vector3(0, 0.1, 0.3); // 30cm forward, 10cm up
//   
//   const mesh = MeshBuilder.CreateBox(objectId, { size: 0.1 }, scene.value as any);
//   
//   if (imageTracking.anchorNode.value) {
//       mesh.parent = imageTracking.anchorNode.value as any;
//     mesh.position = offset;
//   }
//   
//   placedObjects.value.set(objectId, mesh);
//   
//   // Send object creation to network
//   const worldPos = imageTracking.getWorldPosition(offset);
//   const worldRot = mesh.rotationQuaternion || Quaternion.Identity();
//   
//   store.networkSync.sendObjectCreate(
//     objectId,
//     [worldPos.x, worldPos.y, worldPos.z],
//     [worldRot.x, worldRot.y, worldRot.z, worldRot.w],
//     'cube'
//   );
// };

// const handleExitAR = async () => {
//   if (arSceneRef.value) {
//     await arSceneRef.value.exitAR();
//   }
//   isInARMode.value = false;
// };

// Camera focus setup - configure once for close-range QR detection
const triggerCameraFocus = async () => {
  console.log('🎥 Configuring camera for close-range focus...');
  
  // Simple, non-intrusive approach: just set constraints once
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          // @ts-ignore - Focus at close range (20-50cm, good for QR codes)
          focusDistance: 0.3, // 30cm focus distance
          focusMode: 'continuous'
        } as any
      });
      
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        try {
          // Set close-range continuous autofocus
          await videoTrack.applyConstraints({
            // @ts-ignore
            focusDistance: 0.3, // Focus at ~30cm (QR code reading distance)
            focusMode: 'continuous'
          });
          console.log('✅ Camera configured for close-range focus');
        } catch (e) {
          console.log('🎥 Using default focus mode');
        }
      }
      
      // Release the stream immediately
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.log('🎥 Camera config not available, using defaults');
    }
  }
};

// Manual focus trigger (kept for debugging)
// const handleFocusCamera = async () => {
//   // Try to trigger camera autofocus
//   try {
//     // Method 1: Try to access WebXR session directly
//     if (arSceneRef.value?.xrExperience?.baseExperience) {
//       const baseExperience = arSceneRef.value.xrExperience.baseExperience;
//       const session = (baseExperience as any).sessionManager?.currentSession || (baseExperience as any).session;
//       
//       if (session) {
//         // Try to trigger focus by requesting reference space
//         try {
//           await session.requestReferenceSpace('viewer');
//         } catch (e) {
//           // Ignore errors
//         }
//         
//         // Try to access camera track through WebXR
//         if ((session as any).inputSources) {
//           const inputSources = (session as any).inputSources as any[];
//           for (const inputSource of inputSources) {
//             if (inputSource && inputSource.track) {
//               const track = inputSource.track as MediaStreamTrack;
//               if (track.kind === 'video' && 'applyConstraints' in track) {
//                 try {
//                   await (track as any).applyConstraints({
//                     advanced: [{ focusMode: 'continuous' }]
//                   } as any);
//                   console.log('Camera focus triggered via inputSource track');
//                   lastError.value = null;
//                   return;
//                 } catch (e) {
//                   // Continue to fallback
//                 }
//               }
//             }
//           }
//         }
//       }
//     }
//     
//     // Method 2: Fallback - request camera access temporarily to trigger focus
//     if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
//       try {
//         const stream = await navigator.mediaDevices.getUserMedia({ 
//           video: { 
//             facingMode: 'environment'
//           } 
//         });
//         // Stop immediately - we just wanted to trigger focus
//         stream.getTracks().forEach(track => {
//           track.stop();
//         });
//         console.log('Camera focus triggered via getUserMedia');
//         lastError.value = null;
//       } catch (err: any) {
//         console.warn('Could not trigger camera focus:', err);
//         lastError.value = `Focus failed: ${err.message}`;
//       }
//     } else {
//       lastError.value = 'getUserMedia not available';
//     }
//   } catch (error: any) {
//     console.error('Error focusing camera:', error);
//     lastError.value = `Focus error: ${error.message}`;
//   }
// };

const createPlayerAvatar = (userId: string): Mesh => {
  if (!scene.value) throw new Error('Scene not available');
  
  // Create a distinctive avatar: sphere head + cone pointing forward
  const avatarRoot = new Mesh(`player-${userId}`, scene.value as any);
  
  // Head (sphere)
  const head = MeshBuilder.CreateSphere(`player-${userId}-head`, { diameter: 0.15 }, scene.value as any);
  head.parent = avatarRoot;
  head.position = new Vector3(0, 0.15, 0); // 15cm high
  
  const headMat = new StandardMaterial(`player-${userId}-head-mat`, scene.value as any);
  headMat.diffuseColor = new Color3(1, 0.4, 0.8); // Pink/magenta
  headMat.emissiveColor = new Color3(0.5, 0.2, 0.4);
  head.material = headMat;
  
  // Direction cone (pointing forward in their view direction)
  const dirCone = MeshBuilder.CreateCylinder(`player-${userId}-dir`, {
    diameterTop: 0,
    diameterBottom: 0.08,
    height: 0.15,
    tessellation: 8
  }, scene.value as any);
  dirCone.parent = avatarRoot;
  dirCone.position = new Vector3(0, 0.15, 0.15); // In front of head
  dirCone.rotation = new Vector3(Math.PI / 2, 0, 0); // Point forward
  
  const dirMat = new StandardMaterial(`player-${userId}-dir-mat`, scene.value as any);
  dirMat.diffuseColor = new Color3(1, 1, 0); // Yellow
  dirMat.emissiveColor = new Color3(0.5, 0.5, 0);
  dirCone.material = dirMat;
  
  // Base marker (small cylinder at ground level)
  const base = MeshBuilder.CreateCylinder(`player-${userId}-base`, {
    diameter: 0.1,
    height: 0.02,
    tessellation: 12
  }, scene.value as any);
  base.parent = avatarRoot;
  base.position = new Vector3(0, 0.01, 0);
  
  const baseMat = new StandardMaterial(`player-${userId}-base-mat`, scene.value as any);
  baseMat.diffuseColor = new Color3(0.8, 0.8, 0.8);
  baseMat.emissiveColor = new Color3(0.3, 0.3, 0.3);
  base.material = baseMat;
  
  console.log(`✅ Created avatar for player ${userId}`);
  return avatarRoot;
};

const setupNetworkHandlers = () => {
  // Handle player pose updates
  store.networkSync.onMessage('PLAYER_POSE', (message: any) => {
    if (!scene.value || !imageTracking?.anchorNode.value) return;
    
    const userId = message.userId;
    // Don't render our own avatar
    if (userId === store.networkSync.userId) return;
    
    const worldPos = new Vector3(...message.position);
    const worldRot = new Quaternion(...message.rotation);
    
    // Get or create avatar
    let avatar = playerAvatars.value.get(userId);
    if (!avatar) {
      avatar = createPlayerAvatar(userId);
      avatar.parent = imageTracking.anchorNode.value as any;
      playerAvatars.value.set(userId, avatar);
    }
    
    // Convert world position to anchor-relative
    const localPos = imageTracking.getLocalPosition(worldPos);
    avatar.position = localPos;
    avatar.rotationQuaternion = worldRot;
  });
  
  // Handle participant left - clean up their avatar
  store.networkSync.onMessage('PARTICIPANT_LEFT', (message: any) => {
    const userId = message.userId;
    const avatar = playerAvatars.value.get(userId);
    if (avatar) {
      avatar.dispose();
      playerAvatars.value.delete(userId);
      console.log(`🗑️ Removed avatar for player ${userId}`);
    }
  });
  
  // Handle object creation from network
  store.networkSync.onMessage('OBJECT_CREATE', (message: any) => {
    if (!scene.value || !imageTracking?.anchorNode.value) return;
    
    const objId = message.objectId;
    if (placedObjects.value.has(objId)) return; // Already created
    
    const mesh = MeshBuilder.CreateBox(objId, { size: 0.1 }, scene.value as any);
    const worldPos = new Vector3(...message.position);
    const worldRot = new Quaternion(...message.rotation);
    
    // Convert to anchor-relative position
    const localPos = imageTracking.getLocalPosition(worldPos);
    
      mesh.parent = imageTracking.anchorNode.value as any;
    mesh.position = localPos;
    mesh.rotationQuaternion = worldRot;
    
    placedObjects.value.set(objId, mesh);
  });
  
  // Handle object updates from network
  store.networkSync.onMessage('OBJECT_UPDATE', (message: any) => {
    if (!scene.value || !imageTracking?.anchorNode.value) return;
    
    const objId = message.objectId;
    const mesh = placedObjects.value.get(objId);
    if (!mesh) return;
    
    const worldPos = new Vector3(...message.position);
    const worldRot = new Quaternion(...message.rotation);
    
    const localPos = imageTracking.getLocalPosition(worldPos);
    
    mesh.position = localPos;
    mesh.rotationQuaternion = worldRot;
  });
  
  // Handle state sync (for late joiners)
  store.networkSync.onMessage('STATE_SYNC', (message: any) => {
    if (!scene.value || !imageTracking?.anchorNode.value || !anchorFound.value) {
      // Queue state sync until anchor is found
      return;
    }
    
    message.objects.forEach((obj: any) => {
      const objId = obj.objectId;
      if (placedObjects.value.has(objId)) return;
      
      const mesh = MeshBuilder.CreateBox(objId, { size: 0.1 }, scene.value! as any);
      const worldPos = new Vector3(...obj.position);
      const localPos = imageTracking!.getLocalPosition(worldPos);
      
      mesh.parent = imageTracking!.anchorNode.value! as any;
      mesh.position = localPos;
      mesh.rotationQuaternion = new Quaternion(...obj.rotation);
      
      placedObjects.value.set(objId, mesh);
    });
  });
};

// Watch for anchor found to apply queued state sync
watch(anchorFound, (found) => {
  if (found && store.worldObjects.size > 0) {
    // Apply state sync now that anchor is found
    // This will be handled by the STATE_SYNC handler
  }
});

// UI watchers disabled
// watch(debugInfo, (info) => {
//   if (arUI) {
//     arUI.updateDebugInfo(info);
//   }
// }, { deep: true });

// watch(() => store.roomId, () => {
//   if (arUI) {
//     arUI.updateStatusBar(store.roomId || 'None', store.participantCount, anchorFound.value);
//   }
// });

// watch(() => store.participantCount, () => {
//   if (arUI) {
//     arUI.updateStatusBar(store.roomId || 'None', store.participantCount, anchorFound.value);
//   }
// });

// Debug mode: check URL parameter
// const urlParams = new URLSearchParams(window.location.search);
// const debugMode = urlParams.get('debug') === 'true';
// if (debugMode) {
//   console.log('Debug mode enabled');
// }
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.ar-container {
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 1; /* Lower than overlay */
}

.ar-hidden {
  position: fixed;
  top: -9999px;
  left: -9999px;
  width: 1px;
  height: 1px;
  overflow: hidden;
  pointer-events: none;
}
</style>