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

**4. Setup GitHub Authentication (Choose ONE method):**

**OPTION A: SSH Key (Recommended for Private Repos)**

```bash
# Generate SSH key if you don't have one
ssh-keygen -t ed25519 -C "droplet-setup" -f ~/.ssh/id_ed25519 -N ""

# Display public key
echo "=== PUBLIC KEY - Copy this and add to GitHub ==="
cat ~/.ssh/id_ed25519.pub
echo "=== Add this key to GitHub: Settings -> SSH and GPG keys -> New SSH key ==="

# Test SSH connection (will prompt to add GitHub to known_hosts)
ssh -T git@github.com
```

**OPTION B: Personal Access Token (PAT) for HTTPS**

```bash
# Configure git to use token (you'll be prompted for token when cloning)
git config --global credential.helper store
# Note: You'll need to create a PAT at https://github.com/settings/tokens
# Required scopes: repo (for private repos)
```

**5. Create application directory:**
```bash
sudo mkdir -p /var/www/ar-backend
sudo chown $USER:$USER /var/www/ar-backend
cd /var/www/ar-backend
```

**5. Clone the repository:**

**If using SSH (recommended):**
```bash
git clone git@github.com:SonnyC56/WebARColocation.git .
cd backend
```

**If using HTTPS with PAT:**
```bash
# You'll be prompted for username and token
git clone https://github.com/SonnyC56/WebARColocation.git .
cd backend
```

**If repository is public (no auth needed):**
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

### Phase 6: SSL Setup (Required for Vercel HTTPS)

**14. Get SSL certificate (REQUIRED for Vercel testing):**

You have two options:

**OPTION A: Quick SSL Setup Script (Recommended)**

```bash
# Download the quick SSL setup script
wget https://raw.githubusercontent.com/SonnyC56/WebARColocation/master/quick-ssl-setup.sh
chmod +x quick-ssl-setup.sh

# Run with your domain name
./quick-ssl-setup.sh yourdomain.com
```

**OPTION B: Manual SSL Setup**

```bash
# First, ensure DNS A record points to this droplet
# Then update Nginx server_name
sudo nano /etc/nginx/sites-available/default
# Change: server_name _; to server_name yourdomain.com;

# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com
# Follow the prompts
```

**15. Verify SSL:**
```bash
curl https://yourdomain.com/health
# Should return: {"status":"ok","timestamp":...}
```

**16. Update Frontend (Vercel):**
After SSL is working, update Vercel environment variable:
- `VITE_SERVER_URL` = `wss://yourdomain.com`

### Phase 7: Verification & Self-Testing

**16. Run comprehensive self-tests:**

You MUST run all these tests and report the results:

```bash
echo "=== TEST 1: Node.js Installation ==="
node --version
npm --version
echo ""

echo "=== TEST 2: PM2 Status ==="
pm2 status
pm2 list
echo ""

echo "=== TEST 3: Application Health Endpoint ==="
HEALTH_RESPONSE=$(curl -s http://localhost:8080/health)
echo "Response: $HEALTH_RESPONSE"
if echo "$HEALTH_RESPONSE" | grep -q "status.*ok"; then
    echo "✅ Health endpoint working"
else
    echo "❌ Health endpoint failed"
fi
echo ""

echo "=== TEST 4: Port 8080 Listening ==="
if sudo netstat -tlnp | grep -q ":8080"; then
    echo "✅ Port 8080 is listening"
    sudo netstat -tlnp | grep ":8080"
else
    echo "❌ Port 8080 not listening"
fi
echo ""

echo "=== TEST 5: Nginx Status ==="
sudo systemctl status nginx --no-pager -l | head -10
if sudo systemctl is-active --quiet nginx; then
    echo "✅ Nginx is running"
else
    echo "❌ Nginx is not running"
fi
echo ""

echo "=== TEST 6: Nginx Configuration ==="
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo "✅ Nginx configuration valid"
else
    echo "❌ Nginx configuration invalid"
    sudo nginx -t
fi
echo ""

echo "=== TEST 7: Application Logs (Last 20 lines) ==="
pm2 logs ar-backend --lines 20 --nostream
echo ""

echo "=== TEST 8: WebSocket Test (via curl) ==="
WS_TEST=$(curl -s -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: test" http://localhost:8080/ 2>&1 | head -5)
echo "$WS_TEST"
if echo "$WS_TEST" | grep -qi "upgrade\|websocket\|101"; then
    echo "✅ WebSocket headers detected"
else
    echo "⚠️  WebSocket upgrade headers may not be working (this is OK if testing via HTTP)"
fi
echo ""

echo "=== TEST 9: Firewall Status ==="
sudo ufw status
echo ""

echo "=== TEST 10: Process Check ==="
if pgrep -f "dist/server.js" > /dev/null; then
    echo "✅ Backend process is running"
    ps aux | grep "dist/server.js" | grep -v grep
else
    echo "❌ Backend process not found"
fi
echo ""

echo "=== TEST 11: External Access Test ==="
EXTERNAL_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip)
echo "Droplet IP: $EXTERNAL_IP"
echo "Testing external access..."
EXTERNAL_HEALTH=$(curl -s --max-time 5 http://$EXTERNAL_IP/health 2>&1)
if echo "$EXTERNAL_HEALTH" | grep -q "status.*ok"; then
    echo "✅ External access working"
    echo "Health response: $EXTERNAL_HEALTH"
else
    echo "⚠️  External access may need Nginx configuration or firewall adjustment"
    echo "Response: $EXTERNAL_HEALTH"
fi
echo ""
```

