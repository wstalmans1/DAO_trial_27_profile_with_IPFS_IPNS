import { createHelia } from 'helia'
import { unixfs } from '@helia/unixfs'
import type { Helia } from 'helia'
import { CID } from 'multiformats/cid'

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
 * @param autoPin - Automatically pin to configured services after upload (default: false)
 * @returns CID (Content Identifier)
 */
export async function uploadToIPFS(data: string, autoPin = false): Promise<string> {
  try {
    const fs = await getUnixFS()
    const encoder = new TextEncoder()
    const dataBytes = encoder.encode(data)

    const cid = await fs.addBytes(dataBytes)
    const cidString = cid.toString()

    // Automatically pin to all configured services if requested (non-blocking)
    if (autoPin && heliaInstance) {
      void (async () => {
        try {
          const { pinToAllServices } = await import('./ipfs/pinning')
          const pinResults = await pinToAllServices(heliaInstance, cidString, dataBytes)
          const successful = pinResults.filter((r) => r.success)
          const failed = pinResults.filter((r) => !r.success)

          if (successful.length > 0) {
            console.log(`Auto-pinned to: ${successful.map((r) => r.provider).join(', ')}`)
          }
          if (failed.length > 0) {
            console.warn(
              `Auto-pin failed for: ${failed.map((r) => `${r.provider} (${r.error})`).join(', ')}`,
            )
          }
        } catch (pinError) {
          console.warn('Warning: Auto-pinning failed:', pinError)
        }
      })()
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
 * @returns CID
 */
export async function uploadJSONToIPFS(data: object): Promise<string> {
  const jsonString = JSON.stringify(data, null, 2)
  return uploadToIPFS(jsonString)
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

// Re-export pinning functions for convenience
export {
  pinToPinata,
  pinToLocalNode,
  pinToHeliaLocal,
  pinToAllServices,
  checkPinningStatus,
  unpinFromPinata,
  listPinataPins,
  unpinAllPendingFromPinata,
} from './ipfs/pinning'
export type { PinningResult, PinningStatus, PinataPin } from './ipfs/pinning'
