# Quick Reference: How to Use Setup Instructions with Claude

## For Claude Instance on Droplet

**Give Claude this prompt:**

```
You are setting up a WebSocket backend server. Please follow these instructions step-by-step:

[Paste the entire contents of DROPLET_SETUP_INSTRUCTIONS.md]

After completing all phases, you MUST:
1. Run the automated test script: wget https://raw.githubusercontent.com/SonnyC56/WebARColocation/master/test-backend.sh && chmod +x test-backend.sh && ./test-backend.sh
2. Report the test results in the format specified in the instructions
3. Provide the droplet IP and endpoints
```

## What Claude Will Do

1. ✅ Follow all 7 phases of setup
2. ✅ Run comprehensive self-tests (11 tests)
3. ✅ Generate automated test report
4. ✅ Report back with status and endpoints

## Test Coverage

The automated test script (`test-backend.sh`) verifies:
- Node.js installation
- PM2 status and process management
- Health endpoint functionality
- Port 8080 listening
- Nginx status and configuration
- Application logs
- WebSocket headers
- Firewall configuration
- Process existence
- External access
- Git repository and build files

## Files Ready

- ✅ `DROPLET_SETUP_INSTRUCTIONS.md` - Complete step-by-step guide
- ✅ `test-backend.sh` - Automated test script
- ✅ `droplet-setup.sh` - Automated setup script (optional)

All files are committed and pushed to GitHub.
