# GitHub Authentication Setup for Droplet

## Option 1: SSH Key (Recommended)

### Step 1: Generate SSH Key on Droplet
```bash
ssh-keygen -t ed25519 -C "droplet-ar-backend" -f ~/.ssh/id_ed25519 -N ""
```

### Step 2: Display Public Key
```bash
cat ~/.ssh/id_ed25519.pub
```

### Step 3: Add to GitHub
1. Go to: https://github.com/settings/ssh/new
2. Title: "Droplet AR Backend"
3. Paste the public key
4. Click "Add SSH key"

### Step 4: Test Connection
```bash
ssh -T git@github.com
# Should say: "Hi SonnyC56! You've successfully authenticated..."
```

### Step 5: Update Clone URL
In the setup instructions, use:
```bash
git clone git@github.com:SonnyC56/WebARColocation.git .
```

---

## Option 2: Personal Access Token (PAT)

### Step 1: Create PAT on GitHub
1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" -> "Generate new token (classic)"
3. Name: "Droplet AR Backend"
4. Expiration: Choose appropriate (90 days recommended)
5. Scopes: Check `repo` (full control of private repositories)
6. Click "Generate token"
7. **COPY THE TOKEN** (you won't see it again!)

### Step 2: Configure Git on Droplet
```bash
git config --global credential.helper store
```

### Step 3: Clone Repository
```bash
git clone https://github.com/SonnyC56/WebARColocation.git .
# Username: SonnyC56
# Password: [paste your PAT token]
```

The credentials will be saved for future use.

---

## Option 3: Make Repository Public (No Auth Needed)

If you make the repository public:
1. Go to repository Settings -> General -> Danger Zone
2. Change visibility to Public
3. No authentication needed on droplet

---

## Updating Setup Instructions

The instructions now include GitHub authentication setup. Choose the method that works best for you:

- **SSH Key**: Best for security, no token expiration
- **PAT**: Easier setup, but token expires
- **Public Repo**: No auth needed, but code is public

## Troubleshooting

### SSH Key Issues
```bash
# Test SSH connection
ssh -T git@github.com

# Check SSH agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Verify key is added
ssh-add -l
```

### PAT Issues
```bash
# Clear stored credentials
git config --global --unset credential.helper
rm ~/.git-credentials

# Reconfigure
git config --global credential.helper store
```

### Permission Denied
```bash
# Check repository visibility
# Verify SSH key is added to GitHub
# Verify PAT has correct scopes (repo)
```
