# Camera Kit + Lens + WebSocket Architecture

## Overview

The system has three main layers:
1. **Lens (Lens Studio)** - Runs in Camera Kit, handles AR rendering and marker tracking
2. **Frontend (Vue.js)** - Bridges Lens and WebSocket backend
3. **Backend (Node.js WebSocket)** - Manages rooms, participants, and state synchronization

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Lens (Lens Studio)                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Marker Tracking Component                            │  │
│  │  - Detects QR code                                    │  │
│  │  - Calculates 6DOF pose                               │  │
│  │  - Sends MARKER_FOUND/MARKER_UPDATED events          │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          │ Remote API                       │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  3D Objects (Rendered in Lens)                       │  │
│  │  - Orientation marker (cube + cone)                  │  │
│  │  - Player avatars                                    │  │
│  │  - Shared objects                                    │  │
│  │  - Controlled via Remote API messages               │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          │ Remote API                       │
│                          ▼                                   │
└─────────────────────────────────────────────────────────────┘
                          │
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
        ▼                                   ▼
┌──────────────────┐            ┌──────────────────┐
│  Camera Kit SDK   │            │  Camera Kit SDK  │
│  (Session)       │            │  (Remote API)    │
│                   │            │                   │
│  - Renders Lens  │            │  - Receives      │
│  - Manages       │            │    events from   │
│    camera feed   │            │    Lens          │
│  - Handles       │            │  - Sends commands│
│    playback      │            │    to Lens       │
└──────────────────┘            └──────────────────┘
        │                                   │
        │                                   │
        └─────────────────┬─────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Frontend (Vue.js + Composables)               │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  useMarkerTracking                                     │ │
│  │  - Listens for Remote API events from Lens            │ │
│  │  - Receives MARKER_FOUND/MARKER_UPDATED               │ │
│  │  - Updates local tracking state                        │ │
│  └──────────────────────────────────────────────────────┘ │
│                          │                                   │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  App.vue (Main Component)                            │ │
│  │  - Receives marker tracking updates                   │ │
│  │  - Sends commands to Lens via Remote API              │ │
│  │  - Manages player pose updates                        │ │
│  │  - Handles network synchronization                    │ │
│  └──────────────────────────────────────────────────────┘ │
│                          │                                   │
│                          │ WebSocket Messages                │
│                          ▼                                   │
└─────────────────────────────────────────────────────────────┘
                          │
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│         Backend (Node.js WebSocket Server)                  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Session Manager                                      │  │
│  │  - Manages rooms                                      │  │
│  │  - Tracks participants                                │  │
│  │  - Broadcasts messages to room                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Message Types:                                             │
│  - PLAYER_POSE (broadcast to other players)                │
│  - OBJECT_CREATE (broadcast to all)                        │
│  - OBJECT_UPDATE (broadcast to all)                        │
│  - ANCHOR_FOUND (broadcast to others)                      │
│  - STATE_SYNC (send to late joiners)                       │
│  - PARTICIPANT_JOINED/LEFT                                 │
└─────────────────────────────────────────────────────────────┘
```

## Detailed Interaction Flow

### 1. Marker Tracking Flow

**When QR code is detected:**

```
Lens (Marker Tracking Component)
  │
  │ Detects QR code, calculates pose
  │
  ▼
Sends Remote API message:
  {
    type: "MARKER_FOUND",
    position: [x, y, z],
    rotation: [x, y, z, w]
  }
  │
  │
  ▼
Camera Kit SDK (Remote API Event)
  │
  │ Event listener receives message
  │
  ▼
Frontend: useMarkerTracking composable
  │
  │ Updates isTracking = true
  │ Stores transform data
  │
  ▼
Frontend: App.vue
  │
  │ Watches isTracking change
  │ Sends SHOW_ORIENTATION_MARKER to Lens
  │ Sends ANCHOR_FOUND to WebSocket backend
  │
  ├─► Lens: Shows orientation marker (cube + cone)
  │
  └─► Backend: Broadcasts ANCHOR_FOUND to other players
