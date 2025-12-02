/**
 * IPFS Pinning Service
 * Supports automatic pinning to Pinata and local Kubo node
 */

import { PinataSDK } from 'pinata'
import type { Helia } from 'helia'
import { CID } from 'multiformats/cid'

export interface PinningResult {
  success: boolean
  provider: 'pinata' | 'local-node' | 'helia-local'
  error?: string
}

export interface PinningStatus {
  pinata: boolean
  localNode: boolean
  heliaLocal: boolean
}

// Singleton Pinata SDK instance
let pinataInstance: PinataSDK | null = null

/**
 * Get or create Pinata SDK instance
 * Uses SDK for consistent configuration and authentication
 */
function getPinataSDK(): PinataSDK | null {
  const pinataJwt = import.meta.env.VITE_PINATA_JWT
  const pinataGateway = import.meta.env.VITE_PINATA_GATEWAY

  if (!pinataJwt) {
    return null
  }

  if (!pinataInstance) {
    pinataInstance = new PinataSDK({
      pinataJwt,
      pinataGateway: pinataGateway || 'https://gateway.pinata.cloud',
    })
  }

  return pinataInstance
}

/**
 * Pin CID to Pinata using modern SDK method
 * Uses pinata.upload.public.cid() - the correct modern SDK method for pinning existing CIDs
 * Documentation: https://docs.pinata.cloud/sdk/upload/public#cid
 */
export async function pinToPinata(cid: string): Promise<PinningResult> {
  try {
    const pinata = getPinataSDK()
    if (!pinata) {
      return {
        success: false,
        provider: 'pinata',
        error: 'Pinata JWT not configured. Set VITE_PINATA_JWT in .env.local',
      }
    }

    // ✅ Use modern SDK method: pinata.upload.public.cid()
    await pinata.upload.public.cid(cid)

    return {
      success: true,
      provider: 'pinata',
    }
  } catch (error) {
    console.error('Error pinning to Pinata:', error)
    return {
      success: false,
      provider: 'pinata',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Pin CID to local Kubo node via HTTP API
 */
export async function pinToLocalNode(cid: string): Promise<PinningResult> {
  try {
    const localApiUrl = import.meta.env.VITE_LOCAL_IPFS_API || 'http://localhost:5001'

    // Use fetch to call Kubo's pin/add API
    const response = await fetch(`${localApiUrl}/api/v0/pin/add?arg=${cid}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Local node pinning failed: ${response.status} ${errorText}`)
    }

    const result = await response.json()

    // Kubo returns { Pins: [cid] } on success
    if (result.Pins && result.Pins.includes(cid)) {
      return {
        success: true,
        provider: 'local-node',
      }
    }

    throw new Error('Unexpected response from local node')
  } catch (error) {
    // Don't fail if local node is not available (it's optional)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        success: false,
        provider: 'local-node',
        error: 'Local IPFS node not available. Make sure Kubo is running.',
      }
    }

    console.error('Error pinning to local node:', error)
    return {
      success: false,
      provider: 'local-node',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Pin CID to local Helia node
 */
export async function pinToHeliaLocal(helia: Helia, cid: string): Promise<PinningResult> {
  try {
    const cidObj = CID.parse(cid)

    // Pin to local Helia node
    await helia.pins.add(cidObj)

    return {
      success: true,
      provider: 'helia-local',
    }
  } catch (error) {
    console.error('Error pinning to Helia local:', error)
    return {
      success: false,
      provider: 'helia-local',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Pin CID to all configured pinning services
 * @param helia - Helia instance for local pinning
 * @param cid - CID to pin
 * @returns Array of pinning results
 */
export async function pinToAllServices(helia: Helia, cid: string): Promise<PinningResult[]> {
  const results: PinningResult[] = []

  // Pin to Pinata (if configured)
  const pinataResult = await pinToPinata(cid)
  results.push(pinataResult)

  // Pin to local Kubo node (if configured)
  const localNodeResult = await pinToLocalNode(cid)
  results.push(localNodeResult)

  // Pin to local Helia node (always available)
  const heliaLocalResult = await pinToHeliaLocal(helia, cid)
  results.push(heliaLocalResult)

  return results
}

/**
 * Check if CID is pinned on various services
 */
export async function checkPinningStatus(helia: Helia, cid: string): Promise<PinningStatus> {
  const cidObj = CID.parse(cid)
  const status: PinningStatus = {
    pinata: false,
    localNode: false,
    heliaLocal: false,
  }

  // Check Helia local pinning
  try {
    status.heliaLocal = await helia.pins.isPinned(cidObj)
  } catch (error) {
    console.error('Error checking Helia local pin status:', error)
  }

  // Check Pinata (if configured)
  // ✅ Use SDK method: pinata.files.public.list().cid() to check if CID is pinned
  try {
    const pinata = getPinataSDK()
    if (pinata) {
      // Filter files by CID - if found, it's pinned
      const fileList = await pinata.files.public.list().cid(cid)
      status.pinata = fileList.files.length > 0
    }
  } catch (error) {
    console.error('Error checking Pinata pin status:', error)
    status.pinata = false
  }

  // Check local Kubo node (if configured)
  try {
    const localApiUrl = import.meta.env.VITE_LOCAL_IPFS_API || 'http://localhost:5001'
    const response = await fetch(`${localApiUrl}/api/v0/pin/ls?arg=${cid}`, {
      method: 'POST',
    })

    if (response.ok) {
      const result = await response.json()
      status.localNode = result.Keys && result.Keys[cid] !== undefined
    }
  } catch {
    // Local node not available - ignore
  }

  return status
}
