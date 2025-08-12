import React, { useState, useEffect } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';

const AddressMonitor = ({ initialAddress = '', autoStart = false }) => {
    const [monitoringAddress, setMonitoringAddress] = useState(initialAddress);
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [monitoringData, setMonitoringData] = useState(null);
    const [monitoringError, setMonitoringError] = useState('');

    const HELIUS_API_KEY = "8f349fdb-b015-4c10-93f6-0dba07db1287";
    const HELIUS_RPC_URL = `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

    const isValidSolanaAddress = (address) => {
        try {
            new PublicKey(address);
            return true;
        } catch {
            return false;
        }
    };

    const getAccountInfo = async (address) => {
        try {
            const connection = new Connection(HELIUS_RPC_URL, 'confirmed');
            const publicKey = new PublicKey(address);

            const balance = await connection.getBalance(publicKey);

            const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
                programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
            });

            return {
                solBalance: balance / 1000000000, // Convert lamports to SOL
                tokenAccounts: tokenAccounts.value.map(account => ({
                    address: account.pubkey.toBase58(),
                    mint: account.account.data.parsed.info.mint,
                    amount: account.account.data.parsed.info.tokenAmount.uiAmount || 0,
                    decimals: account.account.data.parsed.info.tokenAmount.decimals
                }))
            };
        } catch (error) {
            throw new Error(`Failed to fetch account info: ${error.message}`);
        }
    };

    const getRecentTransactions = async (address) => {
        try {
            const response = await fetch(`https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${HELIUS_API_KEY}&limit=10`);

            if (!response.ok) {
                console.warn('Helius API request failed, using basic transaction data');
                return [];
            }

            const transactions = await response.json();

            return transactions.map(tx => ({
                signature: tx.signature,
                timestamp: new Date(tx.timestamp * 1000).toISOString(),
                type: tx.type || 'UNKNOWN',
                description: tx.description || 'Transaction',
                success: !tx.err
            }));
        } catch (error) {
            console.warn('Failed to fetch transactions from Helius:', error);
            return [];
        }
    };

    const monitorAddress = async (address) => {
        if (!address.trim()) {
            setMonitoringError('Please enter an address to monitor');
            return;
        }

        if (!isValidSolanaAddress(address.trim())) {
            setMonitoringError('Please enter a valid Solana address');
            return;
        }

        setIsMonitoring(true);
        setMonitoringError('');

        try {
            console.log('Monitoring address:', address.trim());

            const accountInfo = await getAccountInfo(address.trim());

            const recentTransactions = await getRecentTransactions(address.trim());

            setMonitoringData({
                address: address.trim(),
                ...accountInfo,
                recentTransactions,
                lastUpdated: new Date().toISOString()
            });

        } catch (error) {
            console.error('Monitoring error:', error);
            setMonitoringError(error.message);
        } finally {
            setIsMonitoring(false);
        }
    };

    useEffect(() => {
        if (monitoringData && !isMonitoring) {
            const interval = setInterval(() => {
                console.log('Auto-refreshing monitoring data...');
                monitorAddress(monitoringData.address);
            }, 30000); // Refresh every 30 seconds

            return () => clearInterval(interval);
        }
    }, [monitoringData, isMonitoring]);

    useEffect(() => {
        if (initialAddress && autoStart && !monitoringData) {
            setMonitoringAddress(initialAddress);
            setTimeout(() => {
                monitorAddress(initialAddress);
            }, 2000); // Small delay to ensure everything is loaded
        }
    }, [initialAddress, autoStart]);

    useEffect(() => {
        if (initialAddress && initialAddress !== monitoringAddress) {
            setMonitoringAddress(initialAddress);
        }
    }, [initialAddress]);

    const stopMonitoring = () => {
        setMonitoringData(null);
        setMonitoringAddress('');
        setMonitoringError('');
    };

    const refreshMonitoring = () => {
        if (monitoringData) {
            monitorAddress(monitoringData.address);
        }
    };

    return (
        <div style={{
            backgroundColor: '#e3f2fd',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '30px',
            border: '2px solid #90caf9'
        }}>
            <h3 style={{ marginTop: 0, color: '#1565c0' }}>📊 Address Monitor (Powered by Helius)</h3>

            <div style={{ marginBottom: '20px' }}>
                <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: 'bold',
                    color: '#1565c0'
                }}>
                    Monitor Solana Address:
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                        type="text"
                        placeholder="Enter address to monitor"
                        value={monitoringAddress}
                        onChange={(e) => setMonitoringAddress(e.target.value)}
                        disabled={isMonitoring}
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: '6px',
                            border: '2px solid #ddd',
                            fontSize: '14px'
                        }}
                    />
                    <button
                        onClick={() => monitorAddress(monitoringAddress)}
                        disabled={isMonitoring || !monitoringAddress.trim()}
                        style={{
                            padding: '12px 20px',
                            backgroundColor: isMonitoring ? '#ccc' : '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: isMonitoring ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        {isMonitoring ? '⏳ Loading...' : '🔍 Monitor'}
                    </button>
                </div>
            </div>

            {monitoringData && (
                <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                        onClick={refreshMonitoring}
                        disabled={isMonitoring}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#17a2b8',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        🔄 Refresh
                    </button>
                    <button
                        onClick={stopMonitoring}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        ⏹️ Stop Monitoring
                    </button>

                    <div style={{
                        padding: '8px 12px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        alignSelf: 'center'
                    }}>
                        🟢 Live Monitoring Active
                    </div>
                </div>
            )}

            {monitoringError && (
                <div style={{
                    backgroundColor: '#f8d7da',
                    color: '#721c24',
                    padding: '12px',
                    borderRadius: '6px',
                    marginBottom: '20px',
                    border: '1px solid #f5c6cb'
                }}>
                    <strong>⚠️ Monitoring Error:</strong> {monitoringError}
                </div>
            )}

            {monitoringData && (
                <div style={{
                    backgroundColor: 'white',
                    color: '#333',
                    padding: '20px',
                    borderRadius: '8px',
                    border: '2px solid #90caf9',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                    <h4 style={{ margin: '0 0 15px 0', color: '#1565c0', fontSize: '16px' }}>📊 Monitoring Results</h4>

                    <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                            gap: '15px',
                            marginBottom: '20px'
                        }}>
                            <div style={{
                                backgroundColor: '#f8f9fa',
                                padding: '15px',
                                borderRadius: '6px',
                                border: '1px solid #dee2e6'
                            }}>
                                <div style={{ fontWeight: 'bold', color: '#495057', marginBottom: '8px' }}>
                                    📍 Address Being Monitored
                                </div>
                                <code style={{
                                    backgroundColor: 'white',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    wordBreak: 'break-all',
                                    fontSize: '12px',
                                    border: '1px solid #ddd'
                                }}>
                                    {monitoringData.address}
                                </code>
                            </div>

                            <div style={{
                                backgroundColor: '#f8f9fa',
                                padding: '15px',
                                borderRadius: '6px',
                                border: '1px solid #dee2e6'
                            }}>
                                <div style={{ fontWeight: 'bold', color: '#495057', marginBottom: '8px' }}>
                                    💰 SOL Balance
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#28a745' }}>
                                    {monitoringData.solBalance.toFixed(4)} SOL
                                </div>
                            </div>

                            <div style={{
                                backgroundColor: '#f8f9fa',
                                padding: '15px',
                                borderRadius: '6px',
                                border: '1px solid #dee2e6'
                            }}>
                                <div style={{ fontWeight: 'bold', color: '#495057', marginBottom: '8px' }}>
                                    🪙 Token Accounts
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#007bff' }}>
                                    {monitoringData.tokenAccounts.length} accounts
                                </div>
                            </div>
                        </div>

                        {monitoringData.tokenAccounts.length > 0 && (
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ fontWeight: 'bold', color: '#495057', marginBottom: '10px', fontSize: '15px' }}>
                                    🏦 Token Holdings:
                                </div>
                                <div style={{
                                    maxHeight: '200px',
                                    overflowY: 'auto',
                                    border: '1px solid #dee2e6',
                                    borderRadius: '6px'
                                }}>
                                    {monitoringData.tokenAccounts.map((token, index) => (
                                        <div key={index} style={{
                                            padding: '12px',
                                            backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white',
                                            borderBottom: index < monitoringData.tokenAccounts.length - 1 ? '1px solid #dee2e6' : 'none'
                                        }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                <div>
                                                    <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Token Mint:</div>
                                                    <code style={{ fontSize: '11px', color: '#495057' }}>
                                                        {token.mint.slice(0, 16)}...{token.mint.slice(-8)}
                                                    </code>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Balance:</div>
                                                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#28a745' }}>
                                                        {token.amount.toLocaleString()} tokens
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{ marginBottom: '15px' }}>
                            <div style={{ fontWeight: 'bold', color: '#495057', marginBottom: '10px', fontSize: '15px' }}>
                                📈 Recent Transactions: {monitoringData.recentTransactions.length}
                            </div>

                            {monitoringData.recentTransactions.length > 0 ? (
                                <div style={{
                                    maxHeight: '250px',
                                    overflowY: 'auto',
                                    border: '1px solid #dee2e6',
                                    borderRadius: '6px'
                                }}>
                                    {monitoringData.recentTransactions.slice(0, 5).map((tx, index) => (
                                        <div key={index} style={{
                                            padding: '12px',
                                            backgroundColor: tx.success ? '#f0f8f0' : '#fdf2f2',
                                            borderBottom: index < Math.min(monitoringData.recentTransactions.length, 5) - 1 ? '1px solid #dee2e6' : 'none',
                                            borderLeft: `4px solid ${tx.success ? '#28a745' : '#dc3545'}`
                                        }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>
                                                        {tx.success ? '✅' : '❌'} {tx.type}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                                                        {tx.description}
                                                    </div>
                                                    <code style={{ fontSize: '10px', color: '#999' }}>
                                                        {tx.signature.slice(0, 12)}...{tx.signature.slice(-8)}
                                                    </code>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '11px', color: '#666' }}>
                                                        {new Date(tx.timestamp).toLocaleDateString()}
                                                    </div>
                                                    <div style={{ fontSize: '10px', color: '#999' }}>
                                                        {new Date(tx.timestamp).toLocaleTimeString()}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{
                                    padding: '20px',
                                    backgroundColor: '#f8f9fa',
                                    borderRadius: '6px',
                                    border: '1px solid #dee2e6',
                                    textAlign: 'center',
                                    color: '#666'
                                }}>
                                    📭 No recent transactions found
                                </div>
                            )}
                        </div>

                        <div style={{
                            fontSize: '12px',
                            color: '#666',
                            textAlign: 'center',
                            padding: '10px',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '4px',
                            border: '1px solid #dee2e6'
                        }}>
                            <strong>Last Updated:</strong> {new Date(monitoringData.lastUpdated).toLocaleString()}
                            <br />
                            <em>🔄 Auto-refreshes every 30 seconds</em>
                        </div>
                    </div>
                </div>
            )}

            <div style={{
                backgroundColor: '#fff3cd',
                padding: '15px',
                borderRadius: '6px',
                fontSize: '13px',
                lineHeight: '1.5',
                border: '1px solid #ffeaa7',
                marginTop: '20px'
            }}>
                <h5 style={{ margin: '0 0 8px 0', color: '#856404' }}>🎯 Monitor Features:</h5>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                    <div>✅ Real-time SOL balance tracking</div>
                    <div>✅ Complete token portfolio overview</div>
                    <div>✅ Recent transaction history</div>
                    <div>✅ Auto-refresh every 30 seconds</div>
                    <div>✅ Enhanced data via Helius APIs</div>
                    <div>✅ Live monitoring indicators</div>
                </div>
            </div>
        </div>
    );
};

export default AddressMonitor;