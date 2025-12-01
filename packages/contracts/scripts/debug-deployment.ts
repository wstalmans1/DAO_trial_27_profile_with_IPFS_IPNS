import { ethers } from "hardhat"

async function main() {
  const address = process.argv[2]
  if (!address) throw new Error("Usage: ts-node scripts/debug-deployment.ts <address>")

  const code = await ethers.provider.getCode(address)
  const balance = await ethers.provider.getBalance(address)
  console.log("Code size:", (code.length - 2) / 2, "bytes")
  console.log("ETH balance:", ethers.formatEther(balance))
}

main().catch((e) => { console.error(e); process.exit(1) })
