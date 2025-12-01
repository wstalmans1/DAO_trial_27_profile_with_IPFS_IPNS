import type { DeployFunction } from 'hardhat-deploy/types'

const func: DeployFunction = async ({ deployments, getNamedAccounts }) => {
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  
  // Deploy ExampleToken with comprehensive NatSpec documentation
  await deploy('ExampleToken', {
    from: deployer,
    args: [deployer, deployer], // initialOwner and initialTreasury both set to deployer
    log: true,
  })
}
export default func
func.tags = ['ExampleToken', 'all']
