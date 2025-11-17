<template>
  <div class="ar-scene-container">
    <canvas ref="canvasRef" class="ar-canvas"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useCameraKit } from '../composables/useCameraKit';

const props = defineProps<{
  lensId?: string;
  lensGroupId?: string;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const {
  initialize,
  createSession,
  setCameraSource,
  loadAndApplyLens,
  play,
  dispose
} = useCameraKit();

onMounted(async () => {
  if (!canvasRef.value) return;

  try {
    // Initialize Camera Kit
    const initialized = await initialize();
    if (!initialized) {
      console.error('Camera Kit initialization failed');
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

    // Load lens if provided
    if (props.lensId && props.lensGroupId) {
      const lensApplied = await loadAndApplyLens(
        newSession as any,
        props.lensId,
        props.lensGroupId
      );
      if (!lensApplied) {
        console.error('Failed to load lens');
      }
    }

    // Start rendering
    await play(newSession as any);
    console.log('Camera Kit ready');
  } catch (err: any) {
    console.error('Camera initialization error:', err);
  }
});

onUnmounted(() => {
  dispose();
});
</script>

<style scoped>
.ar-scene-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #000;
}

.ar-canvas {
  width: 100%;
  height: 100%;
  display: block;
  touch-action: none;
  object-fit: cover;
}
</style>