```

### 2. Player Pose Synchronization Flow

**Every 100ms (10 Hz):**

```
Frontend: App.vue
  │
  │ Interval timer fires
  │
  ▼
Sends Remote API message to Lens:
  {
    type: "REQUEST_CAMERA_POSE"
  }
  │
  │
  ▼
Lens (Script)
  │
  │ Reads camera transform
  │ Calculates pose relative to marker
  │
  ▼
Sends Remote API message back:
  {
    type: "CAMERA_POSE_UPDATE",
    position: [x, y, z],
    rotation: [x, y, z, w]
  }
  │
  │
  ▼
Frontend: App.vue
  │
  │ Receives camera pose
  │
  ▼
Sends WebSocket message to backend:
  {
    type: "PLAYER_POSE",
    userId: "user_123",
    position: [x, y, z],
    rotation: [x, y, z, w]
  }
  │
  │
  ▼
Backend: WebSocket Server
  │
  │ Receives PLAYER_POSE
  │ Looks up room for this user
  │
  ▼
Broadcasts to all other players in room:
  {
    type: "PLAYER_POSE",
    userId: "user_123",
    position: [x, y, z],
    rotation: [x, y, z, w]
  }
  │
  │
  ▼
Other Players' Frontend: App.vue
  │
  │ Receives PLAYER_POSE message
  │
  ▼
Sends Remote API message to their Lens:
  {
    type: "UPDATE_PLAYER_POSE",
    userId: "user_123",
    position: [x, y, z],
    rotation: [x, y, z, w]
  }
  │
  │
  ▼
Other Players' Lens
  │
  │ Updates avatar position/rotation
  │ Renders avatar in 3D space
```

### 3. Object Creation Flow

**When a player creates an object:**

```
Player 1 Frontend: App.vue
  │
  │ User action (e.g., tap to place)
  │
  ▼
Sends Remote API to Lens:
  {
    type: "CREATE_OBJECT",
    objectId: "obj_123",
    position: [x, y, z],
    rotation: [x, y, z, w],
    objectType: "cube"
  }
  │
  ├─► Lens: Creates and renders object
  │
  └─► Also sends WebSocket message:
      {
        type: "OBJECT_CREATE",
        objectId: "obj_123",
        userId: "user_1",
        position: [x, y, z],
        rotation: [x, y, z, w],
        objectType: "cube"
      }
      │
      │
      ▼
      Backend: WebSocket Server
        │
        │ Stores object in room state
        │
        ▼
      Broadcasts to all players (including sender):
        {
          type: "OBJECT_CREATE",
          objectId: "obj_123",
          userId: "user_1",
          position: [x, y, z],
          rotation: [x, y, z, w],
          objectType: "cube"
        }
        │
        │
        ▼
      Player 2 Frontend: App.vue
        │
        │ Receives OBJECT_CREATE
        │ Checks if already created (avoids duplicates)
        │
        ▼
      Sends Remote API to Lens:
        {
          type: "CREATE_OBJECT",
          objectId: "obj_123",
          position: [x, y, z],
          rotation: [x, y, z, w],
          objectType: "cube"
        }
        │
        │
        ▼
      Player 2 Lens: Creates and renders object
```

### 4. Late Joiner State Sync Flow

**When a new player joins a room:**

```
New Player Frontend
  │
  │ Joins room via WebSocket
  │
  ▼
Backend: WebSocket Server
  │
  │ Sends STATE_SYNC message:
  │ {
  │   type: "STATE_SYNC",
  │   objects: [
  │     { objectId: "obj_1", position: [...], ... },
  │     { objectId: "obj_2", position: [...], ... }
  │   ],
  │   participants: [
  │     { userId: "user_1", ... },
  │     { userId: "user_2", ... }
  │   ]
  │ }
  │
  ▼
