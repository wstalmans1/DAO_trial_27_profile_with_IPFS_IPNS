# Quick Start: Phase 1 - IPFS Integration (Helia)

This guide will help you implement **Phase 1, Milestone 1.1 & 1.2** of the IPNS Profile System using **Helia** (modern IPFS).

## Step 1: Verify Dependencies

Helia and its dependencies are already installed in your project! ✅

The following packages are available:
- `helia@^2.1.0` - Core IPFS implementation
- `@helia/unixfs@^2.0.1` - File operations
- `@helia/ipns@^2.0.3` - IPNS support (for Phase 2)

**No installation needed!** You can proceed directly to Step 2.

## Step 2: Set Up IPFS Pinning Service (Optional but Recommended)

Helia runs a full IPFS node in your browser, but for persistence across sessions, you'll want to use a pinning service. Choose one of these free services:

### Option A: Storacha (Recommended for learning)
1. Go to https://console.storacha.network or install CLI:
```bash
   pnpm dlx @storacha/cli@latest
   storacha login your@email.com
   ```
2. Create an account (free tier available)
3. Add to `.env.local`:
```env
VITE_STORACHA_EMAIL=your_email@example.com
```

### Option B: Pinata (Recommended for production)
1. Go to https://www.pinata.cloud
2. Sign up (free tier available)
3. Create API key (JWT)
4. Add to `.env.local`:
```env
VITE_PINATA_JWT=your_jwt_here
VITE_PINATA_GATEWAY=https://gateway.pinata.cloud
```

### Option C: Fleek Platform
1. Go to https://app.fleek.co
2. Sign up (free tier available)
3. Create Application → Get Client ID
4. Add to `.env.local`:
```env
VITE_FLEEK_CLIENT_ID=your_client_id_here
VITE_FLEEK_GATEWAY=https://ipfs.fleek.co
```

**Note**: Pinning services are optional for testing. Helia can work standalone, but pinning ensures your data persists even when your browser is closed.

## Step 3: Create IPFS Service with Helia

Create `apps/dao-dapp/src/services/ipfs.ts`:

```typescript
import { createHelia } from 'helia'
import { unixfs } from '@helia/unixfs'
import type { Helia } from 'helia'

// Singleton Helia instance
let heliaInstance: Helia | null = null
let unixfsInstance: ReturnType<typeof unixfs> | null = null

/**
 * Initialize Helia IPFS node (singleton pattern)
 * @returns Helia instance
 */
async function getHelia(): Promise<Helia> {
  if (heliaInstance) {
    return heliaInstance
  }

  try {
    heliaInstance = await createHelia()
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
 * @returns CID (Content Identifier)
 */
export async function uploadToIPFS(data: string): Promise<string> {
  try {
    const fs = await getUnixFS()
    const encoder = new TextEncoder()
    const dataBytes = encoder.encode(data)
    
    const cid = await fs.addBytes(dataBytes)
    return cid.toString()
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
    
    for await (const chunk of fs.cat(cid)) {
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
```

## Step 4: Create Test Component

