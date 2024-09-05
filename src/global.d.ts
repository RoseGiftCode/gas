// global.d.ts
interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  // Add more specific types based on your usage if needed
}

interface Window {
  ethereum?: EthereumProvider; // Correctly declare ethereum with optional type
}
