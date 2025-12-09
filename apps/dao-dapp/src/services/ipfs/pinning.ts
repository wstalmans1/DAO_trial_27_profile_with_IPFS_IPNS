/**
 * IPFS Pinning Service
 * Supports pinning to Pinata and local Kubo node
 *
 * IMPORTANT: Uses Pinata SDK v2.5.1 with the NEW API endpoints:
 * - pinata.upload.public.cid() for pinning (NOT legacy /pinning/pinByHash)
 * - pinata.files.public.list().cid() for status checks (NOT legacy /data/pinList)
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function hasPinnedCid(response: any, cid: string) {
  const files = response?.files || response?.items || []
  return Array.isArray(files) && files.some((file) => file?.cid === cid)
}

async function waitForPinataPin(pinata: PinataSDK, cid: string, attempts = 5, delayMs = 1000) {
  for (let i = 0; i < attempts; i++) {
    try {
      const files = await pinata.files.public.list().cid(cid)
      if (hasPinnedCid(files, cid)) {
        return true
      }
    } catch (error) {
      console.warn('Pinata status check failed:', error)
    }
    await sleep(delayMs)
  }
  return false
}

/**
 * Get or create Pinata SDK instance
 * Uses the NEW Pinata SDK v2.5.1 with proper V3 API endpoints
 */
function getPinataSDK(): PinataSDK | null {
  const pinataJwt = import.meta.env.VITE_PINATA_JWT

  if (!pinataJwt) {
    return null
  }

  if (!pinataInstance) {
    pinataInstance = new PinataSDK({
      pinataJwt,
    })
  }

  return pinataInstance
}

/**
 * Pin CID to Pinata using the NEW SDK method
 * Uses pinata.upload.public.cid() - the correct modern SDK method for pinning existing CIDs
 * This replaces the deprecated /pinning/pinByHash endpoint
 * Documentation: https://docs.pinata.cloud/sdk/upload/public#cid
 */
