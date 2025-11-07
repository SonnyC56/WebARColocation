import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useNetworkSync } from '../composables/useNetworkSync';
import type {
  Participant,
  VirtualObject,
  StateSyncMessage,
  ParticipantJoinedMessage,
  ParticipantLeftMessage,
} from '../types';

export const useSessionStore = defineStore('session', () => {
  const networkSync = useNetworkSync();
  
  const roomId = ref<string | null>(null);
  const userId = ref<string | null>(null);
  const isHost = ref(false);
  const participants = ref<Map<string, Participant>>(new Map());
  const worldObjects = ref<Map<string, VirtualObject>>(new Map());
  const connectionStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected');

  // Computed
  // Include yourself in the count (participants map doesn't include you, just others)
  const participantCount = computed(() => {
    // If connected, count is participants + yourself, otherwise 0
    return connectionStatus.value === 'connected' ? participants.value.size + 1 : 0;
  });
  const participantList = computed(() => Array.from(participants.value.values()));

  // Initialize network sync handlers
  networkSync.onMessage('STATE_SYNC', (message: any) => {
    const sync = message as StateSyncMessage;
    worldObjects.value.clear();
    sync.objects.forEach((obj) => {
      worldObjects.value.set(obj.objectId, obj);
    });
    participants.value.clear();
    sync.participants.forEach((p) => {
      participants.value.set(p.userId, p);
    });
  });

  networkSync.onMessage('PARTICIPANT_JOINED', (message: any) => {
    const msg = message as ParticipantJoinedMessage;
    participants.value.set(msg.userId, {
      userId: msg.userId,
      userName: msg.userName,
      isHost: false,
    });
  });

  networkSync.onMessage('PARTICIPANT_LEFT', (message: any) => {
    const msg = message as ParticipantLeftMessage;
    participants.value.delete(msg.userId);
  });

  // Actions
  const createSession = async (userName?: string): Promise<string> => {
    connectionStatus.value = 'connecting';
    
    try {
      await networkSync.connect();
      const newRoomId = await networkSync.createRoom(userName);
      
      roomId.value = newRoomId;
      userId.value = networkSync.userId.value;
      isHost.value = true;
      connectionStatus.value = 'connected';
      
      return newRoomId;
    } catch (error) {
      connectionStatus.value = 'disconnected';
      throw error;
    }
  };

  const joinSession = async (roomCode: string, userName?: string): Promise<void> => {
    connectionStatus.value = 'connecting';
    
    try {
      await networkSync.connect();
      await networkSync.joinRoom(roomCode, userName);
      
      roomId.value = roomCode;
      userId.value = networkSync.userId.value;
      isHost.value = false;
      connectionStatus.value = 'connected';
    } catch (error) {
      connectionStatus.value = 'disconnected';
      throw error;
    }
  };

  const leaveSession = (): void => {
    networkSync.disconnect();
    roomId.value = null;
    userId.value = null;
    isHost.value = false;
    participants.value.clear();
    worldObjects.value.clear();
    connectionStatus.value = 'disconnected';
  };

  const addObject = (object: VirtualObject): void => {
    worldObjects.value.set(object.objectId, object);
  };

  const updateObject = (objectId: string, updates: Partial<VirtualObject>): void => {
    const obj = worldObjects.value.get(objectId);
    if (obj) {
      worldObjects.value.set(objectId, { ...obj, ...updates });
    }
  };

  const removeObject = (objectId: string): void => {
    worldObjects.value.delete(objectId);
  };

  return {
    // State
    roomId,
    userId,
    isHost,
    participants,
    worldObjects,
    connectionStatus,
    // Computed
    participantCount,
    participantList,
    // Network sync
    networkSync,
    // Actions
    createSession,
    joinSession,
    leaveSession,
    addObject,
    updateObject,
    removeObject,
  };
});
