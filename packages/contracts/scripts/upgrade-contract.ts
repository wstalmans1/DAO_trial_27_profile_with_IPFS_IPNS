import { ethers, upgrades } from "hardhat"

async function main() {
  const proxyAddress = process.argv[2]
  const newImplName = process.argv[3] || "UpgradeableTokenV2"
  if (!proxyAddress) throw new Error("Usage: ts-node scripts/upgrade-contract.ts <proxyAddress> [ImplName]")

  const NewImpl = await ethers.getContractFactory(newImplName)
  const upgraded = await upgrades.upgradeProxy(proxyAddress, NewImpl)
  console.log("Upgraded proxy at:", await upgraded.getAddress())
}

main().catch((e) => { console.error(e); process.exit(1) })
