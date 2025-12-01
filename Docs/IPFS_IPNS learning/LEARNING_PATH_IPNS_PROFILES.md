# Learning Path: IPNS-Based SSI Profile System

## Overview
Build an IPNS-based member profile system with automatic key generation and encrypted IPNS key storage on IPFS.

**Goal**: Create a DApp interface that enables users to:
- Automatically generate IPNS keys (under the hood)
- Store IPNS keys encrypted with wallet public key on IPFS
- Create and update member profiles via IPNS
- View profiles through IPNS resolution

---

## Prerequisites Knowledge
- ✅ React + TypeScript (you have this)
- ✅ Web3 wallet integration (wagmi/RainbowKit - you have this)
- ⚠️ IPFS basics (we'll learn)
- ⚠️ IPNS concepts (we'll learn)
- ⚠️ Encryption/decryption (we'll learn)

---

## Learning Path Structure

### **Phase 1: Foundation - IPFS Integration** 🏗️
**Goal**: Get IPFS working in your DApp

#### Milestone 1.1: Install IPFS Dependencies
- [ ] Install `ipfs-http-client` or `helia` (modern IPFS)
- [ ] Install `@libp2p/crypto` for key management
- [ ] Set up IPFS pinning service (Pinata/Web3.Storage)
- [ ] Create basic IPFS service module

**Deliverable**: Can upload and retrieve files from IPFS

#### Milestone 1.2: IPFS Service Layer
- [ ] Create `src/services/ipfs.ts`
- [ ] Implement `uploadToIPFS(data: string): Promise<string>` (returns CID)
- [ ] Implement `getFromIPFS(cid: string): Promise<string>`
- [ ] Add error handling and retry logic
- [ ] Test with simple JSON data

**Deliverable**: Working IPFS upload/download service

**Learning Resources**:
- [IPFS Documentation](https://docs.ipfs.tech/)
- [Helia (Modern IPFS)](https://helia.io/)

---

### **Phase 2: IPNS Basics** 🔑
**Goal**: Understand and implement IPNS

#### Milestone 2.1: IPNS Key Generation
- [ ] Learn IPNS key structure (RSA/Ed25519)
- [ ] Generate IPNS key pair programmatically
- [ ] Store key securely (browser storage with encryption)
- [ ] Create `src/services/ipns.ts` module

**Deliverable**: Can generate IPNS keys automatically

#### Milestone 2.2: IPNS Publishing
- [ ] Publish CID to IPNS key
- [ ] Update IPNS record
- [ ] Resolve IPNS name to CID
- [ ] Handle IPNS propagation delays

**Deliverable**: Can publish and resolve IPNS records

**Learning Resources**:
- [IPNS Documentation](https://docs.ipfs.tech/concepts/ipns/)
- [libp2p Key Management](https://github.com/libp2p/js-libp2p-crypto)

---

### **Phase 3: Encryption Layer** 🔐
**Goal**: Encrypt IPNS keys with wallet public key

#### Milestone 3.1: Wallet Public Key Extraction
- [ ] Extract public key from wallet address (Ethereum)
- [ ] Understand ECDSA public key derivation
- [ ] Create utility: `getPublicKeyFromAddress(address: string)`
- [ ] Handle different wallet providers

**Deliverable**: Can derive public key from wallet address

#### Milestone 3.2: Encryption Implementation
- [ ] Choose encryption method (ECC encryption or symmetric with derived key)
- [ ] Implement `encryptWithPublicKey(data: string, publicKey: string): Promise<string>`
- [ ] Implement `decryptWithPrivateKey(encrypted: string, privateKey: string): Promise<string>`
- [ ] Use `@noble/curves` or `ethers.js` for crypto operations

**Deliverable**: Can encrypt/decrypt data with wallet keys

**Learning Resources**:
- [Ethereum Cryptography](https://github.com/ethereum/js-ethereum-cryptography)
- [Noble Curves](https://github.com/paulmillr/noble-curves)

---

### **Phase 4: Profile Structure** 📋
**Goal**: Define and implement profile schema

#### Milestone 4.1: Profile Schema Design
- [ ] Design JSON schema for member profile
- [ ] Include: name, bio, skills, contributions, verifiable credentials
- [ ] Add versioning and timestamp fields
- [ ] Add signature field (signed by wallet)

**Deliverable**: Profile JSON schema definition

#### Milestone 4.2: Profile Management
- [ ] Create `src/types/profile.ts` (TypeScript types)
- [ ] Implement `createProfile(data: ProfileData): Profile`
- [ ] Implement `signProfile(profile: Profile, privateKey: string): Profile`
- [ ] Implement `verifyProfile(profile: Profile): boolean`

**Deliverable**: Profile creation and validation system

---

### **Phase 5: IPNS Key Storage** 💾
**Goal**: Store encrypted IPNS keys on IPFS

#### Milestone 5.1: Key Storage Flow
- [ ] Generate IPNS key pair
- [ ] Encrypt IPNS private key with wallet public key
- [ ] Create storage document: `{ encryptedKey, publicKey, address, timestamp }`
- [ ] Upload encrypted document to IPFS
- [ ] Store IPFS CID reference (could be in contract or localStorage)

**Deliverable**: Encrypted IPNS key stored on IPFS

#### Milestone 5.2: Key Retrieval Flow
- [ ] Retrieve encrypted document from IPFS
- [ ] Decrypt IPNS private key using wallet private key
- [ ] Restore IPNS key pair from decrypted data
- [ ] Handle missing keys (first-time user flow)

**Deliverable**: Can retrieve and decrypt IPNS keys

---

### **Phase 6: Profile CRUD Operations** ✏️
**Goal**: Full profile lifecycle management

#### Milestone 6.1: Create Profile
- [ ] User fills profile form
- [ ] Generate profile JSON
- [ ] Sign profile with wallet
- [ ] Upload profile to IPFS (get CID)
- [ ] Publish CID to IPNS
- [ ] Store encrypted IPNS key (if first time)

**Deliverable**: Can create new profiles

#### Milestone 6.2: Read Profile
- [ ] Resolve IPNS name to CID
- [ ] Fetch profile from IPFS
- [ ] Verify profile signature
- [ ] Display profile in UI

**Deliverable**: Can view profiles via IPNS

#### Milestone 6.3: Update Profile
- [ ] Retrieve existing IPNS key
- [ ] Create updated profile JSON
- [ ] Upload new version to IPFS
- [ ] Update IPNS record to point to new CID
- [ ] Handle IPNS update propagation

**Deliverable**: Can update existing profiles

---

### **Phase 7: Smart Contract Integration** ⛓️
**Goal**: On-chain verification and registry

#### Milestone 7.1: Member Registry Contract
- [ ] Create `MemberRegistry.sol` contract
- [ ] Store IPNS name (or IPFS CID of encrypted key) per address
- [ ] Add events for profile updates
- [ ] Add access control (only owner can update)

**Deliverable**: Smart contract for profile registry

#### Milestone 7.2: Contract Integration
- [ ] Deploy contract
- [ ] Connect frontend to contract
- [ ] Register IPNS name on-chain
- [ ] Query contract for profile references

**Deliverable**: On-chain profile registry

---

### **Phase 8: User Interface** 🎨
**Goal**: Beautiful, intuitive profile management UI

#### Milestone 8.1: Profile View Component
- [ ] Create `ProfileView.tsx` component
- [ ] Display profile information
- [ ] Show IPNS resolution status
- [ ] Handle loading and error states

**Deliverable**: Profile viewing interface

#### Milestone 8.2: Profile Edit Component
- [ ] Create `ProfileEdit.tsx` component
- [ ] Form for profile fields
- [ ] IPNS key generation indicator (automatic)
- [ ] Save/update functionality
- [ ] Success/error feedback

**Deliverable**: Profile editing interface

#### Milestone 8.3: Profile Dashboard
- [ ] Create profile management dashboard
- [ ] Show current profile status
- [ ] Display IPNS name
- [ ] Show profile history (if versioned)
- [ ] Add navigation to profile pages

**Deliverable**: Complete profile management UI

---

### **Phase 9: Advanced Features** 🚀
**Goal**: Enhancements and optimizations

#### Milestone 9.1: Profile Versioning
- [ ] Store profile history
- [ ] Allow viewing previous versions
- [ ] Compare versions

**Deliverable**: Profile version history

#### Milestone 9.2: Profile Sharing
- [ ] Generate shareable IPNS links
- [ ] QR code generation for profiles
- [ ] Public profile pages

**Deliverable**: Profile sharing capabilities

#### Milestone 9.3: Performance Optimization
- [ ] Cache IPNS resolutions
- [ ] Optimize IPFS fetches
- [ ] Add loading states and skeletons
- [ ] Handle IPNS propagation delays gracefully

**Deliverable**: Optimized performance

---

## Technical Stack Recommendations

### Dependencies to Add
```json
{
  "dependencies": {
    "@helia/unixfs": "^2.0.0",           // Modern IPFS
    "@libp2p/crypto": "^2.0.0",          // Key management
    "@noble/curves": "^1.0.0",           // Cryptography
    "ethers": "^6.0.0",                  // Already have viem, but useful for crypto
    "ipfs-http-client": "^60.0.0",      // Alternative: HTTP client for IPFS
    "qrcode.react": "^3.1.0"             // QR codes for sharing
  }
}
```

### Service Architecture
```
src/
├── services/
│   ├── ipfs.ts          # IPFS upload/download
│   ├── ipns.ts          # IPNS key generation, publish, resolve
│   ├── encryption.ts    # Encryption/decryption utilities
│   └── profile.ts       # Profile CRUD operations
├── types/
│   └── profile.ts       # TypeScript types
├── components/
│   ├── ProfileView.tsx
│   ├── ProfileEdit.tsx
│   └── ProfileDashboard.tsx
└── hooks/
    ├── useIPNS.ts       # React hook for IPNS operations
    └── useProfile.ts    # React hook for profile management
```

---

## Key Concepts to Master

### 1. IPNS vs IPFS
- **IPFS**: Content-addressed, immutable (CID changes when content changes)
- **IPNS**: Name-addressed, mutable (same name, different content over time)
- **Use Case**: IPNS for profiles that need updates, IPFS for immutable data

### 2. Key Management
- **IPNS Keys**: RSA or Ed25519 key pairs
- **Storage**: Encrypt private key, store on IPFS
- **Recovery**: Decrypt with wallet private key

### 3. Encryption Strategy
- **Option A**: ECC encryption (encrypt with wallet public key)
- **Option B**: Symmetric encryption with derived key from wallet
- **Recommendation**: Use ECC encryption for better security

### 4. IPNS Propagation
- IPNS updates take time to propagate (seconds to minutes)
- Implement polling/retry logic
- Show "updating..." states in UI

---

## Testing Strategy

### Unit Tests
- [ ] IPFS upload/download
- [ ] IPNS key generation
- [ ] Encryption/decryption
- [ ] Profile validation

### Integration Tests
- [ ] Full profile creation flow
- [ ] Profile update flow
- [ ] IPNS resolution

### E2E Tests
- [ ] User creates profile
- [ ] User updates profile
- [ ] User views another's profile

---

## Common Pitfalls & Solutions

### Pitfall 1: IPNS Propagation Delays
**Solution**: Implement retry logic with exponential backoff, show loading states

### Pitfall 2: Key Loss
**Solution**: Always encrypt keys, provide backup/export functionality

### Pitfall 3: IPFS Pinning Costs
**Solution**: Use free tier services, or implement pinning strategy

### Pitfall 4: Large Profile Data
**Solution**: Compress JSON, use IPFS for large files (images), reference in profile

---

## Success Criteria

✅ User can create profile without manual IPNS key management  
✅ IPNS keys are encrypted and stored on IPFS  
✅ Profiles are editable and updates propagate  
✅ Profile viewing works via IPNS resolution  
✅ UI is intuitive and handles edge cases gracefully  

---

## Next Steps

1. **Start with Phase 1**: Set up IPFS integration
2. **Build incrementally**: Complete each milestone before moving on
3. **Test thoroughly**: Test each phase before proceeding
4. **Document learnings**: Keep notes on challenges and solutions

---

## Resources

- [IPFS Documentation](https://docs.ipfs.tech/)
- [Helia (Modern IPFS)](https://helia.io/)
- [libp2p Crypto](https://github.com/libp2p/js-libp2p-crypto)
- [Ethereum Cryptography](https://github.com/ethereum/js-ethereum-cryptography)
- [Web3.Storage](https://web3.storage/) - Free IPFS pinning
- [Pinata](https://www.pinata.cloud/) - IPFS pinning service

---

**Ready to start? Begin with Phase 1, Milestone 1.1!** 🚀

