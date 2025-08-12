import CreateToken from "./createToken";
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import {
  WalletModalProvider,
  WalletDisconnectButton,
  WalletMultiButton
} from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import React, { useState } from "react";

// Import CSS for wallet adapter UI
import '@solana/wallet-adapter-react-ui/styles.css';

export function Dashboard() {
  const [createdToken, setCreatedToken] = useState(null);

  const wallets = [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
  ];

  // Use devnet for testing (change to mainnet for production)
  const endpoint = "https://api.devnet.solana.com";
  // For mainnet: "https://solana-mainnet.g.alchemy.com/v2/yBzlkWFR7LyZlmSKMjCBgTJEYK9LIktp"

  const handleTokenCreated = (tokenData) => {
    setCreatedToken(tokenData);
    console.log("Token created:", tokenData);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '20px 0'
    }}>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            {/* Header with wallet buttons */}
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              marginBottom: '20px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div>
                <h1 style={{
                  margin: 0,
                  color: '#333',
                  fontSize: '24px'
                }}>
                  🚀 Solana Token Creator
                </h1>
                <p style={{
                  margin: '5px 0 0 0',
                  color: '#666',
                  fontSize: '14px'
                }}>
                  Create and mint custom tokens with wallet integration
                </p>
              </div>

              <div style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'center'
              }}>
                <WalletMultiButton style={{
                  backgroundColor: '#512da8',
                  borderRadius: '8px'
                }} />
                <WalletDisconnectButton style={{
                  backgroundColor: '#d32f2f',
                  borderRadius: '8px'
                }} />
              </div>
            </div>

            <div style={{
              textAlign: 'center',
              marginBottom: '20px'
            }}>
              <span style={{
                display: 'inline-block',
                padding: '8px 16px',
                backgroundColor: endpoint.includes('devnet') ? '#e3f2fd' : '#fff3e0',
                color: endpoint.includes('devnet') ? '#1976d2' : '#f57c00',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: 'bold',
                border: `2px solid ${endpoint.includes('devnet') ? '#90caf9' : '#ffb74d'}`
              }}>
                🌐 Connected to: {endpoint.includes('devnet') ? 'Devnet (Test Network)' : 'Mainnet (Live Network)'}
              </span>
            </div>

            <div style={{
              maxWidth: '1200px',
              margin: '0 auto',
              padding: '0 20px'
            }}>

              <CreateToken
                onTokenCreated={handleTokenCreated}
                useWalletProvider={true}
              />

              {createdToken && (
                <div style={{
                  backgroundColor: '#e8f5e8',
                  border: '2px solid #4caf50',
                  borderRadius: '12px',
                  padding: '20px',
                  marginTop: '30px',
                  textAlign: 'center'
                }}>
                  <h2 style={{
                    color: '#2e7d32',
                    margin: '0 0 15px 0',
                    fontSize: '20px'
                  }}>
                    🎉 Token Launch Successful!
                  </h2>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '15px',
                    marginTop: '20px'
                  }}>
                    <div style={{
                      backgroundColor: 'white',
                      padding: '15px',
                      borderRadius: '8px',
                      border: '1px solid #c8e6c9'
                    }}>
                      <div style={{ fontWeight: 'bold', color: '#2e7d32', marginBottom: '5px' }}>
                        🪙 Token Address
                      </div>
                      <code style={{
                        fontSize: '12px',
                        wordBreak: 'break-all',
                        color: '#666'
                      }}>
                        {createdToken.mintAddress}
                      </code>
                    </div>

                    <div style={{
                      backgroundColor: 'white',
                      padding: '15px',
                      borderRadius: '8px',
                      border: '1px solid #c8e6c9'
                    }}>
                      <div style={{ fontWeight: 'bold', color: '#2e7d32', marginBottom: '5px' }}>
                        💰 Amount Minted
                      </div>
                      <div style={{ fontSize: '16px', color: '#333' }}>
                        {parseFloat(createdToken.amount).toLocaleString()} tokens
                      </div>
                    </div>

                    <div style={{
                      backgroundColor: 'white',
                      padding: '15px',
                      borderRadius: '8px',
                      border: '1px solid #c8e6c9'
                    }}>
                      <div style={{ fontWeight: 'bold', color: '#2e7d32', marginBottom: '5px' }}>
                        🔗 Transaction
                      </div>
                      <a
                        href={`https://explorer.solana.com/tx/${createdToken.signature}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#1976d2',
                          textDecoration: 'none',
                          fontSize: '14px',
                          fontWeight: 'bold'
                        }}
                      >
                        View on Explorer →
                      </a>
                    </div>
                  </div>

                  <div style={{
                    marginTop: '20px',
                    padding: '15px',
                    backgroundColor: '#f3e5f5',
                    borderRadius: '8px',
                    border: '1px solid #e1bee7'
                  }}>
                    <div style={{ fontWeight: 'bold', color: '#7b1fa2', marginBottom: '8px' }}>
                      📊 What's Next?
                    </div>
                    <div style={{ fontSize: '14px', color: '#4a148c' }}>
                      Your tokens are now minted and can be monitored below.
                      The address monitor will automatically track balance changes and transactions.
                    </div>
                  </div>
                </div>
              )}

              <div style={{
                backgroundColor: 'white',
                padding: '25px',
                borderRadius: '12px',
                marginTop: '30px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                border: '1px solid #e0e0e0'
              }}>
                <h3 style={{
                  margin: '0 0 20px 0',
                  color: '#333',
                  fontSize: '18px'
                }}>
                  📋 How to Use This Token Creator
                </h3>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '20px'
                }}>
                  <div style={{
                    padding: '20px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #dee2e6'
                  }}>
                    <div style={{
                      fontWeight: 'bold',
                      color: '#495057',
                      marginBottom: '10px',
                      fontSize: '16px'
                    }}>
                      🔌 Step 1: Connect Wallet
                    </div>
                    <div style={{ fontSize: '14px', color: '#6c757d', lineHeight: '1.5' }}>
                      Click "Connect Wallet" and choose your preferred Solana wallet (Phantom, Solflare, etc.).
                      Make sure you're on the correct network (Devnet for testing).
                    </div>
                  </div>

                  <div style={{
                    padding: '20px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #dee2e6'
                  }}>
                    <div style={{
                      fontWeight: 'bold',
                      color: '#495057',
                      marginBottom: '10px',
                      fontSize: '16px'
                    }}>
                      🪙 Step 2: Create & Mint
                    </div>
                    <div style={{ fontSize: '14px', color: '#6c757d', lineHeight: '1.5' }}>
                      Enter the recipient address, specify how many tokens to mint, and click create.
                      Your wallet will sign the transactions automatically.
                    </div>
                  </div>

                  <div style={{
                    padding: '20px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #dee2e6'
                  }}>
                    <div style={{
                      fontWeight: 'bold',
                      color: '#495057',
                      marginBottom: '10px',
                      fontSize: '16px'
                    }}>
                      📊 Step 3: Monitor Activity
                    </div>
                    <div style={{ fontSize: '14px', color: '#6c757d', lineHeight: '1.5' }}>
                      Use the built-in address monitor to track your token balance,
                      transaction history, and real-time updates automatically.
                    </div>
                  </div>
                </div>

                <div style={{
                  marginTop: '20px',
                  padding: '15px',
                  backgroundColor: '#fff3cd',
                  borderRadius: '6px',
                  border: '1px solid #ffeaa7'
                }}>
                  <div style={{
                    fontWeight: 'bold',
                    color: '#856404',
                    marginBottom: '5px'
                  }}>
                    ⚠️ Important Notes:
                  </div>
                  <ul style={{
                    margin: '0',
                    paddingLeft: '20px',
                    fontSize: '13px',
                    color: '#856404'
                  }}>
                    <li>Currently using Devnet (test network) - no real SOL required</li>
                    <li>Switch endpoint to mainnet for production use</li>
                    <li>Keep your wallet connected for the best experience</li>
                    <li>All transactions are signed through your connected wallet</li>
                  </ul>
                </div>
              </div>
            </div>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </div>
  );
}
