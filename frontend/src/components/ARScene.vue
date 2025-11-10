<template>
  <div class="ar-scene-container">
    <canvas ref="canvasRef" class="ar-canvas"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useCameraKit } from '../composables/useCameraKit';
import type { CameraKitSession } from '@snap/camera-kit';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const { 
  cameraKit, 
  session, 
  isActive, 
  isSupported, 
  initialize, 
  createSession, 
  setCameraSource,
  loadAndApplyLens,
  play,
  pause,
  removeLens,
  dispose 
} = useCameraKit();

defineProps<{
  autoStart?: boolean;
}>();

const emit = defineEmits<{
  'ar-entered': [];
  'ar-exited': [];
  'session-ready': [session: CameraKitSession];
}>();

onMounted(async () => {
  if (!canvasRef.value) return;

  // Initialize Camera Kit
  const initialized = await initialize();
  if (!initialized) {
    console.warn('Camera Kit initialization failed');
    return;
  }

  // Create session with canvas
  const newSession = await createSession(canvasRef.value);
  if (!newSession) {
    console.error('Failed to create Camera Kit session');
    return;
  }

  // Set camera source
  const sourceSet = await setCameraSource(newSession);
  if (!sourceSet) {
    console.error('Failed to set camera source');
    return;
  }

  // Load and apply Lens (Lens IDs from environment)
  const lensId = import.meta.env.VITE_LENS_ID;
  const lensGroupId = import.meta.env.VITE_LENS_GROUP_ID;
  
  if (lensId && lensGroupId && lensId !== 'your_lens_id_here') {
    const lensApplied = await loadAndApplyLens(newSession as any, lensId, lensGroupId);
    if (lensApplied) {
      // Start rendering
      await play(newSession as any);
      emit('session-ready', newSession as any);
    } else {
      console.error('Failed to load/apply Lens');
    }
  } else {
    console.warn('Lens ID or Lens Group ID not configured. Set VITE_LENS_ID and VITE_LENS_GROUP_ID in .env');
    // Still emit session-ready so app can work without Lens initially
    emit('session-ready', newSession as any);
  }
});

watch(isActive, (newValue) => {
  if (newValue) {
    emit('ar-entered');
  } else {
    emit('ar-exited');
  }
});

onUnmounted(() => {
  dispose();
});

// Expose methods for parent components
const enterAR = async (): Promise<boolean> => {
  if (!session.value) {
    console.error('Camera Kit session not initialized');
    return false;
  }
  
  try {
    await play(session.value as any);
    return true;
  } catch (error) {
    console.error('Failed to enter AR:', error);
    return false;
  }
};

const exitAR = async (): Promise<void> => {
  if (session.value) {
    try {
      await pause(session.value as any);
      await removeLens(session.value as any);
    } catch (error) {
      console.error('Failed to exit AR:', error);
    }
  }
};

defineExpose({
  enterAR,
  exitAR,
  isSupported,
  isActive,
  session,
  cameraKit,
});
</script>

<style scoped>
.ar-scene-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  z-index: 1;
  background: #000;
}

.ar-canvas {
  width: 100%;
  height: 100%;
  display: block;
  touch-action: none;
  position: absolute;
  top: 0;
  left: 0;
  object-fit: cover;
  z-index: 1;
}
</style>
