<template>
  <div id="app">
    <!-- Session UI (shown when not in AR) -->
    <SessionUI v-if="!isInARMode" @start-ar="handleStartAR" />
    
    <!-- AR Scene (shown when in AR mode) -->
    <div v-else class="ar-container">
      <ARScene
        ref="arSceneRef"
        @engine-ready="handleEngineReady"
        @ar-entered="handleAREntered"
        @ar-exited="handleARExited"
      />
      <AROverlay
        :anchor-found="anchorFound"
        @place-object="handlePlaceObject"
        @exit-ar="handleExitAR"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import SessionUI from './components/SessionUI.vue';
import ARScene from './components/ARScene.vue';
import AROverlay from './components/AROverlay.vue';
import { useSessionStore } from './stores/session';
import { useImageTracking } from './composables/useImageTracking';
import { Mesh, MeshBuilder, Vector3, Quaternion } from '@babylonjs/core';
import type { Scene, Engine } from '@babylonjs/core';

const store = useSessionStore();
const arSceneRef = ref<InstanceType<typeof ARScene> | null>(null);
const isInARMode = ref(false);
const anchorFound = ref(false);
const scene = ref<Scene | null>(null);
const engine = ref<Engine | null>(null);
const placedObjects = ref<Map<string, Mesh>>(new Map());

let imageTracking: ReturnType<typeof useImageTracking> | null = null;

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
  
  // Initialize image tracking
  if (scn && arSceneRef.value?.xrExperience) {
    imageTracking = useImageTracking(
      ref(scn),
      ref(arSceneRef.value.xrExperience)
    );
    
    // Initialize QR tracking
    imageTracking.initializeImageTracking('/qr-marker.png', 0.2).then((success) => {
      if (success) {
        console.log('Image tracking initialized');
      }
    });
    
    // Watch for anchor tracking state
    watch(() => imageTracking?.isTracking.value, (tracking) => {
      anchorFound.value = tracking || false;
      
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
};

const handleExitAR = async () => {
  if (arSceneRef.value) {
    await arSceneRef.value.exitAR();
  }
  isInARMode.value = false;
};

const setupNetworkHandlers = () => {
  // Handle object creation from network
  store.networkSync.onMessage('OBJECT_CREATE', (message: any) => {
    if (!scene.value || !imageTracking?.anchorNode.value) return;
    
    const objId = message.objectId;
    if (placedObjects.value.has(objId)) return; // Already created
    
    const mesh = MeshBuilder.CreateBox(objId, { size: 0.1 }, scene.value);
    const worldPos = new Vector3(...message.position);
    const worldRot = new Quaternion(...message.rotation);
    
    // Convert to anchor-relative position
    const localPos = imageTracking.getLocalPosition(worldPos);
    
    mesh.parent = imageTracking.anchorNode.value;
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
      
      const mesh = MeshBuilder.CreateBox(objId, { size: 0.1 }, scene.value!);
      const worldPos = new Vector3(...obj.position);
      const localPos = imageTracking!.getLocalPosition(worldPos);
      
      mesh.parent = imageTracking.anchorNode.value!;
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
    store.worldObjects.forEach((obj) => {
      // This will be handled by the STATE_SYNC handler
    });
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
}
</style>