**17. Generate Test Report:**

**OPTION A: Run Automated Test Script (Recommended):**

```bash
# Download and run the automated test script
wget https://raw.githubusercontent.com/SonnyC56/WebARColocation/master/test-backend.sh
chmod +x test-backend.sh
./test-backend.sh
```

This script will:
- Run all 12 comprehensive tests automatically
- Show pass/fail status for each test
- Generate a detailed report file
- Provide a summary with droplet IP and endpoints

**OPTION B: Manual Test Report:**

After running all tests manually, create a summary report:

```bash
cat > /tmp/setup-report.txt << 'EOF'
=== SETUP TEST REPORT ===
Date: $(date)

TEST RESULTS:
- Node.js: [✅/❌]
- PM2: [✅/❌]
- Health Endpoint: [✅/❌]
- Port 8080: [✅/❌]
- Nginx: [✅/❌]
- Nginx Config: [✅/❌]
- Application Logs: [✅/❌]
- WebSocket Headers: [✅/❌]
- Firewall: [✅/❌]
- Process: [✅/❌]
- External Access: [✅/❌]

DROPLET IP: [IP_ADDRESS]
HEALTH ENDPOINT: http://[IP_ADDRESS]/health
WEBSOCKET URL: ws://[IP_ADDRESS] (or wss://[DOMAIN] if SSL configured)

NOTES:
[Any errors or warnings]
EOF

cat /tmp/setup-report.txt
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

## Self-Testing Requirements

**IMPORTANT:** After completing all setup phases, you MUST:

1. **Run all tests from Phase 7, Step 16** (the comprehensive test suite)
2. **Execute each test command** and verify results
3. **Generate the test report** from Step 17
4. **Report findings** using this format:

```
=== SETUP COMPLETE ===

✅ PASSED TESTS:
- [List all tests that passed]

❌ FAILED TESTS:
- [List any tests that failed]
- [Include error messages]

⚠️  WARNINGS:
- [List any warnings or concerns]

DROPLET INFORMATION:
- IP Address: [IP]
- Health Endpoint: http://[IP]/health
- WebSocket URL: ws://[IP] (or wss://[DOMAIN])
- Status: [Ready/Needs Attention]

NEXT STEPS REQUIRED:
- [List any manual steps needed, e.g., "Run PM2 startup command", "Configure SSL"]
```

## Report Back Format

After completing setup AND running all tests, provide this report:

```
=== BACKEND SETUP REPORT ===

PHASE COMPLETION:
✅ Phase 1: System Preparation
✅ Phase 2: Application Setup  
✅ Phase 3: Process Management
✅ Phase 4: Network Configuration
✅ Phase 5: Nginx Configuration
[✅/❌] Phase 6: SSL Setup (if applicable)
✅ Phase 7: Verification & Testing

TEST RESULTS:
[Copy output from test suite]

FINAL STATUS:
- Application URL: http://[IP]/health
- WebSocket URL: ws://[IP] (or wss://[DOMAIN])
- Status: [READY/NOT READY]
- Issues: [None/List issues]

MANUAL STEPS REQUIRED:
- [List any steps the user needs to complete]
```

---

**Ready to begin? Start with Phase 1, Step 1. After completing all phases, run Phase 7 tests and generate the report.**