Create `apps/dao-dapp/src/components/IPFSTest.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { uploadToIPFS, getFromIPFS, stopHelia } from '../services/ipfs';

export default function IPFSTest() {
  const [cid, setCid] = useState<string>('');
  const [data, setData] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [initializing, setInitializing] = useState(true);

  // Initialize Helia on mount
  useEffect(() => {
    const init = async () => {
      try {
        // Helia initializes lazily on first use, but we can trigger it
        await uploadToIPFS('init');
        setInitializing(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize IPFS');
        setInitializing(false);
      }
    };
    init();

    // Cleanup on unmount
    return () => {
      stopHelia().catch(console.error);
    };
  }, []);

  const handleUpload = async () => {
    setLoading(true);
    setError('');
    try {
      const testData = `Test data uploaded at ${new Date().toISOString()}`;
      const uploadedCid = await uploadToIPFS(testData);
      setCid(uploadedCid);
      alert(`Uploaded! CID: ${uploadedCid}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRetrieve = async () => {
    if (!cid) {
      setError('Please upload data first');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const retrievedData = await getFromIPFS(cid);
      setData(retrievedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Retrieval failed');
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur">
        <h2 className="text-xl font-semibold mb-4">IPFS Test</h2>
        <p className="text-slate-400">Initializing IPFS node...</p>
      </div>
    );
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
            <pre className="mt-2 text-xs text-slate-400 overflow-auto">
              {data}
            </pre>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">Error: {error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

## Step 5: Add to App

Update `apps/dao-dapp/src/App.tsx`:

```typescript
import { ConnectButton } from '@rainbow-me/rainbowkit'
import IPFSTest from './components/IPFSTest'

export default function App() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-slate-950 to-indigo-500/10" aria-hidden />
      <div className="relative flex w-full flex-col gap-10 px-6 py-10">
        <header className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-6 py-4 backdrop-blur">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Starter v27.2</p>
            <h1 className="text-2xl font-semibold text-white">DAO DApp</h1>
          </div>
          <ConnectButton />
        </header>
        
        <IPFSTest />
      </div>
    </div>
  )
}
```

**Note**: Make sure to create the `components` directory first:
```bash
mkdir -p apps/dao-dapp/src/components
```

## Step 6: Test It!

1. **Optional**: Configure a pinning service in `.env.local` (Storacha, Pinata, or Fleek)
2. Start the dev server:
```bash
pnpm web:dev
```
3. Open http://localhost:5173
4. Wait for "Initializing IPFS node..." to complete (first time may take a few seconds)
5. Click "Upload Test Data"
6. Wait for CID to appear
7. Click "Retrieve Data"
8. Verify the data matches what you uploaded

## Troubleshooting

### Error: "Failed to initialize IPFS node"
- Check browser console for detailed error
- Ensure you're using a modern browser (Chrome, Firefox, Edge)
- Try refreshing the page

### Error: "Failed to upload to IPFS"
- Check your internet connection
- Helia needs network access to connect to IPFS network
- Check browser console for detailed error

### Slow Initialization
- First-time Helia initialization can take 5-10 seconds
- This is normal - Helia is starting a full IPFS node
- Subsequent operations will be faster

### Data Not Persisting
- Helia stores data in browser IndexedDB
- Data persists across sessions in the same browser
- For cross-device persistence, use a pinning service (Storacha/Pinata/Fleek)

### CORS Errors
- Helia doesn't have CORS issues (it's a full node, not HTTP client)
- If you see CORS errors, they're likely from pinning service API calls

## Key Differences: Helia vs HTTP Client

| Feature | Helia | HTTP Client |
|---------|-------|-------------|
| **Architecture** | Full IPFS node in browser | HTTP API calls |
| **Performance** | Faster (local node) | Slower (network requests) |
| **IPNS Support** | Built-in (`@helia/ipns`) | Requires separate setup |
| **Offline Support** | Can work offline (cached) | Requires internet |
| **Initialization** | Async (5-10s first time) | Instant |
| **Storage** | Browser IndexedDB | No local storage |

## Next Steps

Once this works:
1. ✅ You've completed **Phase 1, Milestone 1.1 & 1.2**
2. Move to **Phase 2**: IPNS Basics
3. Start implementing IPNS key generation (already have `@helia/ipns` installed!)

## Additional Resources

- [Helia Documentation](https://helia.io/)
- [Helia GitHub](https://github.com/ipfs/helia)
- [UnixFS Documentation](https://github.com/ipfs/helia/tree/main/packages/unixfs)
- [Storacha Docs](https://docs.storacha.network/)
- [Pinata Docs](https://docs.pinata.cloud/)
- [Fleek Platform Docs](https://docs.fleek.co/)

---

**Congratulations! You now have IPFS working in your DApp with Helia!** 🎉

**Benefits of using Helia:**
- ✅ Full IPFS node capabilities
- ✅ Ready for IPNS (Phase 2)
- ✅ Better performance
- ✅ Offline support
- ✅ Modern, actively maintained
