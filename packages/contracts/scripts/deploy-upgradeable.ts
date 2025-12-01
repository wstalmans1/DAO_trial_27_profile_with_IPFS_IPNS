import { ethers, upgrades } from "hardhat"

async function main() {
  const [owner] = await ethers.getSigners()
  const treasury = owner.address

  const Impl = await ethers.getContractFactory("UpgradeableToken")
  const proxy = await upgrades.deployProxy(Impl, [owner.address, treasury])
  await proxy.waitForDeployment()
  console.log("Proxy deployed:", await proxy.getAddress())
}

main().catch((e) => { console.error(e); process.exit(1) })
