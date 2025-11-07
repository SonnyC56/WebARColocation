// Shared message types for WebSocket communication (frontend copy)

export interface BaseMessage {
  type: string;
  timestamp?: number;
}

export interface JoinRoomMessage extends BaseMessage {
  type: 'JOIN_ROOM';
  roomId: string;
  userId: string;
  userName?: string;
}

export interface CreateRoomMessage extends BaseMessage {
  type: 'CREATE_ROOM';
  userId: string;
  userName?: string;
}

export interface PlayerPoseMessage extends BaseMessage {
  type: 'PLAYER_POSE';
  userId: string;
  position: [number, number, number];
  rotation: [number, number, number, number]; // quaternion
}

export interface ObjectCreateMessage extends BaseMessage {
  type: 'OBJECT_CREATE';
  objectId: string;
  userId: string;
  position: [number, number, number];
  rotation: [number, number, number, number];
  objectType?: string;
}

export interface ObjectUpdateMessage extends BaseMessage {
  type: 'OBJECT_UPDATE';
  objectId: string;
  userId: string;
  position: [number, number, number];
  rotation: [number, number, number, number];
}

export interface AnchorFoundMessage extends BaseMessage {
  type: 'ANCHOR_FOUND';
  userId: string;
  anchorPosition: [number, number, number];
  anchorRotation: [number, number, number, number];
}

export interface StateSyncMessage extends BaseMessage {
  type: 'STATE_SYNC';
  objects: VirtualObject[];
  participants: Participant[];
}

export interface RoomCreatedResponse extends BaseMessage {
  type: 'ROOM_CREATED';
  roomId: string;
  userId: string;
  isHost: boolean;
}

export interface RoomJoinedResponse extends BaseMessage {
  type: 'ROOM_JOINED';
  roomId: string;
  userId: string;
  isHost: boolean;
}

export interface ErrorMessage extends BaseMessage {
  type: 'ERROR';
  error: string;
  code?: string;
}

export interface ParticipantJoinedMessage extends BaseMessage {
  type: 'PARTICIPANT_JOINED';
  userId: string;
  userName?: string;
}

export interface ParticipantLeftMessage extends BaseMessage {
  type: 'PARTICIPANT_LEFT';
  userId: string;
}

export interface HostChangedMessage extends BaseMessage {
  type: 'HOST_CHANGED';
  newHostId: string;
}

export interface HighFiveMessage extends BaseMessage {
  type: 'HIGH_FIVE';
  fromUserId: string;
  toUserId: string;
}

export type Message =
  | JoinRoomMessage
  | CreateRoomMessage
  | PlayerPoseMessage
  | ObjectCreateMessage
  | ObjectUpdateMessage
  | AnchorFoundMessage
  | StateSyncMessage
  | RoomCreatedResponse
  | RoomJoinedResponse
  | ErrorMessage
  | ParticipantJoinedMessage
  | ParticipantLeftMessage
  | HostChangedMessage
  | HighFiveMessage;

export interface VirtualObject {
  objectId: string;
  userId: string;
  position: [number, number, number];
  rotation: [number, number, number, number];
  objectType?: string;
}

export interface Participant {
  userId: string;
  userName?: string;
  isHost: boolean;
}
