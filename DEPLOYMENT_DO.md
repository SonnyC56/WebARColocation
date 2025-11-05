# Backend - DigitalOcean Deployment Guide

This guide walks you through deploying the backend to DigitalOcean.

## Option 1: DigitalOcean App Platform (Recommended for Quick Start)

### Step 1: Create App Platform App

1. Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
2. Click "Create App"
3. Connect your GitHub repository
4. Select this repository

### Step 2: Configure Backend Service

1. **Source**: Select `backend/` directory
2. **Build Command**: `npm install && npm run build`
3. **Run Command**: `npm start`
4. **Environment Variables**:
   - `PORT`: `8080`
   - `NODE_ENV`: `production`

### Step 3: Configure WebSocket

1. In App Platform settings, ensure WebSocket is enabled
2. The app will be accessible at `https://your-app-name.ondigitalocean.app`
3. Update frontend `VITE_SERVER_URL` to `wss://your-app-name.ondigitalocean.app`

### Step 4: Custom Domain (Optional)

1. In App Platform → Settings → Domains
2. Add your custom domain (e.g., `api.yourdomain.com`)
3. Configure DNS records as instructed
4. SSL certificate is automatically provisioned

---

## Option 2: DigitalOcean Droplet (More Control)

### Step 1: Create Droplet

1. Create a new Ubuntu 22.04 droplet (minimum $6/month)
2. Size: Basic plan with 1GB RAM is sufficient for small groups

### Step 2: Initial Server Setup

```bash
# SSH into your droplet
ssh root@your-droplet-ip

# Update system
apt update && apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install PM2 for process management
npm install -g pm2

# Install Nginx for reverse proxy
apt install nginx -y
```

### Step 3: Clone and Setup App

```bash
# Clone repository (replace with your repo URL)
git clone https://github.com/yourusername/WebARColocation.git
cd WebARColocation/backend

# Install dependencies
npm install

# Build
npm run build

# Test run
npm start
```

### Step 4: Setup SSL with Let's Encrypt

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Get SSL certificate (replace with your domain)
certbot --nginx -d api.yourdomain.com

# Certbot will automatically configure Nginx
```

### Step 5: Configure Nginx for WebSocket

Edit `/etc/nginx/sites-available/default`:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Reload Nginx:
```bash
nginx -t  # Test configuration
systemctl reload nginx
```

### Step 6: Setup PM2 (Process Manager)

```bash
cd /path/to/WebARColocation/backend

# Start with PM2
pm2 start dist/server.js --name ar-backend

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions it gives you
```

### Step 7: Configure Firewall

```bash
# Allow SSH, HTTP, HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### Step 8: Update Frontend Environment Variable

Update your Vercel environment variable:
- `VITE_SERVER_URL`: `wss://api.yourdomain.com`

---

## Health Check

Test your backend is running:
```bash
curl https://api.yourdomain.com/health
```

Should return: `{"status":"ok","timestamp":...}`

## Monitoring

Check PM2 status:
```bash
pm2 status
pm2 logs ar-backend
pm2 monit
```

## Updating Deployment

```bash
cd /path/to/WebARColocation
git pull
cd backend
npm install
npm run build
pm2 restart ar-backend
```
