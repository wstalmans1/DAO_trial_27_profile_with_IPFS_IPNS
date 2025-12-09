import { useState, useEffect } from 'react'
import {
  uploadToIPFS,
  getFromIPFS,
  stopHelia,
  pinToPinata,
  checkPinningStatus,
  getHelia,
  unpinFromPinata,
  listPinataPins,
  unpinAllPendingFromPinata,
  type PinataPin,
} from '../services/ipfs'
import { checkMultipleCIDsInIndexedDB, listCIDsInIndexedDB } from '../utils/indexeddb-check'
import {
  getFullIndexedDBView,
  searchCIDsInIndexedDB,
  type IndexedDBView,
} from '../utils/indexeddb-viewer'
import {
  searchCIDsInHelia,
  diagnoseStuckCID,
  type CIDSearchResult,
} from '../utils/helia-cid-search'

export default function IPFSTest() {
  const [cid, setCid] = useState<string>('')
  const [data, setData] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [initializing, setInitializing] = useState(true)
  const [pinningStatus, setPinningStatus] = useState<{
    pinata: boolean
    localNode: boolean
    heliaLocal: boolean
  } | null>(null)
  const [pinningToPinata, setPinningToPinata] = useState(false)
  const [unpinning, setUnpinning] = useState(false)
  const [pendingPins, setPendingPins] = useState<PinataPin[]>([])
  const [loadingPins, setLoadingPins] = useState(false)
  const [indexedDBView, setIndexedDBView] = useState<IndexedDBView | null>(null)
  const [loadingIndexedDB, setLoadingIndexedDB] = useState(false)
  const [cidSearchResults, setCidSearchResults] = useState<CIDSearchResult[]>([])
  const [searchingCIDs, setSearchingCIDs] = useState(false)

  // Initialize Helia on mount
  useEffect(() => {
    const init = async () => {
      try {
        // Helia initializes lazily on first use, but we can trigger it
        await uploadToIPFS('init')
        setInitializing(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize IPFS')
        setInitializing(false)
      }
    }
    init()

    // Cleanup on unmount
    return () => {
      stopHelia().catch(console.error)
    }
  }, [])

  const handleUpload = async () => {
    setLoading(true)
    setError('')
    setSuccess('')
    setPinningStatus(null)
    try {
      const testData = `Test data uploaded at ${new Date().toISOString()}`
      const uploadedCid = await uploadToIPFS(testData, true) // Auto-pin enabled
      setCid(uploadedCid)
      setSuccess(`Uploaded successfully! CID: ${uploadedCid}`)

      // Check pinning status after a short delay
      setTimeout(async () => {
        try {
          const helia = await getHelia()
          const status = await checkPinningStatus(helia, uploadedCid)
          setPinningStatus(status)
        } catch (err) {
          console.warn('Could not check pinning status:', err)
        }
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  const handleRetrieve = async () => {
    if (!cid) {
      setError('Please upload data first')
      return
    }

    setLoading(true)
    setError('')
    try {
      const retrievedData = await getFromIPFS(cid)
      setData(retrievedData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Retrieval failed')
    } finally {
      setLoading(false)
    }
  }

  const handlePinToPinata = async () => {
    if (!cid) {
      setError('Please upload data first')
      return
    }

    setPinningToPinata(true)
    setError('')
    setSuccess('')
    try {
      const helia = await getHelia()
      const content = await getFromIPFS(cid)
      const result = await pinToPinata(cid, content)

      if (result.success) {
        setSuccess('Pinned to Pinata successfully!')
        // Update pinning status
        const status = await checkPinningStatus(helia, cid)
        setPinningStatus(status)
        // Refresh pending pins list
        await loadPendingPins()
      } else {
        setError(`Failed to pin to Pinata: ${result.error || 'Unknown error'}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pinata pinning failed')
    } finally {
      setPinningToPinata(false)
    }
  }

  const loadPendingPins = async () => {
    setLoadingPins(true)
    setError('')
    try {
      // Get ALL pins to show everything
      const result = await listPinataPins()
      console.log('Raw Pinata pins result:', result)

      // Also check IndexedDB for CIDs
      const indexedDBCIDs = await listCIDsInIndexedDB()
      console.log(`Found ${indexedDBCIDs.length} CIDs in IndexedDB`)

      // Check if the specific searching CIDs are in IndexedDB
      const searchingCids = [
        'bafkrlbuvi',
        'bafkrs2ru4',
        'bafkrzujre',
        'bafkrma47y',
        'bafkrhdxti',
        'bafkrapcse',
        'bafkr5sbiu',
        'bafkrztpui',
        'bafkroj2lu',
        'bafkrndt5i',
      ]
      const indexedDBResults = await checkMultipleCIDsInIndexedDB(searchingCids)
      console.log('Searching CIDs in IndexedDB:', Array.from(indexedDBResults.entries()))

      if (result.success) {
        // Log all statuses we see for debugging
        const statusCounts: Record<string, number> = {}
        result.pins.forEach((pin) => {
          const status = pin.status || 'unknown'
          statusCounts[status] = (statusCounts[status] || 0) + 1
        })
        console.log('Status counts:', statusCounts)
        console.log(
          'All Pinata CIDs:',
          result.pins.map((p) => p.cid),
        )

        // Check if any of the searching CIDs are in the Pinata results
        const pinataCids = new Set(result.pins.map((p) => p.cid.toLowerCase()))
        const foundSearchingCids = searchingCids.filter((cid) => {
          // Check if any Pinata CID contains this searching CID or vice versa
          return Array.from(pinataCids).some((pcid) => pcid.includes(cid) || cid.includes(pcid))
        })
        console.log(
          `Found ${foundSearchingCids.length} of ${searchingCids.length} searching CIDs in Pinata results:`,
          foundSearchingCids,
        )

        // Show ALL pins (not just pending/searching)
        setPendingPins(result.pins)

        console.log(`Loaded ${result.pins.length} pins from Pinata`)
        if (result.pins.length > 0) {
          const pendingCount = result.pins.filter(
            (p) =>
              (p.status || '').toLowerCase() === 'pending' ||
              (p.status || '').toLowerCase() === 'searching',
          ).length
          console.log(`  - ${pendingCount} pending/searching`)
          console.log(`  - ${result.pins.length - pendingCount} other status`)
        }
      } else {
        const errorMsg = result.error || 'Unknown error'
        setError(`Failed to load pins: ${errorMsg}`)
        console.error('Failed to load pins:', result.error)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      setError(`Error loading pins: ${errorMsg}`)
      console.error('Error loading pins:', err)
    } finally {
      setLoadingPins(false)
    }
  }

  const handleUnpin = async (pinCid: string) => {
    setUnpinning(true)
    setError('')
    setSuccess('')
    try {
      const result = await unpinFromPinata(pinCid)
      if (result.success) {
        setSuccess(`Unpinned ${pinCid} successfully!`)
        // Refresh pending pins list
        await loadPendingPins()
        // Update pinning status if it's the current CID
        if (pinCid === cid) {
          const helia = await getHelia()
          const status = await checkPinningStatus(helia, cid)
          setPinningStatus(status)
        }
      } else {
        setError(`Failed to unpin: ${result.error || 'Unknown error'}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unpin failed')
    } finally {
      setUnpinning(false)
    }
  }

  const handleUnpinAllPending = async () => {
    if (pendingPins.length === 0) {
      setError('No pending pins to unpin')
      return
    }

    setUnpinning(true)
    setError('')
    setSuccess('')
    try {
      const result = await unpinAllPendingFromPinata()
      if (result.success) {
        setSuccess(`Unpinned ${result.unpinned} pending pin(s) successfully!`)
        if (result.errors.length > 0) {
          console.warn('Some unpins failed:', result.errors)
        }
        // Refresh pending pins list
        await loadPendingPins()
      } else {
        setError(`Failed to unpin all: ${result.errors.join(', ')}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unpin all failed')
    } finally {
      setUnpinning(false)
    }
  }

  if (initializing) {
    return (
      <div className="rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur">
        <h2 className="text-xl font-semibold mb-4">IPFS Test</h2>
        <p className="text-slate-400">Initializing IPFS node...</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur">
      <h2 className="text-xl font-semibold mb-4">IPFS Test (Helia)</h2>

      <div className="space-y-4">
        <button
          onClick={handleUpload}
          disabled={loading}
          className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 rounded-lg disabled:opacity-50"
        >
          {loading ? 'Uploading...' : 'Upload Test Data'}
        </button>

        {cid && (
          <div className="space-y-2">
            <p className="text-sm text-slate-400 mb-2">CID: {cid}</p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleRetrieve}
                disabled={loading}
                className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Retrieving...' : 'Retrieve Data'}
              </button>
              <button
                onClick={handlePinToPinata}
                disabled={pinningToPinata || !import.meta.env.VITE_PINATA_JWT}
                className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg disabled:opacity-50"
                title={!import.meta.env.VITE_PINATA_JWT ? 'Pinata JWT not configured' : ''}
              >
                {pinningToPinata ? 'Pinning to Pinata...' : 'Pin to Pinata'}
              </button>
              {cid && (
                <button
                  onClick={() => handleUnpin(cid)}
                  disabled={unpinning || !import.meta.env.VITE_PINATA_JWT}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg disabled:opacity-50"
                  title="Unpin this CID from Pinata"
                >
                  {unpinning ? 'Unpinning...' : 'Unpin from Pinata'}
                </button>
              )}
            </div>

            {pinningStatus && (
              <div className="mt-2 p-3 bg-slate-900/50 rounded-lg">
                <p className="text-xs text-slate-400 mb-1">Pinning Status:</p>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        pinningStatus.heliaLocal ? 'bg-green-500' : 'bg-gray-500'
                      }`}
                    />
                    <span className="text-slate-300">
                      Helia Local: {pinningStatus.heliaLocal ? '✓ Pinned' : '✗ Not pinned'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        pinningStatus.pinata ? 'bg-green-500' : 'bg-gray-500'
                      }`}
                    />
                    <span className="text-slate-300">
                      Pinata:{' '}
                      {pinningStatus.pinata
                        ? '✓ Pinned'
                        : import.meta.env.VITE_PINATA_JWT
                          ? '✗ Not pinned'
                          : '○ Not configured'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {data && (
          <div className="mt-4 p-4 bg-slate-900/50 rounded-lg">
            <p className="text-sm text-slate-300">Retrieved Data:</p>
            <pre className="mt-2 text-xs text-slate-400 overflow-auto">{data}</pre>
          </div>
        )}

        {success && (
          <div className="mt-4 p-4 bg-green-500/20 rounded-lg">
            <p className="text-sm text-green-400">✓ {success}</p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">Error: {error}</p>
          </div>
        )}

        {/* Pinata Management Section */}
        {import.meta.env.VITE_PINATA_JWT && (
          <div className="mt-6 p-4 bg-slate-900/50 rounded-lg border border-white/5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-300">Pinata Management</h3>
              <button
                onClick={loadPendingPins}
                disabled={loadingPins}
                className="px-3 py-1 text-xs bg-slate-700/50 hover:bg-slate-700 rounded disabled:opacity-50"
              >
                {loadingPins ? 'Loading...' : 'Refresh All Pins'}
              </button>
            </div>

            {pendingPins.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    {pendingPins.length} pin(s) found
                    {pendingPins.some(
                      (p) => p.status === 'pending' || p.status === 'searching',
                    ) && (
                      <span className="ml-2 text-orange-400">
                        (
                        {
                          pendingPins.filter(
                            (p) => p.status === 'pending' || p.status === 'searching',
                          ).length
                        }{' '}
                        pending/searching)
                      </span>
                    )}
                  </p>
                  {pendingPins.some((p) => p.status === 'pending' || p.status === 'searching') && (
                    <button
                      onClick={handleUnpinAllPending}
                      disabled={unpinning}
                      className="px-3 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 rounded disabled:opacity-50"
                    >
                      {unpinning ? 'Unpinning...' : 'Unpin All Pending'}
                    </button>
                  )}
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {pendingPins.map((pin) => {
                    const isPending = pin.status === 'pending' || pin.status === 'searching'
                    return (
                      <div
                        key={pin.cid}
                        className={`flex items-center justify-between p-2 rounded text-xs ${
                          isPending
                            ? 'bg-orange-500/10 border border-orange-500/20'
                            : 'bg-slate-800/50'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p
                              className="text-slate-300 truncate font-mono text-xs"
                              title={pin.cid}
                            >
                              {pin.cid.length > 20
                                ? `${pin.cid.slice(0, 10)}...${pin.cid.slice(-10)}`
                                : pin.cid}
                            </p>
                            {pin.status && pin.status !== 'unknown' && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-xs ${
                                  isPending
                                    ? 'bg-orange-500/20 text-orange-300'
                                    : pin.status === 'pinned'
                                      ? 'bg-green-500/20 text-green-300'
                                      : 'bg-slate-700 text-slate-400'
                                }`}
                              >
                                {pin.status}
                              </span>
                            )}
                          </div>
                          {pin.name && (
                            <p className="text-slate-500 text-xs mt-0.5">Name: {pin.name}</p>
                          )}
                          {pin.size && (
                            <p className="text-slate-500 text-xs">
                              Size: {(pin.size / 1024).toFixed(2)} KB
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleUnpin(pin.cid)}
                          disabled={unpinning}
                          className="ml-2 px-2 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-xs disabled:opacity-50 whitespace-nowrap"
                        >
                          Unpin
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {pendingPins.length === 0 && !loadingPins && (
              <p className="text-xs text-slate-500">
                No pins found. Click "Refresh All Pins" to load pins from Pinata.
              </p>
            )}
          </div>
        )}

        {/* IndexedDB Viewer Section */}
        <div className="mt-6 p-4 bg-slate-900/50 rounded-lg border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-300">IndexedDB Viewer</h3>
            <button
              onClick={async () => {
                setLoadingIndexedDB(true)
                try {
                  const view = await getFullIndexedDBView()
                  setIndexedDBView(view)
                  console.log('Full IndexedDB View:', view)

                  // Also search for the specific searching CIDs
                  const searchingCids = [
                    'bafkrlbuvi',
                    'bafkrs2ru4',
                    'bafkrzujre',
                    'bafkrma47y',
                    'bafkrhdxti',
                    'bafkrapcse',
                    'bafkr5sbiu',
                    'bafkrztpui',
                    'bafkroj2lu',
                    'bafkrndt5i',
                  ]
                  const searchResults = await searchCIDsInIndexedDB(searchingCids)
                  console.log('Searching CIDs in IndexedDB:', Array.from(searchResults.entries()))
                } catch (err) {
                  console.error('Error loading IndexedDB view:', err)
                  setError(
                    `Error loading IndexedDB: ${err instanceof Error ? err.message : 'Unknown error'}`,
                  )
                } finally {
                  setLoadingIndexedDB(false)
                }
              }}
              disabled={loadingIndexedDB}
              className="px-3 py-1 text-xs bg-slate-700/50 hover:bg-slate-700 rounded disabled:opacity-50"
            >
              {loadingIndexedDB ? 'Loading...' : 'View All IndexedDB'}
            </button>
          </div>

          {indexedDBView && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400">
                <p>Databases: {indexedDBView.totalDatabases}</p>
                <p>Object Stores: {indexedDBView.totalObjectStores}</p>
                <p>Total Records: {indexedDBView.totalRecords}</p>
                <p className="mt-2 font-semibold text-slate-300">
                  CIDs Found: {indexedDBView.allCIDs.length}
                </p>
              </div>

              {indexedDBView.allCIDs.length > 0 && (
                <div className="max-h-60 overflow-y-auto">
                  <p className="text-xs text-slate-400 mb-2">All CIDs in IndexedDB:</p>
                  <div className="space-y-1">
                    {indexedDBView.allCIDs.map((cid) => (
                      <div
                        key={cid}
                        className="p-2 bg-slate-800/50 rounded text-xs font-mono text-slate-300"
                      >
                        {cid}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {indexedDBView.databases.map((db) => (
                <div key={db.name} className="border-t border-slate-700 pt-2">
                  <p className="text-xs font-semibold text-slate-300 mb-1">
                    Database: {db.name} (v{db.version})
                  </p>
                  {db.objectStores.map((store) => (
                    <div key={store.name} className="ml-4 mb-2">
                      <p className="text-xs text-slate-400">
                        Store: {store.name} ({store.count} records)
                      </p>
                      {store.count > 0 && store.count <= 10 && (
                        <pre className="text-xs text-slate-500 mt-1 overflow-auto max-h-32 bg-slate-950/50 p-2 rounded">
                          {JSON.stringify(store.data, null, 2)}
                        </pre>
                      )}
                      {store.count > 10 && (
                        <p className="text-xs text-slate-500 mt-1">
                          (Showing first 100 records, total: {store.count})
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {!indexedDBView && !loadingIndexedDB && (
            <p className="text-xs text-slate-500">
              Click "View All IndexedDB" to see all databases, object stores, and CIDs stored
              locally.
            </p>
          )}
        </div>

        {/* CID Search Section */}
        <div className="mt-6 p-4 bg-slate-900/50 rounded-lg border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-300">Search Stuck CIDs in Helia</h3>
            <button
              onClick={async () => {
                setSearchingCIDs(true)
                setError('')
                try {
                  const helia = await getHelia()

                  // The searching CIDs (full CIDs - you may need to provide complete CIDs)
                  const searchingCids = [
                    'bafkrlbuvi',
                    'bafkrs2ru4',
                    'bafkrzujre',
                    'bafkrma47y',
                    'bafkrhdxti',
                    'bafkrapcse',
                    'bafkr5sbiu',
                    'bafkrztpui',
                    'bafkroj2lu',
                    'bafkrndt5i',
                  ]

                  console.log('Starting comprehensive Helia search for CIDs...')
                  const results = await searchCIDsInHelia(helia, searchingCids)

                  // Also diagnose each CID
                  for (const cid of searchingCids) {
                    const diagnosis = await diagnoseStuckCID(helia, cid)
                    console.log(`Diagnosis for ${cid}:`, diagnosis)
                  }

                  setCidSearchResults(results)
                  console.log('Search results:', results)
                } catch (err) {
                  console.error('Error searching CIDs:', err)
                  setError(
                    `Error searching: ${err instanceof Error ? err.message : 'Unknown error'}`,
                  )
                } finally {
                  setSearchingCIDs(false)
                }
              }}
              disabled={searchingCIDs}
              className="px-3 py-1 text-xs bg-blue-500/20 hover:bg-blue-500/30 rounded disabled:opacity-50"
            >
              {searchingCIDs ? 'Searching...' : 'Search Stuck CIDs'}
            </button>
          </div>

          {cidSearchResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-400 mb-2">
                Search Results ({cidSearchResults.filter((r) => r.found).length} found):
              </p>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {cidSearchResults.map((result) => (
                  <div
                    key={result.cid}
                    className={`p-3 rounded text-xs ${
                      result.found
                        ? 'bg-green-500/10 border border-green-500/20'
                        : 'bg-red-500/10 border border-red-500/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`w-2 h-2 rounded-full ${result.found ? 'bg-green-500' : 'bg-red-500'}`}
                      />
                      <p className="font-mono text-slate-300 font-semibold">
                        {result.cid.length > 20
                          ? `${result.cid.slice(0, 10)}...${result.cid.slice(-10)}`
                          : result.cid}
                      </p>
                      <span className="text-slate-500">
                        {result.found ? '✓ Found' : '✗ Not Found'}
                      </span>
                    </div>
                    {result.locations.length > 0 && (
                      <div className="ml-4 space-y-1">
                        <p className="text-slate-400 font-semibold">Locations:</p>
                        {result.locations.map((loc, idx) => (
                          <div key={idx} className="ml-2 text-slate-500">
                            <span className="font-semibold">{loc.type}</span>
                            {loc.database && ` → ${loc.database}`}
                            {loc.store && ` → ${loc.store}`}
                            {loc.details && ` (${loc.details})`}
                          </div>
                        ))}
                      </div>
                    )}
                    {result.locations.length === 0 && (
                      <p className="ml-4 text-slate-500 italic">
                        Not found in any Helia storage location
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {cidSearchResults.length === 0 && !searchingCIDs && (
            <p className="text-xs text-slate-500">
              Click "Search Stuck CIDs" to search for the 10 searching CIDs in all Helia storage
              locations.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
