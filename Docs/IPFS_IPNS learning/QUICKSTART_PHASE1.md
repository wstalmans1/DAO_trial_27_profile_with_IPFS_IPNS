# Quick Start: Phase 1 - IPFS Integration

This guide will help you implement **Phase 1, Milestone 1.1 & 1.2** of the IPNS Profile System.

## Step 1: Install Dependencies

```bash
cd /Users/wimstalmans/Projects/DAO_trial_26/apps/dao-dapp
pnpm add ipfs-http-client@^60.0.0
pnpm add -D @types/node
```

**Alternative (Modern Approach)**: If you want to use Helia (modern IPFS):
```bash
pnpm add @helia/unixfs@^2.0.0 helia@^2.0.0
```

For this quickstart, we'll use `ipfs-http-client` as it's simpler to start with.

## Step 2: Set Up IPFS Pinning Service

Choose one of these free services:

### Option A: Web3.Storage (Recommended for learning)
1. Go to https://web3.storage
2. Sign up (free)
3. Create an API token
4. Add to `.env.local`:
```env
VITE_WEB3_STORAGE_TOKEN=your_token_here
```

### Option B: Pinata
1. Go to https://www.pinata.cloud
2. Sign up (free tier available)
3. Create API key
4. Add to `.env.local`:
```env
VITE_PINATA_JWT=your_jwt_here
```

## Step 3: Create IPFS Service

Create `apps/dao-dapp/src/services/ipfs.ts`:

```typescript
import { create } from 'ipfs-http-client';

// Initialize IPFS client
const getIPFSClient = () => {
  // Option 1: Use public gateway (for testing)
  // return create({ url: 'https://ipfs.io/api/v0' });
  
  // Option 2: Use Web3.Storage (recommended)
  const token = import.meta.env.VITE_WEB3_STORAGE_TOKEN;
  if (!token) {
    throw new Error('VITE_WEB3_STORAGE_TOKEN not configured');
  }
  return create({
    url: 'https://api.web3.storage',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

/**
 * Upload data to IPFS
 * @param data - String data to upload
 * @returns CID (Content Identifier)
 */
export async function uploadToIPFS(data: string): Promise<string> {
  try {
    const ipfs = getIPFSClient();
    const result = await ipfs.add(data);
    return result.cid.toString();
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    throw new Error('Failed to upload to IPFS');
  }
}

/**
 * Retrieve data from IPFS
 * @param cid - Content Identifier
 * @returns The data as a string
 */
export async function getFromIPFS(cid: string): Promise<string> {
  try {
    const ipfs = getIPFSClient();
    const chunks: Uint8Array[] = [];
    
    for await (const chunk of ipfs.cat(cid)) {
      chunks.push(chunk);
    }
    
    // Combine chunks and convert to string
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return new TextDecoder().decode(result);
  } catch (error) {
    console.error('Error retrieving from IPFS:', error);
    throw new Error(`Failed to retrieve data from IPFS: ${cid}`);
  }
}

/**
 * Upload JSON object to IPFS
 * @param data - Object to upload
 * @returns CID
 */
export async function uploadJSONToIPFS(data: object): Promise<string> {
  const jsonString = JSON.stringify(data, null, 2);
  return uploadToIPFS(jsonString);
}

/**
 * Retrieve and parse JSON from IPFS
 * @param cid - Content Identifier
 * @returns Parsed JSON object
 */
export async function getJSONFromIPFS<T = any>(cid: string): Promise<T> {
  const data = await getFromIPFS(cid);
  return JSON.parse(data) as T;
}
```

## Step 4: Create Test Component

Create `apps/dao-dapp/src/components/IPFSTest.tsx`:

```typescript
import { useState } from 'react';
import { uploadToIPFS, getFromIPFS } from '../services/ipfs';

export default function IPFSTest() {
  const [cid, setCid] = useState<string>('');
  const [data, setData] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

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

  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur">
      <h2 className="text-xl font-semibold mb-4">IPFS Test</h2>
      
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
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">STARTER-V26.1</p>
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

## Step 6: Test It!

1. Make sure your `.env.local` has the IPFS token configured
2. Start the dev server:
```bash
pnpm web:dev
```
3. Open http://localhost:5173
4. Click "Upload Test Data"
5. Wait for CID to appear
6. Click "Retrieve Data"
7. Verify the data matches what you uploaded

## Troubleshooting

### Error: "VITE_WEB3_STORAGE_TOKEN not configured"
- Make sure `.env.local` exists in `apps/dao-dapp/`
- Add your token: `VITE_WEB3_STORAGE_TOKEN=your_token_here`
- Restart the dev server

### Error: "Failed to upload to IPFS"
- Check your internet connection
- Verify your API token is correct
- Check browser console for detailed error

### CORS Errors
- If using public IPFS gateway, you might hit CORS issues
- Use Web3.Storage or Pinata instead (they handle CORS)

## Next Steps

Once this works:
1. ✅ You've completed **Phase 1, Milestone 1.1 & 1.2**
2. Move to **Phase 2**: IPNS Basics
3. Start implementing IPNS key generation

## Additional Resources

- [IPFS HTTP Client Docs](https://github.com/ipfs/js-ipfs/tree/master/packages/ipfs-http-client)
- [Web3.Storage Docs](https://web3.storage/docs/)
- [Pinata Docs](https://docs.pinata.cloud/)

---

**Congratulations! You now have IPFS working in your DApp!** 🎉

