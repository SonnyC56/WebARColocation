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
import { ref, watch, computed } from 'vue';
import SessionUI from './components/SessionUI.vue';
import ARScene from './components/ARScene.vue';
import { useSessionStore } from './stores/session';
import { useImageTracking } from './composables/useImageTracking';
import { useARUI } from './composables/useARUI';
import type { DebugInfo } from './composables/useARUI';
import { Mesh, MeshBuilder, Vector3, Quaternion, StandardMaterial, Color3 } from '@babylonjs/core';
import type { Scene, Engine } from '@babylonjs/core';

const store = useSessionStore();
const arSceneRef = ref<InstanceType<typeof ARScene> | null>(null);
const isInARMode = ref(false);
const anchorFound = ref(false);
const scene = ref<Scene | null>(null);
const engine = ref<Engine | null>(null);
const placedObjects = ref<Map<string, Mesh>>(new Map());
const lastError = ref<string | null>(null);
const trackingInitialized = ref(false);

let imageTracking: ReturnType<typeof useImageTracking> | null = null;
let arUI: ReturnType<typeof useARUI> | null = null;

// Debug info computed property
const debugInfo = computed<DebugInfo>(() => ({
  webxrSupported: arSceneRef.value?.isSupported || false,
  arActive: isInARMode.value && (arSceneRef.value?.isInAR || false),
  trackingInitialized: trackingInitialized.value,
  networkConnected: store.networkSync.connected,
  roomId: store.roomId,
  objectCount: placedObjects.value.size,
  lastError: lastError.value,
}));

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
  
  // Initialize Babylon.js GUI for AR overlay
  arUI = useARUI(scene as any);
  if (arUI) {
    arUI.initializeGUI();
  }
  
  // Initialize image tracking
  if (scn && arSceneRef.value?.xrExperience) {
    imageTracking = useImageTracking(
      scene as any,
      ref(arSceneRef.value.xrExperience) as any
    );
    
    // Initialize QR tracking
    imageTracking.initializeImageTracking('/qr-marker.png', 0.2).then((success) => {
      trackingInitialized.value = success;
      if (success) {
        console.log('Image tracking initialized');
        lastError.value = null;
      } else {
        lastError.value = 'Failed to initialize image tracking';
      }
    }).catch((err: any) => {
      trackingInitialized.value = false;
      lastError.value = `Image tracking error: ${err.message}`;
      console.error('Image tracking initialization error:', err);
    });
    
    // Watch for anchor tracking state
    watch(() => imageTracking?.isTracking.value, (tracking) => {
      anchorFound.value = tracking || false;
      
      // Update UI
      if (arUI) {
        arUI.updateControls(
          handlePlaceObject,
          handleExitAR,
          handleFocusCamera,
          anchorFound.value
        );
        arUI.updateStatusBar(store.roomId || 'None', store.participantCount, anchorFound.value);
        arUI.showCenterInstruction(!anchorFound.value);
      }
      
      if (tracking && imageTracking?.anchorNode.value) {
        // Send anchor found event
        const position = imageTracking.anchorNode.value.position;
        const rotation = imageTracking.anchorNode.value.rotationQuaternion || Quaternion.Identity();
        
        store.networkSync.sendAnchorFound(
          [position.x, position.y, position.z],
          [rotation.x, rotation.y, rotation.z, rotation.w]
        );
      }
    });
  }
  
  // Set up network message handlers
  setupNetworkHandlers();
};

const handleAREntered = () => {
  console.log('AR entered');
  lastError.value = null;
  
  // Update UI
  if (arUI) {
    arUI.updateControls(
      handlePlaceObject,
      handleExitAR,
      handleFocusCamera,
      anchorFound.value
    );
    arUI.updateStatusBar(store.roomId || 'None', store.participantCount, anchorFound.value);
    arUI.showCenterInstruction(!anchorFound.value);
    arUI.updateDebugInfo(debugInfo.value);
  }
  
  // Add a test cube to verify 3D rendering works
  if (scene.value) {
    setTimeout(() => {
      if (scene.value) {
        try {
          const testCube = MeshBuilder.CreateBox('test-cube', { size: 0.2 }, scene.value as any);
          testCube.position = new Vector3(0, 0.5, -1); // 1 meter in front, 0.5m up
          
          const material = new StandardMaterial('test-mat', scene.value as any);
          material.diffuseColor = new Color3(1, 0, 0); // Red
          testCube.material = material;
          
          console.log('Test cube created at position:', testCube.position);
        } catch (err: any) {
          console.error('Failed to create test cube:', err);
          lastError.value = `Test cube error: ${err.message}`;
        }
      }
    }, 1000);
  }
};

