import hre from "hardhat"

async function main() {
  const address = process.argv[2]
  if (!address) throw new Error("Usage: ts-node scripts/verify-multi.ts <address> [constructorArgsJson]")

  const argsJson = process.argv[3]
  const constructorArgs: any[] = argsJson ? JSON.parse(argsJson) : []

  console.log("Verifying on Etherscan…")
  try {
    await hre.run("verify:verify", { address, constructorArguments: constructorArgs })
    console.log("✅ Etherscan verified")
    return
  } catch (e: any) {
    console.log("❌ Etherscan failed:", e.message || e)
  }

  console.log("Verifying on Blockscout…")
  try {
    await hre.run("verify:verify", { address, network: "sepolia-blockscout", constructorArguments: constructorArgs })
    console.log("✅ Blockscout verified")
  } catch (e: any) {
    console.log("❌ Blockscout failed:", e.message || e)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
