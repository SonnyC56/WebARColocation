<template>
  <div class="session-ui">
    <div class="session-container">
      <h1>QR AR Co-Location</h1>
      
      <div v-if="!store.connectionStatus || store.connectionStatus === 'disconnected'" class="session-actions">
        <button @click="handleCreateSession" class="btn btn-primary" :disabled="isLoading">
          Create Session
        </button>
        
        <div class="divider">
          <span>or</span>
        </div>
        
        <div class="join-section">
          <input
            v-model="roomCode"
            type="text"
            placeholder="Enter room code"
            class="input"
            maxlength="6"
            @keyup.enter="handleJoinSession"
          />
          <button @click="handleJoinSession" class="btn btn-secondary" :disabled="!roomCode || isLoading">
            Join Session
          </button>
        </div>
      </div>

      <div v-else-if="store.connectionStatus === 'connecting'" class="status">
        <div class="spinner"></div>
        <p>Connecting...</p>
      </div>

      <div v-else-if="store.connectionStatus === 'connected'" class="session-info">
        <div class="room-info">
          <h2>Room: {{ store.roomId }}</h2>
          <p class="participants">{{ store.participantCount }} participant(s)</p>
          
          <div class="room-code-display">
            <label>Share this code:</label>
            <div class="code-container">
              <code class="room-code">{{ store.roomId }}</code>
              <button @click="copyRoomCode" class="btn-icon" title="Copy to clipboard">
                📋
              </button>
            </div>
          </div>
        </div>

        <div class="actions">
          <button @click="handleStartAR" class="btn btn-primary btn-large" :disabled="!canStartAR">
            Start AR Experience
          </button>
          <button @click="handleLeaveSession" class="btn btn-secondary">
            Leave Session
          </button>
        </div>
      </div>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSessionStore } from '../stores/session';

const store = useSessionStore();
const roomCode = ref('');
const isLoading = ref(false);
const error = ref<string | null>(null);
const userName = ref('');

const canStartAR = computed(() => {
  return store.connectionStatus === 'connected' && store.roomId !== null;
});

const handleCreateSession = async () => {
  isLoading.value = true;
  error.value = null;
  
  try {
    await store.createSession(userName.value || undefined);
  } catch (err: any) {
    error.value = err.message || 'Failed to create session';
  } finally {
    isLoading.value = false;
  }
};

const handleJoinSession = async () => {
  if (!roomCode.value.trim()) return;
  
  isLoading.value = true;
  error.value = null;
  
  try {
    await store.joinSession(roomCode.value.toUpperCase(), userName.value || undefined);
  } catch (err: any) {
    error.value = err.message || 'Failed to join session';
  } finally {
    isLoading.value = false;
  }
};

const handleStartAR = () => {
  emit('start-ar');
};

const handleLeaveSession = () => {
  store.leaveSession();
  roomCode.value = '';
};

const copyRoomCode = async () => {
  if (store.roomId) {
    try {
      await navigator.clipboard.writeText(store.roomId);
      // Could show a toast notification here
    } catch (err) {
      console.error('Failed to copy room code:', err);
    }
  }
};

const emit = defineEmits<{
  'start-ar': [];
}>();
</script>

<style scoped>
.session-ui {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.session-container {
  background: white;
  border-radius: 16px;
  padding: 40px;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

h1 {
  margin: 0 0 30px 0;
  text-align: center;
  color: #333;
  font-size: 2rem;
}

.session-actions {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #5568d3;
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
}

.btn-secondary:hover:not(:disabled) {
  background: #e0e0e0;
}

.btn-large {
  padding: 16px 32px;
  font-size: 1.1rem;
}

.divider {
  display: flex;
  align-items: center;
  text-align: center;
  color: #999;
  margin: 10px 0;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid #ddd;
}

.divider span {
  padding: 0 10px;
}

.join-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input {
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  text-transform: uppercase;
  text-align: center;
  letter-spacing: 2px;
}

.input:focus {
  outline: none;
  border-color: #667eea;
}

.status {
  text-align: center;
  padding: 40px 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.session-info {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.room-info h2 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 1.5rem;
}

.participants {
  color: #666;
  margin: 0 0 20px 0;
}

.room-code-display {
  margin-top: 20px;
}

.room-code-display label {
  display: block;
  margin-bottom: 8px;
  color: #666;
  font-size: 0.9rem;
}

.code-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.room-code {
  flex: 1;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 8px;
  font-size: 1.5rem;
  font-weight: bold;
  letter-spacing: 4px;
  text-align: center;
  font-family: monospace;
}

.btn-icon {
  padding: 12px;
  border: none;
  background: #f0f0f0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.2rem;
}

.btn-icon:hover {
  background: #e0e0e0;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.error-message {
  margin-top: 20px;
  padding: 12px;
  background: #fee;
  color: #c33;
  border-radius: 8px;
  border: 1px solid #fcc;
}
</style>
