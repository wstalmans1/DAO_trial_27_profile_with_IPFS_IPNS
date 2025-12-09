/**
 * Comprehensive IndexedDB Viewer
 * Shows all databases, object stores, and data stored in IndexedDB
 */

export interface IndexedDBDatabase {
  name: string
  version: number
  objectStores: IndexedDBObjectStore[]
}

export interface IndexedDBObjectStore {
  name: string
  keyPath: string | null
  autoIncrement: boolean
  indexes: string[]
  data: any[]
  count: number
}

export interface IndexedDBView {
  databases: IndexedDBDatabase[]
  totalDatabases: number
  totalObjectStores: number
  totalRecords: number
  allCIDs: string[]
}

/**
 * Get all IndexedDB database names
 */
async function getAllDatabaseNames(): Promise<string[]> {
  // IndexedDB doesn't have a direct API to list all databases
  // We need to try common database names used by Helia/IPFS
  const commonNames = [
    'helia',
    'ipfs',
    'helia-blockstore',
    'helia-datastore',
    'helia-blockstore-v1',
    'helia-datastore-v1',
    'ipfs-blockstore',
    'ipfs-datastore',
  ]

  const foundDatabases: string[] = []

  // Try to open each database
  for (const dbName of commonNames) {
    try {
      const db = await openDatabase(dbName)
      if (db) {
        foundDatabases.push(dbName)
        db.close()
      }
    } catch {
      // Database doesn't exist, continue
    }
  }

  // Also try to get databases from the browser's internal list if possible
  // Note: This is browser-specific and may not work in all browsers
  try {
    if (
      typeof indexedDB !== 'undefined' &&
      'databases' in indexedDB &&
      typeof indexedDB.databases === 'function'
    ) {
      const databases = await indexedDB.databases()
      databases.forEach((db: IDBDatabaseInfo) => {
        if (db.name && !foundDatabases.includes(db.name)) {
          foundDatabases.push(db.name)
        }
      })
    }
  } catch {
    // Feature not available
  }

  return foundDatabases
}

/**
 * Open an IndexedDB database
 */
function openDatabase(dbName: string): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    const request = indexedDB.open(dbName)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
    request.onblocked = () => resolve(null)
    request.onupgradeneeded = () => {
      // Database exists but needs upgrade - we'll just read what we can
      resolve(request.result)
    }
  })
}

/**
 * Get all data from an object store
 */
async function getAllDataFromStore(
  db: IDBDatabase,
  storeName: string,
): Promise<{ data: any[]; count: number }> {
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)

      const request = store.getAll()
      request.onsuccess = () => {
        resolve({
          data: request.result || [],
          count: request.result?.length || 0,
        })
      }
      request.onerror = () => reject(request.error)
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Get object store metadata
 */
function getObjectStoreInfo(
  db: IDBDatabase,
  storeName: string,
): {
  name: string
  keyPath: string | null
  autoIncrement: boolean
  indexes: string[]
} {
  const transaction = db.transaction(storeName, 'readonly')
  const store = transaction.objectStore(storeName)

  const indexes: string[] = []
  if (store.indexNames) {
    for (let i = 0; i < store.indexNames.length; i++) {
      indexes.push(store.indexNames[i])
    }
  }

  return {
    name: storeName,
    keyPath: store.keyPath as string | null,
    autoIncrement: store.autoIncrement,
    indexes,
  }
}

/**
 * Extract CIDs from any data structure
 */
function extractCIDs(data: any): string[] {
  const cids: string[] = []
  const seen = new Set<string>()

  function traverse(obj: any) {
    if (obj === null || obj === undefined) return

    if (typeof obj === 'string') {
      // Match CID patterns: baf... (56+ chars) or Qm... (44 chars)
      const matches = obj.match(/\b(baf[a-z0-9]{56,}|Qm[a-zA-Z0-9]{44})\b/g)
      if (matches) {
        matches.forEach((cid) => {
          if (!seen.has(cid)) {
            cids.push(cid)
            seen.add(cid)
          }
        })
      }
    } else if (Array.isArray(obj)) {
      obj.forEach((item) => traverse(item))
    } else if (typeof obj === 'object') {
      Object.values(obj).forEach((value) => traverse(value))
      // Also check keys
      Object.keys(obj).forEach((key) => traverse(key))
    }
  }

  traverse(data)
  return cids
}

