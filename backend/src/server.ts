import { WebSocketServer, WebSocket } from 'ws';
import express from 'express';
import { SessionManager } from './sessionManager';
import {
  Message,
  JoinRoomMessage,
  CreateRoomMessage,
  PlayerPoseMessage,
  ObjectCreateMessage,
  ObjectUpdateMessage,
  AnchorFoundMessage,
  HighFiveMessage,
  RoomCreatedResponse,
  RoomJoinedResponse,
  ErrorMessage,
  ParticipantJoinedMessage,
  ParticipantLeftMessage,
  HostChangedMessage,
  StateSyncMessage,
  VirtualObject,
  Participant,
} from './types';

const PORT = process.env.PORT || 8080;
const app = express();

// HTTP server for health checks
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

const server = app.listen(PORT, () => {
  console.log(`HTTP server listening on port ${PORT}`);
});

// WebSocket server
const wss = new WebSocketServer({ server });
const sessionManager = new SessionManager();

// Handle WebSocket connections
wss.on('connection', (ws: WebSocket) => {
  console.log('New WebSocket connection');

  ws.on('message', (data: string) => {
    try {
      const message: Message = JSON.parse(data.toString());
      handleMessage(ws, message);
    } catch (error) {
      console.error('Failed to parse message:', error);
      sendError(ws, 'Invalid message format');
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
    handleDisconnect(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    handleDisconnect(ws);
  });
});

export function handleMessage(ws: WebSocket, message: Message): void {
  switch (message.type) {
    case 'CREATE_ROOM':
      handleCreateRoom(ws, message);
      break;
    case 'JOIN_ROOM':
      handleJoinRoom(ws, message);
      break;
    case 'PLAYER_POSE':
      handlePlayerPose(ws, message);
      break;
    case 'OBJECT_CREATE':
      handleObjectCreate(ws, message);
      break;
    case 'OBJECT_UPDATE':
      handleObjectUpdate(ws, message);
      break;
    case 'ANCHOR_FOUND':
      handleAnchorFound(ws, message);
      break;
    case 'HIGH_FIVE':
      handleHighFive(ws, message);
      break;
    default:
      sendError(ws, `Unknown message type: ${(message as any).type}`);
  }
}

function handleCreateRoom(ws: WebSocket, message: CreateRoomMessage): void {
  const userId = message.userId || sessionManager.generateUserId();
  const roomId = sessionManager.createRoom(ws, userId, message.userName);

  const response: RoomCreatedResponse = {
    type: 'ROOM_CREATED',
    roomId,
    userId,
    isHost: true,
    timestamp: Date.now(),
  };

  ws.send(JSON.stringify(response));
  console.log(`Room created: ${roomId} by user ${userId}`);
}

function handleJoinRoom(ws: WebSocket, message: JoinRoomMessage): void {
  const userId = message.userId || sessionManager.generateUserId();
  const room = sessionManager.getRoom(message.roomId);

  if (!room) {
    sendError(ws, 'Room not found', 'ROOM_NOT_FOUND');
    return;
  }

  const success = sessionManager.joinRoom(ws, message.roomId, userId, message.userName);

  if (!success) {
    sendError(ws, 'Failed to join room', 'JOIN_FAILED');
    return;
  }

  // Send room joined response
  const participant = room.participants.get(userId);
  const response: RoomJoinedResponse = {
    type: 'ROOM_JOINED',
    roomId: message.roomId,
    userId,
    isHost: participant?.isHost || false,
    timestamp: Date.now(),
  };

  ws.send(JSON.stringify(response));

  // Send current state to new participant
  sendStateSync(ws, room);

  // Notify other participants
  broadcastToRoomExcept(
    message.roomId,
    ws,
    {
      type: 'PARTICIPANT_JOINED',
      userId,
      userName: message.userName,
      timestamp: Date.now(),
    } as ParticipantJoinedMessage
  );

  console.log(`User ${userId} joined room ${message.roomId}`);
}

function handlePlayerPose(ws: WebSocket, message: PlayerPoseMessage): void {
  const room = sessionManager.getRoomForClient(ws);
  if (!room) return;

  // Broadcast pose to other participants in room
  broadcastToRoomExcept(room.roomId, ws, message);
}

function handleObjectCreate(ws: WebSocket, message: ObjectCreateMessage): void {
  const room = sessionManager.getRoomForClient(ws);
  if (!room) return;

  const object: VirtualObject = {
    objectId: message.objectId,
    userId: message.userId,
    position: message.position,
    rotation: message.rotation,
    objectType: message.objectType,
  };

  sessionManager.addObject(room.roomId, object);

  // Broadcast to all participants including sender
  broadcastToRoom(room.roomId, message);
}

function handleObjectUpdate(ws: WebSocket, message: ObjectUpdateMessage): void {
  const room = sessionManager.getRoomForClient(ws);
  if (!room) return;

  sessionManager.updateObject(
    room.roomId,
    message.objectId,
    {
      position: message.position,
      rotation: message.rotation,
    }
  );

  // Broadcast to all participants including sender
  broadcastToRoom(room.roomId, message);
}

function handleAnchorFound(ws: WebSocket, message: AnchorFoundMessage): void {
  const room = sessionManager.getRoomForClient(ws);
  if (!room) return;

  // Broadcast anchor found event to sync with others
  broadcastToRoomExcept(room.roomId, ws, message);
}

function handleHighFive(ws: WebSocket, message: HighFiveMessage): void {
  const room = sessionManager.getRoomForClient(ws);
  if (!room) return;

  // Broadcast high five to the target user (and room for simplicity)
  broadcastToRoom(room.roomId, message);
  console.log(`High five from ${message.fromUserId} to ${message.toUserId}`);
}

function handleDisconnect(ws: WebSocket): void {
  const userId = sessionManager.getUserIdForClient(ws);
  const room = sessionManager.getRoomForClient(ws);

  if (room && userId) {
    const wasHost = room.hostId === userId;

    sessionManager.leaveRoom(ws);

    // If host left, check if migration happened
    if (wasHost) {
      const updatedRoom = sessionManager.getRoom(room.roomId);
      if (updatedRoom && updatedRoom.hostId !== userId) {
        // Host was migrated
        const hostChangedMessage: HostChangedMessage = {
          type: 'HOST_CHANGED',
          newHostId: updatedRoom.hostId,
          timestamp: Date.now(),
        };
        broadcastToRoom(room.roomId, hostChangedMessage);
      }
    }

    // Notify other participants
    const participantLeftMessage: ParticipantLeftMessage = {
      type: 'PARTICIPANT_LEFT',
      userId,
      timestamp: Date.now(),
    };
    broadcastToRoom(room.roomId, participantLeftMessage);
  }
}

function sendStateSync(ws: WebSocket, room: any): void {
  const objects: VirtualObject[] = Array.from(room.objects.values());
  const participants: Participant[] = Array.from(room.participants.values());

  const stateSync: StateSyncMessage = {
    type: 'STATE_SYNC',
    objects,
    participants,
    timestamp: Date.now(),
  };

  ws.send(JSON.stringify(stateSync));
}

function broadcastToRoom(roomId: string, message: Message): void {
  const clients = sessionManager.getClientsInRoom(roomId);
  const messageStr = JSON.stringify(message);

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

function broadcastToRoomExcept(roomId: string, except: WebSocket, message: Message): void {
  const clients = sessionManager.getClientsInRoom(roomId);
  const messageStr = JSON.stringify(message);

  clients.forEach((client) => {
    if (client !== except && client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

function sendError(ws: WebSocket, error: string, code?: string): void {
  const errorMessage: ErrorMessage = {
    type: 'ERROR',
    error,
    code,
    timestamp: Date.now(),
  };

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(errorMessage));
  }
}

console.log(`WebSocket server starting on port ${PORT}`);
console.log(`Health check available at http://localhost:${PORT}/health`);
