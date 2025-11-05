import { ref, onUnmounted } from 'vue';
import { Engine, Scene, WebXRDefaultExperience } from '@babylonjs/core';

export interface WebXRState {
  engine: Engine | null;
  scene: Scene | null;
  xrExperience: WebXRDefaultExperience | null;
  isInAR: boolean;
  isSupported: boolean;
}

export function useWebXR() {
  const engine = ref<Engine | null>(null);
  const scene = ref<Scene | null>(null);
  const xrExperience = ref<WebXRDefaultExperience | null>(null);
  const isInAR = ref(false);
  const isSupported = ref(false);

  // Check if WebXR is supported
  const checkSupport = async (): Promise<boolean> => {
    if (!navigator.xr) {
      isSupported.value = false;
      return false;
    }

    try {
      const supported = await navigator.xr.isSessionSupported('immersive-ar');
      isSupported.value = supported;
      return supported;
    } catch (error) {
      console.error('WebXR support check failed:', error);
      isSupported.value = false;
      return false;
    }
  };

  // Initialize Babylon.js engine and scene
  const initializeEngine = async (canvas: HTMLCanvasElement): Promise<boolean> => {
    try {
      engine.value = new Engine(canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true,
      });

      scene.value = new Scene(engine.value as any);
      
      // Configure scene for AR
      scene.value.clearColor.set(0, 0, 0, 0); // Transparent background
      
      // Enable WebXR
      const xr = await scene.value.createDefaultXRExperienceAsync({
        uiOptions: {
          sessionMode: 'immersive-ar',
          referenceSpaceType: 'local-floor',
        },
        optionalFeatures: true,
      });

      xrExperience.value = xr;

      // Handle AR session start
      xr.baseExperience.onStateChangedObservable.add((state) => {
        if (state === 2) { // XRSessionState.IN_SESSION
          isInAR.value = true;
        } else {
          isInAR.value = false;
        }
      });

      // Handle AR session end
      xr.baseExperience.onStateChangedObservable.add((state) => {
        if (state === 1) { // XRSessionState.NOT_IN_SESSION
          isInAR.value = false;
        }
      });

      // Start render loop
      engine.value.runRenderLoop(() => {
        if (scene.value) {
          scene.value.render();
        }
      });

      // Handle window resize
      window.addEventListener('resize', () => {
        engine.value?.resize();
      });

      return true;
    } catch (error) {
      console.error('Failed to initialize engine:', error);
      return false;
    }
  };

  // Enter AR mode
  const enterAR = async (): Promise<boolean> => {
    if (!xrExperience.value) {
      console.error('XR experience not initialized');
      return false;
    }

    try {
      await xrExperience.value.baseExperience.enterXRAsync('immersive-ar', 'local-floor');
      return true;
    } catch (error) {
      console.error('Failed to enter AR:', error);
      return false;
    }
  };

  // Exit AR mode
  const exitAR = async (): Promise<void> => {
    if (xrExperience.value) {
      try {
        await xrExperience.value.baseExperience.exitXRAsync();
      } catch (error) {
        console.error('Failed to exit AR:', error);
      }
    }
  };

  // Cleanup
  const dispose = () => {
    if (engine.value) {
      engine.value.dispose();
      engine.value = null;
    }
    scene.value = null;
    xrExperience.value = null;
    isInAR.value = false;
  };

  onUnmounted(() => {
    dispose();
  });

  return {
    engine,
    scene,
    xrExperience,
    isInAR,
    isSupported,
    checkSupport,
    initializeEngine,
    enterAR,
    exitAR,
    dispose,
  };
}
