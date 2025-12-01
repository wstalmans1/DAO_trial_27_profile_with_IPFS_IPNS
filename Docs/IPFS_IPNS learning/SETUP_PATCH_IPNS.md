# Setup.sh Integration Patch: IPNS Dependencies

## Quick Reference: Exact Code to Add

### 1. Update Header Comment (Line ~9)

**Find:**
```bash
# DX: Foundry (Forge/Anvil), ESLint/Prettier/Solhint, Husky + lint-staged, Local Safety Net
```

**Add after:**
```bash
# IPFS/IPNS: Helia v2 (full IPFS) + HTTP fallback + IPNS + @libp2p/crypto + @noble/curves
```

---

### 2. Add Dependencies (After Line 120)

**Find:**
```bash
pnpm --dir apps/dao-dapp add @tanstack/react-query-devtools@~5.90.2 zod@~3.22.0
```

**Add after:**
```bash

# IPFS/IPNS - Helia (primary) + HTTP client (fallback) + IPNS support
# Core IPFS implementation (Helia)
pnpm --dir apps/dao-dapp add helia@^2.0.0 @helia/unixfs@^2.0.0 @helia/ipns@^2.0.0

# IPNS key generation and management
pnpm --dir apps/dao-dapp add @libp2p/crypto@^2.0.0

# Cryptography for wallet-based encryption
pnpm --dir apps/dao-dapp add @noble/curves@^1.0.0 @noble/hashes@^1.0.0

# HTTP client fallback (for low-end devices, add later)
# Uncomment when implementing adaptive IPFS service:
# pnpm --dir apps/dao-dapp add ipfs-http-client@^60.0.0
```

---

### 3. Update .env.example (After Line 243, before EOF)

**Find:**
```bash
VITE_SEPOLIA_RPC=https://rpc.sepolia.org
EOF
```

**Replace with:**
```bash
VITE_SEPOLIA_RPC=https://rpc.sepolia.org

# IPFS/IPNS Configuration
# Option 1: Web3.Storage (Recommended for learning - free tier)
VITE_WEB3_STORAGE_TOKEN=

# Option 2: Pinata (Recommended for production - free tier available)
VITE_PINATA_JWT=
VITE_PINATA_GATEWAY=https://gateway.pinata.cloud

# Option 3: Public IPFS Gateways (fallback)
VITE_IPFS_GATEWAY_1=https://dweb.link
VITE_IPFS_GATEWAY_2=https://ipfs.io
VITE_IPFS_GATEWAY_3=https://cloudflare-ipfs.com
VITE_IPFS_GATEWAY_4=https://gateway.pinata.cloud

# IPNS Configuration
VITE_IPNS_ENABLED=true
VITE_IPNS_REPUBLISH_INTERVAL=86400
EOF
```

---

### 4. Create Directory Structure (After Line 246)

**Find:**
```bash
pnpm --dir apps/dao-dapp install

# --- Contracts workspace (Hardhat v2 + plugins) ------------------------------
```

**Add between:**
```bash
pnpm --dir apps/dao-dapp install

# Create IPFS/IPNS service directory structure
mkdir -p apps/dao-dapp/src/services/ipfs
mkdir -p apps/dao-dapp/src/services/ipns
mkdir -p apps/dao-dapp/src/services/encryption
mkdir -p apps/dao-dapp/src/types
mkdir -p apps/dao-dapp/src/utils

# Create placeholder files for IPFS services (will be implemented in learning path)
cat > apps/dao-dapp/src/services/ipfs/.gitkeep <<'EOF'
# IPFS service implementation
EOF

cat > apps/dao-dapp/src/services/ipns/.gitkeep <<'EOF'
# IPNS service implementation
EOF

cat > apps/dao-dapp/src/services/encryption/.gitkeep <<'EOF'
# Encryption service implementation
EOF

cat > apps/dao-dapp/src/types/profile.ts <<'EOF'
// Profile type definitions
// Will be implemented in learning path Phase 4
EOF

cat > apps/dao-dapp/src/utils/deviceCapabilities.ts <<'EOF'
// Device capability detection
// Will be implemented when adding adaptive IPFS service
EOF

# --- Contracts workspace (Hardhat v2 + plugins) ------------------------------
```

---

### 5. Update README (Around Line 974)

**Find:**
```bash
**Frontend**: Vite + React 18 + RainbowKit v2 + wagmi v2 + viem + TanStack Query v5 + Tailwind v4  
**Contracts**: Hardhat v2 + @nomicfoundation/hardhat-toolbox (ethers v6), OpenZeppelin, TypeChain, hardhat-deploy
```

**Replace with:**
```bash
**Frontend**: Vite + React 18 + RainbowKit v2 + wagmi v2 + viem + TanStack Query v5 + Tailwind v4  
**IPFS/IPNS**: Helia v2 (full IPFS node) + @helia/unixfs + @helia/ipns + @libp2p/crypto + @noble/curves
**Contracts**: Hardhat v2 + @nomicfoundation/hardhat-toolbox (ethers v6), OpenZeppelin, TypeChain, hardhat-deploy
```

---

## Complete Dependency List

### Production Dependencies (Required Now):
```json
{
  "helia": "^2.0.0",
  "@helia/unixfs": "^2.0.0",
  "@helia/ipns": "^2.0.0",
  "@libp2p/crypto": "^2.0.0",
  "@noble/curves": "^1.0.0",
  "@noble/hashes": "^1.0.0"
}
```

### Future Dependencies (Commented, Add Later):
```json
{
  "ipfs-http-client": "^60.0.0"
}
```

---

## Environment Variables Summary

### Required for IPFS Operations:
- `VITE_WEB3_STORAGE_TOKEN` - Web3.Storage API token (or)
- `VITE_PINATA_JWT` - Pinata JWT token

### Optional (Fallbacks):
- `VITE_PINATA_GATEWAY` - Pinata gateway URL
- `VITE_IPFS_GATEWAY_1/2/3` - Public gateway URLs

### IPNS Configuration:
- `VITE_IPNS_ENABLED` - Enable/disable IPNS features
- `VITE_IPNS_REPUBLISH_INTERVAL` - Republish interval in seconds

---

## Verification

After applying changes, run:

```bash
# Test setup
bash setup.sh

# Verify dependencies
cd apps/dao-dapp
pnpm list | grep -E "helia|libp2p|noble"

# Verify environment
grep IPFS .env.example
grep IPNS .env.example

# Verify directories
ls -la src/services/
ls -la src/types/
ls -la src/utils/
```

---

### 6. Update Echo Statements - Initial Setup (After Line 1232)

**Find:**
```bash
echo "Next:"
echo "1) Edit apps/dao-dapp/.env.local"
echo "2) Edit packages/contracts/.env.hardhat.local"
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
```

### 7. Update Echo Statements - Fleek Deployment (After Line 1294)

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

## Summary

**7 Changes Required:**
1. ✅ Add header comment (line ~9)
2. ✅ Add dependencies (after line 120)
3. ✅ Update .env.example (after line 243) - includes dweb.link
4. ✅ Create directories (after line 246)
5. ✅ Update README (around line 974)
6. ✅ Update initial setup echo statements (after line 1232)
7. ✅ Update Fleek deployment echo statements (after line 1294)

**All changes are additive - no existing code is modified.**

**Note:** dweb.link is Protocol Labs' official IPFS gateway and is included as the primary fallback gateway option.

