import { ref, type Ref } from 'vue';
import { Scene, TransformNode, Vector3, Quaternion } from '@babylonjs/core';
import { WebXRImageTracking } from '@babylonjs/core/XR/features/WebXRImageTracking';

export interface ImageTrackingState {
  anchorNode: TransformNode | null;
  isTracking: boolean;
  lastKnownPosition: Vector3 | null;
  lastKnownRotation: Quaternion | null;
  driftDetected: boolean;
  timeSinceLastTracking: number;
}

export function useImageTracking(scene: Ref<Scene | null>, xrExperience: any) {
  const anchorNode = ref<TransformNode | null>(null);
  const isTracking = ref(false);
  const lastKnownPosition = ref<Vector3 | null>(null);
  const lastKnownRotation = ref<Quaternion | null>(null);
  const imageTrackingFeature = ref<WebXRImageTracking | null>(null);
  const driftDetected = ref(false);
  const timeSinceLastTracking = ref(0);
  
  // Drift detection parameters
  const DRIFT_THRESHOLD = 0.05; // 5cm position variance threshold
  const DRIFT_CHECK_INTERVAL = 5000; // Check every 5 seconds
  const MAX_TIME_WITHOUT_TRACKING = 30000; // 30 seconds
  let driftCheckInterval: number | null = null;
  let lastTrackingTime = Date.now();
  const positionHistory: Vector3[] = [];
  const MAX_HISTORY_SIZE = 10;

  // Initialize image tracking with QR marker
  const initializeImageTracking = async (qrImagePath: string, estimatedWidth: number = 0.2): Promise<boolean> => {
    if (!scene.value || !xrExperience.value) {
      console.error('Scene or XR experience not initialized');
      return false;
    }

    try {
      const featuresManager = xrExperience.value.featuresManager;
      
      if (!featuresManager) {
        console.error('Features manager not available');
        return false;
      }

      // Enable image tracking feature
      const imageTracking = featuresManager.enableFeature('WebXRImageTracking', 'latest', {
        images: [
          {
            src: qrImagePath,
            estimatedRealWidth: estimatedWidth, // meters
          },
        ],
      }) as WebXRImageTracking;

      if (!imageTracking) {
        console.error('Image tracking feature not available');
        return false;
      }

      imageTrackingFeature.value = imageTracking;

      // Create anchor node for tracked content
      anchorNode.value = new TransformNode('QRAnchor', scene.value);

      // Listen for tracked image updates
      imageTracking.onTrackedImageUpdatedObservable.add((event: any) => {
        if (event.imageIndex === 0) { // Our QR marker is index 0
          if (event.trackingState === 'tracked') {
            handleImageFound(event);
          } else if (event.trackingState === 'updated') {
            handleImageUpdated(event);
          } else {
            handleImageLost();
          }
        }
      });

      // Start drift monitoring
      startDriftMonitoring();

      return true;
    } catch (error) {
      console.error('Failed to initialize image tracking:', error);
      return false;
    }
  };

  const handleImageFound = (event: any) => {
    if (!anchorNode.value || !scene.value) return;

    isTracking.value = true;
    lastTrackingTime = Date.now();
    timeSinceLastTracking.value = 0;
    driftDetected.value = false;

    // Get transform from tracked image
    const transform = event.transform || event.transformationMatrix;
    if (transform) {
      // Update anchor node position and rotation
      let position: Vector3;
      let rotation: Quaternion;
      
      if (transform.getTranslation) {
        position = transform.getTranslation();
        rotation = transform.getRotationQuaternion();
      } else if (transform instanceof Vector3) {
        position = transform;
        rotation = Quaternion.Identity();
      } else {
        // Extract from matrix
        position = transform.getTranslation ? transform.getTranslation() : Vector3.Zero();
        rotation = transform.getRotationQuaternion ? transform.getRotationQuaternion() : Quaternion.Identity();
      }

      // Check for drift if we have previous position
      if (lastKnownPosition.value) {
        const positionDelta = Vector3.Distance(position, lastKnownPosition.value);
        if (positionDelta > DRIFT_THRESHOLD) {
          console.warn(`Potential drift detected: ${positionDelta.toFixed(3)}m`);
          driftDetected.value = true;
        }
      }

      anchorNode.value.position = position;
      anchorNode.value.rotationQuaternion = rotation;

      lastKnownPosition.value = position.clone();
      lastKnownRotation.value = rotation.clone();

      // Add to position history for drift analysis
      positionHistory.push(position.clone());
      if (positionHistory.length > MAX_HISTORY_SIZE) {
        positionHistory.shift();
      }
    }
  };

  const handleImageUpdated = (event: any) => {
    if (!anchorNode.value) return;

    const transform = event.transform || event.transformationMatrix;
    if (transform) {
      let position: Vector3;
      let rotation: Quaternion;
      
      if (transform.getTranslation) {
        position = transform.getTranslation();
        rotation = transform.getRotationQuaternion();
      } else {
        position = transform.getTranslation ? transform.getTranslation() : Vector3.Zero();
        rotation = transform.getRotationQuaternion ? transform.getRotationQuaternion() : Quaternion.Identity();
      }

      anchorNode.value.position = position;
      anchorNode.value.rotationQuaternion = rotation;

      lastKnownPosition.value = position.clone();
      lastKnownRotation.value = rotation.clone();
    }
  };

  const handleImageLost = () => {
    isTracking.value = false;
    // Keep last known position/rotation for drift correction
    // Don't immediately mark as drift - wait for monitoring to detect
  };

  // Start monitoring for drift
  const startDriftMonitoring = () => {
    if (driftCheckInterval) return;

    driftCheckInterval = window.setInterval(() => {
      const now = Date.now();
      timeSinceLastTracking.value = now - lastTrackingTime;

      // Check if tracking has been lost for too long
      if (!isTracking.value && timeSinceLastTracking.value > MAX_TIME_WITHOUT_TRACKING) {
        driftDetected.value = true;
        console.warn('Tracking lost for extended period - drift likely');
      }

      // Check position variance if we have history
      if (positionHistory.length >= 3 && isTracking.value) {
        const variance = calculatePositionVariance(positionHistory);
        if (variance > DRIFT_THRESHOLD) {
          driftDetected.value = true;
          console.warn(`High position variance detected: ${variance.toFixed(3)}m`);
        }
      }
    }, DRIFT_CHECK_INTERVAL);
  };

  // Stop drift monitoring
  const stopDriftMonitoring = () => {
    if (driftCheckInterval) {
      clearInterval(driftCheckInterval);
      driftCheckInterval = null;
    }
  };

  // Calculate position variance from history
  const calculatePositionVariance = (positions: Vector3[]): number => {
    if (positions.length < 2) return 0;

    // Calculate mean position
    const mean = Vector3.Zero();
    positions.forEach(pos => mean.addInPlace(pos));
    mean.scaleInPlace(1 / positions.length);

    // Calculate variance
    let variance = 0;
    positions.forEach(pos => {
      const distance = Vector3.Distance(pos, mean);
      variance += distance * distance;
    });

    return Math.sqrt(variance / positions.length);
  };

  // Relocalize: reset anchor when marker is found again
  const relocalize = () => {
    if (!anchorNode.value || !lastKnownPosition.value || !lastKnownRotation.value) {
      return;
    }

    // Reset anchor to last known good position
    anchorNode.value.position = lastKnownPosition.value.clone();
    anchorNode.value.rotationQuaternion = lastKnownRotation.value.clone();
    driftDetected.value = false;
    positionHistory.length = 0;
    
    console.log('Relocalized anchor to last known position');
  };

  // Get world position relative to anchor
  const getWorldPosition = (localPosition: Vector3): Vector3 => {
    if (!anchorNode.value) {
      return localPosition.clone();
    }

    const worldPosition = Vector3.TransformCoordinates(
      localPosition,
      anchorNode.value.getWorldMatrix()
    );
    return worldPosition;
  };

  // Convert world position to anchor-relative position
  const getLocalPosition = (worldPosition: Vector3): Vector3 => {
    if (!anchorNode.value) {
      return worldPosition.clone();
    }

    const inverseMatrix = anchorNode.value.getWorldMatrix().clone();
    inverseMatrix.invert();
    const localPosition = Vector3.TransformCoordinates(worldPosition, inverseMatrix);
    return localPosition;
  };

  return {
    anchorNode,
    isTracking,
    lastKnownPosition,
    lastKnownRotation,
    imageTrackingFeature,
    driftDetected,
    timeSinceLastTracking,
    initializeImageTracking,
    getWorldPosition,
    getLocalPosition,
    relocalize,
    stopDriftMonitoring,
  };
}
