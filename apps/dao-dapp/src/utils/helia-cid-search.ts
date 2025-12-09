/**
 * Comprehensive CID Search in Helia Framework
 * Searches for CIDs in all Helia storage locations
 */

import type { Helia } from 'helia'
import { CID } from 'multiformats/cid'

export interface CIDSearchResult {
  cid: string
  found: boolean
  locations: CIDLocation[]
}

export interface CIDLocation {
  type: 'pin-store' | 'blockstore' | 'datastore' | 'indexeddb' | 'memory' | 'unknown'
  database?: string
  store?: string
  details?: string
}

/**
 * Search for CIDs in Helia's pin store
 */
async function searchInPinStore(helia: Helia, cids: string[]): Promise<Map<string, CIDLocation[]>> {
  const results = new Map<string, CIDLocation[]>()

  for (const cidStr of cids) {
    const locations: CIDLocation[] = []
    try {
      const cid = CID.parse(cidStr)
      const isPinned = await helia.pins.isPinned(cid)

      if (isPinned) {
        locations.push({
          type: 'pin-store',
          details: 'Found in Helia pin store',
        })

        // Try to get pin details
        try {
          // Check if pins.ls() exists and iterate through pins
          if ('ls' in helia.pins && typeof helia.pins.ls === 'function') {
            const pins = helia.pins.ls()
            for await (const pin of pins) {
              if (pin.toString() === cidStr) {
                locations.push({
                  type: 'pin-store',
                  details: 'Pinned in Helia',
                })
              }
            }
          }
        } catch {
          // Method not available
        }
      }
    } catch {
      // CID parsing failed or not found
    }

    results.set(cidStr, locations)
  }

  return results
}

/**
 * Search for CIDs in Helia's blockstore
 */
async function searchInBlockstore(
  helia: Helia,
  cids: string[],
): Promise<Map<string, CIDLocation[]>> {
  const results = new Map<string, CIDLocation[]>()

  for (const cidStr of cids) {
    const locations: CIDLocation[] = []
    try {
      const cid = CID.parse(cidStr)

      // Try to get the block
      try {
        const block = await helia.blockstore.get(cid)
        if (block) {
          locations.push({
            type: 'blockstore',
            details: `Block found, size: ${block.length} bytes`,
          })
        }
      } catch {
        // Block not found
      }
    } catch {
      // CID parsing failed
    }

    results.set(cidStr, locations)
  }

  return results
}

/**
 * Search IndexedDB for CIDs with detailed location info
 */
async function searchIndexedDBDetailed(cids: string[]): Promise<Map<string, CIDLocation[]>> {
  const results = new Map<string, CIDLocation[]>()

  // Initialize all CIDs
  cids.forEach((cid) => {
    results.set(cid, [])
  })

  try {
    // Common Helia database names
    const dbNames = [
      'helia',
      'ipfs',
      'helia-blockstore',
      'helia-datastore',
      'helia-blockstore-v1',
      'helia-datastore-v1',
      'ipfs-blockstore',
      'ipfs-datastore',
      'blockstore',
      'datastore',
    ]

    // Also try to get all databases
    try {
      if (
        typeof indexedDB !== 'undefined' &&
        'databases' in indexedDB &&
        typeof indexedDB.databases === 'function'
      ) {
        const allDatabases = await indexedDB.databases()
        allDatabases.forEach((dbInfo) => {
          if (dbInfo.name && !dbNames.includes(dbInfo.name)) {
            dbNames.push(dbInfo.name)
          }
        })
      }
    } catch {
      // Feature not available
    }

    for (const dbName of dbNames) {
      try {
        const db = await openDatabase(dbName)
        if (!db) continue

        const objectStoreNames = Array.from(db.objectStoreNames)

        for (const storeName of objectStoreNames) {
          try {
            const transaction = db.transaction(storeName, 'readonly')
            const store = transaction.objectStore(storeName)

            // Get all keys
            const keysRequest = store.getAllKeys()
            const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
              keysRequest.onsuccess = () => resolve(keysRequest.result || [])
              keysRequest.onerror = () => reject(keysRequest.error)
            })

            // Get all values
            const valuesRequest = store.getAll()
            const values = await new Promise<any[]>((resolve, reject) => {
              valuesRequest.onsuccess = () => resolve(valuesRequest.result || [])
              valuesRequest.onerror = () => reject(valuesRequest.error)
            })

            // Check keys for CIDs
            keys.forEach((key) => {
              const keyStr = String(key)
              cids.forEach((cid) => {
                if (keyStr.includes(cid) || cid.includes(keyStr)) {
                  const locations = results.get(cid) || []
                  locations.push({
                    type: 'indexeddb',
                    database: dbName,
                    store: storeName,
                    details: `Found in key: ${keyStr.substring(0, 50)}...`,
                  })
                  results.set(cid, locations)
                }
              })
            })

            // Check values for CIDs
            values.forEach((value, index) => {
              const valueStr = JSON.stringify(value)
              cids.forEach((cid) => {
                if (valueStr.includes(cid)) {
                  const locations = results.get(cid) || []
                  const key = keys[index]
                  locations.push({
                    type: 'indexeddb',
                    database: dbName,
                    store: storeName,
                    details: `Found in value at key: ${key ? String(key).substring(0, 50) : 'unknown'}`,
                  })
                  results.set(cid, locations)
                }
              })
            })
          } catch (error) {
            console.warn(`Error searching ${dbName}/${storeName}:`, error)
          }
        }

        db.close()
      } catch {
        // Database doesn't exist or can't be opened
      }
    }
  } catch (error) {
    console.error('Error searching IndexedDB:', error)
  }

  return results
}

