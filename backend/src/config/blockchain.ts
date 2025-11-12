import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

// Contract ABI (dari compiled contract)
const ESCROW_ABI = [
  "event FundLocked(bytes32 indexed escrowId, address indexed payer, address indexed payee, uint256 amount, string schoolId)",
  "event FundReleased(bytes32 indexed escrowId, address indexed payee, uint256 amount)",
  "function lockFund(bytes32 escrowId, address payee, string memory schoolId) external payable",
  "function releaseFund(bytes32 escrowId) external",
  "function getEscrow(bytes32 escrowId) external view returns (address payer, address payee, uint256 amount, bool isLocked, bool isReleased, string memory schoolId)",
  "function admin() external view returns (address)"
];

// Setup provider dan wallet
export const provider = new ethers.providers.JsonRpcProvider(
  process.env.BLOCKCHAIN_RPC_URL
);

export const wallet = new ethers.Wallet(
  process.env.SERVICE_WALLET_PRIVATE_KEY!,
  provider
);

// Setup contract instance
export const escrowContract = new ethers.Contract(
  process.env.ESCROW_CONTRACT_ADDRESS!,
  ESCROW_ABI,
  wallet
);

// Test connection
export async function testBlockchainConnection() {
  try {
    const network = await provider.getNetwork();
    const balance = await wallet.getBalance();
    const admin = await escrowContract.admin();
    
    console.log('✅ Connected to blockchain');
    console.log(`   Network: ${network.name} (chainId: ${network.chainId})`);
    console.log(`   Wallet: ${wallet.address}`);
    console.log(`   Balance: ${ethers.utils.formatEther(balance)} ETH`);
    console.log(`   Contract Admin: ${admin}`);
    
    return true;
  } catch (error) {
    console.error('❌ Blockchain connection failed:', error);
    return false;
  }
}