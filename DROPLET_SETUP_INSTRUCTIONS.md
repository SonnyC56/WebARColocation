# Instructions for Claude Instance on DigitalOcean Droplet

You are an AI assistant helping to set up a WebSocket backend server for an AR application. Follow these instructions step by step.

## Your Mission
Set up a Node.js backend server that handles WebSocket connections for a multiplayer AR experience.

## Prerequisites
- Fresh Ubuntu 22.04 Droplet
- Root or sudo access
- Internet connection

## Step-by-Step Setup

### Phase 1: System Preparation

**1. Update the system:**
```bash
sudo apt update && sudo apt upgrade -y
```

**2. Install Node.js 18.x:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # Should show v18.x.x
```

**3. Install required tools:**
```bash
sudo npm install -g pm2
sudo apt install nginx certbot python3-certbot-nginx -y
```

### Phase 2: Application Setup

**4. Create application directory:**
```bash
sudo mkdir -p /var/www/ar-backend
sudo chown $USER:$USER /var/www/ar-backend
cd /var/www/ar-backend
```

**5. Clone the repository:**
```bash
git clone https://github.com/SonnyC56/WebARColocation.git .
cd backend
```

**6. Install dependencies and build:**
```bash
npm install --production
npm run build
```

**7. Create environment file:**
```bash
cat > .env << 'EOF'
PORT=8080
NODE_ENV=production
EOF
```

### Phase 3: Process Management

**8. Start application with PM2:**
```bash
pm2 start dist/server.js --name ar-backend
pm2 save
```

**9. Enable PM2 on boot:**
```bash
pm2 startup
# IMPORTANT: Run the command that is output by pm2 startup
```

### Phase 4: Network Configuration

**10. Configure firewall:**
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

**11. Test the application:**
```bash
curl http://localhost:8080/health
# Expected output: {"status":"ok","timestamp":...}
```

### Phase 5: Nginx Configuration

**12. Configure Nginx for WebSocket support:**

Create/edit `/etc/nginx/sites-available/default`:
```bash
sudo nano /etc/nginx/sites-available/default
```

Replace the entire file content with:
```nginx
server {
    listen 80;
    server_name _;
    
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

**13. Test and reload Nginx:**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Phase 6: SSL Setup (If you have a domain)

**14. Get SSL certificate:**
```bash
sudo certbot --nginx -d yourdomain.com
# Follow the prompts
# Certbot will automatically update Nginx config
```

**15. Verify SSL:**
```bash
curl https://yourdomain.com/health
```

### Phase 7: Verification

**16. Run these checks:**

```bash
# Check PM2 status
pm2 status

# Check application logs
pm2 logs ar-backend --lines 50

# Check Nginx status
sudo systemctl status nginx

# Check if port 8080 is listening
sudo netstat -tlnp | grep 8080

# Test health endpoint
curl http://localhost:8080/health
```

## Expected Results

After setup:
- ✅ Application running on port 8080
- ✅ PM2 managing the process
- ✅ Nginx proxying requests
- ✅ Health endpoint responding
- ✅ WebSocket connections supported

## Troubleshooting

If something fails:

**Application won't start:**
```bash
pm2 logs ar-backend --lines 100
cd /var/www/ar-backend/backend
npm run build  # Rebuild if needed
pm2 restart ar-backend
```

**Nginx errors:**
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

**Port already in use:**
```bash
sudo netstat -tlnp | grep 8080
# Kill the process if needed
```

**Firewall blocking:**
```bash
sudo ufw status
sudo ufw allow 8080/tcp  # If needed
```

## Final Notes

1. **Domain vs IP**: If using IP address, replace `yourdomain.com` with the droplet IP
2. **PM2 Startup**: Critical - ensure you run the command from `pm2 startup`
3. **WebSocket**: Nginx config MUST include `Upgrade` and `Connection "upgrade"` headers
4. **SSL**: Only needed if you have a domain name

## Completion Checklist

- [ ] Node.js 18+ installed
- [ ] Repository cloned
- [ ] Dependencies installed
- [ ] Application built successfully
- [ ] PM2 running application
- [ ] PM2 startup configured
- [ ] Nginx configured and running
- [ ] Firewall configured
- [ ] Health endpoint responding
- [ ] SSL certificate installed (if using domain)

## Report Back

After completing setup, report:
1. Application URL (IP or domain)
2. Health endpoint status
3. PM2 status
4. Any errors encountered

---

**Ready to begin? Start with Phase 1, Step 1.**
