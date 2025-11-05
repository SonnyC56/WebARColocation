# SSL Setup Guide for Production

Your droplet IP is: **138.197.104.25**

## Current Setup (Development/Testing)

For now, using: `ws://138.197.104.25`
- ✅ Works for local development
- ✅ Works for testing
- ✅ Works on local networks
- ⚠️ Will auto-convert to `wss://` if frontend is HTTPS (but backend needs SSL)

## Setting Up SSL for Production

### Step 1: Get a Domain Name

Purchase a domain from:
- Namecheap
- Google Domains
- Cloudflare
- Any registrar

Example: `ar-backend.yourdomain.com` or `api.yourdomain.com`

### Step 2: Point Domain to Droplet

In your domain registrar's DNS settings, add an A record:

```
Type: A
Name: @ (or subdomain like "api" or "ar-backend")
Value: 138.197.104.25
TTL: 3600 (or default)
```

Wait for DNS propagation (can take a few minutes to 24 hours). Verify with:
```bash
dig yourdomain.com
# Should return 138.197.104.25
```

### Step 3: Configure Nginx on Droplet

SSH into your droplet and update Nginx config:

```bash
sudo nano /etc/nginx/sites-available/default
```

Update the `server_name` directive:
```nginx
server {
    listen 80;
    server_name yourdomain.com;  # Replace with your domain
    
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

Test and reload:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Step 4: Get SSL Certificate

Run Certbot:
```bash
sudo certbot --nginx -d yourdomain.com
```

Certbot will:
- Automatically obtain SSL certificate from Let's Encrypt
- Configure Nginx for HTTPS
- Set up automatic renewal

### Step 5: Verify SSL

Test your SSL endpoint:
```bash
curl https://yourdomain.com/health
```

Should return: `{"status":"ok","timestamp":...}`

### Step 6: Update Frontend Environment Variable

In Vercel:
1. Go to Project Settings → Environment Variables
2. Update `VITE_SERVER_URL` to: `wss://yourdomain.com`
3. Redeploy

## Quick SSL Setup Script

Save this as `setup-ssl.sh` on your droplet:

```bash
#!/bin/bash
# SSL Setup Script

DOMAIN=$1

if [ -z "$DOMAIN" ]; then
    echo "Usage: ./setup-ssl.sh yourdomain.com"
    exit 1
fi

echo "Setting up SSL for $DOMAIN..."

# Update Nginx config
sudo sed -i "s/server_name _;/server_name $DOMAIN;/" /etc/nginx/sites-available/default

# Test Nginx config
sudo nginx -t

if [ $? -eq 0 ]; then
    sudo systemctl reload nginx
    echo "✅ Nginx updated"
    
    # Get SSL certificate
    sudo certbot --nginx -d $DOMAIN
    
    echo "✅ SSL setup complete!"
    echo "Update Vercel VITE_SERVER_URL to: wss://$DOMAIN"
else
    echo "❌ Nginx configuration error"
    exit 1
fi
```

Usage:
```bash
chmod +x setup-ssl.sh
./setup-ssl.sh yourdomain.com
```

## Testing SSL

### Check Certificate
```bash
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```

### Test WebSocket Over SSL
```bash
# Using wscat (install: npm install -g wscat)
wscat -c wss://yourdomain.com
```

### Browser Test
Open browser console and test:
```javascript
const ws = new WebSocket('wss://yourdomain.com');
ws.onopen = () => console.log('Connected!');
ws.onerror = (e) => console.error('Error:', e);
```

## Troubleshooting

### Certificate Not Issued
- Ensure DNS A record points to 138.197.104.25
- Check DNS propagation: `dig yourdomain.com`
- Verify port 80 is open: `sudo ufw allow 80/tcp`

### Nginx Not Updating
```bash
sudo nginx -t
sudo systemctl restart nginx
sudo tail -f /var/log/nginx/error.log
```

### Certificate Renewal
Certbot sets up automatic renewal. Test renewal:
```bash
sudo certbot renew --dry-run
```

## Current Status

- **Development URL**: `ws://138.197.104.25`
- **Production URL** (after SSL): `wss://yourdomain.com`
- **Auto-conversion**: Code automatically converts `ws://` to `wss://` on HTTPS pages

## Next Steps

1. ✅ Backend is using `ws://138.197.104.25` (works for development)
2. ⏳ Get domain name when ready for production
3. ⏳ Point DNS to droplet IP
4. ⏳ Run certbot to get SSL
5. ⏳ Update Vercel env var to `wss://yourdomain.com`