/**
 * Open IndexedDB database
 */
function openDatabase(dbName: string): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    const request = indexedDB.open(dbName)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
    request.onblocked = () => resolve(null)
    request.onupgradeneeded = () => resolve(request.result)
  })
}

/**
 * Comprehensive search for CIDs in all Helia storage locations
 */
export async function searchCIDsInHelia(helia: Helia, cids: string[]): Promise<CIDSearchResult[]> {
  const results: CIDSearchResult[] = []

  console.log(`Searching for ${cids.length} CIDs in Helia framework...`)

  // Search in pin store
  console.log('1. Searching in Helia pin store...')
  const pinStoreResults = await searchInPinStore(helia, cids)
  console.log(
    `   Found ${Array.from(pinStoreResults.values()).filter((locs) => locs.length > 0).length} CIDs in pin store`,
  )

  // Search in blockstore
  console.log('2. Searching in Helia blockstore...')
  const blockstoreResults = await searchInBlockstore(helia, cids)
  console.log(
    `   Found ${Array.from(blockstoreResults.values()).filter((locs) => locs.length > 0).length} CIDs in blockstore`,
  )

  // Search in IndexedDB
  console.log('3. Searching in IndexedDB...')
  const indexedDBResults = await searchIndexedDBDetailed(cids)
  console.log(
    `   Found ${Array.from(indexedDBResults.values()).filter((locs) => locs.length > 0).length} CIDs in IndexedDB`,
  )

  // Combine results
  for (const cid of cids) {
    const locations: CIDLocation[] = []

    // Add pin store locations
    const pinLocs = pinStoreResults.get(cid) || []
    locations.push(...pinLocs)

    // Add blockstore locations
    const blockLocs = blockstoreResults.get(cid) || []
    locations.push(...blockLocs)

    // Add IndexedDB locations
    const dbLocs = indexedDBResults.get(cid) || []
    locations.push(...dbLocs)

    results.push({
      cid,
      found: locations.length > 0,
      locations,
    })
  }

  return results
}

/**
 * Get full details about where a CID might be stuck
 */
export async function diagnoseStuckCID(
  helia: Helia,
  cid: string,
): Promise<{
  cid: string
  isPinned: boolean
  inBlockstore: boolean
  inIndexedDB: boolean
  indexedDBLocations: CIDLocation[]
  heliaInfo: any
}> {
  const result = {
    cid,
    isPinned: false,
    inBlockstore: false,
    inIndexedDB: false,
    indexedDBLocations: [] as CIDLocation[],
    heliaInfo: {} as any,
  }

  try {
    const cidObj = CID.parse(cid)

    // Check pin store
    result.isPinned = await helia.pins.isPinned(cidObj)

    // Check blockstore
    try {
      const block = await helia.blockstore.get(cidObj)
      result.inBlockstore = !!block
    } catch {
      result.inBlockstore = false
    }

    // Check IndexedDB
    const dbResults = await searchIndexedDBDetailed([cid])
    result.indexedDBLocations = dbResults.get(cid) || []
    result.inIndexedDB = result.indexedDBLocations.length > 0

    // Get Helia instance info
    result.heliaInfo = {
      libp2p: helia.libp2p ? 'present' : 'missing',
      blockstore: helia.blockstore ? 'present' : 'missing',
      datastore: helia.datastore ? 'present' : 'missing',
      pins: helia.pins ? 'present' : 'missing',
    }
  } catch (err) {
    console.error(`Error diagnosing CID ${cid}:`, err)
  }

  return result
}
