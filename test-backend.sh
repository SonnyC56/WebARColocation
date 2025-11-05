#!/bin/bash
# Comprehensive Self-Test Script for AR Backend Setup
# Run this script to verify all components are working correctly

set -e

echo "🧪 Starting Comprehensive Backend Self-Test Suite..."
echo ""

PASSED=0
FAILED=0
WARNINGS=0

# Test 1: Node.js Installation
echo "=== TEST 1: Node.js Installation ==="
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    echo "✅ Node.js: $NODE_VERSION"
    echo "✅ npm: $NPM_VERSION"
    ((PASSED++))
else
    echo "❌ Node.js not found"
    ((FAILED++))
fi
echo ""

# Test 2: PM2 Status
echo "=== TEST 2: PM2 Status ==="
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "ar-backend"; then
        echo "✅ PM2 installed and ar-backend process found"
        pm2 status | grep ar-backend
        ((PASSED++))
    else
        echo "⚠️  PM2 installed but ar-backend not running"
        pm2 list
        ((WARNINGS++))
    fi
else
    echo "❌ PM2 not installed"
    ((FAILED++))
fi
echo ""

# Test 3: Application Health Endpoint
echo "=== TEST 3: Application Health Endpoint ==="
HEALTH_RESPONSE=$(curl -s --max-time 5 http://localhost:8080/health 2>&1 || echo "ERROR")
if echo "$HEALTH_RESPONSE" | grep -q "status.*ok"; then
    echo "✅ Health endpoint working"
    echo "Response: $HEALTH_RESPONSE"
    ((PASSED++))
else
    echo "❌ Health endpoint failed"
    echo "Response: $HEALTH_RESPONSE"
    ((FAILED++))
fi
echo ""

# Test 4: Port 8080 Listening
echo "=== TEST 4: Port 8080 Listening ==="
if sudo netstat -tlnp 2>/dev/null | grep -q ":8080" || ss -tlnp 2>/dev/null | grep -q ":8080"; then
    echo "✅ Port 8080 is listening"
    sudo netstat -tlnp 2>/dev/null | grep ":8080" || ss -tlnp 2>/dev/null | grep ":8080"
    ((PASSED++))
else
    echo "❌ Port 8080 not listening"
    ((FAILED++))
fi
echo ""

# Test 5: Nginx Status
echo "=== TEST 5: Nginx Status ==="
if sudo systemctl is-active --quiet nginx 2>/dev/null; then
    echo "✅ Nginx is running"
    sudo systemctl status nginx --no-pager -l | head -5
    ((PASSED++))
else
    echo "❌ Nginx is not running"
    sudo systemctl status nginx --no-pager -l | head -5
    ((FAILED++))
fi
echo ""

# Test 6: Nginx Configuration
echo "=== TEST 6: Nginx Configuration ==="
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo "✅ Nginx configuration valid"
    ((PASSED++))
else
    echo "❌ Nginx configuration invalid"
    sudo nginx -t
    ((FAILED++))
fi
echo ""

# Test 7: Application Logs
echo "=== TEST 7: Application Logs (Last 10 lines) ==="
if pm2 list | grep -q "ar-backend"; then
    echo "Recent logs:"
    pm2 logs ar-backend --lines 10 --nostream 2>/dev/null || echo "Could not retrieve logs"
    ((PASSED++))
else
    echo "⚠️  Cannot check logs - ar-backend not running"
    ((WARNINGS++))
fi
echo ""

# Test 8: WebSocket Headers Test
echo "=== TEST 8: WebSocket Headers Test ==="
WS_TEST=$(curl -s -i --max-time 5 -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: test" http://localhost:8080/ 2>&1 | head -5)
if echo "$WS_TEST" | grep -qi "upgrade\|websocket\|101"; then
    echo "✅ WebSocket upgrade headers detected"
    echo "$WS_TEST" | head -3
    ((PASSED++))
else
    echo "⚠️  WebSocket upgrade headers not detected (may be OK via HTTP)"
    echo "$WS_TEST" | head -3
    ((WARNINGS++))
fi
echo ""

# Test 9: Firewall Status
echo "=== TEST 9: Firewall Status ==="
if sudo ufw status | grep -q "Status: active"; then
    echo "✅ Firewall is active"
    sudo ufw status | head -10
    ((PASSED++))
else
    echo "⚠️  Firewall may not be configured"
    sudo ufw status
    ((WARNINGS++))
fi
echo ""

# Test 10: Process Check
echo "=== TEST 10: Backend Process Check ==="
if pgrep -f "dist/server.js" > /dev/null; then
    echo "✅ Backend process is running"
    ps aux | grep "dist/server.js" | grep -v grep
    ((PASSED++))
else
    echo "❌ Backend process not found"
    ((FAILED++))
fi
echo ""

# Test 11: External Access Test
echo "=== TEST 11: External Access Test ==="
EXTERNAL_IP=$(curl -s --max-time 5 ifconfig.me 2>/dev/null || curl -s --max-time 5 ipinfo.io/ip 2>/dev/null || echo "UNKNOWN")
echo "Droplet IP: $EXTERNAL_IP"
if [ "$EXTERNAL_IP" != "UNKNOWN" ]; then
    echo "Testing external access..."
    EXTERNAL_HEALTH=$(curl -s --max-time 5 http://$EXTERNAL_IP/health 2>&1)
    if echo "$EXTERNAL_HEALTH" | grep -q "status.*ok"; then
        echo "✅ External access working"
        echo "Health response: $EXTERNAL_HEALTH"
        ((PASSED++))
    else
        echo "⚠️  External access may need Nginx configuration"
        echo "Response: $EXTERNAL_HEALTH"
        ((WARNINGS++))
    fi
else
    echo "⚠️  Could not determine external IP"
    ((WARNINGS++))
fi
echo ""

# Test 12: Git Repository Check
echo "=== TEST 12: Git Repository Check ==="
if [ -d "/var/www/ar-backend" ]; then
    if [ -f "/var/www/ar-backend/backend/dist/server.js" ]; then
        echo "✅ Repository cloned and built successfully"
        echo "Build file exists: /var/www/ar-backend/backend/dist/server.js"
        ((PASSED++))
    else
        echo "⚠️  Repository exists but build may be missing"
        ((WARNINGS++))
    fi
else
    echo "❌ Repository directory not found"
    ((FAILED++))
fi
echo ""

# Summary Report
echo "=========================================="
echo "=== TEST SUMMARY ==="
echo "=========================================="
echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED"
echo "⚠️  Warnings: $WARNINGS"
echo ""

# Generate report file
cat > /tmp/backend-test-report.txt << EOF
=== BACKEND SETUP TEST REPORT ===
Date: $(date)
Droplet IP: $EXTERNAL_IP

TEST RESULTS:
✅ Passed: $PASSED
❌ Failed: $FAILED
⚠️  Warnings: $WARNINGS

DETAILED RESULTS:
- Node.js: $(command -v node > /dev/null && echo "✅ Installed" || echo "❌ Missing")
- PM2: $(command -v pm2 > /dev/null && echo "✅ Installed" || echo "❌ Missing")
- Health Endpoint: $(curl -s --max-time 2 http://localhost:8080/health | grep -q "ok" && echo "✅ Working" || echo "❌ Failed")
- Port 8080: $(sudo netstat -tlnp 2>/dev/null | grep -q ":8080" && echo "✅ Listening" || echo "❌ Not listening")
- Nginx: $(sudo systemctl is-active --quiet nginx 2>/dev/null && echo "✅ Running" || echo "❌ Not running")
- Backend Process: $(pgrep -f "dist/server.js" > /dev/null && echo "✅ Running" || echo "❌ Not running")

ENDPOINTS:
- Health: http://$EXTERNAL_IP/health
- WebSocket: ws://$EXTERNAL_IP (or wss://[DOMAIN] if SSL configured)

STATUS: $(if [ $FAILED -eq 0 ]; then echo "✅ READY"; else echo "❌ NEEDS ATTENTION"; fi)

EOF

echo "📄 Full report saved to: /tmp/backend-test-report.txt"
cat /tmp/backend-test-report.txt

if [ $FAILED -eq 0 ]; then
    echo ""
    echo "🎉 All critical tests passed! Backend appears to be ready."
    exit 0
else
    echo ""
    echo "⚠️  Some tests failed. Please review the output above."
    exit 1
fi
