# Frontend - Vercel Deployment Guide

This guide walks you through deploying the frontend to Vercel.

## Step 1: Prepare Repository

1. Ensure all code is committed and pushed to GitHub
2. Make sure `frontend/vercel.json` exists (already created)

## Step 2: Connect to Vercel

1. Go to [Vercel](https://vercel.com)
2. Sign up or log in (GitHub OAuth recommended)
3. Click "Add New Project"
4. Import your GitHub repository

## Step 3: Configure Project

### Project Settings:
- **Framework Preset**: Vite
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Environment Variables:
Add the following environment variable:
- **Key**: `VITE_SERVER_URL`
- **Value**: Your backend WebSocket URL
  - For local testing: `ws://localhost:8080`
  - For production: `wss://api.yourdomain.com` (or your DigitalOcean app URL)

**Important**: Environment variables prefixed with `VITE_` are exposed to the client-side code.

## Step 4: Deploy

1. Click "Deploy"
2. Vercel will:
   - Install dependencies
   - Run build command
   - Deploy to CDN
   - Provide a preview URL

## Step 5: Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain (e.g., `ar.yourdomain.com`)
3. Configure DNS records as instructed by Vercel
4. SSL certificate is automatically provisioned

## Step 6: Update Environment Variables After Deployment

If you need to update `VITE_SERVER_URL`:
1. Go to Project Settings → Environment Variables
2. Update the value
3. Redeploy (or it will auto-redeploy on next push)

## Continuous Deployment

Vercel automatically deploys on every push to your main branch:
- Push to `main` → Production deployment
- Push to other branches → Preview deployments

## Build Settings Reference

The `vercel.json` configuration:
- SPA routing (all routes redirect to index.html)
- Security headers
- Automatic HTTPS

## Testing Deployment

1. Visit your Vercel URL: `https://your-app.vercel.app`
2. Open browser console to check for errors
3. Test WebSocket connection to backend
4. Test AR functionality on Android device

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Check TypeScript errors locally first

### WebSocket Connection Fails
- Verify `VITE_SERVER_URL` is set correctly
- Check backend is running and accessible
- Ensure WebSocket URL uses `wss://` (secure) in production

### AR Not Working
- Ensure site is served over HTTPS (Vercel does this automatically)
- Check browser console for WebXR errors
- Verify device supports WebXR
