<template>
  <div id="app">
    <!-- Session UI (shown when not in AR) -->
    <SessionUI v-if="!isInARMode" @start-ar="handleStartAR" />
    
    <!-- AR Scene (always mounted, shown when in AR mode) -->
    <div :class="{ 'ar-container': isInARMode, 'ar-hidden': !isInARMode }">
      <ARScene
        ref="arSceneRef"
        @session-ready="handleSessionReady"
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
import { useMarkerTracking } from './composables/useMarkerTracking';
import type { CameraKitSession } from '@snap/camera-kit';

const store = useSessionStore();
const arSceneRef = ref<InstanceType<typeof ARScene> | null>(null);
const isInARMode = ref(false);
const anchorFound = ref(false);
const session = ref<CameraKitSession | null>(null);
const placedObjects = ref<Set<string>>(new Set()); // Track object IDs (objects rendered in Lens)
const playerAvatars = ref<Set<string>>(new Set()); // Track player avatar IDs
const lastError = ref<string | null>(null);
const trackingInitialized = ref(false);

let markerTracking: ReturnType<typeof useMarkerTracking> | null = null;

const handleStartAR = async () => {
  if (!arSceneRef.value) return;
  
  // Enter AR mode
  const entered = await arSceneRef.value.enterAR();
  if (entered) {
    isInARMode.value = true;
  }
};

const handleSessionReady = (cameraKitSession: CameraKitSession) => {
  session.value = cameraKitSession;
  console.log('Camera Kit session ready');
  
  // Initialize marker tracking
  markerTracking = useMarkerTracking(ref(cameraKitSession) as any);
  markerTracking.initializeMarkerTracking();
  
  // Initialize QR tracking with physical size
  const qrPhysicalSize = 0.2; // 20cm - MEASURE YOUR ACTUAL QR CODE SIZE
  console.log(`📏 Initializing QR tracking with physical size: ${qrPhysicalSize}m (${qrPhysicalSize * 100}cm)`);
  
  markerTracking.startTracking('/qr-marker.png', qrPhysicalSize);
  trackingInitialized.value = true;
  
  // Watch for marker tracking state
  watch(() => markerTracking?.isTracking.value, (tracking) => {
    const wasFound = anchorFound.value;
    anchorFound.value = tracking || false;
    
    if (anchorFound.value && !wasFound) {
      console.log('🎯 Marker found! Creating orientation marker via Remote API');
      
      // Send command to Lens to create orientation marker
      // The Lens should have objects pre-configured and will show/hide them based on Remote API
      if (session.value) {
        try {
          // Send message to Lens via Remote API
          const remoteApi = (session.value as any).remoteApi;
          if (remoteApi && typeof remoteApi.send === 'function') {
            remoteApi.send({
              type: 'SHOW_ORIENTATION_MARKER',
              position: [0, 0.15, 0], // 15cm above QR
            });
          }
          
          // Send anchor found event to network
          if (markerTracking?.transform.value) {
            const transform = markerTracking.transform.value;
            store.networkSync.sendAnchorFound(
              transform.position,
              transform.rotation
            );
          }
          
          // Start sending player pose updates
          startPlayerPoseUpdates();
        } catch (error) {
          console.error('Failed to send orientation marker command:', error);
        }
      }
    } else if (!anchorFound.value && wasFound) {
      // Marker lost
      if (session.value) {
        try {
          const remoteApi = (session.value as any).remoteApi;
          if (remoteApi && typeof remoteApi.send === 'function') {
            remoteApi.send({
              type: 'HIDE_ORIENTATION_MARKER',
            });
          }
        } catch (error) {
          console.error('Failed to hide orientation marker:', error);
        }
      }
    }
  });
  
  // Set up network message handlers
  setupNetworkHandlers();
};

// Send player pose updates to network
let playerPoseInterval: number | null = null;
const startPlayerPoseUpdates = () => {
  if (playerPoseInterval) return; // Already running
  
  playerPoseInterval = window.setInterval(() => {
    if (!session.value || !anchorFound.value) return;
    
    try {
      // Request camera pose from Lens via Remote API
      // The Lens should track the camera and send pose updates back
      const remoteApi = (session.value as any).remoteApi;
      if (remoteApi && typeof remoteApi.send === 'function') {
        remoteApi.send({
          type: 'REQUEST_CAMERA_POSE',
        });
      }
    } catch (error) {
      console.warn('Failed to request camera pose:', error);
    }
  }, 100); // 10 updates per second
  
  console.log('🎮 Started requesting camera pose updates');
};

const stopPlayerPoseUpdates = () => {
  if (playerPoseInterval) {
    clearInterval(playerPoseInterval);
    playerPoseInterval = null;
    console.log('🎮 Stopped requesting camera pose updates');
  }
};

const handleAREntered = () => {
  console.log('AR entered');
  lastError.value = null;
};

const handleARExited = () => {
  console.log('AR exited');
  isInARMode.value = false;
  stopPlayerPoseUpdates();
  
  // Clean up player avatars via Remote API
  playerAvatars.value.forEach((userId) => {
    if (session.value) {
      try {
        const remoteApi = (session.value as any).remoteApi;
        if (remoteApi && typeof remoteApi.send === 'function') {
          remoteApi.send({
            type: 'REMOVE_PLAYER_AVATAR',
            userId,
          });
        }
      } catch (error) {
        console.error(`Failed to remove avatar for ${userId}:`, error);
      }
    }
  });
  playerAvatars.value.clear();
};

