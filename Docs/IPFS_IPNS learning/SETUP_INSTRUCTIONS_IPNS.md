# Setup Instructions: IPNS Profile System Integration

## Overview
These instructions guide you through integrating all IPNS/Helia dependencies and environment configurations into your `setup.sh` script for the IPNS-based SSI profile system.

---

## Integration Points in setup.sh

### 1. Update Header Comment (Line ~6-9)

**Location**: After line 9, add IPFS/IPNS information

**Add after line 9:**
```bash
# IPFS/IPNS: Helia (full IPFS) + HTTP client fallback + IPNS support
#            @libp2p/crypto for key generation, @noble/curves for encryption
```

---

### 2. Add IPFS/IPNS Dependencies (After Line 120)

**Location**: After the existing Web3 dependencies line (line 120)

**Add after line 120:**
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

**Complete section should look like:**
```bash
# Web3 + data
pnpm --dir apps/dao-dapp add @rainbow-me/rainbowkit@~2.2.8 wagmi@~2.16.9 viem@~2.37.6 @tanstack/react-query@~5.90.2
pnpm --dir apps/dao-dapp add @tanstack/react-query-devtools@~5.90.2 zod@~3.22.0

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

### 3. Update Environment Variables (After Line 243)

**Location**: In the `.env.example` section (after line 243, before `EOF`)

**Add after line 243 (before the closing `EOF`):**
```bash
# IPFS/IPNS Configuration
# Option 1: Web3.Storage (Recommended for learning - free tier)
VITE_WEB3_STORAGE_TOKEN=

# Option 2: Pinata (Recommended for production - free tier available)
VITE_PINATA_JWT=
VITE_PINATA_GATEWAY=https://gateway.pinata.cloud

# Option 3: Public IPFS Gateways (fallback)
VITE_IPFS_GATEWAY_1=https://ipfs.io
VITE_IPFS_GATEWAY_2=https://cloudflare-ipfs.com
VITE_IPFS_GATEWAY_3=https://gateway.pinata.cloud

# IPNS Configuration
VITE_IPNS_ENABLED=true
VITE_IPNS_REPUBLISH_INTERVAL=86400
```

**Complete `.env.example` section should look like:**
```bash
# Env example
cat > apps/dao-dapp/.env.example <<'EOF'
VITE_WALLETCONNECT_ID=
VITE_MAINNET_RPC=https://cloudflare-eth.com
VITE_POLYGON_RPC=https://polygon-rpc.com
VITE_OPTIMISM_RPC=https://optimism.publicnode.com
VITE_ARBITRUM_RPC=https://arbitrum.publicnode.com
VITE_SEPOLIA_RPC=https://rpc.sepolia.org

# IPFS/IPNS Configuration
# Option 1: Web3.Storage (Recommended for learning - free tier)
VITE_WEB3_STORAGE_TOKEN=

# Option 2: Pinata (Recommended for production - free tier available)
VITE_PINATA_JWT=
VITE_PINATA_GATEWAY=https://gateway.pinata.cloud

# Option 3: Public IPFS Gateways (fallback)
VITE_IPFS_GATEWAY_1=https://ipfs.io
VITE_IPFS_GATEWAY_2=https://cloudflare-ipfs.com
VITE_IPFS_GATEWAY_3=https://gateway.pinata.cloud

