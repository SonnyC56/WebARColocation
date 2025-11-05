// Session and room management for multiplayer AR sessions

import { WebSocket } from 'ws';
import { RoomState, Participant, VirtualObject } from './types';

export class SessionManager {
  private rooms: Map<string, RoomState> = new Map();
  private clientToRoom: Map<WebSocket, string> = new Map();
  private clientToUserId: Map<WebSocket, string> = new Map();
  private userIdCounter: number = 0;

  generateRoomId(): string {
    // Generate a 6-character alphanumeric room code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let roomId = '';
    for (let i = 0; i < 6; i++) {
      roomId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return roomId;
  }

  generateUserId(): string {
    return `user_${Date.now()}_${++this.userIdCounter}`;
  }

  createRoom(ws: WebSocket, userId: string, userName?: string): string {
    const roomId = this.generateRoomId();
    
    const room: RoomState = {
      roomId,
      participants: new Map(),
      objects: new Map(),
      hostId: userId,
      createdAt: Date.now(),
    };

    const participant: Participant = {
      userId,
      userName,
      isHost: true,
    };

    room.participants.set(userId, participant);
    this.rooms.set(roomId, room);
    this.clientToRoom.set(ws, roomId);
    this.clientToUserId.set(ws, userId);

    return roomId;
  }

  joinRoom(ws: WebSocket, roomId: string, userId: string, userName?: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      return false;
    }

    const participant: Participant = {
      userId,
      userName,
      isHost: false,
    };

    room.participants.set(userId, participant);
    this.clientToRoom.set(ws, roomId);
    this.clientToUserId.set(ws, userId);

    return true;
  }

  leaveRoom(ws: WebSocket): void {
    const roomId = this.clientToRoom.get(ws);
    const userId = this.clientToUserId.get(ws);

    if (!roomId || !userId) {
      return;
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }

    room.participants.delete(userId);

    // If host left, promote next participant
    if (room.hostId === userId && room.participants.size > 0) {
      const nextHost = Array.from(room.participants.values())[0];
      room.hostId = nextHost.userId;
      nextHost.isHost = true;
    }

    // Clean up if room is empty
    if (room.participants.size === 0) {
      this.rooms.delete(roomId);
    }

    this.clientToRoom.delete(ws);
    this.clientToUserId.delete(ws);
  }

  getRoom(roomId: string): RoomState | undefined {
    return this.rooms.get(roomId);
  }

  getRoomForClient(ws: WebSocket): RoomState | undefined {
    const roomId = this.clientToRoom.get(ws);
    if (!roomId) return undefined;
    return this.rooms.get(roomId);
  }

  getUserIdForClient(ws: WebSocket): string | undefined {
    return this.clientToUserId.get(ws);
  }

  getClientsInRoom(roomId: string): WebSocket[] {
    const clients: WebSocket[] = [];
    for (const [ws, rId] of this.clientToRoom.entries()) {
      if (rId === roomId) {
        clients.push(ws);
      }
    }
    return clients;
  }

  addObject(roomId: string, object: VirtualObject): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.objects.set(object.objectId, object);
  }

  updateObject(roomId: string, objectId: string, updates: Partial<VirtualObject>): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const obj = room.objects.get(objectId);
    if (!obj) return;
    room.objects.set(objectId, { ...obj, ...updates });
  }
}
