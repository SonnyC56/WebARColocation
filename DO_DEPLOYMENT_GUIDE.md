# DigitalOcean App Platform Deployment - Quick Guide

## Step-by-Step Deployment

### 1. Go to DigitalOcean App Platform
Visit: https://cloud.digitalocean.com/apps

### 2. Create New App
- Click **"Create App"**
- Choose **"GitHub"** as source
- Authorize DigitalOcean if needed
- Select repository: **SonnyC56/WebARColocation**
- Select branch: **master**
- Click **"Next"**

### 3. Configure Backend Service

#### Service Settings:
- **Resource Type**: Web Service
- **Name**: `backend` (or any name you prefer)
- **Source Directory**: `backend/`
- **Build Command**: `npm install && npm run build`
- **Run Command**: `npm start`
- **HTTP Port**: `8080`

#### Environment Variables:
Click **"Edit"** next to Environment Variables and add:
- **Key**: `PORT` | **Value**: `8080`
- **Key**: `NODE_ENV` | **Value**: `production`

#### Plan:
- **Basic Plan** ($5/month) is sufficient for testing
- Or **Starter Plan** ($12/month) for more resources

### 4. Review & Deploy
- Review configuration
- Click **"Create Resources"**
- DigitalOcean will:
  - Clone your repo
  - Install dependencies
  - Build the TypeScript code
  - Start the server

### 5. Get Your Backend URL
After deployment completes:
- Your app will be available at: `https://your-app-name.ondigitalocean.app`
- Health check: `https://your-app-name.ondigitalocean.app/health`
- WebSocket URL: `wss://your-app-name.ondigitalocean.app`

### 6. Update Frontend Environment Variable
1. Go to **Vercel** → Your Project → Settings → Environment Variables
2. Update `VITE_SERVER_URL` to: `wss://your-app-name.ondigitalocean.app`
3. Redeploy or wait for auto-redeploy

## Testing

### Test Backend Health:
```bash
curl https://your-app-name.ondigitalocean.app/health
```

Should return:
```json
{"status":"ok","timestamp":1234567890}
```

### Test WebSocket Connection:
Open browser console on your frontend app and check for WebSocket connection errors.

## Troubleshooting

### Build Fails
- Check build logs in DigitalOcean dashboard
- Ensure `npm run build` completes successfully locally
- Verify TypeScript compilation succeeds

### WebSocket Not Connecting
- Ensure URL uses `wss://` (secure WebSocket) not `ws://`
- Check DigitalOcean app logs for errors
- Verify port 8080 is correctly configured

### App Not Starting
- Check logs in DigitalOcean dashboard
- Verify `dist/server.js` exists after build
- Ensure `npm start` command is correct

## Monitoring

- **Logs**: Available in DigitalOcean dashboard → App → Runtime Logs
- **Metrics**: Dashboard shows CPU, memory, and request metrics
- **Alerts**: Set up alerts for high CPU/memory usage

## Scaling

If you need more resources:
- Go to App → Settings → Plan
- Upgrade to higher tier plan
- Or add horizontal scaling (multiple instances)

## Domain Setup (Optional)

1. Go to App → Settings → Domains
2. Add your custom domain (e.g., `api.yourdomain.com`)
3. Configure DNS records as instructed
4. SSL certificate is automatically provisioned

---

**Your backend is now live!** 🎉
