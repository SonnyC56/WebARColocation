# Quick Start: Testing on Vercel

## Current Situation

- **Frontend**: Deployed on Vercel (HTTPS automatically)
- **Backend**: Droplet at `138.197.104.25` (currently HTTP only)
- **Problem**: HTTPS pages cannot connect to `ws://` (insecure WebSocket)

## Solution: Set Up SSL on Droplet

To test on Vercel, you need SSL on your backend. Here are your options:

### Option 1: Quick SSL Setup (If You Have a Domain)

**On your droplet, run:**

```bash
# Download quick SSL setup script
wget https://raw.githubusercontent.com/SonnyC56/WebARColocation/master/quick-ssl-setup.sh
chmod +x quick-ssl-setup.sh

# Run with your domain
./quick-ssl-setup.sh yourdomain.com
```

**Then in Vercel:**
1. Go to Project Settings → Environment Variables
2. Set `VITE_SERVER_URL` = `wss://yourdomain.com`
3. Redeploy

### Option 2: Use IP with Self-Signed Certificate (Testing Only)

**On your droplet:**

```bash
# Generate self-signed certificate (for testing only)
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/nginx-selfsigned.key \
  -out /etc/ssl/certs/nginx-selfsigned.crt \
  -subj "/CN=138.197.104.25"

# Update Nginx to use self-signed cert
sudo nano /etc/nginx/sites-available/default
```

Add SSL configuration:
```nginx
server {
    listen 443 ssl;
    server_name 138.197.104.25;
    
    ssl_certificate /etc/ssl/certs/nginx-selfsigned.crt;
    ssl_certificate_key /etc/ssl/private/nginx-selfsigned.key;
    
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

```bash
sudo nginx -t
sudo systemctl reload nginx
```

**In Vercel:**
- Set `VITE_SERVER_URL` = `wss://138.197.104.25`
- ⚠️ Browser will show SSL warning (click "Advanced" → "Proceed")

### Option 3: Test Locally First (No SSL Needed)

**For local testing:**
1. Run frontend locally: `cd frontend && npm run dev`
2. Uses HTTP, so `ws://138.197.104.25` works fine
3. Test functionality before deploying to Vercel

## Recommended: Get a Domain

The easiest solution is to get a domain:

1. **Buy domain** (Namecheap, Google Domains, etc.) - ~$10-15/year
2. **Point DNS** to `138.197.104.25`
3. **Run quick SSL setup** script
4. **Update Vercel** env var to `wss://yourdomain.com`

## Current Code Behavior

The code will:
- ✅ Use `ws://138.197.104.25` on HTTP pages
- ✅ Auto-convert to `wss://138.197.104.25` on HTTPS pages
- ⚠️ Connection will fail until backend has SSL

## Testing Checklist

- [ ] Backend accessible at `http://138.197.104.25/health`
- [ ] Domain DNS points to droplet (if using domain)
- [ ] SSL certificate installed on droplet
- [ ] HTTPS endpoint works: `curl https://yourdomain.com/health`
- [ ] Vercel env var set to `wss://yourdomain.com`
- [ ] Frontend redeployed on Vercel

## Quick Test Commands

```bash
# Test backend health
curl http://138.197.104.25/health

# Test SSL (after setup)
curl https://yourdomain.com/health

# Test WebSocket (install wscat: npm install -g wscat)
wscat -c wss://yourdomain.com
```