# IPNS Configuration
VITE_IPNS_ENABLED=true
VITE_IPNS_REPUBLISH_INTERVAL=86400
EOF
```

---

### 4. Create IPFS Service Directory Structure (After Line 246)

**Location**: After `pnpm --dir apps/dao-dapp install` (line 246)

**Add after line 246:**
```bash
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
```

---

### 5. Update README Documentation (Around Line 974)

**Location**: In the README section (around line 974)

**Add after the existing frontend line:**
```bash
**IPFS/IPNS**: Helia v2 (full IPFS node) + @helia/unixfs + @helia/ipns + @libp2p/crypto + @noble/curves
```

**Complete section should look like:**
```bash
**Frontend**: Vite + React 18 + RainbowKit v2 + wagmi v2 + viem + TanStack Query v5 + Tailwind v4  
**IPFS/IPNS**: Helia v2 (full IPFS node) + @helia/unixfs + @helia/ipns + @libp2p/crypto + @noble/curves
**Contracts**: Hardhat v2 + @nomicfoundation/hardhat-toolbox (ethers v6), OpenZeppelin, TypeChain, hardhat-deploy  
```

---

## Complete Integration Checklist

### Dependencies to Add:
- [x] `helia@^2.0.0` - Core IPFS implementation
- [x] `@helia/unixfs@^2.0.0` - File operations
- [x] `@helia/ipns@^2.0.0` - IPNS support
- [x] `@libp2p/crypto@^2.0.0` - Key generation
- [x] `@noble/curves@^1.0.0` - Elliptic curve cryptography
- [x] `@noble/hashes@^1.0.0` - Hashing functions
- [ ] `ipfs-http-client@^60.0.0` - HTTP fallback (commented, add later)

### Environment Variables to Add:
- [x] `VITE_WEB3_STORAGE_TOKEN` - Web3.Storage API token
- [x] `VITE_PINATA_JWT` - Pinata JWT token
- [x] `VITE_PINATA_GATEWAY` - Pinata gateway URL
- [x] `VITE_IPFS_GATEWAY_1/2/3` - Public gateway fallbacks
- [x] `VITE_IPNS_ENABLED` - IPNS feature flag
- [x] `VITE_IPNS_REPUBLISH_INTERVAL` - IPNS republish interval

### Directory Structure to Create:
- [x] `apps/dao-dapp/src/services/ipfs/`
- [x] `apps/dao-dapp/src/services/ipns/`
- [x] `apps/dao-dapp/src/services/encryption/`
- [x] `apps/dao-dapp/src/types/`
- [x] `apps/dao-dapp/src/utils/`

---

## Step-by-Step Integration

### Step 1: Add Dependencies Section
1. Locate line 120 in `setup.sh`
2. Add the IPFS/IPNS dependencies block after the Web3 dependencies
3. Keep HTTP client commented for now

### Step 2: Update Environment Variables
1. Locate the `.env.example` section (around line 236)
2. Add IPFS/IPNS environment variables before the closing `EOF`
3. Ensure all variables are documented

### Step 3: Create Directory Structure
1. Locate line 246 (after `pnpm --dir apps/dao-dapp install`)
2. Add directory creation commands
3. Create placeholder files

### Step 4: Update Documentation
1. Locate README section (around line 974)
2. Add IPFS/IPNS line to frontend stack description

### Step 5: Update Echo Statements (After Line 1232)

**Location**: After the "Next:" echo statement (around line 1232)

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

### Step 6: Update Fleek Deployment Instructions (After Line 1282)

**Location**: In the Fleek environment variables section (around line 1282)

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

### Step 7: Test Integration
1. Run `bash setup.sh` in a clean directory
2. Verify all dependencies install correctly
3. Check that `.env.example` contains all new variables
4. Verify directory structure is created
5. Verify echo statements include IPFS/IPNS instructions

---

## Verification Commands

After running `setup.sh`, verify the integration:

```bash
# Check dependencies are installed
cd apps/dao-dapp
pnpm list helia @helia/unixfs @helia/ipns @libp2p/crypto @noble/curves @noble/hashes

# Check environment file
cat .env.example | grep IPFS
cat .env.example | grep IPNS

# Check directory structure
ls -la src/services/
ls -la src/types/
ls -la src/utils/
```

---

## Notes

1. **HTTP Client**: Currently commented out. Uncomment when implementing adaptive IPFS service for low-end device support.

2. **Environment Variables**: Users will need to:
   - Sign up for Web3.Storage or Pinata
   - Add their API tokens to `.env.local`
   - Configure gateway preferences

3. **Future Adaptations**: The structure supports:
   - Adding HTTP client fallback later
   - Implementing device capability detection
   - Creating adaptive IPFS service

4. **Production Ready**: All dependencies are production-ready and actively maintained.

---

## Next Steps After Integration

1. Update learning path documents to reference these dependencies
2. Create initial IPFS service implementation (Phase 1)
3. Implement IPNS key generation (Phase 2)
4. Add encryption service (Phase 3)
5. Build profile management (Phase 4+)

---

## Troubleshooting

### If dependencies fail to install:
- Check Node.js version (requires >=22)
- Verify pnpm version (10.16.1)
- Check network connectivity

### If environment variables are missing:
- Verify `.env.example` was updated correctly
- Check that `.env.local` was copied from `.env.example`
- Ensure no syntax errors in the heredoc

### If directories aren't created:
- Check that `mkdir -p` commands are executed
- Verify file paths are correct
- Check for permission issues