/**
 * Get comprehensive view of all IndexedDB data
 */
export async function getFullIndexedDBView(): Promise<IndexedDBView> {
  const databases: IndexedDBDatabase[] = []
  let totalObjectStores = 0
  let totalRecords = 0
  const allCIDs: string[] = []
  const seenCIDs = new Set<string>()

  try {
    // Get all database names
    const dbNames = await getAllDatabaseNames()
    console.log(`Found ${dbNames.length} IndexedDB databases:`, dbNames)

    for (const dbName of dbNames) {
      try {
        const db = await openDatabase(dbName)
        if (!db) continue

        const objectStoreNames = Array.from(db.objectStoreNames)
        const objectStores: IndexedDBObjectStore[] = []

        for (const storeName of objectStoreNames) {
          try {
            const storeInfo = getObjectStoreInfo(db, storeName)
            const { data, count } = await getAllDataFromStore(db, storeName)

            // Extract CIDs from this store's data
            const storeCIDs = extractCIDs(data)
            storeCIDs.forEach((cid) => {
              if (!seenCIDs.has(cid)) {
                allCIDs.push(cid)
                seenCIDs.add(cid)
              }
            })

            objectStores.push({
              ...storeInfo,
              data: data.slice(0, 100), // Limit to first 100 records for performance
              count,
            })

            totalObjectStores++
            totalRecords += count
          } catch (err) {
            console.warn(`Error reading store ${storeName} in ${dbName}:`, err)
            // Still add the store with empty data
            objectStores.push({
              name: storeName,
              keyPath: null,
              autoIncrement: false,
              indexes: [],
              data: [],
              count: 0,
            })
          }
        }

        databases.push({
          name: dbName,
          version: db.version,
          objectStores,
        })

        db.close()
      } catch (err) {
        console.warn(`Error reading database ${dbName}:`, err)
      }
    }
  } catch (error) {
    console.error('Error getting IndexedDB view:', error)
  }

  return {
    databases,
    totalDatabases: databases.length,
    totalObjectStores,
    totalRecords,
    allCIDs: allCIDs.sort(),
  }
}

/**
 * Search for specific CIDs in IndexedDB
 */
export async function searchCIDsInIndexedDB(
  cids: string[],
): Promise<Map<string, { found: boolean; locations: string[] }>> {
  const results = new Map<string, { found: boolean; locations: string[] }>()

  // Initialize all CIDs as not found
  cids.forEach((cid) => {
    results.set(cid, { found: false, locations: [] })
  })

  try {
    const dbNames = await getAllDatabaseNames()

    for (const dbName of dbNames) {
      try {
        const db = await openDatabase(dbName)
        if (!db) continue

        const objectStoreNames = Array.from(db.objectStoreNames)

        for (const storeName of objectStoreNames) {
          try {
            const { data } = await getAllDataFromStore(db, storeName)
            const dataStr = JSON.stringify(data)

            cids.forEach((cid) => {
              if (dataStr.includes(cid)) {
                const result = results.get(cid)!
                result.found = true
                result.locations.push(`${dbName}/${storeName}`)
                results.set(cid, result)
              }
            })
          } catch (err) {
            console.warn(`Error searching in ${dbName}/${storeName}:`, err)
          }
        }

        db.close()
      } catch (err) {
        console.warn(`Error searching database ${dbName}:`, err)
      }
    }
  } catch (error) {
    console.error('Error searching IndexedDB:', error)
  }

  return results
}
