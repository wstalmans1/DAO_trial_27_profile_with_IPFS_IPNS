/**
 * Utility to check IndexedDB for stored CIDs
 * Helia stores data in IndexedDB, we can check if CIDs are stored locally
 */

/**
 * Check if a CID exists in IndexedDB (Helia's storage)
 * @param cid - CID to check
 * @returns true if CID is found in IndexedDB
 */
export async function checkCIDInIndexedDB(cid: string): Promise<boolean> {
  try {
    // Helia uses IndexedDB with specific database names
    // Common database names: helia, ipfs, helia-blockstore, etc.
    const dbNames = ['helia', 'ipfs', 'helia-blockstore', 'helia-datastore']

    for (const dbName of dbNames) {
      try {
        const db = await openIndexedDB(dbName)
        if (db) {
          // Check all object stores
          const objectStoreNames = Array.from(db.objectStoreNames)
          for (const storeName of objectStoreNames) {
            const transaction = db.transaction(storeName, 'readonly')
            const store = transaction.objectStore(storeName)

            // Try to find the CID in the store
            // CIDs might be stored as keys or values
            const request = store.getAll()
            const results = await new Promise<any[]>((resolve, reject) => {
              request.onsuccess = () => resolve(request.result || [])
              request.onerror = () => reject(request.error)
            })

            // Check if CID appears in any of the results
            const found = results.some((item) => {
              if (typeof item === 'string') {
                return item.includes(cid)
              }
              if (typeof item === 'object' && item !== null) {
                return JSON.stringify(item).includes(cid)
              }
              return false
            })

            if (found) {
              db.close()
              return true
            }
          }
          db.close()
        }
      } catch {
        // Database doesn't exist or can't be opened, continue
      }
    }

    return false
  } catch (error) {
    console.error('Error checking IndexedDB:', error)
    return false
  }
}

/**
 * List all CIDs found in IndexedDB
 * @returns Array of CIDs found
 */
export async function listCIDsInIndexedDB(): Promise<string[]> {
  const cids: string[] = []

  try {
    const dbNames = ['helia', 'ipfs', 'helia-blockstore', 'helia-datastore']

    for (const dbName of dbNames) {
      try {
        const db = await openIndexedDB(dbName)
        if (db) {
          const objectStoreNames = Array.from(db.objectStoreNames)
          for (const storeName of objectStoreNames) {
            const transaction = db.transaction(storeName, 'readonly')
            const store = transaction.objectStore(storeName)

            const request = store.getAll()
            const results = await new Promise<any[]>((resolve, reject) => {
              request.onsuccess = () => resolve(request.result || [])
              request.onerror = () => reject(request.error)
            })

            // Extract CIDs from results (CIDs typically start with 'baf' or 'Qm')
            results.forEach((item) => {
              const itemStr = typeof item === 'string' ? item : JSON.stringify(item)
              // Match CID patterns (baf... or Qm...)
              const cidMatches = itemStr.match(/\b(baf[a-z0-9]{56,}|Qm[a-zA-Z0-9]{44})\b/g)
              if (cidMatches) {
                cids.push(...cidMatches)
              }
            })
          }
          db.close()
        }
      } catch {
        continue
      }
    }
  } catch (error) {
    console.error('Error listing CIDs from IndexedDB:', error)
  }

  // Remove duplicates
  return [...new Set(cids)]
}

/**
 * Helper to open IndexedDB database
 */
function openIndexedDB(dbName: string): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    const request = indexedDB.open(dbName)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
    request.onblocked = () => resolve(null)
  })
}

/**
 * Check multiple CIDs in IndexedDB
 * @param cids - Array of CIDs to check
 * @returns Map of CID to boolean (found or not)
 */
export async function checkMultipleCIDsInIndexedDB(cids: string[]): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>()

  // Get all CIDs from IndexedDB first
  const indexedDBCIDs = await listCIDsInIndexedDB()
  const indexedDBSet = new Set(indexedDBCIDs)

  // Check each requested CID
  for (const cid of cids) {
    // Check if full CID is in IndexedDB, or if any IndexedDB CID contains this CID
    const found =
      indexedDBSet.has(cid) ||
      indexedDBCIDs.some((dbCid) => dbCid.includes(cid) || cid.includes(dbCid))
    results.set(cid, found)
  }

  return results
}
