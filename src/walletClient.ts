import { createWalletClient, custom } from 'viem';
import { mainnet, bsc, polygon, optimism, arbitrum, zkSync } from 'viem/chains';

// Define your chains
export const chains = {
  mainnet,
  bsc,
  polygon,
  optimism,
  arbitrum,
  zkSync,
};

// Create the wallet client
const createClient = () => {
  if (typeof window !== 'undefined' && window.ethereum) {
    return createWalletClient({
      chain: mainnet, // Default chain can be set to any of your supported chains
      transport: custom(window.ethereum as EthereumProvider),
    });
  } else {
    console.warn('window.ethereum is not available');
    return null;
  }
};

export const walletClient = createClient();

// Function to switch chains
export const switchChain = async (chainId: number) => {
  if (walletClient) {
    try {
      await walletClient.switchChain({ id: chainId });
      console.log(`Successfully switched to chain ID: ${chainId}`);
    } catch (error) {
      console.error(`Failed to switch to chain ID: ${chainId}`, error);
    }
  } else {
    console.error('walletClient is not initialized');
  }
};
