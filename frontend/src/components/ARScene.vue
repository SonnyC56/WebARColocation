<template>
  <div class="ar-scene-container">
    <canvas ref="canvasRef" class="ar-canvas"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useWebXR } from '../composables/useWebXR';
import type { Engine, Scene } from '@babylonjs/core';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const { engine, scene, xrExperience, isInAR, isSupported, checkSupport, initializeEngine, enterAR, exitAR, dispose } = useWebXR();

defineProps<{
  autoStart?: boolean;
}>();

const emit = defineEmits<{
  'ar-entered': [];
  'ar-exited': [];
  'engine-ready': [engine: Engine, scene: Scene];
}>();

onMounted(async () => {
  if (!canvasRef.value) return;

  // Check WebXR support
  const supported = await checkSupport();
  if (!supported) {
    console.warn('WebXR immersive-ar not supported on this device');
  }

  // Initialize engine
  const initialized = await initializeEngine(canvasRef.value);
  if (initialized && engine.value && scene.value) {
    emit('engine-ready', engine.value as Engine, scene.value as Scene);
  }
});

watch(isInAR, (newValue) => {
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
defineExpose({
  enterAR,
  exitAR,
  isSupported,
  isInAR,
  engine,
  scene,
  xrExperience,
  checkSupport,
});
</script>

<style scoped>
.ar-scene-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.ar-canvas {
  width: 100%;
  height: 100%;
  display: block;
  touch-action: none;
}
</style>