export async function pinToPinata(
  cid: string,
  content?: Uint8Array | string,
): Promise<PinningResult> {
  try {
    const pinata = getPinataSDK()

    if (!pinata) {
      return {
        success: false,
        provider: 'pinata',
        error: 'Pinata JWT not configured. Set VITE_PINATA_JWT in .env.local',
      }
    }

    // ✅ Use NEW SDK method: pinata.upload.public.cid()
    // This is the correct, documented way to pin existing CIDs
    await pinata.upload.public.cid(cid)

    const confirmed = await waitForPinataPin(pinata, cid)
    if (confirmed) {
      return {
        success: true,
        provider: 'pinata',
      }
    }

    if (content !== undefined) {
      const dataBytes = typeof content === 'string' ? new TextEncoder().encode(content) : content
      const file = new File([dataBytes], `${cid}.bin`, { type: 'application/octet-stream' })
      const uploadResult = await pinata.upload.public.file(file, {
        metadata: { name: cid },
      })

      if (uploadResult.cid !== cid) {
        return {
          success: false,
          provider: 'pinata',
          error: `Pinata returned different CID (${uploadResult.cid}) while uploading content`,
        }
      }

      const uploadedConfirmed = await waitForPinataPin(pinata, cid, 6, 1200)
      if (uploadedConfirmed) {
        return {
          success: true,
          provider: 'pinata',
        }
      }
    }

    return {
      success: false,
      provider: 'pinata',
      error: 'Pinata did not confirm the pin. Content may be unreachable from the network.',
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
export async function pinToAllServices(
  helia: Helia,
  cid: string,
  content?: Uint8Array | string,
): Promise<PinningResult[]> {
  const results: PinningResult[] = []

  // Pin to Pinata (if configured)
  const pinataResult = await pinToPinata(cid, content)
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
  // ✅ Use NEW SDK method: pinata.files.public.list().cid()
  // This replaces the deprecated /data/pinList endpoint
  try {
    const pinata = getPinataSDK()
    if (pinata) {
      // Use NEW SDK method to check if CID is pinned
      const files = await pinata.files.public.list().cid(cid)
      status.pinata = hasPinnedCid(files, cid)
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

/**
 * Unpin CID from Pinata
 * Uses the NEW SDK method to remove a pin
 */
export async function unpinFromPinata(cid: string): Promise<PinningResult> {
  try {
    const pinata = getPinataSDK()

    if (!pinata) {
      return {
        success: false,
        provider: 'pinata',
        error: 'Pinata JWT not configured. Set VITE_PINATA_JWT in .env.local',
      }
    }

    // Use REST API for unpinning (SDK may not have delete method)
    const pinataJwt = import.meta.env.VITE_PINATA_JWT
    const response = await fetch(`https://api.pinata.cloud/pinning/unpin/${cid}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${pinataJwt}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(
        errorData.error?.message ||
          errorData.message ||
          `HTTP ${response.status}: ${response.statusText}`,
      )
    }

    return {
      success: true,
      provider: 'pinata',
    }
  } catch (error) {
    console.error('Error unpinning from Pinata:', error)
    return {
      success: false,
      provider: 'pinata',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * List all pins from Pinata (including pending)
 * Returns an array of pin objects with their status
 */
export interface PinataPin {
  cid: string
  name?: string
  status?: string
  createdAt?: string
  size?: number
}

export async function listPinataPins(status?: 'pinned' | 'pending' | 'searching'): Promise<{
  success: boolean
  pins: PinataPin[]
  error?: string
}> {
  try {
    const pinata = getPinataSDK()

    if (!pinata) {
      return {
        success: false,
        pins: [],
        error: 'Pinata JWT not configured. Set VITE_PINATA_JWT in .env.local',
      }
    }

    // Use REST API to list pins (SDK list method may not support status filtering)
    const pinataJwt = import.meta.env.VITE_PINATA_JWT

    // Fetch ALL pins with multiple status filters to ensure we get everything
    // Pinata API supports status parameter: pinned, searching, queued, failed, etc.
    let allPins: any[] = []

    // First, fetch all pins without status filter
    const response = await fetch(`https://api.pinata.cloud/data/pinList?pageLimit=1000`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${pinataJwt}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch pins: ${response.status}`)
    }

    const result = await response.json()
    allPins = result.rows || []
    console.log(`Fetched ${allPins.length} pins from Pinata (no filter)`)

    // Also fetch pins with "searching" status specifically
    try {
      const searchingResponse = await fetch(
        `https://api.pinata.cloud/data/pinList?pageLimit=1000&status=searching`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${pinataJwt}`,
          },
        },
      )

      if (searchingResponse.ok) {
        const searchingResult = await searchingResponse.json()
        const searchingPins = searchingResult.rows || []
        console.log(`Fetched ${searchingPins.length} pins with "searching" status`)

        // Merge and deduplicate by CID
        const existingCids = new Set(allPins.map((p: any) => p.ipfs_pin_hash))
        searchingPins.forEach((pin: any) => {
          if (!existingCids.has(pin.ipfs_pin_hash)) {
            allPins.push(pin)
            existingCids.add(pin.ipfs_pin_hash)
          }
        })
        console.log(`Total unique pins after merging searching: ${allPins.length}`)
      }
    } catch (err) {
      console.warn('Failed to fetch searching pins separately:', err)
    }

    // Also try fetching with status=pending
    try {
      const pendingResponse = await fetch(
        `https://api.pinata.cloud/data/pinList?pageLimit=1000&status=pending`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${pinataJwt}`,
          },
        },
      )

      if (pendingResponse.ok) {
        const pendingResult = await pendingResponse.json()
        const pendingPins = pendingResult.rows || []
        console.log(`Fetched ${pendingPins.length} pins with "pending" status`)

        // Merge and deduplicate by CID
        const existingCids = new Set(allPins.map((p: any) => p.ipfs_pin_hash))
        pendingPins.forEach((pin: any) => {
          if (!existingCids.has(pin.ipfs_pin_hash)) {
            allPins.push(pin)
            existingCids.add(pin.ipfs_pin_hash)
          }
        })
        console.log(`Total unique pins after merging pending: ${allPins.length}`)
      }
    } catch (err) {
      console.warn('Failed to fetch pending pins separately:', err)
    }

    console.log('Sample pin objects from Pinata:', allPins.slice(0, 3))

    let pins: PinataPin[] = allPins.map((pin: any) => {
      // Pinata API returns status in various formats - check multiple possible fields
      let pinStatus = 'unknown'
      if (pin.status) {
        pinStatus = pin.status.toLowerCase()
      } else if (pin.pin_status) {
        pinStatus = pin.pin_status.toLowerCase()
      } else if (pin.state) {
        pinStatus = pin.state.toLowerCase()
      }

      return {
        cid: pin.ipfs_pin_hash || pin.hash || pin.cid || '',
        name: pin.metadata?.name || pin.name,
        status: pinStatus,
        createdAt: pin.date_pinned || pin.created_at || pin.dateCreated,
        size: pin.size || pin.pin_size,
      }
    })

    console.log(`Fetched ${pins.length} pins from Pinata API`)
    console.log('Sample pins:', pins.slice(0, 3))

    // Filter by status if requested
    // Pinata statuses: 'pinned', 'pending', 'searching', 'unpinned', etc.
    if (status) {
      const statusLower = status.toLowerCase()
      // Include both 'pending' and 'searching' when filtering for pending
      if (statusLower === 'pending') {
        const beforeFilter = pins.length
        pins = pins.filter((pin) => pin.status === 'pending' || pin.status === 'searching')
        console.log(`Filtered from ${beforeFilter} to ${pins.length} pins (pending/searching)`)
      } else {
        const beforeFilter = pins.length
        pins = pins.filter((pin) => pin.status === statusLower)
        console.log(`Filtered from ${beforeFilter} to ${pins.length} pins (status: ${statusLower})`)
      }
    }

    return {
      success: true,
      pins,
    }
  } catch (error) {
    console.error('Error listing Pinata pins:', error)
    return {
      success: false,
      pins: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Unpin all pending/searching pins from Pinata
 * Useful for cleaning up stuck/pending pins
 * IMPORTANT: Only unpins pins with status 'pending' or 'searching', NOT successfully pinned content
 */
export async function unpinAllPendingFromPinata(): Promise<{
  success: boolean
  unpinned: number
  errors: string[]
}> {
  const result = {
    success: true,
    unpinned: 0,
    errors: [] as string[],
  }

  try {
    // Get all pins first
    const allPinsResult = await listPinataPins()

    if (!allPinsResult.success) {
      return {
        success: false,
        unpinned: 0,
        errors: [allPinsResult.error || 'Failed to fetch pins'],
      }
    }

    // Filter to ONLY pending and searching pins (NOT pinned ones!)
    const pendingPins = allPinsResult.pins.filter(
      (pin) => pin.status === 'pending' || pin.status === 'searching',
    )

    if (pendingPins.length === 0) {
      return {
        ...result,
        success: true,
      }
    }

    console.log(
      `Found ${pendingPins.length} pending/searching pins to unpin (out of ${allPinsResult.pins.length} total pins)`,
    )

    // Unpin each pending/searching pin
    for (const pin of pendingPins) {
      // Double-check status before unpinning
      if (pin.status !== 'pending' && pin.status !== 'searching') {
        console.warn(`Skipping pin ${pin.cid} with status '${pin.status}' - not pending/searching`)
        continue
      }

      const unpinResult = await unpinFromPinata(pin.cid)
      if (unpinResult.success) {
        result.unpinned++
      } else {
        result.errors.push(`${pin.cid}: ${unpinResult.error || 'Unknown error'}`)
      }
    }

    return result
  } catch (error) {
    return {
      success: false,
      unpinned: result.unpinned,
      errors: [...result.errors, error instanceof Error ? error.message : 'Unknown error'],
    }
  }
}
