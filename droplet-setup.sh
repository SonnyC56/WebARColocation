#!/bin/bash
# DigitalOcean Droplet Setup Script for AR Backend
# Run this script on a fresh Ubuntu 22.04 droplet

set -e  # Exit on error

echo "🚀 Starting AR Backend Setup..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Update system
echo -e "${BLUE}📦 Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
echo -e "${BLUE}📦 Installing Node.js 18...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
echo -e "${GREEN}✅ Node.js ${NODE_VERSION} installed${NC}"
echo -e "${GREEN}✅ npm ${NPM_VERSION} installed${NC}"

# Install PM2 globally
echo -e "${BLUE}📦 Installing PM2...${NC}"
sudo npm install -g pm2

# Install Nginx
echo -e "${BLUE}📦 Installing Nginx...${NC}"
sudo apt install nginx -y

# Install Certbot for SSL
echo -e "${BLUE}📦 Installing Certbot...${NC}"
sudo apt install certbot python3-certbot-nginx -y

# Create app directory
echo -e "${BLUE}📁 Creating application directory...${NC}"
APP_DIR="/var/www/ar-backend"
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# Clone repository
echo -e "${BLUE}📥 Cloning repository...${NC}"
cd $APP_DIR
git clone https://github.com/SonnyC56/WebARColocation.git .

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
cd backend
npm install --production

# Build application
echo -e "${BLUE}🔨 Building application...${NC}"
npm run build

# Create .env file
echo -e "${BLUE}📝 Creating environment file...${NC}"
cat > .env << EOF
PORT=8080
NODE_ENV=production
EOF

# Start with PM2
echo -e "${BLUE}🚀 Starting application with PM2...${NC}"
pm2 start dist/server.js --name ar-backend
pm2 save

# Setup PM2 startup script
echo -e "${BLUE}⚙️  Configuring PM2 startup...${NC}"
pm2 startup

echo -e "${YELLOW}⚠️  Run the command shown above to enable PM2 on boot${NC}"

# Configure firewall
echo -e "${BLUE}🔥 Configuring firewall...${NC}"
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo -e "${GREEN}✅ Setup complete!${NC}"
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "1. Configure Nginx (see nginx-config.txt)"
echo "2. Setup SSL certificate: sudo certbot --nginx -d yourdomain.com"
echo "3. Test: curl http://localhost:8080/health"
