import { createHelia } from 'helia'
import { unixfs } from '@helia/unixfs'
import type { Helia } from 'helia'
import { CID } from 'multiformats/cid'
import { pinToAllServices, type PinningResult } from './ipfs/pinning'

// Singleton Helia instance
let heliaInstance: Helia | null = null
let unixfsInstance: ReturnType<typeof unixfs> | null = null

/**
 * Initialize Helia IPFS node (singleton pattern)
 * @returns Helia instance
 */
export async function getHelia(): Promise<Helia> {
  if (heliaInstance) {
    return heliaInstance
  }

  try {
    heliaInstance = await createHelia()
    // @ts-expect-error - version mismatch between helia and unixfs types, but works at runtime
    unixfsInstance = unixfs(heliaInstance)
    return heliaInstance
  } catch (error) {
    console.error('Error initializing Helia:', error)
    throw new Error('Failed to initialize IPFS node')
  }
}

/**
 * Get UnixFS instance
 * @returns UnixFS instance
 */
async function getUnixFS() {
  if (!unixfsInstance) {
    await getHelia()
  }
  if (!unixfsInstance) {
    throw new Error('UnixFS not initialized')
  }
  return unixfsInstance
}

/**
 * Upload data to IPFS
 * @param data - String data to upload
 * @param autoPin - Automatically pin to configured pinning services (default: true)
 * @returns CID (Content Identifier)
 */
export async function uploadToIPFS(data: string, autoPin: boolean = true): Promise<string> {
  try {
    const fs = await getUnixFS()
    const encoder = new TextEncoder()
    const dataBytes = encoder.encode(data)

    const cid = await fs.addBytes(dataBytes)
    const cidString = cid.toString()

    // Automatically pin to all configured services
    if (autoPin && heliaInstance) {
      try {
        const pinResults = await pinToAllServices(heliaInstance, cidString)
        const successfulPins = pinResults.filter((r) => r.success)
        const failedPins = pinResults.filter((r) => !r.success)

        if (successfulPins.length > 0) {
          console.log(
            `✓ Pinned ${cidString} to: ${successfulPins.map((r) => r.provider).join(', ')}`,
          )
        }

        if (failedPins.length > 0) {
          console.warn(
            `⚠ Failed to pin ${cidString} to: ${failedPins
              .map((r) => `${r.provider} (${r.error})`)
              .join(', ')}`,
          )
        }
      } catch (pinError) {
        // Don't fail the upload if pinning fails
        console.warn('Warning: Auto-pinning failed:', pinError)
      }
    }

    return cidString
  } catch (error) {
    console.error('Error uploading to IPFS:', error)
    throw new Error('Failed to upload to IPFS')
  }
}

/**
 * Retrieve data from IPFS
 * @param cid - Content Identifier (can be CID string or CID object)
 * @returns The data as a string
 */
export async function getFromIPFS(cid: string): Promise<string> {
  try {
    const fs = await getUnixFS()
    const decoder = new TextDecoder()
    const chunks: Uint8Array[] = []

    // Convert string CID to CID object if needed
    const cidObj = typeof cid === 'string' ? CID.parse(cid) : cid

    for await (const chunk of fs.cat(cidObj)) {
      chunks.push(chunk)
    }

    // Combine chunks and convert to string
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    const result = new Uint8Array(totalLength)
    let offset = 0

    for (const chunk of chunks) {
      result.set(chunk, offset)
      offset += chunk.length
    }

    return decoder.decode(result)
  } catch (error) {
    console.error('Error retrieving from IPFS:', error)
    throw new Error(`Failed to retrieve data from IPFS: ${cid}`)
  }
}

/**
 * Upload JSON object to IPFS
 * @param data - Object to upload
 * @param autoPin - Automatically pin to configured pinning services (default: true)
 * @returns CID
 */
export async function uploadJSONToIPFS(data: object, autoPin: boolean = true): Promise<string> {
  const jsonString = JSON.stringify(data, null, 2)
  return uploadToIPFS(jsonString, autoPin)
}

/**
 * Retrieve and parse JSON from IPFS
 * @param cid - Content Identifier
 * @returns Parsed JSON object
 */
export async function getJSONFromIPFS<T = any>(cid: string): Promise<T> {
  const data = await getFromIPFS(cid)
  return JSON.parse(data) as T
}

/**
 * Stop Helia node (cleanup)
 * Call this when your app unmounts or when you're done with IPFS
 */
export async function stopHelia(): Promise<void> {
  if (heliaInstance) {
    await heliaInstance.stop()
    heliaInstance = null
    unixfsInstance = null
  }
}

/**
 * Manually pin a CID to all configured pinning services
 * @param cid - CID to pin
 * @returns Array of pinning results
 */
export async function pinCID(cid: string): Promise<PinningResult[]> {
  if (!heliaInstance) {
    await getHelia()
  }
  if (!heliaInstance) {
    throw new Error('Helia instance not available')
  }
  return pinToAllServices(heliaInstance, cid)
}