const setupNetworkHandlers = () => {
  // Handle player pose updates
  store.networkSync.onMessage('PLAYER_POSE', (message: any) => {
    if (!session.value) return;
    
    const userId = message.userId;
    // Don't render our own avatar
    if (userId === store.networkSync.userId) return;
    
    // Send player pose to Lens via Remote API
    // Lens will render the avatar at the specified position
    try {
      const remoteApi = (session.value as any).remoteApi;
      if (!remoteApi || typeof remoteApi.send !== 'function') {
        console.warn('Remote API not available');
        return;
      }
      
      remoteApi.send({
        type: 'UPDATE_PLAYER_POSE',
        userId,
        position: message.position,
        rotation: message.rotation,
      });
      
      // Track avatar IDs
      if (!playerAvatars.value.has(userId)) {
        playerAvatars.value.add(userId);
        // Tell Lens to create avatar for this player
        remoteApi.send({
          type: 'CREATE_PLAYER_AVATAR',
          userId,
          position: message.position,
          rotation: message.rotation,
        });
      }
    } catch (error) {
      console.error('Failed to send player pose to Lens:', error);
    }
  });
  
  // Handle participant left - clean up their avatar
  store.networkSync.onMessage('PARTICIPANT_LEFT', (message: any) => {
    const userId = message.userId;
    if (session.value && playerAvatars.value.has(userId)) {
      try {
        const remoteApi = (session.value as any).remoteApi;
        if (remoteApi && typeof remoteApi.send === 'function') {
          remoteApi.send({
            type: 'REMOVE_PLAYER_AVATAR',
            userId,
          });
          playerAvatars.value.delete(userId);
          console.log(`🗑️ Removed avatar for player ${userId}`);
        }
      } catch (error) {
        console.error(`Failed to remove avatar for ${userId}:`, error);
      }
    }
  });
  
  // Handle high five messages
  store.networkSync.onMessage('HIGH_FIVE', (message: any) => {
    // Only show if we're the recipient
    if (message.toUserId === store.networkSync.userId) {
      console.log(`🙌 Received high five from ${message.fromUserId}`);
      
      // Show toast notification
      const toast = document.createElement('div');
      toast.className = 'high-five-toast';
      toast.textContent = '🙌 High five received!';
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.remove();
      }, 2000);
    }
  });
  
  // Handle object creation from network
  store.networkSync.onMessage('OBJECT_CREATE', (message: any) => {
    if (!session.value) return;
    
    const objId = message.objectId;
    if (placedObjects.value.has(objId)) return; // Already created
    
    // Send object creation command to Lens via Remote API
    try {
      const remoteApi = (session.value as any).remoteApi;
      if (remoteApi && typeof remoteApi.send === 'function') {
        remoteApi.send({
          type: 'CREATE_OBJECT',
          objectId: objId,
          position: message.position,
          rotation: message.rotation,
          objectType: message.objectType || 'cube',
        });
        
        placedObjects.value.add(objId);
      }
    } catch (error) {
      console.error('Failed to create object via Remote API:', error);
    }
  });
  
  // Handle object updates from network
  store.networkSync.onMessage('OBJECT_UPDATE', (message: any) => {
    if (!session.value) return;
    
    const objId = message.objectId;
    if (!placedObjects.value.has(objId)) return;
    
    // Send object update command to Lens via Remote API
    try {
      const remoteApi = (session.value as any).remoteApi;
      if (remoteApi && typeof remoteApi.send === 'function') {
        remoteApi.send({
          type: 'UPDATE_OBJECT',
          objectId: objId,
          position: message.position,
          rotation: message.rotation,
        });
      }
    } catch (error) {
      console.error('Failed to update object via Remote API:', error);
    }
  });
  
  // Handle state sync (for late joiners)
  store.networkSync.onMessage('STATE_SYNC', (message: any) => {
    if (!session.value || !anchorFound.value) {
      // Queue state sync until anchor is found
      return;
    }
    
    // Send all objects to Lens via Remote API
    message.objects.forEach((obj: any) => {
      const objId = obj.objectId;
      if (placedObjects.value.has(objId)) return;
      
      try {
        const remoteApi = (session.value as any).remoteApi;
        if (remoteApi && typeof remoteApi.send === 'function') {
          remoteApi.send({
            type: 'CREATE_OBJECT',
            objectId: objId,
            position: obj.position,
            rotation: obj.rotation,
            objectType: obj.objectType || 'cube',
          });
          
          placedObjects.value.add(objId);
        }
      } catch (error) {
        console.error(`Failed to sync object ${objId}:`, error);
      }
    });
  });
  
  // Listen for camera pose updates from Lens
  if (session.value) {
    // Remote API events - check Camera Kit docs for correct event name
    (session.value as any).events.addEventListener('remote-api', (event: CustomEvent) => {
      const message = event.detail;
      
      if (message.type === 'CAMERA_POSE_UPDATE') {
        // Lens sent camera pose, forward to network
        if (message.position && message.rotation) {
          store.networkSync.sendPlayerPose(
            message.position,
            message.rotation
          );
        }
      }
    });
  }
};

// Watch for anchor found to apply queued state sync
watch(anchorFound, (found) => {
  if (found && store.worldObjects.size > 0) {
    // Apply state sync now that anchor is found
    // This will be handled by the STATE_SYNC handler
  }
});
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
  z-index: 1;
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

/* High five toast styles */
.high-five-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 12px 20px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  border-radius: 8px;
  font-size: 1.1rem;
  z-index: 10000;
  animation: slideIn 0.3s ease, slideOut 0.3s ease 1.7s forwards;
}

@keyframes slideIn {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideOut {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(400px);
    opacity: 0;
  }
}
</style>
