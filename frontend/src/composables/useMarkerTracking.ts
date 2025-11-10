import { ref, type Ref } from 'vue';
import type { CameraKitSession } from '@snap/camera-kit';

// Simplified transform interface (similar to Babylon.js Vector3/Quaternion)
export interface Transform {
  position: [number, number, number]; // x, y, z
  rotation: [number, number, number, number]; // quaternion x, y, z, w
}

export interface MarkerTrackingState {
  isTracking: boolean;
  lastKnownPosition: [number, number, number] | null;
  lastKnownRotation: [number, number, number, number] | null;
  transform: Transform | null;
}

export function useMarkerTracking(session: Ref<CameraKitSession | null>) {
  const isTracking = ref(false);
  const lastKnownPosition = ref<[number, number, number] | null>(null);
  const lastKnownRotation = ref<[number, number, number, number] | null>(null);
  const transform = ref<Transform | null>(null);

  // Remote API message handler
  const handleRemoteAPIMessage = (event: CustomEvent) => {
    const message = event.detail;
    
    // Handle marker tracking events from Lens
    if (message.type === 'MARKER_FOUND' || message.type === 'MARKER_UPDATED') {
      isTracking.value = true;
      
      if (message.position && message.rotation) {
        const pos: [number, number, number] = message.position;
        const rot: [number, number, number, number] = message.rotation;
        
        lastKnownPosition.value = pos;
        lastKnownRotation.value = rot;
        transform.value = { position: pos, rotation: rot };
        
        console.log('🎯 Marker tracked:', {
          position: pos,
          rotation: rot,
        });
      }
    } else if (message.type === 'MARKER_LOST') {
      isTracking.value = false;
      console.log('🎯 Marker lost');
    }
  };

  // Initialize marker tracking by setting up Remote API listeners
  const initializeMarkerTracking = (): void => {
    if (!session.value) {
      console.error('Camera Kit session not available');
      return;
    }

    // Set up Remote API event listener
    // The Lens will send marker tracking data via Remote API
    // Note: Remote API events may use a different event name - check Camera Kit docs
    (session.value as any).events.addEventListener('remote-api', handleRemoteAPIMessage);
    
    console.log('Marker tracking initialized - waiting for Lens to send tracking data');
  };

  // Send command to Lens to start tracking (if needed)
  const startTracking = (markerImagePath: string, estimatedWidth: number = 0.2): void => {
    if (!session.value) {
      console.error('Camera Kit session not available');
      return;
    }

    // Send message to Lens via Remote API to start marker tracking
    // The Lens should be configured in Lens Studio to listen for this
    try {
      // Remote API: send message to Lens
      // Note: The exact API may vary - check Camera Kit Web SDK docs for latest API
      if ('remoteApi' in session.value && typeof (session.value as any).remoteApi?.send === 'function') {
        (session.value as any).remoteApi.send({
          type: 'START_MARKER_TRACKING',
          markerImage: markerImagePath,
          estimatedWidth: estimatedWidth,
        });
        console.log(`Marker tracking started for ${markerImagePath}`);
      } else {
        console.warn('Remote API not available - Lens should handle marker tracking automatically');
      }
    } catch (error) {
      console.error('Failed to send marker tracking command:', error);
    }
  };

  // Stop tracking
  const stopTracking = (): void => {
    if (!session.value) {
      return;
    }

    try {
      if ('remoteApi' in session.value && typeof (session.value as any).remoteApi?.send === 'function') {
        (session.value as any).remoteApi.send({
          type: 'STOP_MARKER_TRACKING',
        });
        isTracking.value = false;
        console.log('Marker tracking stopped');
      }
    } catch (error) {
      console.error('Failed to stop marker tracking:', error);
    }
  };

  // Get world position from local position (for coordinate conversion)
  // Note: Camera Kit uses its own coordinate system, may need conversion
  const getWorldPosition = (localPosition: [number, number, number]): [number, number, number] => {
    // For now, return as-is. Coordinate system conversion may be needed
    // depending on how Camera Kit's coordinate system maps to world space
    return localPosition;
  };

  // Convert world position to local (marker-relative) position
  const getLocalPosition = (worldPosition: [number, number, number]): [number, number, number] => {
    // For now, return as-is. Coordinate system conversion may be needed
    return worldPosition;
  };

  // Cleanup
  const dispose = (): void => {
    if (session.value) {
      (session.value as any).events.removeEventListener('remote-api', handleRemoteAPIMessage);
    }
    isTracking.value = false;
    lastKnownPosition.value = null;
    lastKnownRotation.value = null;
    transform.value = null;
  };

  return {
    isTracking,
    lastKnownPosition,
    lastKnownRotation,
    transform,
    initializeMarkerTracking,
    startTracking,
    stopTracking,
    getWorldPosition,
    getLocalPosition,
    dispose,
  };
}

