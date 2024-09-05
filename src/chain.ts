import { type Chain } from 'viem';

// Define a function to standardize chain definitions
function defineChain(chain: Chain): Chain {
  return {
    formatters: undefined,
    fees: undefined,
    serializers: undefined,
    ...chain,
  };
}


// Chain configurations

// Arbitrum
const arbitrum = defineChain({
  id: 42161,
  name: 'Arbitrum One',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://arb-mainnet.g.alchemy.com/v2/iUoZdhhu265uyKgw-V6FojhyO80OKfmV'] },
  },
  blockExplorers: {
    default: {
      name: 'Arbiscan',
      url: 'https://arbiscan.io',
      apiUrl: 'https://api.arbiscan.io/api',
    },
  },
  contracts: {
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11',
      blockCreated: 7654707,
    },
  },
});

// Polygon
const polygon = defineChain({
  id: 137,
  name: 'Polygon',
  nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://polygon-mainnet.g.alchemy.com/v2/iUoZdhhu265uyKgw-V6FojhyO80OKfmV'] },
  },
  blockExplorers: {
    default: {
      name: 'PolygonScan',
      url: 'https://polygonscan.com',
      apiUrl: 'https://api.polygonscan.com/api',
    },
  },
  contracts: {
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11',
      blockCreated: 25770160,
    },
  },
});

// ZKsync Era
const zksync = defineChain({
  id: 324,
  name: 'ZKsync Era',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://zksync-mainnet.g.alchemy.com/v2/iUoZdhhu265uyKgw-V6FojhyO80OKfmV'],
      webSocket: ['wss://zksync-mainnet.g.alchemy.com/v2/iUoZdhhu265uyKgw-V6FojhyO80OKfmV'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Etherscan',
      url: 'https://era.zksync.network/',
      apiUrl: 'https://api-era.zksync.network/api',
    },
    native: {
      name: 'ZKsync Explorer',
      url: 'https://explorer.zksync.io/',
      apiUrl: 'https://block-explorer-api.mainnet.zksync.io/api',
    },
  },
  contracts: {
    multicall3: {
      address: '0xF9cda624FBC7e059355ce98a31693d299FACd963',
    },
  },
});

// Ethereum Mainnet
const mainnet = defineChain({
  id: 1,
  name: 'Ethereum',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://eth-mainnet.g.alchemy.com/v2/iUoZdhhu265uyKgw-V6FojhyO80OKfmV'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Etherscan',
      url: 'https://etherscan.io',
      apiUrl: 'https://api.etherscan.io/api',
    },
  },
  contracts: {
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11',
      blockCreated: 14353601,
    },
  },
});

// Optimism
const optimism = defineChain({
  id: 10,
  name: 'Optimism',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://opt-mainnet.g.alchemy.com/v2/iUoZdhhu265uyKgw-V6FojhyO80OKfmV'] },
  },
  blockExplorers: {
    default: {
      name: 'Optimistic Explorer',
      url: 'https://optimistic.etherscan.io',
      apiUrl: 'https://api.optimistic.etherscan.io/api',
    },
  },
  contracts: {
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11',
      blockCreated: 21542477,
    },
  },
});

// Define the tuple of all chains
export const chains: readonly [
  typeof arbitrum,
  typeof polygon,
  typeof zksync,
  typeof mainnet,
  typeof optimism
] = [
  arbitrum,
  polygon,
  zksync,
  mainnet,
  optimism,
] as const;
