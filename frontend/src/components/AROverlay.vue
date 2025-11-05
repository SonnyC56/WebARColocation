<template>
  <div class="ar-overlay">
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
      <div class="status-item" :class="{ 'status-ok': anchorFound, 'status-warning': !anchorFound }">
        <span class="status-label">Anchor:</span>
        <span class="status-value">{{ anchorFound ? 'Found' : 'Not Found' }}</span>
      </div>
    </div>

    <!-- Center instructions -->
    <div v-if="!anchorFound" class="center-instruction">
      <div class="instruction-card">
        <h3>Scan QR Code</h3>
        <p>Point your device at the QR marker to anchor the AR experience</p>
      </div>
    </div>

    <!-- Bottom controls -->
    <div class="controls">
      <button @click="handlePlaceObject" class="btn-control" :disabled="!anchorFound">
        Place Object
      </button>
      <button @click="handleExitAR" class="btn-control btn-exit">
        Exit AR
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSessionStore } from '../stores/session';

const store = useSessionStore();

const props = defineProps<{
  anchorFound: boolean;
}>();

const emit = defineEmits<{
  'place-object': [];
  'exit-ar': [];
}>();

const handlePlaceObject = () => {
  emit('place-object');
};

const handleExitAR = () => {
  emit('exit-ar');
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
</style>
