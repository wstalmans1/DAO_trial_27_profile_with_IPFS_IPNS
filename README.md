# DApp Setup (Rookie-friendly)

**Frontend**: Vite + React 18 + RainbowKit v2 + wagmi v2 + viem + TanStack Query v5 + Tailwind v4  
**IPFS/IPNS**: Helia v2 (full IPFS node) + @helia/unixfs + @helia/ipns + @libp2p/crypto + @noble/curves  
**IPFS Pinning**: Storacha SDK, Pinata SDK, or Fleek Platform SDK (choose one or multiple)  
**Contracts**: Hardhat v2 + @nomicfoundation/hardhat-toolbox (ethers v6), OpenZeppelin, TypeChain, hardhat-deploy  
**DX**: Foundry (Forge/Anvil), gas-reporter, contract-sizer, solidity-docgen (auto, opt-out), Solhint/Prettier, Husky  
**Documentation**: Comprehensive NatSpec support with linting, validation, and auto-generation (disable with `DOCS_AUTOGEN=false`)  
**Local Safety Net**: Automated checks via Husky hooks (pre-commit, pre-push) and pnpm scripts

## 1) First-time setup

Run the setup script:
```bash
bash setup.sh
```

After setup completes, you'll need to configure your environment files:

**Step 1:** Edit `apps/dao-dapp/.env.local`
- Add your `VITE_WALLETCONNECT_ID` (get one free from [WalletConnect Cloud](https://cloud.walletconnect.com))
- Add RPC URLs for the networks you want to use (defaults are provided)
- **IPFS/IPNS Configuration** (choose one or multiple pinning services):
  - `VITE_STORACHA_EMAIL` - Your email for [Storacha](https://storacha.network) (free tier available)
    - **Setup Steps (pnpm-first):**
      1. Install CLI: `pnpm dlx @storacha/cli@latest`
      2. Create account: `storacha login your@email.com` (check email for verification link)
      3. Select a plan (Free tier available) after email verification
      4. Create a Space: `storacha space create my-space` (or use JS client in code)
      5. Add your email to `.env.local` as `VITE_STORACHA_EMAIL`
    - **Alternative:** Use web console at https://console.storacha.network
    - **In Code:** Use `@storacha/client` - `const client = await create(); await client.login(email)`
  - `VITE_PINATA_JWT` - Get from [Pinata](https://app.pinata.cloud) → API Keys → New Key (free tier available)
  - `VITE_PINATA_GATEWAY` - Get from [Pinata](https://app.pinata.cloud) → Gateways (format: fun-llama-300.mypinata.cloud)
  - `VITE_FLEEK_CLIENT_ID` - Get from [Fleek Platform](https://app.fleek.co) → Create Application → Get Client ID
  - IPFS gateway URLs are pre-configured with defaults

**Step 2:** Edit `packages/contracts/.env.hardhat.local`
- Add your `PRIVATE_KEY` or `MNEMONIC` (for deploying contracts)
- Add RPC URLs for networks (Sepolia, Mainnet, etc.)
- Add `ETHERSCAN_API_KEY` (get one free from [Etherscan](https://etherscan.io/apis))
- Optionally add `CMC_API_KEY` for gas price reporting

**Optional speedup:** If you want faster builds, run:
```bash
pnpm approve-builds
# Then select: bufferutil, utf-8-validate, keccak, secp256k1
```

## Local Safety Net

All checks and quality gates run **locally on your machine** - no need for GitHub Actions!

### Automatic Checks (via Husky Hooks)

**Pre-commit hook** (runs automatically before every `git commit`):
- Formats code with Prettier
- Lints TypeScript/JavaScript with ESLint
- Lints Solidity with Solhint
- Formats Solidity with Forge (if Foundry is installed)
- **You can't commit broken code!**

**Pre-push hook** (runs automatically before every `git push`):
- Compiles all contracts
- Runs Hardhat tests
- Runs Foundry tests (if installed)
- **You can't push broken code!**
- Skip with `git push --no-verify` if needed

### Manual Check Commands

Run comprehensive checks anytime:

```bash
pnpm check:all        # Run all checks (frontend + contracts)
pnpm check:frontend   # Lint and build frontend only
pnpm check:contracts  # Compile and test contracts only
pnpm check:quick      # Fast checks (linting only, no tests)
pnpm check:full       # Alias for check:all
./scripts/check.sh    # Comprehensive bash script with detailed output
```

### Deploy Your App Online (Optional)

Want to share your app with the world? Deploy it to IPFS using Fleek:

**Step 1:** Go to your frontend folder
```bash
cd apps/dao-dapp
```

**Step 2:** Initialize Fleek
```bash
pnpm dlx @fleekhq/fleek-cli@0.1.8 site:init
```
This creates a `.fleek.json` file - commit it to git.

**Step 3:** Get your API key
- Go to [Fleek Dashboard](https://app.fleek.co)
- Create an account (free)
- Get your API key from settings

**Step 4:** Add it to GitHub Secrets
- Go to your GitHub repo → Settings → Secrets and variables → Actions
- Click "New repository secret"
- Name: `FLEEK_API_KEY`
- Value: paste your API key from Fleek

**That's it!** Your app will automatically deploy to IPFS whenever you push to the `main` branch. The deployment happens after all tests pass successfully.

> 💡 **Note:** No secrets are stored in your code - they're safely stored in GitHub Secrets.

## 2) Everyday commands

### Start Developing

**Frontend (web app):**
```bash
pnpm web:dev
```
Opens your app at `http://localhost:5173` - it auto-refreshes when you make changes!

**Local blockchain (for testing):**
```bash
pnpm anvil:start   # Start a local blockchain
pnpm anvil:stop    # Stop it when you're done
```
This gives you a local Ethereum network to test your contracts without spending real money.

### Run Safety Checks

**Quick checks (before committing):**
```bash
pnpm check:quick      # Fast linting checks only
```

**Full safety check (before pushing):**
```bash
pnpm check:all       # Run all checks (frontend + contracts)
# Or use the detailed script:
./scripts/check.sh   # Comprehensive check with colored output
```

**Individual checks:**
```bash
pnpm check:frontend   # Lint and build frontend
pnpm check:contracts  # Compile and test contracts
```

> 💡 **Note:** These checks run automatically via Husky hooks (pre-commit and pre-push), but you can also run them manually anytime!

### Working with Contracts

**Basic workflow:**
```bash
pnpm contracts:compile  # Compile your contracts (creates ABIs for frontend)
pnpm contracts:test     # Run tests
pnpm contracts:deploy   # Deploy to your configured network
```

**Verify your contracts on block explorers:**
```bash
pnpm contracts:verify              # Verify on Etherscan
pnpm contracts:verify:multi        # Try both Etherscan and Blockscout (if one fails)
pnpm contracts:verify:stdjson      # Verify using standard JSON input (for complex contracts)
pnpm contracts:verify-upgradeable  # Verify upgradeable proxy contracts
```

**Advanced features:**
```bash
pnpm contracts:debug              # Check code size and balance for any address
pnpm contracts:deploy-upgradeable # Deploy an upgradeable proxy contract
pnpm contracts:upgrade            # Upgrade an existing proxy contract
pnpm contracts:docs               # Generate documentation from your NatSpec comments
pnpm contracts:lint:natspec       # Check that your documentation is complete
```

**Foundry (alternative testing framework):**
```bash
pnpm forge:test       # Run Foundry tests
pnpm forge:fmt        # Format your Solidity code
pnpm foundry:update   # Update Foundry to latest version
```

## 3) Create Your First Contract

Let's create a simple token contract to get you started!

**Step 1:** Create the contract file
Create `packages/contracts/contracts/MyToken.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
contract MyToken is ERC20 {
  constructor() ERC20("MyToken","MTK") { _mint(msg.sender, 1_000_000 ether); }
}
```

**Step 2:** Create the deployment script
Create `packages/contracts/deploy/01_mytoken.ts`:

```ts
import type { DeployFunction } from 'hardhat-deploy/types'
const func: DeployFunction = async ({ deployments, getNamedAccounts }) => {
  const { deploy } = deployments; const { deployer } = await getNamedAccounts();
  await deploy('MyToken', { from: deployer, args: [], log: true });
}
export default func; func.tags = ['MyToken'];
```

**Step 3:** Compile and deploy
```bash
pnpm contracts:compile
pnpm --filter contracts exec hardhat deploy --network sepolia --tags MyToken
```

**What happens:**
- Your contract compiles successfully ✅
- It gets deployed to Sepolia testnet ✅
- The ABI (Application Binary Interface) automatically appears in `apps/dao-dapp/src/contracts/` ✅
- You can now use it in your frontend! 🎉

## 4) Documenting Your Contracts

Good documentation helps others (and future you!) understand your code. This setup makes it easy!

### What is NatSpec?
NatSpec (Natural Language Specification) is a way to document your Solidity contracts using special comments. Think of it like JSDoc for JavaScript, but for smart contracts.

### How It Works

**Automatic documentation:**
- Every time you compile, documentation is automatically generated
- It creates nice Markdown files in `packages/contracts/docs`
- Want to skip auto-generation? Set `DOCS_AUTOGEN=false` in your environment

**Manual commands:**
```bash
pnpm contracts:docs          # Generate documentation right now
pnpm contracts:lint:natspec  # Check that all your functions are documented
```

### NatSpec Tags You Can Use:
- `@title` - Give your contract a title
- `@notice` - Explain what your contract/function does (for users)
- `@dev` - Technical details (for developers)
- `@param` - Describe each parameter
- `@return` - Explain what the function returns
- `@author` - Your name or team
- `@custom:*` - Any custom tags you want

### See It In Action
Check out `packages/contracts/contracts/ExampleToken.sol` - it has comprehensive NatSpec documentation showing you how it's done!

### Where Does It Go?
- Documentation files are saved to `packages/contracts/docs`
- They're generated automatically after each compile (unless disabled)
- You can also generate them manually anytime with `pnpm contracts:docs`

The generated docs work great with tools like:
- **solidity-docgen** - Creates Markdown docs (already included!)
- **docusaurus** - Build a full documentation website
