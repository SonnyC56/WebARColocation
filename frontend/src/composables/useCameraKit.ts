import { ref, onUnmounted } from 'vue';
import { bootstrapCameraKit, createMediaStreamSource, Transform2D, type CameraKit, type CameraKitSession } from '@snap/camera-kit';

export interface CameraKitState {
  cameraKit: CameraKit | null;
  session: CameraKitSession | null;
  isActive: boolean;
  isSupported: boolean;
}

export function useCameraKit() {
  const cameraKit = ref<CameraKit | null>(null);
  const session = ref<CameraKitSession | null>(null);
  const isActive = ref(false);
  const isSupported = ref(true); // Camera Kit Web SDK supports modern browsers

  // Get API token from environment
  const getApiToken = (): string => {
    const token = import.meta.env.VITE_CAMERA_KIT_API_TOKEN;
    if (!token || token === 'your_api_token_here') {
      throw new Error('Camera Kit API token not configured. Please set VITE_CAMERA_KIT_API_TOKEN in your .env file');
    }
    return token;
  };

  // Bootstrap Camera Kit SDK
  const initialize = async (): Promise<boolean> => {
    try {
      const apiToken = getApiToken();
      cameraKit.value = await bootstrapCameraKit({ 
        apiToken,
        logger: import.meta.env.DEV ? 'console' : undefined, // Enable logging in dev mode
      });
      console.log('Camera Kit initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Camera Kit:', error);
      isSupported.value = false;
      return false;
    }
  };

  // Create a Camera Kit session
  const createSession = async (canvas?: HTMLCanvasElement): Promise<CameraKitSession | null> => {
    if (!cameraKit.value) {
      const initialized = await initialize();
      if (!initialized) {
        return null;
      }
    }

    try {
      const newSession = await cameraKit.value!.createSession({ 
        liveRenderTarget: canvas || undefined 
      });
      session.value = newSession;

      // Set up error handling
      newSession.events.addEventListener('error', (event) => {
        console.error('Camera Kit session error:', event.detail.error);
        if (event.detail.error.name === 'LensExecutionError') {
          console.error('Lens encountered an error and was removed');
          isActive.value = false;
        }
      });

      console.log('Camera Kit session created');
      return newSession;
    } catch (error) {
      console.error('Failed to create Camera Kit session:', error);
      return null;
    }
  };

  // Set camera source
  const setCameraSource = async (session: CameraKitSession): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Back camera for AR
        } 
      });
      
      const source = createMediaStreamSource(stream, {
        transform: Transform2D.MirrorX, // Mirror for natural feel
        cameraType: 'environment', // Back camera for world AR
      });

      await session.setSource(source);
      console.log('Camera source set successfully');
      return true;
    } catch (error) {
      console.error('Failed to set camera source:', error);
      return false;
    }
  };

  // Load and apply a Lens
  const loadAndApplyLens = async (
    session: CameraKitSession,
    lensId: string,
    lensGroupId: string
  ): Promise<boolean> => {
    if (!cameraKit.value) {
      console.error('Camera Kit not initialized');
      return false;
    }

    try {
      const lens = await cameraKit.value.lensRepository.loadLens(lensId, lensGroupId);
      await session.applyLens(lens);
      console.log('Lens applied successfully');
      return true;
    } catch (error) {
      console.error('Failed to load/apply Lens:', error);
      return false;
    }
  };

  // Start rendering
  const play = async (session: CameraKitSession): Promise<void> => {
    try {
      await session.play();
      isActive.value = true;
      console.log('Camera Kit session started');
    } catch (error) {
      console.error('Failed to start session:', error);
      isActive.value = false;
    }
  };

  // Stop rendering
  const pause = async (session: CameraKitSession): Promise<void> => {
    try {
      await session.pause();
      isActive.value = false;
      console.log('Camera Kit session paused');
    } catch (error) {
      console.error('Failed to pause session:', error);
    }
  };

  // Remove Lens
  const removeLens = async (session: CameraKitSession): Promise<void> => {
    try {
      await session.removeLens();
      console.log('Lens removed');
    } catch (error) {
      console.error('Failed to remove Lens:', error);
    }
  };

  // Change Lens (removes current and applies new one)
  const changeLens = async (
    session: CameraKitSession,
    lensId: string,
    lensGroupId: string
  ): Promise<boolean> => {
    try {
      // Remove current lens first
      await removeLens(session);

      // Load and apply new lens
      return await loadAndApplyLens(session, lensId, lensGroupId);
    } catch (error) {
      console.error('Failed to change Lens:', error);
      return false;
    }
  };

  // Cleanup
  const dispose = async (): Promise<void> => {
    if (session.value) {
      try {
        await session.value.pause();
        await session.value.removeLens();
      } catch (error) {
        console.error('Error during session cleanup:', error);
      }
      session.value = null;
    }
    isActive.value = false;
  };

  onUnmounted(() => {
    dispose();
  });

  return {
    cameraKit,
    session,
    isActive,
    isSupported,
    initialize,
    createSession,
    setCameraSource,
    loadAndApplyLens,
    changeLens,
    play,
    pause,
    removeLens,
    dispose,
  };
}

