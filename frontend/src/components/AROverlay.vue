<template>
  <div class="ar-overlay">
    <!-- Debug Panel (Top Left) -->
    <div class="debug-panel">
      <div class="debug-header">
        <span>DEBUG</span>
        <button @click="showDebug = !showDebug" class="debug-toggle">
          {{ showDebug ? '▼' : '▲' }}
        </button>
      </div>
      <div v-if="showDebug" class="debug-content">
        <div class="debug-line">
          <span class="debug-label">WebXR:</span>
          <span :class="['debug-value', props.debugInfo.webxrSupported ? 'ok' : 'error']">
            {{ props.debugInfo.webxrSupported ? 'Supported' : 'Not Supported' }}
          </span>
        </div>
        <div class="debug-line">
          <span class="debug-label">AR Session:</span>
          <span :class="['debug-value', props.debugInfo.arActive ? 'ok' : 'warning']">
            {{ props.debugInfo.arActive ? 'Active' : 'Inactive' }}
          </span>
        </div>
        <div class="debug-line">
          <span class="debug-label">Image Tracking:</span>
          <span :class="['debug-value', props.debugInfo.trackingInitialized ? 'ok' : 'warning']">
            {{ props.debugInfo.trackingInitialized ? 'Init' : 'Not Init' }}
          </span>
        </div>
        <div class="debug-line">
          <span class="debug-label">QR Anchor:</span>
          <span :class="['debug-value', props.anchorFound ? 'ok' : 'warning']">
            {{ props.anchorFound ? 'Found' : 'Not Found' }}
          </span>
        </div>
        <div class="debug-line">
          <span class="debug-label">Network:</span>
          <span :class="['debug-value', props.debugInfo.networkConnected ? 'ok' : 'error']">
            {{ props.debugInfo.networkConnected ? 'Connected' : 'Disconnected' }}
          </span>
        </div>
        <div class="debug-line">
          <span class="debug-label">Room:</span>
          <span class="debug-value">{{ props.debugInfo.roomId || 'None' }}</span>
        </div>
        <div class="debug-line">
          <span class="debug-label">Scene Objects:</span>
          <span class="debug-value">{{ props.debugInfo.objectCount }}</span>
        </div>
        <div v-if="props.debugInfo.lastError" class="debug-line error-line">
          <span class="debug-label">Error:</span>
          <span class="debug-value error">{{ props.debugInfo.lastError }}</span>
        </div>
      </div>
    </div>

    <!-- Status bar -->
    <div class="status-bar">
      <div class="status-item">
        <span class="status-label">Room:</span>
        <span class="status-value">{{ store.roomId }}</span>
      </div>
      <div class="status-item">
        <span class="status-label">Participants:</span>
        <span class="status-value">{{ store.participantCount }}</span>
      </div>
      <div class="status-item" :class="{ 'status-ok': props.anchorFound, 'status-warning': !props.anchorFound }">
        <span class="status-label">Anchor:</span>
        <span class="status-value">{{ props.anchorFound ? 'Found' : 'Not Found' }}</span>
      </div>
    </div>

    <!-- Center instructions -->
    <div v-if="!props.anchorFound" class="center-instruction">
      <div class="instruction-card">
        <h3>Scan QR Code</h3>
        <p>Point your device at the QR marker to anchor the AR experience</p>
        <button @click="handleFocusCamera" class="btn-focus">
          Focus Camera
        </button>
      </div>
    </div>

    <!-- Bottom controls -->
    <div class="controls">
      <button @click="handleFocusCamera" class="btn-control btn-focus">
        Focus Camera
      </button>
      <button @click="handlePlaceObject" class="btn-control" :disabled="!props.anchorFound">
        Place Object
      </button>
      <button @click="handleExitAR" class="btn-control btn-exit">
        Exit AR
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useSessionStore } from '../stores/session';

const store = useSessionStore();
const showDebug = ref(true);

export interface DebugInfo {
  webxrSupported: boolean;
  arActive: boolean;
  trackingInitialized: boolean;
  networkConnected: boolean;
  roomId: string | null;
  objectCount: number;
  lastError: string | null;
}

const props = defineProps<{
  anchorFound: boolean;
  debugInfo: DebugInfo;
}>();

const emit = defineEmits<{
  'place-object': [];
  'exit-ar': [];
  'focus-camera': [];
}>();

const handlePlaceObject = () => {
  emit('place-object');
};

const handleExitAR = () => {
  emit('exit-ar');
};

const handleFocusCamera = () => {
  emit('focus-camera');
};
</script>

<style scoped>
.ar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 1000;
}

.status-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 12px 20px;
  display: flex;
  justify-content: space-around;
  gap: 20px;
  pointer-events: auto;
}

.status-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.status-label {
  font-size: 0.75rem;
  opacity: 0.8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-value {
  font-size: 0.9rem;
  font-weight: 600;
}

.status-ok {
  color: #4ade80;
}

.status-warning {
  color: #fbbf24;
}

.center-instruction {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: auto;
}

.instruction-card {
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 24px 32px;
  border-radius: 16px;
  text-align: center;
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.instruction-card h3 {
  margin: 0 0 12px 0;
  font-size: 1.5rem;
}

.instruction-card p {
  margin: 0;
  opacity: 0.9;
}

.controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.7);
  padding: 20px;
  display: flex;
  justify-content: center;
  gap: 16px;
  pointer-events: auto;
}

.btn-control {
  padding: 14px 28px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  background: rgba(102, 126, 234, 0.9);
  color: white;
  backdrop-filter: blur(10px);
  transition: all 0.2s;
}

.btn-control:hover:not(:disabled) {
  background: rgba(102, 126, 234, 1);
  transform: translateY(-2px);
}

.btn-control:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-exit {
  background: rgba(239, 68, 68, 0.9);
}

.btn-exit:hover:not(:disabled) {
  background: rgba(239, 68, 68, 1);
}

.debug-panel {
  position: absolute;
  top: 0;
  left: 0;
  background: rgba(0, 0, 0, 0.85);
  color: white;
  font-family: 'Courier New', monospace;
  font-size: 0.75rem;
  padding: 8px;
  z-index: 2000;
  pointer-events: auto;
  max-width: 280px;
  max-height: 70vh;
  overflow-y: auto;
  border-radius: 0 0 8px 0;
  border-right: 2px solid rgba(255, 255, 255, 0.3);
  border-bottom: 2px solid rgba(255, 255, 255, 0.3);
}

.debug-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
  margin-bottom: 4px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
}

.debug-toggle {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.7rem;
}

.debug-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.debug-line {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 0;
}

.debug-label {
  opacity: 0.8;
  min-width: 100px;
}

.debug-value {
  font-weight: 600;
  text-align: right;
}

.debug-value.ok {
  color: #4ade80;
}

.debug-value.warning {
  color: #fbbf24;
}

.debug-value.error {
  color: #f87171;
}

.error-line {
  background: rgba(248, 113, 113, 0.1);
  padding: 4px;
  border-radius: 4px;
  border-left: 2px solid #f87171;
}

.btn-focus {
  background: rgba(34, 197, 94, 0.9);
}

.btn-focus:hover:not(:disabled) {
  background: rgba(34, 197, 94, 1);
}

@media (max-width: 480px) {
  .debug-panel {
    font-size: 0.65rem;
    max-width: 240px;
    padding: 6px;
  }
  
  .debug-label {
    min-width: 80px;
  }
}
</style>
