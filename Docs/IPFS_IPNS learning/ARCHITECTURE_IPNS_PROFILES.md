# IPNS Profile System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Profile View │  │ Profile Edit │  │  Dashboard   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    React Hooks Layer                             │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │  useIPNS()   │  │ useProfile() │                            │
│  └──────────────┘  └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Service Layer                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  IPFS    │  │   IPNS   │  │Encryption│  │ Profile │        │
│  │ Service  │  │ Service  │  │ Service  │  │ Service │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
└─────────────────────────────────────────────────────────────────┘
         │            │            │            │
         │            │            │            │
         ▼            ▼            ▼            ▼
    ┌────────────────────────────────────────────────────┐
    │              External Services                      │
    │  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
    │  │  IPFS    │  │  IPNS    │  │  Wallet  │         │
    │  │ Network  │  │ Network  │  │ (wagmi)  │         │
    │  └──────────┘  └──────────┘  └──────────┘         │
    └────────────────────────────────────────────────────┘
```

## Data Flow: Creating a Profile

```
1. User Action
   └─> Fill profile form
       │
       ▼
2. Generate IPNS Key Pair (automatic)
   └─> Create RSA/Ed25519 key pair
       │
       ▼
3. Create Profile JSON
   └─> {
         name: "...",
         bio: "...",
         signature: "0x..." (signed with wallet)
       }
       │
       ▼
4. Upload Profile to IPFS
   └─> Returns: CID (QmABC123...)
       │
       ▼
5. Publish CID to IPNS
   └─> IPNS Name: /ipns/k51qzi5uqu5d...
       │
       ▼
6. Encrypt IPNS Private Key
   └─> Encrypt with wallet public key
       │
       ▼
7. Store Encrypted Key on IPFS
   └─> {
         encryptedKey: "...",
         publicKey: "...",
         address: "0x...",
         timestamp: "..."
       }
       │
       ▼
8. Store Reference (Optional: On-chain)
   └─> Smart Contract: mapping(address => string) ipnsNames
```

## Data Flow: Updating a Profile

```
1. User Action
   └─> Edit profile form
       │
       ▼
2. Retrieve Encrypted IPNS Key
   └─> Get from IPFS (using stored CID)
       │
       ▼
3. Decrypt IPNS Private Key
   └─> Decrypt with wallet private key
       │
       ▼
4. Create Updated Profile JSON
   └─> New version with updated data
       │
       ▼
5. Upload New Profile to IPFS
   └─> Returns: New CID (QmDEF456...)
       │
       ▼
6. Update IPNS Record
   └─> Point IPNS name to new CID
       │
       ▼
7. Wait for Propagation
   └─> IPNS update propagates (seconds to minutes)
```

## Data Flow: Viewing a Profile

```
1. User Action
   └─> Request profile (by address or IPNS name)
       │
       ▼
2. Resolve IPNS Name
   └─> /ipns/k51qzi5uqu5d... → CID (QmABC123...)
       │
       ▼
3. Fetch Profile from IPFS
   └─> Get JSON from CID
       │
       ▼
4. Verify Signature
   └─> Verify profile signature matches address
       │
       ▼
5. Display Profile
   └─> Render in UI
```

## Key Storage Strategy

### Encrypted Key Document Structure
```json
{
  "version": "1.0",
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "publicKey": "0x04...",  // Wallet public key used for encryption
  "encryptedIPNSKey": {
    "ciphertext": "...",     // Encrypted IPNS private key
    "iv": "...",             // Initialization vector
    "salt": "...",           // Salt for key derivation
    "algorithm": "aes-256-gcm"
  },
  "ipnsPublicKey": "...",   // IPNS public key (not encrypted)
  "ipnsName": "/ipns/k51qzi5uqu5d...",
  "createdAt": "2025-01-XX...",
  "updatedAt": "2025-01-XX..."
}
```

### Storage Locations

1. **Encrypted IPNS Key Document**: Stored on IPFS
   - CID stored in: localStorage or Smart Contract
   - Encrypted with: Wallet public key (derived from address)

2. **IPNS Name**: Stored in Smart Contract (optional)
   - `mapping(address => string) public ipnsNames`
   - Allows public lookup of profiles

3. **IPNS Private Key**: Never stored unencrypted
   - Only exists in memory during operations
   - Encrypted before storage

## Security Considerations

### Encryption Flow
```
Wallet Address (0x...)
    │
    ▼
Derive Public Key (ECDSA)
    │
    ▼
Encrypt IPNS Private Key
    │
    ▼
Store Encrypted Key on IPFS
```

### Decryption Flow
```
User Connects Wallet
    │
    ▼
Access Wallet Private Key (via wallet provider)
    │
    ▼
Retrieve Encrypted Key from IPFS
    │
    ▼
Decrypt IPNS Private Key
    │
    ▼
Use IPNS Key for Profile Operations
```

## Component Responsibilities

### `ipfs.ts` Service
- `uploadToIPFS(data: string): Promise<string>` - Upload and get CID
- `getFromIPFS(cid: string): Promise<string>` - Retrieve data by CID
- `pinToIPFS(cid: string): Promise<void>` - Pin content

### `ipns.ts` Service
- `generateIPNSKey(): Promise<IPNSKeyPair>` - Generate new key pair
- `publishToIPNS(key: IPNSKeyPair, cid: string): Promise<void>` - Publish CID
- `resolveIPNS(name: string): Promise<string>` - Resolve to CID
- `updateIPNS(key: IPNSKeyPair, newCid: string): Promise<void>` - Update record

### `encryption.ts` Service
- `derivePublicKey(address: string): Promise<string>` - Get public key from address
- `encryptWithPublicKey(data: string, publicKey: string): Promise<EncryptedData>`
- `decryptWithPrivateKey(encrypted: EncryptedData, privateKey: string): Promise<string>`

### `profile.ts` Service
- `createProfile(data: ProfileData): Profile` - Create profile object
- `signProfile(profile: Profile, signer: Signer): Promise<Profile>` - Sign profile
- `verifyProfile(profile: Profile): boolean` - Verify signature
- `saveProfile(profile: Profile): Promise<string>` - Save and return IPNS name
- `loadProfile(ipnsName: string): Promise<Profile>` - Load profile

## Error Handling Strategy

### IPNS Propagation Delays
```typescript
async function resolveIPNSWithRetry(name: string, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const cid = await resolveIPNS(name);
      return cid;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(2000 * (i + 1)); // Exponential backoff
    }
  }
}
```

### IPFS Upload Failures
- Retry with exponential backoff
- Fallback to different IPFS gateway
- Show user-friendly error messages

### Key Decryption Failures
- Verify wallet is connected
- Check if encrypted key exists
- Provide recovery options

## Performance Optimizations

1. **Caching**
   - Cache IPNS resolutions (TTL: 5 minutes)
   - Cache profile data
   - Cache encrypted key documents

2. **Lazy Loading**
   - Load profile only when needed
   - Load IPNS key only when editing

3. **Background Operations**
   - Upload to IPFS in background
   - Update IPNS asynchronously
   - Show optimistic UI updates

## Testing Strategy

### Unit Tests
- IPFS service methods
- IPNS operations
- Encryption/decryption
- Profile validation

### Integration Tests
- Full profile creation flow
- Profile update flow
- IPNS resolution

### Mock Services
- Mock IPFS node
- Mock IPNS resolution
- Mock wallet provider