New Player Frontend: App.vue
  │
  │ Receives STATE_SYNC
  │ Waits for marker to be found (anchorFound = true)
  │
  ▼
For each object in STATE_SYNC:
  │
  ▼
Sends Remote API to Lens:
  {
    type: "CREATE_OBJECT",
    objectId: "obj_1",
    position: [x, y, z],
    rotation: [x, y, z, w]
  }
  │
  │
  ▼
Lens: Creates all objects at correct positions
```

## Key Points

### Remote API (Lens ↔ Frontend)
- **Bidirectional**: Frontend can send commands to Lens, Lens can send events to Frontend
- **Event-driven**: Uses event listeners (`addEventListener('remote-api', ...)`)
- **Message format**: JSON objects with `type` field
- **Purpose**: Control Lens behavior, receive tracking data, manage 3D objects

### WebSocket (Frontend ↔ Backend)
- **Bidirectional**: Frontend sends updates, backend broadcasts to room
- **Message-driven**: Uses `onMessage` handlers
- **Message format**: JSON objects matching `types.ts` interfaces
- **Purpose**: Synchronize state across multiple players, manage rooms

### Separation of Concerns

1. **Lens handles**:
   - AR rendering (Camera Kit does this)
   - Marker tracking (Lens Studio component)
   - 3D object rendering
   - Camera pose calculation

2. **Frontend handles**:
   - WebSocket connection management
   - Message routing between Lens and Backend
   - State management (Pinia store)
   - UI (SessionUI component)

3. **Backend handles**:
   - Room management
   - Participant tracking
   - Message broadcasting
   - State persistence (for late joiners)

## Example: Complete Multiplayer Interaction

**Scenario**: Two players in a room, Player 1 finds QR code, Player 2 joins later

```
Time T0: Player 1 finds QR code
  Lens → Frontend: MARKER_FOUND
  Frontend → Lens: SHOW_ORIENTATION_MARKER
  Frontend → Backend: ANCHOR_FOUND
  Lens: Shows orientation marker

Time T1: Player 1 moves (every 100ms)
  Frontend → Lens: REQUEST_CAMERA_POSE
  Lens → Frontend: CAMERA_POSE_UPDATE
  Frontend → Backend: PLAYER_POSE
  Backend → Player 2: PLAYER_POSE (broadcast)
  Player 2 Frontend → Player 2 Lens: UPDATE_PLAYER_POSE
  Player 2 Lens: Updates Player 1's avatar position

Time T2: Player 2 joins room
  Player 2 Frontend → Backend: JOIN_ROOM
  Backend → Player 2 Frontend: STATE_SYNC (all objects + participants)
  Player 2 Frontend → Player 2 Lens: CREATE_OBJECT (for each object)
  Player 2 Lens: Renders all existing objects

Time T3: Player 2 finds QR code
  Player 2 Lens → Player 2 Frontend: MARKER_FOUND
  Player 2 Frontend → Player 2 Lens: SHOW_ORIENTATION_MARKER
  Player 2 Lens: Shows orientation marker
  (Now both players see same objects at same positions!)
```

## Important Notes

1. **Coordinate System**: Lens uses Camera Kit's coordinate system. The frontend assumes positions are already in the correct space. If coordinate conversion is needed, it should happen in the Lens script.

2. **Marker Tracking**: The Lens's Marker Tracking component handles all QR detection. The frontend only receives pose updates, it doesn't do any tracking itself.

3. **State Management**: The backend maintains the "source of truth" for shared objects and participant lists. The Lens is the "source of truth" for rendering and marker tracking.

4. **Synchronization**: Player poses are synchronized at ~10 Hz (every 100ms). Object creation/updates are synchronized immediately when they occur.

5. **Late Joiners**: When a player joins late, they receive a full STATE_SYNC with all existing objects. They then create these objects in their Lens once their marker is found.

This architecture allows the Lens to handle all AR rendering (which Camera Kit excels at), while the WebSocket backend handles multiplayer synchronization (which it's already doing well).

