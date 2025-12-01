import { useState, useEffect } from 'react'
import { uploadToIPFS, getFromIPFS, stopHelia } from '../services/ipfs'

export default function IPFSTest() {
  const [cid, setCid] = useState<string>('')
  const [data, setData] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [initializing, setInitializing] = useState(true)

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
    try {
      const testData = `Test data uploaded at ${new Date().toISOString()}`
      const uploadedCid = await uploadToIPFS(testData)
      setCid(uploadedCid)
      setSuccess(`Uploaded successfully! CID: ${uploadedCid}`)
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
          <div>
            <p className="text-sm text-slate-400 mb-2">CID: {cid}</p>
            <button
              onClick={handleRetrieve}
              disabled={loading}
              className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 rounded-lg disabled:opacity-50"
            >
              {loading ? 'Retrieving...' : 'Retrieve Data'}
            </button>
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
      </div>
    </div>
  )
}
