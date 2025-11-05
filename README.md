# QR-Anchored Co-Located AR Experience

A WebXR-based multiplayer AR experience that uses QR codes as shared spatial anchors for co-located multi-user AR.

## Features

- **QR Code Anchoring**: Uses WebXR Image Tracking to anchor AR content to a physical QR marker
- **Multiplayer Sync**: Real-time synchronization of virtual objects across multiple devices
- **Session Management**: Create or join rooms with unique session codes
- **Drift Correction**: Automatic detection and correction of tracking drift
- **Late Joiner Support**: Users can join ongoing sessions and receive full world state
- **Host Migration**: Automatic host migration when the original host leaves

## Tech Stack

### Frontend
- Vue 3 (Composition API)
- Babylon.js 6.x (3D rendering and WebXR)
- Pinia (state management)
- Vite (build tool)
- TypeScript

### Backend
- Node.js
- WebSocket (ws library)
- Express (HTTP server)
- TypeScript

## Prerequisites

- Node.js 18+ LTS
- Android device with ARCore support (for WebXR)
- Chrome browser with WebXR support (or enable `#webxr-incubations` flag)

## Local Development

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env and set VITE_SERVER_URL=ws://localhost:8080
npm run dev
```

For HTTPS (required for WebXR), generate self-signed certificates:
```bash
openssl req -newkey rsa:2048 -nodes -keyout key.pem -x509 -days 365 -out cert.pem
```

Place `key.pem` and `cert.pem` in the `frontend/` directory.

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

The server will start on `http://localhost:8080` with WebSocket support on the same port.

## Deployment

### Frontend (Vercel)

1. Connect your GitHub repository to Vercel
2. Set build command: `cd frontend && npm install && npm run build`
3. Set output directory: `frontend/dist`
4. Set environment variable `VITE_SERVER_URL` to your backend WebSocket URL (wss://...)
5. Deploy

### Backend (DigitalOcean)

#### Option 1: DigitalOcean App Platform

1. Connect your GitHub repository
2. Select Node.js as the runtime
3. Set build command: `cd backend && npm install && npm run build`
4. Set run command: `cd backend && npm start`
5. Set environment variables from `.env.example`
6. Deploy

#### Option 2: DigitalOcean Droplet

1. Create a Ubuntu droplet
2. Install Node.js 18+:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. Clone repository and setup:
   ```bash
   git clone <your-repo>
   cd WebARColocation/backend
   npm install
   npm run build
   ```

4. Setup SSL with Let's Encrypt:
   ```bash
   sudo apt-get install certbot
   sudo certbot certonly --standalone -d yourdomain.com
   ```

5. Configure Nginx reverse proxy for WebSocket:
   ```nginx
   server {
       listen 443 ssl;
       server_name yourdomain.com;

       ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

       location / {
           proxy_pass http://localhost:8080;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

6. Run with PM2:
   ```bash
   npm install -g pm2
   pm2 start dist/server.js --name ar-backend
   pm2 save
   pm2 startup
   ```

## Usage

1. **Create Session**: Open the app and click "Create Session" to get a room code
2. **Share Code**: Share the room code with other participants
3. **Join Session**: Others enter the code and click "Join Session"
4. **Start AR**: Once connected, click "Start AR Experience"
5. **Scan QR**: Point device at the QR marker to anchor the AR content
6. **Place Objects**: Tap "Place Object" to add virtual objects to the scene
7. **Synchronized**: All participants see the same objects in the same real-world location

## QR Marker

Place a QR code marker in your physical space. The system expects a QR code image at `/qr-marker.png` in the public folder. Replace this with your actual QR code image.

**Recommended specifications:**
- Size: Print at least 20cm x 20cm
- Placement: Flat surface, good lighting
- Orientation: Ensure consistent orientation for all users

## Browser Support

- **Android Chrome**: Full support (requires WebXR flag in some versions)
- **iOS Safari**: Not supported (WebXR not available)
- **Desktop**: Debug mode available (non-AR canvas)

## Development Notes

- WebXR Image Tracking requires Chrome's `#webxr-incubations` flag during development
- Ensure HTTPS for WebXR camera access (automatic on Vercel)
- Test with multiple devices for multi-user sync validation

## License

MIT
