// Import React and necessary hooks
import { useEffect, useState } from 'react';
import { CssBaseline, GeistProvider } from '@geist-ui/core';
import type { AppProps } from 'next/app';
import NextHead from 'next/head';
import GithubCorner from 'react-github-corner';
import '../styles/globals.css';

// Wagmi and RainbowKit imports
import { createConfig, WagmiConfig, http } from 'wagmi';
import { RainbowKitProvider, connectorsForWallets } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { useIsMounted } from '../hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Import wallet configurations
import {
  rainbowWallet,
  walletConnectWallet,
  coinbaseWallet,
  trustWallet,
  uniswapWallet,
  okxWallet,
  metaMaskWallet,
  bybitWallet,
  binanceWallet,
} from '@rainbow-me/rainbowkit/wallets';

// Import chains from wagmi
import { mainnet, polygon, optimism, arbitrum, zkSync } from 'wagmi/chains';

// Import WalletConnect packages
import SignClient from '@walletconnect/sign-client';
import { Web3Wallet } from '@walletconnect/web3wallet';

// Define WalletConnect projectId
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'dce4c19a5efd3cba4116b12d4fc3689a';

// Define predefinedChains
const predefinedChains = {
  mainnet,
  polygon,
  optimism,
  arbitrum,
  zkSync,
};

// Convert object to tuple
const chainsArray = Object.values(predefinedChains) as [Chain, ...Chain[]];

// Define connectors
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [coinbaseWallet, trustWallet, rainbowWallet, metaMaskWallet, walletConnectWallet],
    },
    {
      groupName: 'More',
      wallets: [binanceWallet, bybitWallet, okxWallet, trustWallet, uniswapWallet],
    },
  ],
  {
    appName: 'Test App',
    projectId: projectId,
  }
);

// Create Wagmi config
const wagmiConfig = createConfig({
  connectors,
  chains: chainsArray,
  transports: {
    1: http('https://eth-mainnet.g.alchemy.com/v2/iUoZdhhu265uyKgw-V6FojhyO80OKfmV'),
    137: http('https://polygon-mainnet.g.alchemy.com/v2/iUoZdhhu265uyKgw-V6FojhyO80OKfmV'),
    10: http('https://opt-mainnet.g.alchemy.com/v2/iUoZdhhu265uyKgw-V6FojhyO80OKfmV'),
    42161: http('https://arb-mainnet.g.alchemy.com/v2/iUoZdhhu265uyKgw-V6FojhyO80OKfmV'),
    324: http('https://zksync-mainnet.g.alchemy.com/v2/iUoZdhhu265uyKgw-V6FojhyO80OKfmV'),
  },
});

// Create a QueryClient instance for React Query
const queryClient = new QueryClient();

// Main App component
const App = ({ Component, pageProps }: AppProps) => {
  const [web3wallet, setWeb3Wallet] = useState<InstanceType<typeof Web3Wallet> | null>(null);
  const isMounted = useIsMounted();

  useEffect(() => {
    if (isMounted) {
      const initializeWalletConnect = async () => {
        try {
          // Initialize the SignClient
          const signClient = await SignClient.init({
            projectId: projectId,
          });

          // Initialize Web3Wallet with SignClient core
          const wallet = await Web3Wallet.init({
            core: signClient.core, // Pass the core property of signClient
            metadata: {
              name: 'Test App',
              description: 'AppKit Example',
              url: 'https://web3modal.com',
              icons: ['https://avatars.githubusercontent.com/u/37784886'],
            },
          });

          setWeb3Wallet(wallet);
          console.log('WalletConnect initialized successfully');
        } catch (error) {
          console.error('Error initializing WalletConnect:', error);
        }
      };

      initializeWalletConnect();
    }
  }, [isMounted]);

  // Example of switching to a different network on component mount
  useEffect(() => {
    if (isMounted && web3wallet) {
      // Replace with desired chain if needed
      switchChain(predefinedChains.polygon.id);
    }
  }, [isMounted]);

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={wagmiConfig}>
        <RainbowKitProvider>
          <NextHead>
            <title>Drain</title>
            <meta name="description" content="Send all tokens from one wallet to another" />
            <link rel="icon" href="/favicon.ico" />
          </NextHead>
          <GeistProvider>
            <CssBaseline />
            <GithubCorner href="https://github.com/dawsbot/drain" size="140" bannerColor="#e056fd" />
            {isMounted && web3wallet ? <Component {...pageProps} /> : null}
          </GeistProvider>
        </RainbowKitProvider>
      </WagmiConfig>
    </QueryClientProvider>
  );
};

export default App;
