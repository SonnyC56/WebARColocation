# Vercel Configuration Guide

## Step 1: Set Environment Variables in Vercel

1. **Go to Vercel Dashboard**
   - Visit https://vercel.com/dashboard
   - Sign in to your account
   - Find your project: **WebARColocation**

2. **Navigate to Settings**
   - Click on your project
   - Go to **Settings** tab (left sidebar)
   - Click **Environment Variables** (under "Configuration")

3. **Add Environment Variables**
   Click **Add New** and add each variable:

   **Variable 1:**
   - **Key**: `VITE_CAMERA_KIT_API_TOKEN`
   - **Value**: `eyJhbGciOiJIUzI1NiIsImtpZCI6IkNhbnZhc1MyU0hNQUNQcm9kIiwidHlwIjoiSldUIn0.eyJhdWQiOiJjYW52YXMtY2FudmFzYXBpIiwiaXNzIjoiY2FudmFzLXMyc3Rva2VuIiwibmJmIjoxNzYyMzA5MDI5LCJzdWIiOiI5MjlhY2NlMy1hMmI2LTRkNjMtODM0Yi02MGExNTZkMDI3ZWN-U1RBR0lOR340Y2QxZjI4YS1jZTQxLTQ0NGEtODVjNi1mNGViMWQ1ZjcyM2EifQ.NwLwqfOE3-iT_DyW_zPsDhf5fm_OsdmpoliSW6Yz5jo`
   - **Environment**: Select all (Production, Preview, Development)
   - Click **Save**

   **Variable 2:**
   - **Key**: `VITE_LENS_ID`
   - **Value**: `placeholder` (update after creating Lens)
   - **Environment**: Select all
   - Click **Save**

   **Variable 3:**
   - **Key**: `VITE_LENS_GROUP_ID`
   - **Value**: `placeholder` (update after creating Lens)
   - **Environment**: Select all
   - Click **Save**

4. **Redeploy**
   - After adding variables, go to **Deployments** tab
   - Click the **⋯** menu on the latest deployment
   - Click **Redeploy**
   - Or push a new commit to trigger automatic redeploy

## Step 2: Configure Content Security Policy (CSP) Headers

Camera Kit requires specific CSP headers to load its WebAssembly runtime.

### Option A: Using vercel.json (Recommended)

1. **Create `vercel.json` in project root** (if it doesn't exist)

2. **Add CSP headers configuration:**

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "connect-src 'self' https://*.snapar.com wss://138.197.104.25 ws://138.197.104.25; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cf-st.sc-cdn.net/ blob:; worker-src 'self' blob:;"
        }
      ]
    }
  ]
}
```

**Note**: This CSP allows:
- `connect-src`: Camera Kit CDN (`*.snapar.com`) and your WebSocket backend
- `script-src`: Camera Kit scripts (`cf-st.sc-cdn.net`) and WebAssembly (`blob:`, `'unsafe-eval'`)
- `worker-src`: For Web Workers (if using Web Worker mode)

### Option B: Using Vercel Dashboard (Alternative)

1. **Go to Project Settings**
   - Settings → **Headers**

2. **Add Header**
   - Click **Add Header**
   - **Source**: `/(.*)`
   - **Header Name**: `Content-Security-Policy`
   - **Value**: 
     ```
     connect-src 'self' https://*.snapar.com wss://138.197.104.25 ws://138.197.104.25; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cf-st.sc-cdn.net/ blob:; worker-src 'self' blob:;
     ```

## Step 3: Create vercel.json File

Let me create the vercel.json file for you:

```bash
# In project root
cat > vercel.json << 'EOF'
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "connect-src 'self' https://*.snapar.com wss://138.197.104.25 ws://138.197.104.25; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cf-st.sc-cdn.net/ blob:; worker-src 'self' blob:;"
        }
      ]
    }
  ]
}
EOF
```

Then commit and push:
```bash
git add vercel.json
git commit -m "Add CSP headers for Camera Kit"
git push origin master
```

## Step 4: Verify Deployment

1. **Check Deployment Logs**
   - Go to **Deployments** tab in Vercel
   - Click on the latest deployment
   - Check **Build Logs** for any errors

2. **Test in Browser**
   - Open your deployed URL
   - Open browser console (F12)
   - Look for:
     - ✅ `"Camera Kit initialized successfully"`
     - ❌ Any CSP errors (should be none)

3. **Common Issues**

   **CSP Error**: "Refused to connect to..."
   - Check CSP headers are set correctly
   - Verify `connect-src` includes `https://*.snapar.com`

   **Camera Kit Error**: "Failed to initialize"
   - Check environment variable `VITE_CAMERA_KIT_API_TOKEN` is set
   - Verify API token is correct
   - Check browser console for detailed error

## Quick Checklist

- [ ] Environment variables added in Vercel dashboard
- [ ] `vercel.json` created with CSP headers
- [ ] Changes committed and pushed
- [ ] Deployment successful (check Vercel dashboard)
- [ ] Test in browser - Camera Kit initializes
- [ ] No CSP errors in browser console

## Alternative: Using Vercel CLI

If you prefer using CLI:

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login
vercel login

# Link project
vercel link

# Set environment variables
vercel env add VITE_CAMERA_KIT_API_TOKEN
vercel env add VITE_LENS_ID
vercel env add VITE_LENS_GROUP_ID

# Deploy
vercel --prod
```

## Notes

- **CSP Headers**: Required for Camera Kit to download and execute WebAssembly
- **Environment Variables**: Must start with `VITE_` to be accessible in frontend code
- **Redeploy**: After adding environment variables, you need to redeploy for them to take effect
- **WebSocket Backend**: CSP includes your backend URL (`wss://138.197.104.25`) for WebSocket connections

## Troubleshooting

**Build fails**: Check build logs in Vercel dashboard
**CSP errors**: Verify `vercel.json` is in project root and committed
**Environment variables not working**: Make sure they start with `VITE_` and redeploy
**Camera Kit won't initialize**: Check API token is correct and CSP headers allow connections