const handleARExited = () => {
  console.log('AR exited');
  isInARMode.value = false;
};

const handlePlaceObject = () => {
  if (!scene.value || !imageTracking?.anchorNode.value) return;
  
  // Place a simple cube at the anchor position (offset forward)
  const objectId = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const offset = new Vector3(0, 0.1, 0.3); // 30cm forward, 10cm up
  
  const mesh = MeshBuilder.CreateBox(objectId, { size: 0.1 }, scene.value as any);
  
  if (imageTracking.anchorNode.value) {
      mesh.parent = imageTracking.anchorNode.value as any;
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
};

const handleExitAR = async () => {
  if (arSceneRef.value) {
    await arSceneRef.value.exitAR();
  }
  isInARMode.value = false;
};

const handleFocusCamera = async () => {
  // Try to trigger camera autofocus
  try {
    // Method 1: Try to access WebXR session directly
    if (arSceneRef.value?.xrExperience?.baseExperience) {
      const baseExperience = arSceneRef.value.xrExperience.baseExperience;
      const session = (baseExperience as any).sessionManager?.currentSession || (baseExperience as any).session;
      
      if (session) {
        // Try to trigger focus by requesting reference space
        try {
          await session.requestReferenceSpace('viewer');
        } catch (e) {
          // Ignore errors
        }
        
        // Try to access camera track through WebXR
        if ((session as any).inputSources) {
          const inputSources = (session as any).inputSources as any[];
          for (const inputSource of inputSources) {
            if (inputSource && inputSource.track) {
              const track = inputSource.track as MediaStreamTrack;
              if (track.kind === 'video' && 'applyConstraints' in track) {
                try {
                  await (track as any).applyConstraints({
                    advanced: [{ focusMode: 'continuous' }]
                  } as any);
                  console.log('Camera focus triggered via inputSource track');
                  lastError.value = null;
                  return;
                } catch (e) {
                  // Continue to fallback
                }
              }
            }
          }
        }
      }
    }
    
    // Method 2: Fallback - request camera access temporarily to trigger focus
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment'
          } 
        });
        // Stop immediately - we just wanted to trigger focus
        stream.getTracks().forEach(track => {
          track.stop();
        });
        console.log('Camera focus triggered via getUserMedia');
        lastError.value = null;
      } catch (err: any) {
        console.warn('Could not trigger camera focus:', err);
        lastError.value = `Focus failed: ${err.message}`;
      }
    } else {
      lastError.value = 'getUserMedia not available';
    }
  } catch (error: any) {
    console.error('Error focusing camera:', error);
    lastError.value = `Focus error: ${error.message}`;
  }
};

const setupNetworkHandlers = () => {
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

// Watch debug info and update GUI
watch(debugInfo, (info) => {
  if (arUI) {
    arUI.updateDebugInfo(info);
  }
}, { deep: true });

// Watch store changes for UI updates
watch(() => store.roomId, () => {
  if (arUI) {
    arUI.updateStatusBar(store.roomId || 'None', store.participantCount, anchorFound.value);
  }
});

watch(() => store.participantCount, () => {
  if (arUI) {
    arUI.updateStatusBar(store.roomId || 'None', store.participantCount, anchorFound.value);
  }
});

// Debug mode: check URL parameter
const urlParams = new URLSearchParams(window.location.search);
const debugMode = urlParams.get('debug') === 'true';

if (debugMode) {
  console.log('Debug mode enabled');
  // Add debug visualizations or logging
}
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