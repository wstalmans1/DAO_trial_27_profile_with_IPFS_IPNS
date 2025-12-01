// IPFS provider configuration and selection
// Supports multiple pinning providers:
// - Storacha (via @storacha/client - VITE_STORACHA_EMAIL)
//   Usage: import { create } from "@storacha/client"
//   const client = await create()
//   const account = await client.login(email)
//   await account.plan.wait() // Wait for payment plan selection
//   const space = await client.createSpace("my-space", { account })
//   const cid = await client.uploadFile(file)
// - Pinata (via pinata SDK - VITE_PINATA_JWT, VITE_PINATA_GATEWAY)
//   Usage: import { PinataSDK } from "pinata"
//   const pinata = new PinataSDK({ pinataJwt, pinataGateway })
// - Fleek Platform (via @fleek-platform/sdk/browser - VITE_FLEEK_CLIENT_ID)
//   Uses ApplicationAccessTokenService for client-side authentication
// Users can configure which provider(s) to use via environment variables
// Will be implemented in learning path
