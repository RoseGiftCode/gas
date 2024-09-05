// Required imports
import type { NextApiRequest, NextApiResponse } from 'next';

// Helper function to select chain name based on chain ID
const selectChainName = (chainId: number): string => {
  switch (chainId) {
    case 1:
      return 'eth-mainnet';
    case 137:
      return 'polygon-mainnet';
    case 10:
      return 'optimism-mainnet';
    case 42161:
      return 'arbitrum-mainnet';
    default:
      throw new Error('Unsupported chain ID');
  }
};

// Main API handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Extract address and chainId from the request query
    const { address, chainId } = req.query;

    // Select the appropriate chain name based on the chainId
    const chainName = selectChainName(parseInt(chainId as string));

    // Construct the Alchemy API URL
    const alchemyApiUrl = `https://${chainName}.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`;

    // Fetch token balances using the Alchemy API
    const response = await fetch(alchemyApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getTokenBalances',
        params: [address, 'erc20'],
      }),
    });

    // Parse the response data
    const data = await response.json();

    // Send the data back as a JSON response
    res.status(200).json(data);
  } catch (error) {
    // Handle errors with type assertion for better type safety
    res.status(500).json({ error: (error as Error).message });
  }
}
