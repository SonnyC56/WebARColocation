# Deployment Quick Start

## Overview

- **Frontend**: Vercel (CDN, automatic HTTPS)
- **Backend**: DigitalOcean (App Platform or Droplet)

## Quick Steps

### 1. Push to GitHub

```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit: QR AR Co-location system"

# Create GitHub repo, then:
git remote add origin https://github.com/yourusername/WebARColocation.git
git branch -M main
git push -u origin main
```

### 2. Deploy Frontend (Vercel)

1. Go to https://vercel.com
2. Import GitHub repository
3. Set root directory: `frontend`
4. Add environment variable: `VITE_SERVER_URL=wss://your-backend-url`
5. Deploy

See [DEPLOYMENT_VERCEL.md](./DEPLOYMENT_VERCEL.md) for details.

### 3. Deploy Backend (DigitalOcean)

**Option A: App Platform (Easiest)**
1. Go to https://cloud.digitalocean.com/apps
2. Create app from GitHub repo
3. Set source: `backend/` directory
4. Build: `npm install && npm run build`
5. Run: `npm start`
6. Deploy

**Option B: Droplet (More Control)**
1. Create Ubuntu droplet
2. Follow [DEPLOYMENT_DO.md](./DEPLOYMENT_DO.md) guide
3. Setup Nginx reverse proxy
4. Configure SSL with Let's Encrypt

## Environment Variables

### Frontend (Vercel)
- `VITE_SERVER_URL`: Backend WebSocket URL (wss://...)

### Backend (DigitalOcean)
- `PORT`: 8080
- `NODE_ENV`: production

## Testing

1. Frontend: Visit Vercel URL
2. Backend: `curl https://your-backend-url/health`
3. Full system: Create session, join with multiple devices, test AR

## Next Steps

- Customize 3D objects (see `CURRENT_EXPERIENCE.md`)
- Add more features
- Scale backend if needed
