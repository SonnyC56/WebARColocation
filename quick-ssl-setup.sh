#!/bin/bash
# Quick SSL Setup for Droplet
# Usage: ./quick-ssl-setup.sh yourdomain.com

set -e

DOMAIN=$1

if [ -z "$DOMAIN" ]; then
    echo "❌ Error: Domain name required"
    echo "Usage: ./quick-ssl-setup.sh yourdomain.com"
    exit 1
fi

echo "🔐 Setting up SSL for $DOMAIN..."

# Check if domain resolves to this droplet
DROPLET_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip)
DOMAIN_IP=$(dig +short $DOMAIN | tail -n1)

if [ "$DOMAIN_IP" != "$DROPLET_IP" ]; then
    echo "⚠️  Warning: Domain $DOMAIN does not resolve to this droplet ($DROPLET_IP)"
    echo "   Domain resolves to: $DOMAIN_IP"
    echo "   Please update DNS A record to point to $DROPLET_IP"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Update Nginx config
echo "📝 Updating Nginx configuration..."
sudo sed -i "s/server_name _;/server_name $DOMAIN;/" /etc/nginx/sites-available/default

# Test Nginx config
echo "🧪 Testing Nginx configuration..."
if sudo nginx -t 2>&1 | grep -q "successful"; then
    sudo systemctl reload nginx
    echo "✅ Nginx updated and reloaded"
else
    echo "❌ Nginx configuration error:"
    sudo nginx -t
    exit 1
fi

# Get SSL certificate
echo "🔒 Obtaining SSL certificate from Let's Encrypt..."
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN || {
    echo "⚠️  Certbot failed. Common issues:"
    echo "   1. DNS not propagated (wait 5-60 minutes)"
    echo "   2. Port 80 not accessible (check firewall)"
    echo "   3. Domain already has certificate"
    exit 1
}

# Test SSL
echo "🧪 Testing SSL..."
if curl -s --max-time 5 https://$DOMAIN/health | grep -q "ok"; then
    echo "✅ SSL working! Health endpoint responds over HTTPS"
else
    echo "⚠️  SSL certificate installed but health check failed"
fi

echo ""
echo "✅ SSL setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update Vercel environment variable:"
echo "   VITE_SERVER_URL = wss://$DOMAIN"
echo ""
echo "2. Test WebSocket connection:"
echo "   wscat -c wss://$DOMAIN"
echo ""
echo "3. Verify in browser console:"
echo "   const ws = new WebSocket('wss://$DOMAIN');"
echo "   ws.onopen = () => console.log('Connected!');"
