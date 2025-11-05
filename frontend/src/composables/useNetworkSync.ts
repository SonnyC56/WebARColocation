import { ref, onUnmounted } from 'vue';
import type {
  Message,
  JoinRoomMessage,
  CreateRoomMessage,
  PlayerPoseMessage,
  ObjectCreateMessage,
  ObjectUpdateMessage,
  AnchorFoundMessage,
  RoomCreatedResponse,
  RoomJoinedResponse,
  ErrorMessage,
} from '../types';

export interface NetworkSyncState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  roomId: string | null;
  userId: string | null;
  isHost: boolean;
}

export function useNetworkSync() {
  const ws = ref<WebSocket | null>(null);
  const connected = ref(false);
  const connecting = ref(false);
  const error = ref<string | null>(null);
  const roomId = ref<string | null>(null);
  const userId = ref<string | null>(null);
  const isHost = ref(false);

  const serverUrl = (() => {
    const envUrl = import.meta.env.VITE_SERVER_URL;
    
    // If environment variable is set, use it and ensure protocol matches page protocol
    if (envUrl) {
      // If page is HTTPS and URL is ws://, convert to wss://
      if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
        if (envUrl.startsWith('ws://')) {
          console.warn('Converting ws:// to wss:// for HTTPS page');
          return envUrl.replace('ws://', 'wss://');
        }
      }
      // If page is HTTP and URL is wss://, convert to ws:// (for local dev)
      if (typeof window !== 'undefined' && window.location.protocol === 'http:') {
        if (envUrl.startsWith('wss://') && window.location.hostname === 'localhost') {
          console.warn('Converting wss:// to ws:// for local HTTP development');
          return envUrl.replace('wss://', 'ws://');
        }
      }
      return envUrl;
    }
    
    // Default to droplet IP for development/testing
    // Will auto-convert ws:// to wss:// if page is HTTPS
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//138.197.104.25`;
    }
    
    // Fallback (shouldn't happen in browser)
    return 'ws://138.197.104.25';
  })();

  // Throttle for player pose updates (10-15 Hz)
  let lastPoseUpdate = 0;
  const POSE_UPDATE_INTERVAL = 1000 / 15; // 15 Hz

  // Message handlers
  const messageHandlers = new Map<string, (message: Message) => void>();

  const connect = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (connecting.value || connected.value) {
        resolve();
        return;
      }

      connecting.value = true;
      error.value = null;

      try {
        // In browser, use native WebSocket
        const WebSocketClass = typeof window !== 'undefined' ? window.WebSocket : WebSocket;
        const socket = new WebSocketClass(serverUrl) as WebSocket;

        socket.onopen = () => {
          ws.value = socket as any;
          connected.value = true;
          connecting.value = false;
          console.log('WebSocket connected');
          resolve();
        };

        socket.onerror = (err: any) => {
          connecting.value = false;
          error.value = 'Failed to connect to server';
          console.error('WebSocket error:', err);
          reject(err);
        };

        socket.onclose = () => {
          connected.value = false;
          ws.value = null;
          console.log('WebSocket closed');
        };

        socket.onmessage = (event: MessageEvent) => {
          try {
            const message: Message = JSON.parse(event.data);
            handleMessage(message);
          } catch (err) {
            console.error('Failed to parse message:', err);
          }
        };
      } catch (err) {
        connecting.value = false;
        error.value = 'Failed to create WebSocket connection';
        reject(err);
      }
    });
  };

  const disconnect = () => {
    if (ws.value) {
      ws.value.close();
      ws.value = null;
    }
    connected.value = false;
    roomId.value = null;
    userId.value = null;
    isHost.value = false;
  };

  const send = (message: Message): void => {
    if (!ws.value || ws.value.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send message: WebSocket not connected');
      return;
    }

    const messageWithTimestamp = {
      ...message,
      timestamp: Date.now(),
    };

    ws.value.send(JSON.stringify(messageWithTimestamp));
  };

  const createRoom = (userName?: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!connected.value) {
        reject(new Error('Not connected to server'));
        return;
      }

      const tempUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      userId.value = tempUserId;

      const handler = (message: Message) => {
        if (message.type === 'ROOM_CREATED') {
          const response = message as RoomCreatedResponse;
          roomId.value = response.roomId;
          isHost.value = true;
          messageHandlers.delete('ROOM_CREATED');
          resolve(response.roomId);
        } else if (message.type === 'ERROR') {
          const errorMsg = message as ErrorMessage;
          messageHandlers.delete('ROOM_CREATED');
          reject(new Error(errorMsg.error));
        }
      };

      messageHandlers.set('ROOM_CREATED', handler);

      const createMessage: CreateRoomMessage = {
        type: 'CREATE_ROOM',
        userId: tempUserId,
        userName,
      };

      send(createMessage);
    });
  };

  const joinRoom = (roomCode: string, userName?: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!connected.value) {
        reject(new Error('Not connected to server'));
        return;
      }

      const tempUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      userId.value = tempUserId;

      const handler = (message: Message) => {
        if (message.type === 'ROOM_JOINED') {
          const response = message as RoomJoinedResponse;
          roomId.value = response.roomId;
          isHost.value = false;
          messageHandlers.delete('ROOM_JOINED');
          resolve();
        } else if (message.type === 'ERROR') {
          const errorMsg = message as ErrorMessage;
          messageHandlers.delete('ROOM_JOINED');
          reject(new Error(errorMsg.error));
        }
      };

      messageHandlers.set('ROOM_JOINED', handler);

      const joinMessage: JoinRoomMessage = {
        type: 'JOIN_ROOM',
        roomId: roomCode,
        userId: tempUserId,
        userName,
      };

      send(joinMessage);
    });
  };

  const sendPlayerPose = (
    position: [number, number, number],
    rotation: [number, number, number, number]
  ): void => {
    const now = Date.now();
    if (now - lastPoseUpdate < POSE_UPDATE_INTERVAL) {
      return; // Throttle updates
    }

    if (!userId.value || !roomId.value) return;

    const poseMessage: PlayerPoseMessage = {
      type: 'PLAYER_POSE',
      userId: userId.value,
      position,
      rotation,
    };

    send(poseMessage);
    lastPoseUpdate = now;
  };

  const sendObjectCreate = (
    objectId: string,
    position: [number, number, number],
    rotation: [number, number, number, number],
    objectType?: string
  ): void => {
    if (!userId.value || !roomId.value) return;

    const createMessage: ObjectCreateMessage = {
      type: 'OBJECT_CREATE',
      objectId,
      userId: userId.value,
      position,
      rotation,
      objectType,
    };

    send(createMessage);
  };

  const sendObjectUpdate = (
    objectId: string,
    position: [number, number, number],
    rotation: [number, number, number, number]
  ): void => {
    if (!userId.value || !roomId.value) return;

    const updateMessage: ObjectUpdateMessage = {
      type: 'OBJECT_UPDATE',
      objectId,
      userId: userId.value,
      position,
      rotation,
    };

    send(updateMessage);
  };

  const sendAnchorFound = (
    anchorPosition: [number, number, number],
    anchorRotation: [number, number, number, number]
  ): void => {
    if (!userId.value || !roomId.value) return;

    const anchorMessage: AnchorFoundMessage = {
      type: 'ANCHOR_FOUND',
      userId: userId.value,
      anchorPosition,
      anchorRotation,
    };

    send(anchorMessage);
  };

  const onMessage = (type: string, handler: (message: Message) => void): void => {
    messageHandlers.set(type, handler);
  };

  const offMessage = (type: string): void => {
    messageHandlers.delete(type);
  };

  const handleMessage = (message: Message): void => {
    // Call registered handlers
    const handler = messageHandlers.get(message.type);
    if (handler) {
      handler(message);
    }

    // Handle system messages
    switch (message.type) {
      case 'PARTICIPANT_JOINED':
      case 'PARTICIPANT_LEFT':
      case 'HOST_CHANGED':
        // Emit events for these
        break;
      case 'STATE_SYNC':
        // Handle state sync
        break;
    }
  };

  // Auto-reconnect logic
  let reconnectTimeout: number | null = null;
  const attemptReconnect = () => {
    if (reconnectTimeout) return;

    reconnectTimeout = window.setTimeout(() => {
      reconnectTimeout = null;
      if (!connected.value && roomId.value) {
        console.log('Attempting to reconnect...');
        connect().catch(() => {
          attemptReconnect();
        });
      }
    }, 3000);
  };

  onUnmounted(() => {
    disconnect();
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
  });

  return {
    ws,
    connected,
    connecting,
    error,
    roomId,
    userId,
    isHost,
    connect,
    disconnect,
    createRoom,
    joinRoom,
    sendPlayerPose,
    sendObjectCreate,
    sendObjectUpdate,
    sendAnchorFound,
    onMessage,
    offMessage,
    attemptReconnect,
  };
}
