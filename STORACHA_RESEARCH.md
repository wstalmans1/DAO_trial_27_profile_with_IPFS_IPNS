# Storacha Research & Integration Guide

**Research Date:** December 5, 2024  
**Project:** DAO Trial 27 Profile with IPFS-IPNS  
**Current Setup:** Helia (browser-based IPFS) + Pinata (pinning service)

---

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Architecture & Technology Stack](#architecture--technology-stack)
4. [Integration Options](#integration-options)
5. [Comparison: Storacha vs Pinata](#comparison-storacha-vs-pinata)
6. [Integration with Helia/IPFS DApp](#integration-with-heliaipfs-dapp)
7. [Authentication & Authorization](#authentication--authorization)
8. [Pricing & Limits](#pricing--limits)
9. [Recommended Integration Strategy](#recommended-integration-strategy)
10. [Resources & Links](#resources--links)

---

## Overview

**Storacha** is a decentralized hot storage network built on top of IPFS and Filecoin, designed to provide scalable, verifiable, and user-owned data storage solutions. It acts as a high-performance layer on top of IPFS, offering CDN-level retrieval speeds while maintaining the decentralized, content-addressed nature of IPFS.

### What Makes Storacha Unique

- **Hot Storage Network**: Optimized for fast access (unlike Filecoin's cold storage)
- **IPFS Native**: Fully compatible with IPFS, meaning data stored on Storacha is discoverable by other IPFS nodes
- **User-Controlled**: Uses UCANs (User Controlled Authorization Networks) for decentralized identity and permissions
- **High Availability**: Targets 99.9% uptime with CDN-level performance
- **Filecoin Backup**: Data is redundantly stored on Filecoin for long-term persistence

---

## Key Features

### 1. **Decentralized Storage**
- Utilizes IPFS for content addressing and discovery
- Data stored across multiple nodes for redundancy
- Content Identifiers (CIDs) ensure data integrity and verifiability

### 2. **High Performance**
- **CDN-Level Retrieval Speeds**: Ultra-high storage throughput and low retrieval times
- **Large Data Sharding**: Efficiently handles massive datasets by breaking them into manageable pieces
- **Optimized for Hot Storage**: Designed for frequently accessed data

### 3. **User-Controlled Data**
- **UCANs (User Controlled Authorization Networks)**: Decentralized identity and permission management
- Users have full control over their data and who can access it
- Fine-grained permission system

### 4. **Redundancy & Reliability**
- Data stored on multiple storage providers
- Backed up on Filecoin network for long-term persistence
- Cryptographic proofs ensure data integrity
- 99.9% uptime target

### 5. **IPFS Compatibility**
- Data stored on Storacha is discoverable by other IPFS nodes
- Standard IPFS CIDs are used
- Can be accessed via IPFS gateways (`https://storacha.link/ipfs/{cid}`)
- Works seamlessly with existing IPFS tools and libraries

---

## Architecture & Technology Stack

### Core Technologies

- **IPFS**: For content addressing and peer-to-peer discovery
- **Filecoin**: For long-term, verifiable storage backup
- **UCANs**: For decentralized authentication and authorization
- **HTTP Gateways**: For accessing IPFS content via standard HTTP

### Key Concepts

#### Upload vs. Store

Storacha distinguishes between two operations:

- **Upload**: The process of adding data to the network (creating CIDs, chunking, hashing)
- **Store**: The actual storage of data as opaque, hash-addressed blobs

This separation allows for better control over the storage lifecycle.

#### Spaces

Spaces act as namespaces for organizing content. Each space can have its own permissions and settings. **Who owns the Space is a critical architectural decision** that determines how your application integrates with Storacha.

#### Delegation Proofs

UCANs allow you to delegate capabilities to applications or CI/CD pipelines, enabling secure, controlled access without sharing your main credentials.

---

## Architecture Options: Who Owns the Space?

**⚠️ CRITICAL ARCHITECTURAL DECISION:** Before integrating Storacha, you must decide who owns the Space. This fundamental choice affects your entire integration approach, user experience, and data control model.

Storacha supports three distinct architecture patterns, each with different implications:

### 1. Client-Server Architecture

**Who Owns the Space:** You (the developer) own the Space.

**How It Works:**
- Users upload data to your application server
- Your backend uploads the data to Storacha using your Space
- All data flows through your infrastructure

**Characteristics:**
- ✅ Full visibility: You can see all uploads
- ✅ Centralized control: You manage the Space
- ❌ Egress costs: Data flows through your server
- ❌ Scalability concerns: Your server handles all uploads
- ❌ Not truly decentralized: Users depend on your infrastructure

**Best For:**
- Traditional web applications
- When you need full control and visibility
- Small to medium scale applications
- When egress costs are acceptable

**Implementation:**
```typescript
// Backend (your server)
const client = await StorachaClient.create()
await client.login('your-email@example.com')
await client.space.create('YourSpace')
// ... register space, get delegation proof

// When user uploads to your API
app.post('/api/upload', async (req, res) => {
  const file = req.file
  const cid = await client.uploadDirectory([file])
  res.json({ cid })
})
```

**Reference:** [Storacha Docs - Client-Server Architecture](https://docs.storacha.network/concepts/architecture-options/#client-server)

---

### 2. Delegated Architecture

**Who Owns the Space:** You (the developer) own the Space, but delegate upload permissions to users.

**How It Works:**
- You own and register the Space
- Your backend generates UCAN delegations for each user
- Users upload directly to Storacha using their delegation
- No data flows through your server (no egress costs)

**Characteristics:**
- ✅ No egress costs: Users upload directly
- ✅ Scalable: No server bottleneck
- ✅ Some control: You own the Space
- ❌ Limited visibility: Need separate tracking mechanism
- ❌ Backend required: Must generate delegations

**Best For:**
- Applications wanting to avoid egress costs
- When you want some control but better scalability
- Medium to large scale applications
- When you can implement delegation infrastructure

**Implementation:**
```typescript
// Backend: Generate delegation for user
async function createUserDelegation(userDid: string) {
  const client = await StorachaClient.create()
  // ... load your Space delegation proof
  await client.addSpace(proof)
  
  const audience = DID.parse(userDid)
  const abilities = ['space/blob/add', 'upload/add']
  const expiration = Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24h
  
  const delegation = await client.createDelegation(audience, abilities, { expiration })
  return delegation.archive()
}

// Frontend: User uploads directly
async function uploadAsUser(delegationArchive: Uint8Array) {
  const client = await StorachaClient.create()
  const delegation = await Delegation.extract(delegationArchive)
  
  const space = await client.addSpace(delegation.ok)
  await client.setCurrentSpace(space.did())
  
  // User can now upload directly
  const cid = await client.uploadDirectory([file])
  return cid
}
```

**Reference:** [Storacha Docs - Delegated Architecture](https://docs.storacha.network/concepts/architecture-options/#delegated)

---

### 3. User-Owned Architecture ⭐ (Your Focus)

**Who Owns the Space:** Each user owns their own Space.

**How It Works:**
- Each user creates and registers their own Space
- Users authorize their own Agent on their Space
- Users upload directly to Storacha using their own Space
- You have no visibility unless users share CIDs with you

**Characteristics:**
- ✅ **Truly decentralized**: Users own their data completely
- ✅ **No backend required**: Everything happens client-side
- ✅ **No egress costs**: Users upload directly
- ✅ **Maximum scalability**: No server bottleneck
- ✅ **User sovereignty**: Aligns with Web3 principles
- ✅ **Privacy-first**: Users control their data
- ❌ **No visibility**: Can't see what users upload unless they share
- ❌ **User onboarding**: Users must create Spaces themselves
- ❌ **Tracking complexity**: Need separate mechanism to track CIDs

**Best For:**
- **Decentralized applications (DApps)**
- **Web3/blockchain applications**
- **Privacy-focused applications**
- **User-controlled data scenarios**
- **Applications where user sovereignty is a core value**
- **Your DAO profile project** (perfect fit!)

**Implementation Flow:**

```typescript
// Frontend: User creates and manages their own Space
import * as Client from '@storacha/client'

async function setupUserOwnedSpace() {
  // 1. Create client for user
  const client = await Client.create()
  
  // 2. User authenticates (email or other method)
  await client.login('user@example.com')
  
  // 3. User creates their own Space
  const space = await client.space.create('MyPersonalSpace')
  
  // 4. User authorizes their Agent on the Space
  await client.space.authorize(space.did())
  
  // 5. Set as current space
  await client.setCurrentSpace(space.did())
  
  // 6. User can now upload directly
  const cid = await client.uploadDirectory([file])
  
  return { spaceDid: space.did(), cid }
}
```

**Complete User-Owned Integration Example:**

```typescript
// apps/dao-dapp/src/services/ipfs/storacha-user-owned.ts
import * as Client from '@storacha/client'
import type { Helia } from 'helia'

export interface UserSpace {
  spaceDid: string
  isAuthorized: boolean
}

export interface UserOwnedUploadResult {
  success: boolean
  cid: string
  gatewayUrl: string
  spaceDid: string
  error?: string
}

/**
 * Initialize or retrieve user's Storacha client
 * Each user has their own client instance
 */
export async function getUserStorachaClient(): Promise<Awaited<ReturnType<typeof Client.create>>> {
  // Check if user already has a client in session/localStorage
  const storedClient = localStorage.getItem('storacha_client_state')
  
  if (storedClient) {
    // Restore client from stored state
    // Implementation depends on Storacha client's persistence API
  }
  
  // Create new client for this user
  const client = await Client.create()
  return client
}

/**
 * Check if user has a registered Space
 */
export async function getUserSpace(): Promise<UserSpace | null> {
  const client = await getUserStorachaClient()
  
  try {
    // Check if user has existing spaces
    const spaces = await client.space.list()
    
    if (spaces && spaces.length > 0) {
      const currentSpace = spaces[0] // Use first space or let user select
      return {
        spaceDid: currentSpace.did(),
        isAuthorized: true
      }
    }
    
    return null
  } catch (error) {
    console.error('Error checking user space:', error)
    return null
  }
}

/**
 * Create a new Space for the user
 */
export async function createUserSpace(spaceName: string): Promise<UserSpace> {
  const client = await getUserStorachaClient()
  
  try {
    // User authenticates (could be email, wallet, etc.)
    // For now, using email - but could be extended to wallet-based auth
    const email = prompt('Enter your email to create a Storacha Space:')
    if (!email) {
      throw new Error('Email required')
    }
    
    await client.login(email)
    
    // Create user's Space
    const space = await client.space.create(spaceName)
    
    // Authorize the user's Agent on their Space
    await client.space.authorize(space.did())
    
    // Set as current space
    await client.setCurrentSpace(space.did())
    
    // Store space info locally
    localStorage.setItem('storacha_space_did', space.did())
    
    return {
      spaceDid: space.did(),
      isAuthorized: true
    }
  } catch (error) {
    console.error('Error creating user space:', error)
    throw error
  }
}

/**
 * Upload data using user's own Space
 */
export async function uploadToUserOwnedStoracha(
  data: string | Uint8Array | File | File[],
  spaceName?: string
): Promise<UserOwnedUploadResult> {
  try {
    const client = await getUserStorachaClient()
    
    // Check if user has a Space
    let userSpace = await getUserSpace()
    
    // If no space, create one
    if (!userSpace) {
      const spaceNameToUse = spaceName || `UserSpace_${Date.now()}`
      userSpace = await createUserSpace(spaceNameToUse)
    }
    
    // Ensure current space is set
    await client.setCurrentSpace(userSpace.spaceDid)
    
    // Convert data to File format
    let files: File[]
    if (typeof data === 'string') {
      const blob = new Blob([data], { type: 'text/plain' })
      files = [new File([blob], 'data.txt')]
    } else if (data instanceof Uint8Array) {
      const blob = new Blob([data])
      files = [new File([blob], 'data.bin')]
    } else if (Array.isArray(data)) {
      files = data
    } else {
      files = [data]
    }
    
    // Upload using user's Space
    const cid = await client.uploadDirectory(files)
    const gatewayUrl = `https://storacha.link/ipfs/${cid}`
    
    return {
      success: true,
      cid,
      gatewayUrl,
      spaceDid: userSpace.spaceDid
    }
  } catch (error) {
    console.error('Error uploading to user-owned Storacha:', error)
    return {
      success: false,
      cid: '',
      gatewayUrl: '',
      spaceDid: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Optional: If you want to track user uploads, have users share CIDs
 * This maintains user ownership while allowing you to index content
 */
export async function shareCIDWithApp(cid: string, metadata?: Record<string, any>) {
  // User explicitly shares CID with your application
  // This maintains user ownership while allowing you to track/index
  
  const response = await fetch('/api/share-cid', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cid, metadata })
  })
  
  return response.json()
}
```

**Advanced: Wallet-Based Space Ownership & DID Integration** ⭐

For true Web3 integration, users can use their crypto wallet (MetaMask, WalletConnect, etc.) as the foundation for DIDs and DID signatures. This is the **recommended approach for DAO/Web3 applications**.

**⚠️ IMPORTANT: Client-Side DApp Context**

**Your project is a CLIENT-SIDE ONLY DApp (browser-based).** All implementations below are designed for client-side use:
- ✅ **Option 1**: MetaMask message signing (client-side, secure)
- ✅ **Option 2**: Masca integration (client-side MetaMask Snap)
- ❌ **Option 3**: Direct private key access (NOT applicable - server-side only)

**Key Principle:** Never expose private keys in browser code. Use MetaMask's message signing or Masca for secure client-side authentication.

### Why Wallet-Based DIDs?

1. **No Additional Key Management**: Users already have wallet keys
2. **Deterministic**: Same wallet = same DID across devices
3. **Web3 Native**: Aligns with blockchain identity patterns
4. **Cross-Platform**: Works across different applications
5. **User Familiarity**: Users already understand wallet-based auth

### Architecture: Wallet → DID → Space → UCAN Signatures

```
MetaMask Account (Ethereum Address)
    ↓
DID (did:key or did:ethr)
    ↓
Storacha Space DID (derived from wallet DID)
    ↓
UCAN Signatures (signed with wallet private key)
    ↓
Upload to Storacha
```

### Option 1: MetaMask Account as DID (Ethereum Address DID) ⭐ **Recommended for Client-Side DApps**

**This is the simplest and most secure approach for browser-based DApps.** MetaMask accounts can function directly as DIDs using the `did:ethr` method, and you use MetaMask's message signing (no private key exposure):

```typescript
// apps/dao-dapp/src/services/ipfs/storacha-wallet.ts
import { ethers } from 'ethers'
import * as Client from '@storacha/client'
import { Signer } from '@storacha/client/principal/ed25519'
// Note: Storacha may support secp256k1 (Ethereum) signers - check docs

/**
 * Convert Ethereum address to DID
 * Format: did:ethr:0x...
 */
function addressToDID(address: string): string {
  return `did:ethr:${address.toLowerCase()}`
}

/**
 * Get user's DID from MetaMask
 */
async function getWalletDID(): Promise<string> {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('MetaMask not installed')
  }
  
  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()
  const address = await signer.getAddress()
  
  return addressToDID(address)
}

/**
 * Create Storacha client using wallet-based authentication
 */
export async function createWalletStorachaClient() {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('MetaMask not installed')
  }
  
  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()
  const address = await signer.getAddress()
  const walletDID = addressToDID(address)
  
  // Create signer from wallet private key
  // Note: This requires access to private key, which MetaMask doesn't expose directly
  // Alternative: Use message signing for UCANs (see Option 2)
  
  // For now, we'll use a hybrid approach:
  // 1. Use wallet address as DID identifier
  // 2. Use message signing for UCAN signatures
  
  const client = await Client.create({
    // Configure client to use wallet-based identity
    // Implementation depends on Storacha client's wallet support
  })
  
  return { client, walletDID, address }
}
```

### Option 2: Masca Integration (Recommended for Full DID Support)

**Masca** is a MetaMask Snap that adds Self-Sovereign Identity (SSI) support, enabling:
- DID management within MetaMask
- Verifiable Credentials (VCs)
- Multiple DID methods (did:key, did:ethr, did:pkh, etc.)
- UCAN signing with wallet keys

**Installation:**
```bash
pnpm add @blockchain-lab-um/masca-connector
```

**Implementation:**
```typescript
// apps/dao-dapp/src/services/ipfs/storacha-masca.ts
import { MascaApi } from '@blockchain-lab-um/masca-connector'
import * as Client from '@storacha/client'

/**
 * Initialize Masca and get user's DID
 */
async function initializeMasca(): Promise<{ api: MascaApi; did: string }> {
  // Check if MetaMask is installed
  if (typeof window.ethereum === 'undefined') {
    throw new Error('MetaMask not installed')
  }
  
  // Request Masca Snap installation if not already installed
  const snapId = 'npm:@blockchain-lab-um/masca' // or your Masca snap ID
  
  try {
    await window.ethereum.request({
      method: 'wallet_requestSnaps',
      params: {
        [snapId]: {}
      }
    })
  } catch (error) {
    console.error('Failed to install Masca Snap:', error)
    throw error
  }
  
  // Connect to Masca
  const api = (await window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: {
      snapId,
      request: {
        method: 'getDID'
      }
    }
  })) as MascaApi
  
  // Get user's DID
  const did = await api.getDID()
  
  return { api, did }
}

/**
 * Create Storacha Space using wallet-based DID
 */
export async function createSpaceFromWallet(spaceName: string) {
  const { api, did } = await initializeMasca()
  
  // Create Storacha client
  const client = await Client.create()
  
  // Use wallet DID to create/access Space
  // The Space DID can be derived from the wallet DID
  // This ensures deterministic Space ownership
  
  // Create Space with wallet DID as owner
  const space = await client.space.create(spaceName)
  
  // Authorize using wallet signature
  // This would involve signing a UCAN with the wallet
  await authorizeSpaceWithWallet(space, api, did)
  
  return {
    spaceDid: space.did(),
    walletDid: did,
    space
  }
}

/**
 * Authorize Space using wallet signature
 */
async function authorizeSpaceWithWallet(
  space: any,
  mascaApi: MascaApi,
  walletDid: string
) {
  // Create authorization message
  const message = {
    space: space.did(),
    action: 'authorize',
    timestamp: Date.now()
  }
  
  // Sign with wallet via Masca
  const signature = await mascaApi.signData(JSON.stringify(message))
  
  // Use signature to authorize Space
  // Implementation depends on Storacha's authorization flow
  // This would typically involve creating a UCAN delegation
  // signed with the wallet's private key
}
```

### Option 3: Direct Wallet Private Key → Storacha Signer

**⚠️ NOT APPLICABLE FOR CLIENT-SIDE DAPPS**

This option requires direct access to the wallet's private key, which:
- ❌ **Cannot be done in browser/client-side apps** - MetaMask and other wallets never expose private keys
- ❌ **Security risk** - Never expose private keys in browser code
- ✅ **Only viable for server-side applications** - Where you control the key management

**For your client-side DApp, this option is NOT applicable.** Use Option 1 (MetaMask message signing) or Option 2 (Masca) instead.

**When this might be used (for reference only - not your use case):**
- Server-side applications with controlled key management
- Trusted environments where you manage keys securely
- Backend services that need to act on behalf of users

**Implementation (server-side only - DO NOT USE IN BROWSER):**
```typescript
// ⚠️ SERVER-SIDE ONLY - DO NOT USE IN BROWSER/CLIENT-SIDE CODE
// apps/dao-dapp/src/services/ipfs/storacha-wallet-direct.ts
import { ethers } from 'ethers'
import * as Client from '@storacha/client'
import { Signer } from '@storacha/client/principal/ed25519'
// Note: Storacha may need secp256k1 signer for Ethereum keys

/**
 * Create Storacha signer from Ethereum private key
 * 
 * ⚠️ WARNING: Only use this in secure server-side environments
 * ⚠️ NEVER expose private keys in browser/client-side code!
 * ⚠️ This is NOT applicable for client-side DApps like yours
 */
export async function createStorachaClientFromPrivateKey(
  privateKey: string
): Promise<Awaited<ReturnType<typeof Client.create>>> {
  // This would only work server-side where you control key management
  // For client-side DApps, use Option 1 or Option 2 instead
  throw new Error('Not applicable for client-side DApps - use Option 1 or Option 2')
}
```

### Complete Wallet-Based User-Owned Implementation

```typescript
// apps/dao-dapp/src/services/ipfs/storacha-user-owned-wallet.ts
import { ethers } from 'ethers'
import * as Client from '@storacha/client'
import type { Helia } from 'helia'

export interface WalletSpace {
  walletAddress: string
  walletDID: string
  spaceDid: string
  isAuthorized: boolean
}

/**
 * Get user's wallet address and DID
 */
export async function getWalletIdentity(): Promise<{
  address: string
  did: string
}> {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('MetaMask not installed. Please install MetaMask to continue.')
  }
  
  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()
  const address = await signer.getAddress()
  
  // Convert to DID format
  // Using did:ethr (Ethereum DID method)
  const did = `did:ethr:${address.toLowerCase()}`
  
  return { address, did }
}

/**
 * Create or retrieve user's Storacha Space using wallet
 */
export async function getOrCreateWalletSpace(
  spaceName?: string
): Promise<WalletSpace> {
  const { address, did } = await getWalletIdentity()
  
  // Check if user already has a Space for this wallet
  const storedSpaceDid = localStorage.getItem(`storacha_space_${address}`)
  
  if (storedSpaceDid) {
    return {
      walletAddress: address,
      walletDID: did,
      spaceDid: storedSpaceDid,
      isAuthorized: true
    }
  }
  
  // Create new Space
  const client = await Client.create()
  
  // Authenticate using wallet
  // This would involve signing a message with MetaMask
  // to prove ownership of the DID
  const message = `Storacha Space Creation\n\nWallet: ${address}\nDID: ${did}\nTimestamp: ${Date.now()}`
  
  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()
  const signature = await signer.signMessage(message)
  
  // Use signature to authenticate with Storacha
  // Implementation depends on Storacha's wallet auth API
  // This might involve:
  // 1. Creating a UCAN delegation signed with wallet
  // 2. Using the signature to prove DID ownership
  // 3. Registering the Space with the wallet DID as owner
  
  // For now, using email as fallback (user would need to link wallet)
  // In production, you'd use the wallet signature directly
  const email = prompt('Enter email to link with your wallet for Storacha:')
  if (email) {
    await client.login(email)
  }
  
  const spaceNameToUse = spaceName || `WalletSpace_${address.slice(0, 8)}`
  const space = await client.space.create(spaceNameToUse)
  
  // Store Space DID linked to wallet address
  localStorage.setItem(`storacha_space_${address}`, space.did())
  
  return {
    walletAddress: address,
    walletDID: did,
    spaceDid: space.did(),
    isAuthorized: true
  }
}

/**
 * Upload to Storacha using wallet-based Space
 */
export async function uploadToWalletOwnedStoracha(
  data: string | Uint8Array | File | File[],
  spaceName?: string
): Promise<{
  success: boolean
  cid: string
  gatewayUrl: string
  walletAddress: string
  spaceDid: string
  error?: string
}> {
  try {
    // Get or create wallet Space
    const walletSpace = await getOrCreateWalletSpace(spaceName)
    
    // Create client
    const client = await Client.create()
    
    // Authenticate (using wallet signature or linked email)
    // In production, this would use wallet signature directly
    const storedEmail = localStorage.getItem(`storacha_email_${walletSpace.walletAddress}`)
    if (storedEmail) {
      await client.login(storedEmail)
    }
    
    // Set current space
    await client.setCurrentSpace(walletSpace.spaceDid)
    
    // Convert data to File format
    let files: File[]
    if (typeof data === 'string') {
      const blob = new Blob([data], { type: 'text/plain' })
      files = [new File([blob], 'data.txt')]
    } else if (data instanceof Uint8Array) {
      const blob = new Blob([data])
      files = [new File([blob], 'data.bin')]
    } else if (Array.isArray(data)) {
      files = data
    } else {
      files = [data]
    }
    
    // Upload using wallet's Space
    const cid = await client.uploadDirectory(files)
    const gatewayUrl = `https://storacha.link/ipfs/${cid}`
    
    return {
      success: true,
      cid,
      gatewayUrl,
      walletAddress: walletSpace.walletAddress,
      spaceDid: walletSpace.spaceDid
    }
  } catch (error) {
    console.error('Error uploading to wallet-owned Storacha:', error)
    return {
      success: false,
      cid: '',
      gatewayUrl: '',
      walletAddress: '',
      spaceDid: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Sign UCAN with wallet (for delegations, etc.)
 */
export async function signUCANWithWallet(message: string): Promise<string> {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('MetaMask not installed')
  }
  
  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()
  
  // Sign message with wallet
  const signature = await signer.signMessage(message)
  
  return signature
}
```

### Integration with Your Existing Wagmi Setup

Since your project already uses Wagmi (from `apps/dao-dapp/src/config/wagmi.ts`), you can integrate wallet-based Storacha:

```typescript
// apps/dao-dapp/src/services/ipfs/storacha-wagmi.ts
import { useAccount, useSignMessage } from 'wagmi'
import * as Client from '@storacha/client'

export function useWalletStoracha() {
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  
  const uploadWithWallet = async (data: string | Uint8Array | File | File[]) => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected')
    }
    
    // Get wallet DID
    const walletDID = `did:ethr:${address.toLowerCase()}`
    
    // Create Storacha client
    const client = await Client.create()
    
    // Sign authentication message
    const authMessage = `Storacha Authentication\n\nWallet: ${address}\nDID: ${walletDID}`
    const signature = await signMessageAsync({ message: authMessage })
    
    // Use signature for Storacha authentication
    // (Implementation depends on Storacha's wallet auth API)
    
    // Upload data
    // ... rest of upload logic
  }
  
  return { uploadWithWallet, walletDID: address ? `did:ethr:${address.toLowerCase()}` : null }
}
```

### Key Considerations

1. **DID Methods**: Storacha may support different DID methods:
   - `did:key` (Ed25519 keys)
   - `did:ethr` (Ethereum addresses)
   - `did:pkh` (Public Key Hash)
   - Check Storacha docs for supported methods

2. **Signer Types**: Storacha may require specific signer types:
   - Ed25519 (common for UCANs)
   - secp256k1 (Ethereum keys)
   - Check Storacha client docs for signer API

3. **UCAN Signing**: UCANs need to be signed with the DID's private key:
   - MetaMask doesn't expose private keys
   - Use message signing (`eth_sign` or `personal_sign`)
   - Or use Masca for full DID/VC support

4. **Space DID Derivation**: 
   - Space DIDs can be derived deterministically from wallet DIDs
   - Same wallet = same Space across devices
   - Enables true portability

### Recommended Approach for Your DAO Project

**Use Wallet-Based DIDs as Primary Identity:**

1. **User connects MetaMask** → Get Ethereum address
2. **Derive DID** → `did:ethr:0x...`
3. **Create/Retrieve Space** → Space DID derived from wallet DID
4. **Sign UCANs** → Use MetaMask message signing or Masca
5. **Upload to Storacha** → Using wallet-owned Space

**Benefits:**
- ✅ No email required
- ✅ True Web3 identity
- ✅ Cross-device portability (same wallet = same Space)
- ✅ Aligns with DAO principles
- ✅ Users already have wallets

**References:**
- [Storacha Docs - Architecture Options](https://docs.storacha.network/concepts/architecture-options/#user-owned)
- [Masca Documentation](https://docs.masca.io/)
- [MetaMask Signing Docs](https://docs.metamask.io/wallet/how-to/sign-data/)
- [Ethereum DID Method (did:ethr)](https://github.com/decentralized-identity/ethr-did-resolver)

**Tracking User Uploads (Optional)**

Since you have no visibility into user uploads, you can implement a voluntary sharing mechanism:

```typescript
// User uploads to their Space
const result = await uploadToUserOwnedStoracha(data)

// User optionally shares CID with your app for indexing/tracking
if (userWantsToShare) {
  await shareCIDWithApp(result.cid, {
    userId: currentUser.id,
    timestamp: Date.now(),
    type: 'profile'
  })
}

// Your backend can now index these CIDs
// But user still owns the data
```

**Reference:** [Storacha Docs - User-Owned Architecture](https://docs.storacha.network/concepts/architecture-options/#user-owned)

---

### Architecture Comparison Table

| Aspect | Client-Server | Delegated | User-Owned |
|--------|--------------|-----------|------------|
| **Space Owner** | Developer | Developer | User |
| **Backend Required** | ✅ Yes | ✅ Yes (for delegations) | ❌ No |
| **Egress Costs** | ❌ Yes | ✅ No | ✅ No |
| **Scalability** | Limited | High | Maximum |
| **Visibility** | ✅ Full | ⚠️ Limited | ❌ None (unless shared) |
| **User Control** | ❌ Low | ⚠️ Medium | ✅ Maximum |
| **Decentralization** | ❌ Low | ⚠️ Medium | ✅ High |
| **Onboarding Complexity** | Low | Medium | Higher |
| **Best For** | Traditional apps | Scalable apps | Web3/DApps |

---

### Why User-Owned Architecture Fits Your DAO Project

Your DAO profile project is **perfect** for the user-owned architecture because:

1. **DAO Principles**: DAOs are about decentralization and user sovereignty - user-owned Spaces align perfectly
2. **Profile Data**: User profiles should be owned by users, not the platform
3. **No Backend Needed**: Your current setup is browser-based (Helia) - user-owned fits this perfectly
4. **IPFS Native**: You're already using IPFS/Helia - Storacha complements this with hot storage
5. **User Control**: Users can take their Space and data anywhere - true portability

**Recommended Approach for Your Project:**
- Use **User-Owned Architecture with Wallet-Based DIDs** as primary
- Users connect MetaMask → Derive DID from wallet address (`did:ethr:0x...`)
- Users create/retrieve Spaces using wallet DID (deterministic across devices)
- Users sign UCANs with wallet (via MetaMask message signing or Masca)
- Users upload profile data to their wallet-owned Spaces
- Optional: Implement CID sharing mechanism if you need indexing
- Keep Helia for local caching and peer-to-peer operations
- Leverage existing Wagmi setup for wallet connectivity

---

## Integration Options

Storacha provides multiple integration methods to suit different use cases:

### 1. JavaScript/TypeScript Client (Recommended for Web DApps)

**Package:** `@storacha/client`

**Installation:**
```bash
npm install @storacha/client
npm install files-from-path  # Helper for file handling
```

**Basic Usage:**
```javascript
import { filesFromPaths } from 'files-from-path';
import * as Client from '@storacha/client';

// Create client instance
const client = await Client.create();

// Authenticate (email-based)
await client.login('your-email@example.com');

// Upload a file or directory
const files = await filesFromPaths('path/to/your/file');
const cid = await client.uploadDirectory(files);

console.log(`IPFS CID: ${cid}`);
console.log(`Gateway URL: https://storacha.link/ipfs/${cid}`);
```

**Key Features:**
- Handles file chunking and hashing automatically
- Root CID calculated locally before upload
- Returns standard IPFS CIDs
- Works in browser and Node.js environments

**GitHub Repository:** https://github.com/storacha/upload-service

---

### 2. Command-Line Interface (CLI)

**Package:** `@storacha/cli`

**Installation:**
```bash
npm install -g @storacha/cli
```

**Requirements:**
- Node.js 18+ 
- npm 7+

**Common Commands:**
```bash
# Login with email
storacha login your-email@example.com

# Create a storage space
storacha space create YourSpaceName

# Upload files
storacha up path/to/your/file

# List spaces
storacha space list

# Get help
storacha --help
```

**Use Cases:**
- Quick file uploads from terminal
- CI/CD scripts
- Automated deployment workflows

**Documentation:** https://docs.storacha.network/cli/

---

### 3. Go Client

**Package:** `github.com/storacha/go-client`

**Installation:**
```bash
go get github.com/storacha/go-client
```

**Basic Usage:**
```go
package main

import (
    "context"
    "fmt"
    "github.com/storacha/go-client"
)

func main() {
    ctx := context.Background()
    
    // Create client
    client, err := client.New(ctx)
    if err != nil {
        panic(err)
    }

    // Login
    err = client.Login(ctx, "your-email@example.com")
    if err != nil {
        panic(err)
    }

    // Upload file
    cid, err := client.UploadFile(ctx, "path/to/your/file")
    if err != nil {
        panic(err)
    }

    fmt.Printf("Uploaded CID: %s\n", cid)
    fmt.Printf("Gateway URL: https://storacha.link/ipfs/%s\n", cid)
}
```

**Use Cases:**
- Backend services written in Go
- Server-side file processing
- Microservices architecture

**Documentation:** https://docs.storacha.network/go-client/

---

### 4. GitHub Action

**Action:** `storacha/add-to-web3@v4`

**Usage in GitHub Workflow:**
```yaml
name: Deploy to Storacha

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build project
        run: npm run build
      
      - uses: storacha/add-to-web3@v4
        id: storacha
        with:
          path_to_add: 'dist'
          proof: ${{ secrets.STORACHA_PROOF }}
          secret_key: ${{ secrets.STORACHA_PRINCIPAL }}
      
      - name: Output CID
        run: echo ${{ steps.storacha.outputs.cid }}
      
      - name: Output URL
        run: echo ${{ steps.storacha.outputs.url }}
```

**Setup:**
1. Generate UCAN delegation proofs from Storacha console
2. Add `STORACHA_PROOF` and `STORACHA_PRINCIPAL` as GitHub secrets
3. Use the action in your workflow

**Use Cases:**
- Automated deployment of static sites
- CI/CD pipeline integration
- Build artifact storage

**GitHub Repository:** https://github.com/storacha/add-to-web3

---

### 5. Model Context Protocol (MCP) Integration

For AI applications, Storacha provides an MCP server implementation.

**Setup:**
```bash
git clone https://github.com/storacha/mcp-storage-server.git
cd mcp-storage-server
pnpm install
```

**Use Cases:**
- AI/ML applications requiring standardized storage interfaces
- Integration with AI development tools

**Documentation:** https://docs.storacha.network/ai/mcp/

---

## Comparison: Storacha vs Pinata

### Current Setup (Pinata)

**What You're Using:**
- Pinata SDK v2.5.1 for pinning CIDs
- Pinata REST API for status checks and management
- Free plan with limitations (pins stuck in "searching" status)
- Manual pinning after content upload to Helia

**Limitations Experienced:**
- Free plan restrictions causing pins to get stuck
- Some features require paid plans
- Pins can remain in "searching" status indefinitely
- Need to manage pinning separately from upload

---

### Storacha Advantages

| Feature | Pinata | Storacha |
|---------|--------|----------|
| **Storage Model** | Pinning service (requires existing CID) | Full storage + pinning solution |
| **Upload Flow** | Upload → Get CID → Pin separately | Upload → Auto-stored + pinned |
| **IPFS Compatibility** | ✅ Yes | ✅ Yes (native) |
| **Performance** | Good | CDN-level (optimized hot storage) |
| **Free Tier** | Limited (pins can get stuck) | Unknown limits (need to verify) |
| **User Control** | Centralized auth | UCANs (decentralized) |
| **Filecoin Backup** | ❌ No | ✅ Yes |
| **Data Ownership** | Managed by Pinata | User-controlled via UCANs |
| **Integration Complexity** | Medium (SDK + REST API mix) | Low (unified SDK) |

---

### Key Differences

1. **Storage vs. Pinning**
   - **Pinata**: Primarily a pinning service. You upload to IPFS first, then pin the CID.
   - **Storacha**: Full storage solution. Upload directly to Storacha, which handles IPFS storage and pinning.

2. **Authentication**
   - **Pinata**: JWT-based API keys (centralized)
   - **Storacha**: UCANs (User Controlled Authorization Networks) - decentralized

3. **Data Control**
   - **Pinata**: Data managed through Pinata's platform
   - **Storacha**: User-controlled with fine-grained permissions

4. **Performance**
   - **Pinata**: Good performance, but not optimized for hot storage
   - **Storacha**: Optimized for hot storage with CDN-level speeds

5. **Backup Strategy**
   - **Pinata**: Relies on Pinata's infrastructure
   - **Storacha**: Redundant storage + Filecoin backup

---

## Integration with Helia/IPFS DApp

### Current Architecture

**⚠️ Important: Your project is a CLIENT-SIDE ONLY DApp (browser-based)**

Your project uses:
- **Helia**: Browser-based IPFS node (singleton pattern) - **Client-side**
- **UnixFS**: For file operations - **Client-side**
- **Pinata**: For pinning CIDs to ensure availability - **Client-side API calls**
- **Local Kubo Node**: Optional local IPFS daemon - **External service**
- **Wagmi**: Wallet connectivity - **Client-side**
- **No Backend**: Everything runs in the browser - **Client-side only**

### Recommended Architecture: User-Owned Spaces

**For your DAO profile project, the User-Owned Architecture is the recommended approach** because:

1. **Aligns with DAO principles**: Decentralization and user sovereignty
2. **No backend required**: Fits your browser-based Helia setup perfectly
3. **User data ownership**: Profiles belong to users, not the platform
4. **True portability**: Users can take their Space and data anywhere
5. **Privacy-first**: Users control who sees their data

### Integration Approaches

#### Option 1: User-Owned Architecture (Recommended for Your Project) ⭐

**Benefits:**
- ✅ **Truly decentralized**: Users own their data completely
- ✅ **No backend required**: Everything happens client-side (perfect for your Helia setup)
- ✅ **No egress costs**: Users upload directly to Storacha
- ✅ **Maximum scalability**: No server bottleneck
- ✅ **User sovereignty**: Aligns with DAO/Web3 principles
- ✅ **Privacy-first**: Users control their data
- ✅ **Filecoin backup**: Included automatically
- ✅ **CDN-level performance**: Hot storage optimization

**Implementation:**
See the complete implementation example in the [User-Owned Architecture](#3-user-owned-architecture--your-focus) section above.

**Key Points:**
- Each user creates their own Space on first use
- Users authenticate with email (or wallet in future)
- Users upload directly to their Space
- No data flows through your servers
- Optional CID sharing mechanism if you need indexing

**Update `ipfs.ts`:**
```typescript
// Add user-owned Storacha as an option
export async function uploadToIPFS(
  data: string, 
  options?: {
    autoPin?: boolean
    useStoracha?: boolean
    useUserOwnedSpace?: boolean  // New option
  }
): Promise<string> {
  // User-owned Storacha (recommended)
  if (options?.useStoracha && options?.useUserOwnedSpace) {
    const { uploadToUserOwnedStoracha } = await import('./ipfs/storacha-user-owned')
    const result = await uploadToUserOwnedStoracha(data)
    if (!result.success) {
      throw new Error(`Failed to upload to user-owned Storacha: ${result.error}`)
    }
    
    // Optional: Cache locally in Helia
    if (heliaInstance) {
      try {
        const cidObj = CID.parse(result.cid)
        await heliaInstance.pins.add(cidObj)
      } catch (error) {
        console.warn('Failed to cache CID locally:', error)
      }
    }
    
    return result.cid
  }
  
  // Existing Helia upload logic (fallback)
  const fs = await getUnixFS()
  // ... rest of implementation
}
```

---

#### Option 2: Use Storacha as Primary Storage, Keep Helia for Local Operations

**Benefits:**
- Best of both worlds
- Storacha for persistent storage
- Helia for local caching and peer-to-peer operations

**Implementation:**
```typescript
export async function uploadToIPFS(
  data: string,
  options?: {
    useStoracha?: boolean
    cacheLocally?: boolean
  }
): Promise<string> {
  let cid: string
  
  if (options?.useStoracha) {
    // Upload to Storacha (primary storage)
    const { uploadToStoracha } = await import('./ipfs/storacha')
    cid = await uploadToStoracha(data)
  } else {
    // Upload to local Helia
    const fs = await getUnixFS()
    const encoder = new TextEncoder()
    const dataBytes = encoder.encode(data)
    cid = (await fs.addBytes(dataBytes)).toString()
  }
  
  // Optionally cache locally in Helia
  if (options?.cacheLocally && heliaInstance) {
    const cidObj = CID.parse(cid)
    await heliaInstance.pins.add(cidObj)
  }
  
  return cid
}
```

---

#### Option 3: Hybrid Approach - Storacha + Pinata + Local

**Benefits:**
- Maximum redundancy
- Multiple pinning services
- Fallback options

**Implementation:**
```typescript
export async function uploadToIPFSWithRedundancy(
  data: string
): Promise<{
  cid: string
  storacha: boolean
  pinata: boolean
  local: boolean
}> {
  // Upload to Helia first
  const fs = await getUnixFS()
  const encoder = new TextEncoder()
  const dataBytes = encoder.encode(data)
  const cid = (await fs.addBytes(dataBytes)).toString()
  
  // Pin to all services in parallel
  const [storachaResult, pinataResult, localResult] = await Promise.allSettled([
    uploadToStoracha(data).then(() => true).catch(() => false),
    pinToPinata(cid, dataBytes).then(r => r.success),
    pinToHeliaLocal(heliaInstance!, cid).then(r => r.success)
  ])
  
  return {
    cid,
    storacha: storachaResult.status === 'fulfilled' && storachaResult.value,
    pinata: pinataResult.status === 'fulfilled' && pinataResult.value,
    local: localResult.status === 'fulfilled' && localResult.value
  }
}
```

---

## Authentication & Authorization

### UCANs (User Controlled Authorization Networks)

Storacha uses UCANs for decentralized authentication, which is fundamentally different from Pinata's JWT-based approach.

**Key Concepts:**

1. **Principals**: Entities that can make claims (users, applications, services)
2. **Capabilities**: Permissions granted to principals
3. **Delegation**: Principals can delegate capabilities to other principals
4. **Proofs**: Cryptographic proofs that verify capabilities

**Benefits:**
- No central authority needed
- Fine-grained permissions
- Can delegate capabilities to applications/CI/CD
- User-controlled data access

**Setup Process:**

1. **Create Account**: Sign up with email or GitHub
2. **Generate Delegation Proofs**: Create UCANs for your application
3. **Store Proofs Securely**: Use environment variables or secure storage
4. **Use in Application**: Pass proofs to client for authentication

**Example:**
```typescript
// Generate proof from Storacha console, store as env var
const proof = import.meta.env.VITE_STORACHA_PROOF
const principal = import.meta.env.VITE_STORACHA_PRINCIPAL

const client = await StorachaClient.create()
// Use proof for authentication instead of email login
```

---

## Pricing & Limits

### Current Information

**Note:** Specific pricing details were not found in the research. Storacha appears to be relatively new, and pricing information may not be publicly available or may be in flux.

**Recommendations:**
1. Check Storacha's official website for current pricing
2. Contact Storacha team for enterprise/volume pricing
3. Test free tier limits through the console
4. Compare with Pinata's pricing structure

### Free Tier Considerations

Based on the research:
- Storacha appears to offer a free tier (details unknown)
- May have better free tier experience than Pinata (no "searching" pin issues)
- Filecoin backup included (value-add)

**Action Items:**
- Sign up for Storacha account to explore free tier
- Test upload limits and performance
- Compare with current Pinata free tier experience

---

## Recommended Integration Strategy

### Phase 1: Evaluation (Week 1)

1. **Sign Up & Explore**
   - Create Storacha account
   - Test CLI and web console
   - Understand free tier limits
   - Test upload/download performance

2. **Proof of Concept**
   - Create simple integration test
   - Upload test files via JavaScript client
   - Verify CID compatibility with Helia
   - Test retrieval through IPFS gateways

3. **Compare Performance**
   - Upload same files to both Pinata and Storacha
   - Compare upload speeds
   - Compare retrieval speeds
   - Test with various file sizes

### Phase 2: Implementation (Week 2-3)

**Recommended Approach: Option 1 (Replace Pinata)**

**Steps:**

1. **Install Dependencies**
   ```bash
   pnpm add @storacha/client files-from-path
   ```

2. **Create Storacha Service**
   - Create `apps/dao-dapp/src/services/ipfs/storacha.ts`
   - Implement upload functions
   - Add authentication handling
   - Add error handling and retries

3. **Update IPFS Service**
   - Add Storacha as pinning option
   - Update `uploadToIPFS` to support Storacha
   - Maintain backward compatibility with Pinata initially

4. **Update UI Components**
   - Add Storacha upload option to `IPFSTest.tsx`
   - Show Storacha status alongside Pinata
   - Add configuration UI for Storacha credentials

5. **Environment Variables**
   ```env
   VITE_STORACHA_EMAIL=your-email@example.com
   VITE_STORACHA_PROOF=your-ucan-proof  # Optional, for CI/CD
   VITE_STORACHA_PRINCIPAL=your-principal  # Optional, for CI/CD
   ```

### Phase 3: Migration (Week 4)

1. **Gradual Migration**
   - Run both Pinata and Storacha in parallel
   - Compare reliability and performance
   - Migrate new uploads to Storacha
   - Keep Pinata for existing pins

2. **Monitor & Optimize**
   - Track upload success rates
   - Monitor retrieval performance
   - Optimize based on usage patterns

3. **Full Migration** (Optional)
   - Once confident, make Storacha primary
   - Keep Pinata as backup option
   - Update documentation

---

## Integration Considerations

### Advantages for Your Project (User-Owned Architecture)

1. **Solves Current Issues**
   - No more "searching" pin problems (users own their Spaces)
   - Unified upload + storage solution
   - Better free tier experience (likely)
   - No backend required (fits your browser-based setup)

2. **Perfect Architecture Fit**
   - **User-controlled data**: Users own their Spaces (UCANs)
   - **Decentralized**: No central authority
   - **DAO-aligned**: Matches decentralization principles
   - **Privacy-first**: Users control their data
   - **Filecoin backup**: Included automatically

3. **Performance**
   - CDN-level retrieval speeds
   - Optimized for hot storage
   - Better for frequently accessed data
   - No server bottleneck (users upload directly)

4. **Future-Proof**
   - Built on IPFS/Filecoin (decentralized)
   - User-controlled permissions
   - Aligns with Web3 principles
   - True data portability (users can take Space anywhere) <=== ????????????????????????
   - Can integrate with crypto wallets in future

### Potential Challenges (User-Owned Architecture)

1. **Learning Curve**
   - UCANs concept may be new
   - Space creation/management flow
   - User onboarding complexity
   - Need to understand Space DID management

2. **User Experience**
   - Users must create Spaces (first-time flow)
   - Need clear UI for Space management
   - Handle Space creation errors
   - Explain benefits to users

3. **Visibility & Tracking**
   - No automatic visibility into user uploads
   - Need voluntary CID sharing mechanism if tracking needed
   - May need separate indexing system
   - Users must explicitly share CIDs

4. **Migration Effort**
   - Need to update existing code
   - Implement user-owned flow
   - Handle Space persistence (localStorage/IndexedDB)
   - Testing and validation required

5. **Uncertainty**
   - Relatively new service
   - Pricing not fully clear
   - May have limitations not yet discovered
   - User-owned flow may have edge cases

6. **Dependency Management**
   - Another service to manage
   - Need to handle failures gracefully
   - Consider fallback to Helia/Pinata
   - Handle network failures

---

## Code Examples

### Complete Integration Example

```typescript
// apps/dao-dapp/src/services/ipfs/storacha.ts
import * as StorachaClient from '@storacha/client'
import type { Helia } from 'helia'

let storachaClient: Awaited<ReturnType<typeof StorachaClient.create>> | null = null

export interface StorachaUploadResult {
  success: boolean
  cid: string
  gatewayUrl: string
  error?: string
}

/**
 * Initialize Storacha client (singleton pattern)
 */
export async function getStorachaClient() {
  if (!storachaClient) {
    try {
      storachaClient = await StorachaClient.create()
      
      // Try email login first
      const email = import.meta.env.VITE_STORACHA_EMAIL
      if (email) {
        await storachaClient.login(email)
        console.log('Storacha client initialized with email')
      } else {
        console.warn('VITE_STORACHA_EMAIL not set, Storacha client created but not authenticated')
      }
    } catch (error) {
      console.error('Error initializing Storacha client:', error)
      throw error
    }
  }
  return storachaClient
}

/**
 * Upload string data to Storacha
 */
export async function uploadStringToStoracha(
  data: string,
  filename = 'data.txt'
): Promise<StorachaUploadResult> {
  try {
    const client = await getStorachaClient()
    const blob = new Blob([data], { type: 'text/plain' })
    const file = new File([blob], filename)
    
    const cid = await client.uploadDirectory([file])
    const gatewayUrl = `https://storacha.link/ipfs/${cid}`
    
    return {
      success: true,
      cid,
      gatewayUrl,
    }
  } catch (error) {
    console.error('Error uploading to Storacha:', error)
    return {
      success: false,
      cid: '',
      gatewayUrl: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Upload Uint8Array to Storacha
 */
export async function uploadBytesToStoracha(
  data: Uint8Array,
  filename = 'data.bin'
): Promise<StorachaUploadResult> {
  try {
    const client = await getStorachaClient()
    const blob = new Blob([data])
    const file = new File([blob], filename)
    
    const cid = await client.uploadDirectory([file])
    const gatewayUrl = `https://storacha.link/ipfs/${cid}`
    
    return {
      success: true,
      cid,
      gatewayUrl,
    }
  } catch (error) {
    console.error('Error uploading to Storacha:', error)
    return {
      success: false,
      cid: '',
      gatewayUrl: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Upload File or FileList to Storacha
 */
export async function uploadFilesToStoracha(
  files: File | File[]
): Promise<StorachaUploadResult> {
  try {
    const client = await getStorachaClient()
    const fileArray = Array.isArray(files) ? files : [files]
    
    const cid = await client.uploadDirectory(fileArray)
    const gatewayUrl = `https://storacha.link/ipfs/${cid}`
    
    return {
      success: true,
      cid,
      gatewayUrl,
    }
  } catch (error) {
    console.error('Error uploading to Storacha:', error)
    return {
      success: false,
      cid: '',
      gatewayUrl: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Check if CID exists in Storacha (via IPFS gateway)
 */
export async function checkCIDInStoracha(cid: string): Promise<boolean> {
  try {
    const gatewayUrl = `https://storacha.link/ipfs/${cid}`
    const response = await fetch(gatewayUrl, { method: 'HEAD' })
    return response.ok
  } catch {
    return false
  }
}
```

### Updated IPFS Service Integration

```typescript
// apps/dao-dapp/src/services/ipfs.ts (additions)

import { uploadStringToStoracha, uploadBytesToStoracha } from './ipfs/storacha'

export interface UploadOptions {
  autoPin?: boolean
  useStoracha?: boolean
  cacheLocally?: boolean
}

export async function uploadToIPFS(
  data: string,
  options: UploadOptions = {}
): Promise<string> {
  // Option 1: Use Storacha as primary storage
  if (options.useStoracha) {
    const result = await uploadStringToStoracha(data)
    if (!result.success) {
      throw new Error(`Failed to upload to Storacha: ${result.error}`)
    }
    
    // Optionally cache locally in Helia
    if (options.cacheLocally && heliaInstance) {
      try {
        const cidObj = CID.parse(result.cid)
        await heliaInstance.pins.add(cidObj)
      } catch (error) {
        console.warn('Failed to cache CID locally:', error)
      }
    }
    
    return result.cid
  }
  
  // Option 2: Use Helia (existing implementation)
  const fs = await getUnixFS()
  const encoder = new TextEncoder()
  const dataBytes = encoder.encode(data)
  const cid = await fs.addBytes(dataBytes)
  const cidString = cid.toString()
  
  // Auto-pin to configured services
  if (options.autoPin && heliaInstance) {
    void (async () => {
      try {
        const { pinToAllServices } = await import('./ipfs/pinning')
        await pinToAllServices(heliaInstance!, cidString, dataBytes)
      } catch (pinError) {
        console.warn('Warning: Auto-pinning failed:', pinError)
      }
    })()
  }
  
  return cidString
}
```

---

## Resources & Links

### Official Documentation

- **Main Documentation**: https://docs.storacha.network/
- **Quickstart Guide**: https://docs.storacha.network/quickstart/
- **CLI Documentation**: https://docs.storacha.network/cli/
- **JavaScript Client**: https://docs.storacha.network/js-client/
- **Go Client**: https://docs.storacha.network/go-client/
- **Concepts (Upload vs Store)**: https://docs.storacha.network/concepts/upload-vs-store/
- **IPFS Gateways**: https://docs.storacha.network/concepts/ipfs-gateways/
- **MCP Integration**: https://docs.storacha.network/ai/mcp/
- **Community Integrations**: https://docs.storacha.network/community-integrations/

### GitHub Repositories

- **Upload Service (JS Client)**: https://github.com/storacha/upload-service
- **CLI Tool**: https://github.com/storacha/cli (assumed)
- **Go Client**: https://github.com/storacha/go-client
- **GitHub Action**: https://github.com/storacha/add-to-web3
- **MCP Server**: https://github.com/storacha/mcp-storage-server
- **Organization**: https://github.com/storacha

### Websites

- **Main Website**: https://storacha.network/
- **Gateway**: https://storacha.link/
- **Console/Platform**: Check Storacha website for console access

### Community & Support

- **Discord**: Join Storacha Discord (link from website)
- **Filecoin Blog Posts**:
  - https://filecoin.io/blog/posts/introducing-storacha---the-future-of-hot-decentralized-data/
  - https://filecoin.io/blog/posts/filecoin-and-storacha-spicing-up-decentralized-hot-storage-like-never-before/

### Related Technologies

- **IPFS Documentation**: https://docs.ipfs.tech/
- **Helia Documentation**: https://helia.io/
- **UCAN Specification**: Search for UCAN (User Controlled Authorization Networks)
- **Filecoin**: https://filecoin.io/

---

## Next Steps

1. **Immediate Actions**
   - [ ] Sign up for Storacha account
   - [ ] Test CLI tool with sample files
   - [ ] Explore web console features
   - [ ] Check pricing/limits for free tier
   - [ ] Test JavaScript client in a simple HTML page

2. **Evaluation Phase**
   - [ ] Create proof-of-concept integration
   - [ ] Compare upload/retrieval performance with Pinata
   - [ ] Test with various file sizes
   - [ ] Verify CID compatibility with Helia
   - [ ] Test error handling and edge cases

3. **Implementation Phase**
   - [ ] Create Storacha service module
   - [ ] Integrate with existing IPFS service
   - [ ] Update UI components
   - [ ] Add configuration options
   - [ ] Write tests

4. **Migration Phase**
   - [ ] Run parallel with Pinata
   - [ ] Monitor performance and reliability
   - [ ] Gradually migrate new uploads
   - [ ] Document migration process

---

## Conclusion

Storacha presents an interesting alternative to Pinata for your IPFS/Helia-based DApp. Key advantages include:

- **Unified solution**: Upload + storage in one step
- **Better performance**: CDN-level speeds for hot storage
- **User control**: UCANs for decentralized permissions
- **Filecoin backup**: Long-term persistence included
- **IPFS native**: Full compatibility with existing IPFS tools

The main considerations are:
- Learning curve for UCANs
- Migration effort from Pinata
- Uncertainty around pricing and limits
- Relatively new service (less proven track record)

**Recommendation**: Proceed with Phase 1 (Evaluation) to test Storacha in your specific use case before committing to full migration.

---

## Feasibility Analysis: Direct Filecoin Integration vs Storacha

**Purpose:** This analysis evaluates whether to use Storacha (hot storage layer on Filecoin) or integrate directly with Filecoin for your client-side DAO profile DApp.

### Executive Summary

| Aspect | Storacha | Direct Filecoin |
|--------|----------|-----------------|
| **Storage Type** | Hot storage (fast access) | Cold storage (slower access) |
| **Complexity** | Low-Medium | High |
| **Client-Side Feasibility** | ✅ High | ⚠️ Medium (requires FIL tokens) |
| **Performance** | CDN-level speeds | Variable (depends on miners) |
| **Cost Model** | Service-based (pricing unclear) | Pay-per-storage (FIL tokens) |
| **User Experience** | Simple (email/wallet auth) | Complex (deal-making, FIL management) |
| **Decentralization** | Medium (service layer) | High (direct network) |
| **Best For** | Frequently accessed data | Long-term archival storage |

**Quick Recommendation:** For a DAO profile DApp with frequently accessed profile data, **Storacha is likely the better choice** due to hot storage optimization and simpler UX. Direct Filecoin is better for archival/backup use cases.

---

### 1. Understanding Filecoin vs Storacha

#### Filecoin Fundamentals

**What is Filecoin?**
- Decentralized storage network built on IPFS
- Uses blockchain to incentivize storage providers (miners)
- **Cold storage**: Optimized for long-term, verifiable storage
- Requires **FIL tokens** to pay for storage deals
- Storage deals are made between clients and miners
- Data retrieval can be slower (cold storage model)

**Key Characteristics:**
- **Proof of Storage**: Miners prove they're storing data
- **Deal-Making**: Clients negotiate storage deals with miners
- **FIL Tokens**: Required for payment
- **Retrieval Markets**: Separate from storage (can be slow/expensive)

#### Storacha Fundamentals

**What is Storacha?**
- **Hot storage layer** built on top of IPFS and Filecoin
- Optimized for **fast access** (CDN-level speeds)
- Automatically backs up to Filecoin (you don't manage deals)
- **Abstraction layer**: Handles Filecoin complexity for you
- User-friendly authentication (email/wallet)

**Key Characteristics:**
- **Hot Storage**: Fast retrieval for frequently accessed data
- **Filecoin Backup**: Automatic long-term persistence
- **Simplified UX**: No deal-making or FIL token management
- **Service Layer**: Adds convenience but adds dependency

---

### 2. Technical Feasibility for Client-Side DApp

#### Direct Filecoin Integration Options

##### Option A: Web3.Storage (Simplified Filecoin Interface)

**What it is:**
- Service by Protocol Labs that abstracts Filecoin complexity
- Provides simple API for storing/retrieving data
- Handles deal-making and FIL payments behind the scenes
- Free tier available

**Client-Side Feasibility:**
```typescript
// Example: Web3.Storage integration
import { Web3Storage } from 'web3.storage'

const client = new Web3Storage({ token: 'YOUR_API_TOKEN' })

// Upload (client-side)
const cid = await client.put([file])

// Retrieve (client-side)
const res = await client.get(cid)
const files = await res.files()
```

**Pros:**
- ✅ Simple API (similar to Storacha)
- ✅ Client-side compatible
- ✅ Free tier available
- ✅ Handles Filecoin complexity
- ✅ IPFS native (CIDs)

**Cons:**
- ❌ Still a service layer (not truly "direct" Filecoin)
- ❌ Requires API token (centralized auth)
- ❌ Less control than direct Filecoin
- ❌ Performance depends on Web3.Storage infrastructure

**Verdict:** Similar to Storacha in complexity, but less optimized for hot storage.

---

##### Option B: NFT.Storage (Filecoin for NFTs)

**What it is:**
- Specialized Filecoin service for NFT metadata/media
- Free for public NFT data
- Simple API

**Client-Side Feasibility:**
```typescript
import { NFTStorage } from 'nft.storage'

const client = new NFTStorage({ token: 'YOUR_API_TOKEN' })

// Upload NFT data
const metadata = await client.store({
  name: 'Profile',
  description: 'DAO Profile',
  image: file
})
```

**Pros:**
- ✅ Free for public data
- ✅ Simple API
- ✅ Client-side compatible
- ✅ Good for NFT/metadata use cases

**Cons:**
- ❌ Specialized for NFTs (may not fit general profile data)
- ❌ Still a service layer
- ❌ Less flexible than Storacha

**Verdict:** Good for NFT-specific use cases, but not ideal for general profile storage.

---

##### Option C: Filsnap (MetaMask Snap for Filecoin)

**What it is:**
- MetaMask Snap that adds Filecoin support
- Allows users to manage Filecoin accounts in MetaMask
- Can sign Filecoin transactions
- Enables direct interaction with Filecoin network

**Client-Side Feasibility:**
```typescript
// Install Filsnap in MetaMask
await window.ethereum.request({
  method: 'wallet_requestSnaps',
  params: {
    'npm:@chainsafe/filsnap': {}
  }
})

// Get Filecoin account
const account = await window.ethereum.request({
  method: 'wallet_invokeSnap',
  params: {
    snapId: 'npm:@chainsafe/filsnap',
    request: { method: 'fil_getAddress' }
  }
})
```

**Pros:**
- ✅ True Filecoin integration (not a service layer)
- ✅ Wallet-based (fits your Web3 stack)
- ✅ Client-side compatible
- ✅ Users control FIL tokens

**Cons:**
- ❌ **Complex**: Requires deal-making with miners
- ❌ **FIL Tokens Required**: Users need FIL to pay for storage
- ❌ **Slow Retrieval**: Cold storage model (not optimized for frequent access)
- ❌ **Deal Management**: Complex process of finding miners, making deals
- ❌ **Retrieval Markets**: Separate from storage (can be slow/expensive)
- ❌ **User Experience**: Much more complex than Storacha

**Verdict:** Technically feasible but **very complex** for end users. Not ideal for frequently accessed profile data.

---

##### Option D: Direct Filecoin SDK Integration ⭐ **True Direct Integration**

**What it is:**
- Direct SDK libraries for Filecoin integration
- No service layer abstraction
- Direct interaction with Filecoin network
- Examples: Synapse SDK, lotus-js-client, Filecoin.js

**Client-Side Feasibility:**

**Option D1: Synapse SDK (Filecoin Onchain Cloud)**

```typescript
// Example: Synapse SDK integration
import { Synapse, RPC_URLS } from '@filoz/synapse-sdk'
import { ethers } from 'ethers'

// Initialize with MetaMask
const provider = new ethers.BrowserProvider(window.ethereum)
const signer = await provider.getSigner()

const synapse = await Synapse.create({
  rpcURL: RPC_URLS.mainnet.http,
  signer: signer // Use MetaMask signer
})

// Upload data
const upload = await synapse.storage.upload(
  new TextEncoder().encode('Profile data')
)
console.log(`Uploaded PieceCID: ${upload.pieceCid}`)

// Download data
const data = await synapse.storage.download(upload.pieceCid)
```

**Pros:**
- ✅ **True direct integration** - No service layer
- ✅ Client-side compatible (browser-optimized)
- ✅ MetaMask integration built-in
- ✅ TypeScript SDK (type-safe)
- ✅ Programmable payments (Filecoin Pay)
- ✅ Verifiable on-chain (transparency)
- ✅ Storage management API

**Cons:**
- ⚠️ **FIL Tokens Required** - Users need FIL for storage
- ⚠️ **Deal Management** - Still need to handle storage deals
- ⚠️ **Complexity** - More complex than Storacha/Web3.Storage
- ⚠️ **Retrieval** - May be slower (depends on storage type)
- ⚠️ **Learning Curve** - Need to understand Filecoin concepts

**Installation:**
```bash
npm install @filoz/synapse-sdk ethers
```

**Documentation:** https://docs.filecoin.cloud/

**Verdict:** True direct Filecoin integration, but requires FIL tokens and deal management. More complex than Storacha but more control.

---

**Option D2: Lotus JS Client (Low-Level)**

```typescript
// Example: Lotus JS Client (if available for browser)
// Note: Lotus is primarily server-side, but JS clients exist
import { LotusRPC } from '@filecoin-shipyard/lotus-client-rpc'

// Connect to Lotus node (requires Lotus node endpoint)
const client = new LotusRPC(
  new BrowserProvider('https://lotus-node-endpoint'),
  { schema: FilecoinSchema.mainnet }
)

// Make storage deals (complex process)
// Requires: Finding miners, negotiating deals, managing FIL
```

**Pros:**
- ✅ Complete control over Filecoin network
- ✅ Direct Lotus API access
- ✅ Full deal-making capabilities

**Cons:**
- ❌ **Requires Lotus Node** - Need access to Filecoin node
- ❌ **Not truly client-side** - Usually requires backend node
- ❌ Very complex (low-level API)
- ❌ Heavy for browser

**Verdict:** Not practical for pure client-side DApps (requires Lotus node).

---

**Option D3: Other Filecoin SDKs**

Other potential SDKs (research needed):
- `@filecoin-shipyard/*` libraries
- Filecoin.js (if exists)
- Direct RPC calls to Filecoin nodes

**Verdict:** Synapse SDK is the most viable direct SDK option for client-side DApps.

---

##### Option E: Direct Lotus Client (Not Feasible for Browser)

**What it is:**
- Full Filecoin node client
- Complete control over deal-making
- Direct interaction with Filecoin network

**Client-Side Feasibility:**
- ❌ **NOT feasible** - Requires running a full node
- ❌ Too heavy for browser
- ❌ Requires significant resources

**Verdict:** Not applicable for client-side DApps.

---

### 3. Comparison Matrix: Storacha vs Direct Filecoin

| Feature | Storacha | Web3.Storage | NFT.Storage | Filsnap (Direct) |
|---------|----------|-------------|-------------|------------------|
| **Storage Type** | Hot (fast) | Hot/Cold mix | Hot/Cold mix | Cold (slow) |
| **Client-Side** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Complexity** | Low | Low | Low | **Very High** |
| **FIL Tokens Required** | ❌ No | ❌ No | ❌ No | ✅ **Yes** |
| **Deal Management** | Automatic | Automatic | Automatic | **Manual** |
| **Retrieval Speed** | CDN-level | Good | Good | **Variable/Slow** |
| **User Experience** | Simple | Simple | Simple | **Complex** |
| **Cost** | Service-based | Free tier | Free (public) | Pay FIL |
| **Decentralization** | Medium | Medium | Medium | **High** |
| **Best For** | Hot data | General storage | NFTs | Archival |

---

### 4. Use Case Analysis: DAO Profile DApp

#### Your Requirements

Based on your project:
- **DAO Profile Data**: User profiles, metadata, possibly images
- **Access Pattern**: Frequently accessed (hot data)
- **Client-Side Only**: No backend
- **User Experience**: Should be simple for DAO members
- **Web3 Native**: Wallet-based authentication preferred

#### Storacha Fit

**✅ Excellent Fit:**
- Hot storage optimized for frequently accessed profiles
- Simple wallet-based authentication (fits your Wagmi setup)
- No FIL token management needed
- CDN-level retrieval speeds
- Automatic Filecoin backup (best of both worlds)
- User-owned Spaces align with DAO principles

**⚠️ Considerations:**
- Service dependency (but abstracts complexity)
- Pricing unclear (need to verify)
- Relatively new service

#### Direct Filecoin Fit

**Synapse SDK (Direct SDK):**
- ✅ **True direct integration** - No service layer
- ✅ Client-side compatible
- ✅ More control than Storacha
- ⚠️ **FIL tokens required** - Users need FIL
- ⚠️ **More complex** - Deal management still needed
- ⚠️ **Retrieval speed** - Depends on storage type (warm vs cold)

**Filsnap (Direct):**
- ❌ **Poor Fit for Hot Data:**
  - Cold storage model (slow for frequently accessed profiles)
  - Complex deal-making process
  - FIL token management required from users
  - Poor user experience (too complex)
  - Retrieval can be slow/expensive

**✅ Good Fit for Backup/Archival:**
- If you want long-term archival backup
- If cost is primary concern (can be cheaper)
- If you want maximum decentralization
- If you need true direct Filecoin integration (Synapse SDK)

---

### 5. Cost Analysis

#### Storacha Costs

**Unknown (Need to Verify):**
- Likely service-based pricing
- May have free tier
- Pricing model unclear from research

**Action Required:** Sign up and check pricing before committing.

#### Direct Filecoin Costs

**FIL Token Costs:**
- Storage: ~$0.000000000231 per GB per second (very cheap)
- Retrieval: Variable (can be expensive if data is cold)
- Gas fees: For deal-making transactions

**Example Calculation:**
- 1 GB stored for 1 year ≈ $0.0073 (very cheap)
- But: Requires FIL tokens, deal-making complexity, retrieval costs

**Hidden Costs:**
- Development time (complex integration)
- User education (FIL management, deal-making)
- Support complexity (users managing deals)
- Retrieval latency (user experience impact)

---

### 6. Implementation Complexity

#### Storacha Implementation

**Complexity: Low-Medium**

```typescript
// Simple implementation
const client = await Client.create()
await client.login(email) // or wallet-based
const cid = await client.uploadDirectory(files)
```

**Time Estimate:** 1-2 weeks
- Install SDK
- Implement authentication
- Add upload/retrieve functions
- Test integration

#### Direct Filecoin (Filsnap) Implementation

**Complexity: Very High**

```typescript
// Complex implementation
// 1. Install Filsnap
// 2. Get FIL account
// 3. Fund account with FIL
// 4. Find storage miners
// 5. Negotiate deals
// 6. Monitor deal status
// 7. Handle retrieval
// 8. Manage FIL payments
```

**Time Estimate:** 4-8 weeks
- Learn Filecoin deal-making
- Implement Filsnap integration
- Build deal management UI
- Handle FIL token management
- Implement retrieval logic
- Error handling for failed deals
- User education materials

---

### 7. User Experience Comparison

#### Storacha UX

**Flow:**
1. User connects wallet (or enters email)
2. Creates Space (one-time)
3. Uploads profile data
4. Gets CID immediately
5. Fast retrieval anytime

**User Friction:** Low
- Familiar wallet-based auth
- Simple upload process
- Fast access

#### Direct Filecoin UX

**Flow:**
1. User installs Filsnap
2. Gets Filecoin account
3. Acquires FIL tokens (exchange, bridge, etc.)
4. Funds Filecoin account
5. Finds storage miners
6. Negotiates deals
7. Waits for deal confirmation
8. Monitors deal status
9. Retrieves data (may be slow)

**User Friction:** Very High
- Complex onboarding
- FIL token acquisition
- Deal management
- Slow retrieval

---

### 8. Performance Comparison

#### Storacha Performance

- **Upload Speed:** Fast (optimized network)
- **Retrieval Speed:** CDN-level (hot storage)
- **Availability:** 99.9% target
- **Latency:** Low (milliseconds)

**Best For:** Frequently accessed data (profiles, metadata)

#### Direct Filecoin Performance

- **Upload Speed:** Variable (depends on miner)
- **Retrieval Speed:** Slow (cold storage, retrieval markets)
- **Availability:** High (decentralized)
- **Latency:** High (seconds to minutes)

**Best For:** Long-term archival (backup, rarely accessed)

---

### 9. Decentralization Comparison

#### Storacha Decentralization

**Level: Medium**
- ✅ Data stored on IPFS (decentralized)
- ✅ Backed up on Filecoin (decentralized)
- ⚠️ Service layer adds centralization point
- ⚠️ Authentication through Storacha service

**Trade-off:** Convenience vs. pure decentralization

#### Direct Filecoin Decentralization

**Level: High**
- ✅ Direct interaction with Filecoin network
- ✅ No service layer
- ✅ Users control FIL tokens
- ✅ Direct deal-making with miners

**Trade-off:** Complexity vs. decentralization

---

### 10. Risk Analysis

#### Storacha Risks

**Technical Risks:**
- ⚠️ Service dependency (if Storacha goes down)
- ⚠️ Pricing changes (unclear pricing model)
- ⚠️ Relatively new service (less proven)
- ✅ Data still on IPFS/Filecoin (can migrate)

**Mitigation:**
- Data is IPFS-native (can access via other gateways)
- Filecoin backup ensures persistence
- Can migrate to direct Filecoin if needed

#### Direct Filecoin Risks

**Technical Risks:**
- ⚠️ Complex implementation (more bugs)
- ⚠️ Deal failures (miners go offline)
- ⚠️ FIL token volatility (cost uncertainty)
- ⚠️ Retrieval failures (data unavailable)
- ⚠️ User experience issues (complexity)

**Mitigation:**
- Use multiple miners (redundancy)
- Monitor deal status
- Handle failures gracefully
- Provide user education

---

### 11. Hybrid Approach: Storacha + Direct Filecoin Backup

**Best of Both Worlds:**

```typescript
// Primary: Storacha (hot storage)
const storachaResult = await uploadToStoracha(profileData)

// Backup: Direct Filecoin (archival)
if (storachaResult.success) {
  // Store CID on Filecoin for long-term backup
  await storeOnFilecoin(storachaResult.cid)
}
```

**Benefits:**
- ✅ Fast access via Storacha
- ✅ Long-term backup on Filecoin
- ✅ Redundancy
- ✅ Can migrate if Storacha fails

**Complexity:** Medium (two integrations)

---

### 12. Recommendations

#### For Your DAO Profile DApp

**Primary Recommendation: Storacha**

**Reasons:**
1. **Hot Storage**: Profile data is frequently accessed (needs fast retrieval)
2. **User Experience**: Simple wallet-based auth (fits your stack)
3. **Client-Side**: Perfect for browser-only DApp
4. **Development Speed**: Faster to implement
5. **Filecoin Backup**: Automatic long-term persistence

**When to Consider Direct Filecoin:**
- If Storacha pricing is prohibitive
- If you need maximum decentralization
- If data is rarely accessed (archival use case)
- If you have resources for complex implementation

#### Implementation Strategy

**Phase 1: Start with Storacha**
- Implement Storacha for primary storage
- Evaluate pricing and performance
- Test user experience

**Phase 2: Add Direct Filecoin (Optional)**
- If needed, add Filecoin backup layer
- Use Web3.Storage for simplicity
- Or Filsnap for direct integration

**Phase 3: Monitor and Optimize**
- Compare costs
- Monitor performance
- Adjust based on usage

---

### 13. Conclusion

**For a client-side DAO profile DApp:**

| Aspect | Winner | Reason |
|--------|--------|--------|
| **Hot Storage** | Storacha | Optimized for frequent access |
| **User Experience** | Storacha | Much simpler |
| **Development Speed** | Storacha | Faster to implement |
| **Client-Side Fit** | Storacha | Better abstraction |
| **Cost (Unknown)** | TBD | Need to verify Storacha pricing |
| **Decentralization** | Direct Filecoin | More decentralized |
| **Complexity** | Storacha | Much simpler |

**Final Verdict:**

**Use Storacha** for your primary storage needs because:
- ✅ Optimized for hot storage (fits profile data access pattern)
- ✅ Simple client-side integration
- ✅ Better user experience
- ✅ Automatic Filecoin backup (best of both worlds)
- ✅ Faster development

**Consider Direct Filecoin SDK (Synapse)** if:
- Storacha pricing is too high
- You need maximum decentralization
- You want true direct integration (no service layer)
- You're building archival/backup features
- You have resources for medium-complexity implementation
- Users can handle FIL token management

**Consider Direct Filecoin (Filsnap)** only if:
- You need absolute maximum control
- You're building archival/backup features
- You have significant resources for complex implementation
- You can handle very complex user experience

**Recommended Approach:**
1. Start with Storacha (primary storage)
2. Monitor costs and performance
3. Add direct Filecoin backup if needed (hybrid approach)
4. Migrate to direct Filecoin only if Storacha doesn't meet needs

---

**Document Version:** 1.1  
**Last Updated:** December 5, 2024  
**Research Method:** Web search + official documentation review + feasibility analysis

