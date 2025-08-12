import React, { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction, Keypair } from '@solana/web3.js';
import {
    getMinimumBalanceForRentExemptMint,
    getMinimumBalanceForRentExemptAccount,
    createInitializeMintInstruction,
    TOKEN_PROGRAM_ID,
    MINT_SIZE,
    createAssociatedTokenAccountInstruction,
    getAssociatedTokenAddress,
    createMintToInstruction
} from '@solana/spl-token';
import AddressMonitor from './AddressMonitor';

function CreateToken({ onTokenCreated, useWalletProvider = false, endpoint = "https://api.devnet.solana.com" }) {
    const [userAddress, setUserAddress] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [shouldStartMonitoring, setShouldStartMonitoring] = useState(false);
    const [tokenAmount, setTokenAmount] = useState('1000');
    const [costBreakdown, setCostBreakdown] = useState(null);

    const { connection } = useConnection();
    const { publicKey, sendTransaction, connected } = useWallet();

    useEffect(() => {
        const getCostBreakdown = async () => {
            if (connected && connection) {
                try {
                    const mintRent = await getMinimumBalanceForRentExemptMint(connection);
                    const accountRent = await getMinimumBalanceForRentExemptAccount(connection);
                    const fees = 0.005 * LAMPORTS_PER_SOL;

                    setCostBreakdown({
                        mintRent: mintRent / LAMPORTS_PER_SOL,
                        accountRent: accountRent / LAMPORTS_PER_SOL,
                        fees: fees / LAMPORTS_PER_SOL,
                        total: (mintRent + accountRent + fees) / LAMPORTS_PER_SOL
                    });
                } catch (error) {
                    console.warn('Could not fetch cost breakdown:', error);
                }
            }
        };

        getCostBreakdown();
    }, [connected, connection]);

    const isValidSolanaAddress = (address) => {
        try {
            new PublicKey(address);
            return true;
        } catch {
            return false;
        }
    };

    const isValidTokenAmount = (amount) => {
        const num = parseFloat(amount);
        return !isNaN(num) && num > 0 && num <= 1000000;
    };

    const waitForConfirmation = async (connection, signature, maxRetries = 3) => {
        for (let i = 0; i < maxRetries; i++) {
            try {
                const result = await connection.confirmTransaction(signature, 'confirmed');
                if (result.value.err) {
                    throw new Error(`Transaction failed: ${result.value.err}`);
                }
                return result;
            } catch (error) {
                console.log(`Confirmation attempt ${i + 1} failed:`, error.message);
                if (i === maxRetries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    };

    async function create() {
        setError('');
        setResult(null);
        setShouldStartMonitoring(false);

        if (!tokenAmount || tokenAmount.trim() === '') {
            setError('Token amount is required');
            return;
        }

        const testAmount = parseFloat(tokenAmount.trim());
        if (isNaN(testAmount) || testAmount <= 0) {
            setError(`Invalid token amount: "${tokenAmount}". Please enter a valid number greater than 0.`);
            return;
        }

        if (useWalletProvider && !connected) {
            setError('Please connect your wallet first');
            return;
        }

        if (useWalletProvider && !publicKey) {
            setError('Wallet not properly connected');
            return;
        }

        if (useWalletProvider && !sendTransaction) {
            setError('Wallet does not support required transaction features. Please try Phantom or Solflare wallet.');
            return;
        }

        if (!userAddress.trim()) {
            setError('Please enter a Solana address');
            return;
        }

        if (!isValidSolanaAddress(userAddress.trim())) {
            setError('Please enter a valid Solana address');
            return;
        }

        if (!tokenAmount.trim()) {
            setError('Please enter the amount of tokens to mint');
            return;
        }

        if (!isValidTokenAmount(tokenAmount.trim())) {
            setError('Please enter a valid token amount (0.000000001 to 1,000,000)');
            return;
        }

        setIsLoading(true);

        try {
            console.log("=== TOKEN CREATION DEBUG ===");
            console.log("User Address:", userAddress);
            console.log("Token Amount (raw):", tokenAmount);
            console.log("Token Amount (trimmed):", tokenAmount.trim());
            console.log("Use Wallet Provider:", useWalletProvider);
            console.log("Connected:", connected);
            console.log("Public Key:", publicKey?.toBase58());
            console.log("============================");

            console.log("Starting token creation...");

            if (useWalletProvider) {
                const balance = await connection.getBalance(publicKey);
                const balanceInSOL = balance / LAMPORTS_PER_SOL;

                console.log("=== WALLET DEBUG INFO ===");
                console.log("Connected wallet address:", publicKey.toBase58());
                console.log("Raw balance (lamports):", balance);
                console.log("Balance in SOL:", balanceInSOL);
                console.log("RPC endpoint:", connection.rpcEndpoint);
                console.log("========================");

                const mintRentExemption = await getMinimumBalanceForRentExemptMint(connection);
                const accountRentExemption = await getMinimumBalanceForRentExemptAccount(connection);

                const estimatedCost = mintRentExemption + accountRentExemption + (0.005 * LAMPORTS_PER_SOL); // 0.005 SOL for fees

                console.log("Required costs:", {
                    mintRentExemption: mintRentExemption / LAMPORTS_PER_SOL,
                    accountRentExemption: accountRentExemption / LAMPORTS_PER_SOL,
                    estimatedTotal: estimatedCost / LAMPORTS_PER_SOL,
                    userHasEnough: balance >= estimatedCost
                });

                if (balance < estimatedCost) {
                    const needed = (estimatedCost - balance) / LAMPORTS_PER_SOL;
                    throw new Error(
                        `🐛 DEBUG INFO:\n` +
                        `Connected Address: ${publicKey.toBase58()}\n` +
                        `Current Balance: ${balanceInSOL.toFixed(6)} SOL\n` +
                        `RPC Endpoint: ${connection.rpcEndpoint}\n\n` +
                        `Insufficient SOL balance. You need ${(estimatedCost / LAMPORTS_PER_SOL).toFixed(4)} SOL total ` +
                        `(${needed.toFixed(4)} SOL more) to cover:\n` +
                        `• Token mint creation: ${(mintRentExemption / LAMPORTS_PER_SOL).toFixed(4)} SOL\n` +
                        `• Token account creation: ${(accountRentExemption / LAMPORTS_PER_SOL).toFixed(4)} SOL\n` +
                        `• Transaction fees: ~0.005 SOL\n\n` +
                        `🔍 Check:\n` +
                        `1. Is your wallet on Devnet?\n` +
                        `2. Is this the right account with 26 SOL?\n` +
                        `3. Try refreshing the page and reconnecting wallet`
                    );
                }
            }

            console.log("Creating token mint...");

            const mintKeypair = Keypair.generate();

            const lamports = await getMinimumBalanceForRentExemptMint(connection);

            const transaction = new Transaction().add(
                SystemProgram.createAccount({
                    fromPubkey: publicKey,
                    newAccountPubkey: mintKeypair.publicKey,
                    space: MINT_SIZE,
                    lamports,
                    programId: TOKEN_PROGRAM_ID,
                }),
                createInitializeMintInstruction(
                    mintKeypair.publicKey,
                    9, // decimals
                    publicKey, // mint authority
                    null // freeze authority
                )
            );
            transaction.feePayer = publicKey;
            transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
            transaction.partialSign(mintKeypair);

            const signature = await sendTransaction(transaction, connection);
            await connection.confirmTransaction(signature, 'confirmed');
            const mintAccount = mintKeypair.publicKey;

            console.log("Token mint created:", mintAccount.toBase58());

            const recipientPublicKey = new PublicKey(userAddress.trim());

            console.log("Creating token account...");

            const tokenAccountAddress = await getAssociatedTokenAddress(
                mintAccount,
                recipientPublicKey
            );

            const accountInfo = await connection.getAccountInfo(tokenAccountAddress);

            if (!accountInfo) {
                const createATATransaction = new Transaction().add(
                    createAssociatedTokenAccountInstruction(
                        publicKey,           // Payer
                        tokenAccountAddress, // Associated token account
                        recipientPublicKey,  // Owner
                        mintAccount          // Mint
                    )
                );

                const ataSignature = await sendTransaction(createATATransaction, connection);
                await connection.confirmTransaction(ataSignature, 'confirmed');
                console.log("Token account created:", tokenAccountAddress.toBase58());
            } else {
                console.log("Token account already exists:", tokenAccountAddress.toBase58());
            }

            console.log("Minting tokens...");
            const userTokenAmount = parseFloat(tokenAmount.trim());

            if (isNaN(userTokenAmount) || userTokenAmount <= 0) {
                throw new Error(`Invalid token amount: "${tokenAmount}". Please enter a valid number.`);
            }

            const rawAmount = Math.floor(userTokenAmount * Math.pow(10, 9));

            if (isNaN(rawAmount) || rawAmount <= 0) {
                throw new Error(`Invalid calculated amount. Please check your token amount: ${userTokenAmount}`);
            }

            const amount = BigInt(rawAmount);

            console.log(`Minting ${userTokenAmount} tokens (${amount.toString()} raw amount)`);

            const mintToTransaction = new Transaction().add(
                createMintToInstruction(
                    mintAccount,             // Mint
                    tokenAccountAddress,     // Destination
                    publicKey,               // Authority
                    amount                   // Amount
                )
            );

            const mintSignature = await sendTransaction(mintToTransaction, connection);
            await connection.confirmTransaction(mintSignature, 'confirmed');

            console.log("Mint transaction signature:", mintSignature);
            await waitForConfirmation(connection, mintSignature);
            console.log("Tokens minted successfully!");

            const tokenData = {
                mintAddress: mintAccount.toBase58(),
                tokenAccount: tokenAccountAddress.toBase58(),
                amount: userTokenAmount.toString(),
                recipient: userAddress.trim(),
                signature: mintSignature,
                payer: publicKey.toBase58()
            };

            setResult(tokenData);

            if (onTokenCreated) {
                onTokenCreated(tokenData);
            }

            setShouldStartMonitoring(true);

        } catch (err) {
            console.error("Error creating token:", err);

            let errorMessage = err.message;

            if (err.message.includes('User rejected')) {
                errorMessage = "Transaction was rejected. Please approve the transaction in your wallet.";
            } else if (err.message.includes('sendTransaction')) {
                errorMessage = "Wallet does not support required transaction features. Try using Phantom or Solflare wallet.";
            } else if (err.message.includes('Insufficient')) {
                errorMessage = err.message; 
            } else if (err.message.includes('blockhash')) {
                errorMessage = "Network congestion. Please try again in a few moments.";
            }

            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }

    const handleClearResults = () => {
        setResult(null);
        setError('');
        setUserAddress('');
        setTokenAmount('1000');
        setShouldStartMonitoring(false);
    };

    return (
        <div style={{
            maxWidth: '800px',
            margin: '20px auto',
            padding: '20px',
            fontFamily: 'Arial, sans-serif'
        }}>
            {useWalletProvider && (
                <div style={{
                    backgroundColor: connected ? '#d4edda' : '#f8d7da',
                    color: connected ? '#155724' : '#721c24',
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    border: `2px solid ${connected ? '#c3e6cb' : '#f5c6cb'}`,
                    textAlign: 'center'
                }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                        {connected ? '✅ Wallet Connected' : '❌ Wallet Not Connected'}
                    </div>
                    {connected && publicKey && (
                        <div style={{ fontSize: '14px' }}>
                            <strong>Address:</strong> <code>{publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-8)}</code>
                        </div>
                    )}

                    {useWalletProvider && connected && costBreakdown && (
                        <div style={{
                            backgroundColor: '#e7f3ff',
                            color: '#0066cc',
                            padding: '15px',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            border: '2px solid #b3d9ff'
                        }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '14px' }}>
                                💰 Token Creation Costs (One-time):
                            </div>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                                gap: '10px',
                                fontSize: '13px'
                            }}>
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>Mint Creation:</div>
                                    <div>{costBreakdown.mintRent.toFixed(6)} SOL</div>
                                </div>
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>Token Account:</div>
                                    <div>{costBreakdown.accountRent.toFixed(6)} SOL</div>
                                </div>
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>Network Fees:</div>
                                    <div>~{costBreakdown.fees.toFixed(3)} SOL</div>
                                </div>
                                <div style={{
                                    backgroundColor: '#ffffff',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid #90caf9'
                                }}>
                                    <div style={{ fontWeight: 'bold', color: '#1565c0' }}>Total Needed:</div>
                                    <div style={{ fontSize: '15px', fontWeight: 'bold' }}>
                                        {costBreakdown.total.toFixed(4)} SOL
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {!connected && (
                        <div style={{ fontSize: '14px' }}>
                            Please connect your wallet using the button above to create tokens
                        </div>
                    )}
                </div>
            )}

            <div style={{
                backgroundColor: '#f8f9fa',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '30px',
                border: '2px solid #e9ecef',
                opacity: useWalletProvider && (!connected || !sendTransaction) ? 0.6 : 1
            }}>
                <h3 style={{ marginTop: 0, color: '#495057' }}>🚀 Create New Token</h3>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontWeight: 'bold',
                        color: '#495057'
                    }}>
                        Enter Recipient Solana Address:
                    </label>
                    <input
                        type="text"
                        placeholder="e.g., 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
                        value={userAddress}
                        onChange={(e) => setUserAddress(e.target.value)}
                        disabled={isLoading || (useWalletProvider && (!connected || !sendTransaction))}
                        style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '6px',
                            border: '2px solid #ddd',
                            fontSize: '14px',
                            boxSizing: 'border-box',
                            transition: 'border-color 0.3s ease'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#007bff'}
                        onBlur={(e) => e.target.style.borderColor = '#ddd'}
                    />
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontWeight: 'bold',
                        color: '#495057'
                    }}>
                        Amount of Tokens to Mint:
                    </label>
                    <input
                        type="number"
                        placeholder="e.g., 1000"
                        value={tokenAmount}
                        onChange={(e) => setTokenAmount(e.target.value)}
                        disabled={isLoading || (useWalletProvider && !connected)}
                        min="0.000000001"
                        max="1000000"
                        step="0.000000001"
                        style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '6px',
                            border: '2px solid #ddd',
                            fontSize: '14px',
                            boxSizing: 'border-box',
                            transition: 'border-color 0.3s ease'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#007bff'}
                        onBlur={(e) => e.target.style.borderColor = '#ddd'}
                    />
                    <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                        Enter any amount between 0.000000001 and 1,000,000 tokens
                    </small>
                </div>

                <button
                    onClick={create}
                    disabled={isLoading || !userAddress.trim() || !tokenAmount.trim() || (useWalletProvider && (!connected || !sendTransaction))}
                    style={{
                        width: '100%',
                        padding: '15px',
                        backgroundColor: isLoading ? '#6c757d' : (useWalletProvider && (!connected || !sendTransaction)) ? '#dc3545' : '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        cursor: (isLoading || (useWalletProvider && (!connected || !sendTransaction))) ? 'not-allowed' : 'pointer',
                        transition: 'background-color 0.3s ease',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                >
                    {isLoading ? '⏳ Creating Token...' :
                        (useWalletProvider && !connected) ? '🔌 Connect Wallet First' :
                            (useWalletProvider && !sendTransaction) ? '❌ Wallet Not Compatible' :
                                tokenAmount.trim() ?
                                    `🪙 Create & Mint ${parseFloat(tokenAmount.trim()).toLocaleString()} Tokens` :
                                    '🪙 Create Token & Mint Tokens'}
                </button>

                <div style={{
                    marginTop: '15px',
                    display: 'flex',
                    gap: '10px',
                    flexWrap: 'wrap',
                    justifyContent: 'center'
                }}>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#495057', alignSelf: 'center' }}>
                        Quick amounts:
                    </span>
                    {['100', '1000', '10000', '100000'].map((amount) => (
                        <button
                            key={amount}
                            onClick={() => setTokenAmount(amount)}
                            disabled={isLoading || (useWalletProvider && (!connected || !sendTransaction))}
                            style={{
                                padding: '6px 12px',
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '12px',
                                cursor: (isLoading || (useWalletProvider && (!connected || !sendTransaction))) ? 'not-allowed' : 'pointer',
                                opacity: (isLoading || (useWalletProvider && (!connected || !sendTransaction))) ? 0.6 : 1
                            }}
                        >
                            {parseInt(amount).toLocaleString()}
                        </button>
                    ))}
                </div>

                {isLoading && (
                    <div style={{
                        marginTop: '15px',
                        padding: '10px',
                        backgroundColor: '#e7f3ff',
                        borderRadius: '6px',
                        border: '1px solid #b3d9ff',
                        fontSize: '14px'
                    }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>🔄 Token Creation in Progress:</div>
                        <div style={{ color: '#666' }}>
                            • Creating token mint with your wallet as authority...<br />
                            • Setting up associated token account...<br />
                            • Minting {tokenAmount} tokens to recipient address...<br />
                            • Please approve transactions in your wallet...
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <div style={{
                    backgroundColor: '#f8d7da',
                    color: '#721c24',
                    padding: '15px',
                    borderRadius: '6px',
                    marginBottom: '20px',
                    border: '1px solid #f5c6cb',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>❌ Error:</div>
                    {error}
                </div>
            )}

            {result && (
                <div style={{
                    backgroundColor: '#d4edda',
                    color: '#155724',
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '30px',
                    border: '2px solid #c3e6cb',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}>
                    <h3 style={{ margin: '0 0 15px 0', fontSize: '18px' }}>✅ Token Created Successfully!</h3>

                    <div style={{
                        display: 'grid',
                        gap: '12px',
                        fontSize: '14px',
                        lineHeight: '1.6'
                    }}>
                        <div style={{
                            backgroundColor: '#ffffff',
                            padding: '12px',
                            borderRadius: '6px',
                            border: '1px solid #c3e6cb'
                        }}>
                            <strong>🪙 Token Mint Address:</strong><br />
                            <code style={{
                                backgroundColor: '#f8f9fa',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                wordBreak: 'break-all',
                                fontSize: '13px'
                            }}>
                                {result.mintAddress}
                            </code>
                        </div>

                        <div style={{
                            backgroundColor: '#ffffff',
                            padding: '12px',
                            borderRadius: '6px',
                            border: '1px solid #c3e6cb'
                        }}>
                            <strong>👤 Recipient Address:</strong><br />
                            <code style={{
                                backgroundColor: '#f8f9fa',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                wordBreak: 'break-all',
                                fontSize: '13px'
                            }}>
                                {result.recipient}
                            </code>
                        </div>

                        <div style={{
                            backgroundColor: '#ffffff',
                            padding: '12px',
                            borderRadius: '6px',
                            border: '1px solid #c3e6cb'
                        }}>
                            <strong>💰 Amount Minted:</strong> {parseFloat(result.amount).toLocaleString()} tokens<br />
                            <strong>🔗 Transaction:</strong> <a
                                href={`https://explorer.solana.com/tx/${result.signature}${endpoint && endpoint.includes('devnet') ? '?cluster=devnet' : ''}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#007bff', textDecoration: 'none' }}
                            >
                                View on Solana Explorer
                            </a>
                        </div>

                        {useWalletProvider && (
                            <div style={{
                                backgroundColor: '#ffffff',
                                padding: '12px',
                                borderRadius: '6px',
                                border: '1px solid #c3e6cb'
                            }}>
                                <strong>🔑 Created by Wallet:</strong><br />
                                <code style={{
                                    backgroundColor: '#f8f9fa',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '13px'
                                }}>
                                    {result.payer}
                                </code>
                            </div>
                        )}
                    </div>

                    <div style={{
                        marginTop: '15px',
                        display: 'flex',
                        gap: '10px',
                        flexWrap: 'wrap'
                    }}>
                        <button
                            onClick={handleClearResults}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#6c757d',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            🔄 Create Another Token
                        </button>

                        <div style={{
                            padding: '10px',
                            backgroundColor: '#e7f3ff',
                            borderRadius: '4px',
                            fontSize: '12px',
                            color: '#0066cc',
                            flex: 1,
                            minWidth: '200px'
                        }}>
                            <strong>💡 Next:</strong> The address monitor below will automatically track your new tokens!
                        </div>
                    </div>
                </div>
            )}

            <AddressMonitor
                initialAddress={result ? result.recipient : ''}
                autoStart={shouldStartMonitoring}
                endpoint={endpoint}
            />
        </div>
    );
}

export default CreateToken;