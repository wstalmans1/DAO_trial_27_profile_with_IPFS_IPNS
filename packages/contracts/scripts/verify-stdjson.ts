import hre from "hardhat"
import fs from "fs"

async function main() {
  const address = process.argv[2]
  const stdJsonPath = process.argv[3]
  const contractFullyQualifiedName = process.argv[4] // e.g. contracts/My.sol:My
  if (!address || !stdJsonPath || !contractFullyQualifiedName) {
    throw new Error("Usage: ts-node scripts/verify-stdjson.ts <address> <standardJsonPath> <FQN>")
  }

  const standardJsonInput = fs.readFileSync(stdJsonPath, "utf8")

  // First try Etherscan (supports standard-json-input)
  try {
    await hre.run("verify:verify", {
      address,
      contract: contractFullyQualifiedName,
      constructorArguments: [],
      libraries: {},
      standardJsonInput,
    })
    console.log("✅ Etherscan verified via standard JSON input")
    return
  } catch (e: any) {
    console.log("❌ Etherscan failed:", e.message || e)
  }

  // Then try Blockscout; many instances also support standard-json-input
  try {
    await hre.run("verify:verify", {
      address,
      contract: contractFullyQualifiedName,
      constructorArguments: [],
      libraries: {},
      standardJsonInput,
      network: "sepolia-blockscout",
    })
    console.log("✅ Blockscout verified via standard JSON input")
  } catch (e: any) {
    console.log("❌ Blockscout failed:", e.message || e)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
