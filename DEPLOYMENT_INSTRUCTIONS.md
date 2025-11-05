# Deployment Instructions

## 1. GitHub Setup

Your repository is ready to push. Run these commands:

```bash
# Create a new repository on GitHub (via web interface)
# Then run:

git remote add origin https://github.com/YOUR_USERNAME/WebARColocation.git
git push -u origin main
```

**Or use GitHub CLI:**
```bash
gh repo create WebARColocation --public --source=. --remote=origin --push
```

## 2. Vercel Deployment (Frontend)

### Step-by-Step:

1. **Go to Vercel**: https://vercel.com
2. **Sign up/Login**: Use GitHub OAuth for easy integration
3. **Import Project**: Click "Add New Project"
4. **Select Repository**: Choose your GitHub repo
5. **Configure**:
   - Framework Preset: **Vite**
   - Root Directory: **frontend**
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `dist` (auto-detected)
   - Install Command: `npm install` (auto-detected)
6. **Environment Variables**:
   - Click "Environment Variables"
   - Add: `VITE_SERVER_URL` = `wss://your-backend-url` (update after backend is deployed)
   - For now, use: `ws://localhost:8080` for testing
7. **Deploy**: Click "Deploy"

### After Backend is Deployed:

1. Go to Project Settings → Environment Variables
2. Update `VITE_SERVER_URL` to your DigitalOcean backend URL (wss://...)
3. Redeploy or wait for automatic redeploy

**Your Vercel URL**: `https://your-project-name.vercel.app`

## 3. DigitalOcean Deployment (Backend)

### Option A: App Platform (Recommended - Easiest)

1. **Go to DO App Platform**: https://cloud.digitalocean.com/apps
2. **Create App**: Click "Create App"
3. **Connect GitHub**: Select your repository
4. **Configure Backend**:
   - **Source**: Select `backend/` directory
   - **Type**: Web Service
   - **Build Command**: `npm install && npm run build`
   - **Run Command**: `npm start`
   - **HTTP Port**: `8080`
5. **Environment Variables**:
   - `PORT`: `8080`
   - `NODE_ENV`: `production`
6. **Resources**: Basic plan ($5/month) is sufficient
7. **Deploy**: Click "Create Resources"

### Option B: Droplet (More Control)

See detailed instructions in `DEPLOYMENT_DO.md`

### After Deployment:

1. Get your backend URL: `https://your-app-name.ondigitalocean.app`
2. Test health endpoint: `curl https://your-app-name.ondigitalocean.app/health`
3. Update Vercel environment variable `VITE_SERVER_URL` to `wss://your-app-name.ondigitalocean.app`

## 4. Update Frontend Environment Variable

Once backend is deployed:

1. Go to Vercel → Your Project → Settings → Environment Variables
2. Edit `VITE_SERVER_URL`
3. Set to: `wss://your-digitalocean-app-url` (note: wss:// not ws://)
4. Save and redeploy

## 5. Testing

1. **Frontend**: Visit your Vercel URL
2. **Backend**: Test health endpoint
3. **Full System**: 
   - Create a session
   - Join with multiple devices
   - Test AR functionality

## Troubleshooting

### Frontend Build Fails
- Check Vercel build logs
- Ensure all dependencies are in package.json
- Test build locally: `cd frontend && npm run build`

### Backend WebSocket Not Connecting
- Ensure URL uses `wss://` (secure WebSocket) in production
- Check backend logs in DigitalOcean dashboard
- Verify firewall allows WebSocket connections

### CORS Issues
- Backend should allow connections from Vercel domain
- Check browser console for CORS errors

## Quick Reference

### Frontend (Vercel)
- **URL**: `https://your-project.vercel.app`
- **Env Var**: `VITE_SERVER_URL=wss://backend-url`

### Backend (DigitalOcean)
- **URL**: `https://your-app.ondigitalocean.app`
- **Health**: `https://your-app.ondigitalocean.app/health`
- **Port**: `8080`

## Next Steps

1. ✅ Push to GitHub
2. ✅ Deploy frontend to Vercel
3. ✅ Deploy backend to DigitalOcean
4. ✅ Update frontend env var with backend URL
5. ✅ Test full system
6. 🎉 Enjoy your AR experience!
