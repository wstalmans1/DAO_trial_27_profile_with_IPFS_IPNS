# Setup.sh Updates Summary: Answers to Your Questions

## Question 1: What about https://dweb.link?

**Answer:** Yes, dweb.link should definitely be included! It's Protocol Labs' official IPFS gateway and is highly recommended.

### Update Required:

**In `.env.example` section (around line 243):**

Replace:
```bash
# Option 3: Public IPFS Gateways (fallback)
VITE_IPFS_GATEWAY_1=https://ipfs.io
VITE_IPFS_GATEWAY_2=https://cloudflare-ipfs.com
VITE_IPFS_GATEWAY_3=https://gateway.pinata.cloud
```

With:
```bash
# Option 3: Public IPFS Gateways (fallback)
# dweb.link is Protocol Labs' official IPFS gateway (recommended as primary fallback)
VITE_IPFS_GATEWAY_1=https://dweb.link
VITE_IPFS_GATEWAY_2=https://ipfs.io
VITE_IPFS_GATEWAY_3=https://cloudflare-ipfs.com
VITE_IPFS_GATEWAY_4=https://gateway.pinata.cloud
```

**Why dweb.link?**
- Official Protocol Labs gateway
- Reliable and well-maintained
- Good performance globally
- Supports both IPFS and IPNS
- Recommended as primary fallback gateway

---

## Question 2: Do we also adapt adequately the echo statements at the end of setup.sh?

**Answer:** Yes, absolutely! The echo statements provide user instructions and should include IPFS/IPNS configuration steps.

### Update 1: Initial Setup Instructions (After Line 1232)

**Find:**
```bash
echo "Next:"
echo "1) Edit apps/dao-dapp/.env.local"
echo "2) Edit packages/contracts/.env.hardhat.local"
echo "3) To deploy the website locally, run \"pnpm web\:dev\" from the root directory"
```

**Replace with:**
```bash
echo "Next:"
echo "1) Edit apps/dao-dapp/.env.local"
echo "   - Add your VITE_WALLETCONNECT_ID (get one free from https://cloud.walletconnect.com)"
echo "   - Add IPFS/IPNS configuration:"
echo "     * VITE_WEB3_STORAGE_TOKEN (get from https://web3.storage) OR"
echo "     * VITE_PINATA_JWT (get from https://pinata.cloud)"
echo "   - RPC URLs are pre-configured with defaults"
echo "2) Edit packages/contracts/.env.hardhat.local"
echo "   - Add your PRIVATE_KEY or MNEMONIC (for deploying contracts)"
echo "   - Add RPC URLs for networks (Sepolia, Mainnet, etc.)"
echo "   - Add ETHERSCAN_API_KEY (get one free from https://etherscan.io/apis)"
echo "3) To deploy the website locally, run \"pnpm web\:dev\" from the root directory"
```

### Update 2: Fleek Deployment Instructions (After Line 1294)

**Find:**
```bash
echo "     * Name: VITE_SEPOLIA_RPC"
echo "       Value: https://rpc.sepolia.org (or your custom RPC)"
echo "   - (If you see 'Hide advanced options', click it to see more fields if needed)"
```

**Add after (before the closing quote):**
```bash
echo "     * Name: VITE_WEB3_STORAGE_TOKEN"
echo "       Value: (get from https://web3.storage - sign up for free account)"
echo "       OR"
echo "     * Name: VITE_PINATA_JWT"
echo "       Value: (get from https://pinata.cloud - sign up for free account)"
echo "     * Name: VITE_PINATA_GATEWAY"
echo "       Value: https://gateway.pinata.cloud"
echo "     * Name: VITE_IPFS_GATEWAY_1"
echo "       Value: https://dweb.link"
echo "     * Name: VITE_IPFS_GATEWAY_2"
echo "       Value: https://ipfs.io"
echo "     * Name: VITE_IPFS_GATEWAY_3"
echo "       Value: https://cloudflare-ipfs.com"
echo "     * Name: VITE_IPNS_ENABLED"
echo "       Value: true"
echo "   - (If you see 'Hide advanced options', click it to see more fields if needed)"
```

### Update 3: Troubleshooting Section (After Line 1310)

**Find:**
```bash
echo "       → Make sure all VITE_* variables are added (especially VITE_WALLETCONNECT_ID)"
```

**Replace with:**
```bash
echo "       → Make sure all VITE_* variables are added:"
echo "         - VITE_WALLETCONNECT_ID (required)"
echo "         - VITE_WEB3_STORAGE_TOKEN or VITE_PINATA_JWT (for IPFS)"
echo "         - All RPC URLs (required for blockchain connections)"
```

---

## Complete Integration Checklist (Updated)

### Dependencies:
- [x] `helia@^2.0.0`
- [x] `@helia/unixfs@^2.0.0`
- [x] `@helia/ipns@^2.0.0`
- [x] `@libp2p/crypto@^2.0.0`
- [x] `@noble/curves@^1.0.0`
- [x] `@noble/hashes@^1.0.0`

### Environment Variables:
- [x] `VITE_WEB3_STORAGE_TOKEN` or `VITE_PINATA_JWT`
- [x] `VITE_PINATA_GATEWAY`
- [x] `VITE_IPFS_GATEWAY_1=https://dweb.link` ⭐ **NEW**
- [x] `VITE_IPFS_GATEWAY_2=https://ipfs.io`
- [x] `VITE_IPFS_GATEWAY_3=https://cloudflare-ipfs.com`
- [x] `VITE_IPFS_GATEWAY_4=https://gateway.pinata.cloud` ⭐ **NEW**
- [x] `VITE_IPNS_ENABLED`
- [x] `VITE_IPNS_REPUBLISH_INTERVAL`

### Code Changes:
- [x] Header comment (line ~9)
- [x] Dependencies (after line 120)
- [x] Environment variables (after line 243) - **includes dweb.link**
- [x] Directory structure (after line 246)
- [x] README (around line 974)
- [x] Initial setup echo (after line 1232) ⭐ **NEW**
- [x] Fleek deployment echo (after line 1294) ⭐ **NEW**
- [x] Troubleshooting echo (after line 1310) ⭐ **NEW**

---

## Summary of All Changes

**Total: 8 integration points**

1. ✅ Header comment - Add IPFS/IPNS description
2. ✅ Dependencies - Add 6 production dependencies
3. ✅ Environment variables - Add IPFS/IPNS config (includes dweb.link)
4. ✅ Directory structure - Create service directories
5. ✅ README - Update stack description
6. ✅ Initial setup echo - Add IPFS/IPNS instructions
7. ✅ Fleek deployment echo - Add IPFS/IPNS env vars
8. ✅ Troubleshooting echo - Update variable checklist

---

## Gateway Priority Order

When implementing fallback logic, use this priority:

1. **dweb.link** - Protocol Labs official (primary fallback)
2. **ipfs.io** - Public IPFS gateway
3. **cloudflare-ipfs.com** - Cloudflare CDN-backed
4. **gateway.pinata.cloud** - Pinata gateway (if using Pinata)

This ensures maximum reliability and global accessibility.

---

## Next Steps

1. Apply all 8 changes to `setup.sh`
2. Test the setup script in a clean directory
3. Verify all echo statements display correctly
4. Verify environment variables are properly documented
5. Test IPFS/IPNS functionality after setup

