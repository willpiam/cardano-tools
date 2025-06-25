import { useEffect } from 'react';
import './styles/globals.css';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { setWalletError, clearWalletError } from './store/errorSlice';
import {
  setWalletSelectList,
  setPreviewWallet,
  setPreviewAddress,
  setWalletBalance,
} from './store/networkSlice';
import { setQueue, setQueueError } from './store/queueSlice';
import {
  setCeremonies,
  setCeremonyError,
  updateCeremony,
  setPendingCeremony,
  setCeremonyStatus,
  setHasSignedCeremony,
} from './store/ceremonySlice';
import {
  setSelectedWallet,
  setAddress,
  setBalance,
  setLucid,
} from './store/walletSlice';
import { setActiveView, setShowWalletSelect } from './store/modalSlice';
import {
  setRecipientAddress,
  setSignupError,
  resetSignupForm,
} from './store/signupSlice';
import { Card } from './components/Card';
import { Button } from './components/Button';
import {
  Emulator,
  Lucid,
  fromText,
  paymentCredentialOf,
} from '@lucid-evolution/lucid';
import { HeadBox } from './components/HeadBox';
import Decoration from './components/Decoration';
import * as CML from '@anastasia-labs/cardano-multiplatform-lib-browser';
import { setProtocolParameters, setProtocolError } from './store/protocolSlice';
const POLLING_INTERVAL = 30000; // 30 seconds in milliseconds

function App() {
  const dispatch = useAppDispatch();
  const walletSelectList = useAppSelector(
    (state) => state.network.walletSelectList
  );
  const queue = useAppSelector((state) => state.queue.participants);
  const ceremonies = useAppSelector((state) => state.ceremony.ceremonies);
  const pendingCeremony = useAppSelector(
    (state) => state.ceremony.pendingCeremony
  );
  const ceremonyStatus = useAppSelector(
    (state) => state.ceremony.ceremonyStatus
  );
  const hasSignedCeremony = useAppSelector(
    (state) => state.ceremony.hasSignedCeremony
  );
  const selectedWallet = useAppSelector((state) => state.wallet.selectedWallet);
  const walletAddress = useAppSelector((state) => state.wallet.address);
  const lucid = useAppSelector((state) => state.wallet.lucid);
  const { activeView, showWalletSelect } = useAppSelector(
    (state) => state.modal
  );
  const recipientAddress = useAppSelector(
    (state) => state.signup.recipientAddress
  );
  const signupError = useAppSelector((state) => state.signup.error);
  const { minParticipants, uniformOutputValue } = useAppSelector(
    (state) => state.protocol
  );

  // Effect to get available wallets
  useEffect(() => {
    if (typeof (window as any).cardano === 'undefined') {
      dispatch(setWalletError('No Cardano wallet found'));
      return;
    }

    const labels = Object.keys((window as any).cardano);
    dispatch(setWalletSelectList(labels));
    dispatch(clearWalletError());
  }, [dispatch]);
  console.log({ walletSelectList });
  // Effect to fetch protocol parameters
  useEffect(() => {
    const fetchProtocolParameters = async () => {
      try {
        const response = await fetch(
          `${process.env.REACT_APP_BASE_SERVER_URL}/protocol_parameters`
        );
        if (!response.ok) {
          throw new Error('Failed to fetch protocol parameters');
        }
        const data = await response.json();
        dispatch(setProtocolParameters(data));
      } catch (error) {
        console.error('Error fetching protocol parameters:', error);
        dispatch(
          setProtocolError(
            error instanceof Error
              ? error.message
              : 'Failed to fetch protocol parameters'
          )
        );
      }
    };

    fetchProtocolParameters();
  }, [dispatch]);

  const handleWalletSelect = async (walletName: string) => {
    try {
      const wallet = (window as any).cardano[walletName];
      const api = await wallet.enable();

      // Initialize Lucid
      const _lucid = await Lucid(new Emulator([]), 'Preview');

      _lucid.selectWallet.fromAPI(api);
      dispatch(setLucid(_lucid));
      const address = await _lucid.wallet().address();

      // Get wallet balance
      const utxos = await _lucid.wallet().getUtxos();
      const walletBalance = utxos.reduce(
        (acc, utxo) => acc + utxo.assets.lovelace,
        BigInt(0)
      );

      dispatch(setPreviewWallet(walletName));
      dispatch(setPreviewAddress(address));
      dispatch(setWalletBalance({ lovelace: walletBalance }));
      dispatch(setSelectedWallet(walletName));
      dispatch(setAddress(address));
      dispatch(setBalance(walletBalance));
    } catch (error) {
      console.error('Failed to connect to wallet:', error);
      dispatch(setWalletError('Failed to connect to wallet'));
    }
  };

  const fetchData = async () => {
    console.log('fetching data');
    try {
      // Fetch queue
      const queueResponse = await fetch(
        `${process.env.REACT_APP_BASE_SERVER_URL}/queue`
      );
      if (queueResponse.ok) {
        const queueData = await queueResponse.json();
        dispatch(setQueue(queueData));
        dispatch(setQueueError(null));
      }

      // Fetch ceremonies
      const ceremoniesResponse = await fetch(
        `${process.env.REACT_APP_BASE_SERVER_URL}/list_active_ceremonies`
      );
      if (ceremoniesResponse.ok) {
        const ceremoniesData = await ceremoniesResponse.json();
        dispatch(setCeremonies(ceremoniesData));
        dispatch(setCeremonyError(null));
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      if (error instanceof Error) {
        dispatch(setQueueError(error.message));
        dispatch(setCeremonyError(error.message));
      }
    }
  };


  const handleSignup = async () => {
    if (!walletAddress || !recipientAddress) {
      dispatch(setSignupError('Please provide both addresses'));
      return;
    }

    try {
      // Create the payload
      const payload = fromText(
        JSON.stringify({
          context:
            'By signing this message, you express your intention to participate in a Turn Mixing Ceremony. A transaction will be created, and you will be asked to sign it. Failure to do so will result in your wallet being blacklisted from the Turn service. By signing this message, you also confirm that you have backed up the private key of the receiving address.',
          address: walletAddress,
          recipient: recipientAddress,
          signupTimestamp: new Date(),
        })
      );

      console.log('signing message');
      // Sign the payload
      const signedMessage = await lucid
        .wallet()
        .signMessage(walletAddress, payload);
      console.log('signed message', signedMessage);

      // Send to API
      const response = await fetch(
        `${process.env.REACT_APP_BASE_SERVER_URL}/signup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            signedMessage,
            payload,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      // Success! Reset form
      dispatch(resetSignupForm());

      // fetch queue again ---------------------------------------------------------------------------------------------
      fetchData();
    } catch (error) {
      console.error('Signup failed:', error);
      dispatch(
        setSignupError(
          error instanceof Error ? error.message : 'Failed to sign up'
        )
      );
    }
  };

  // Effect to poll for queue and ceremonies data
  useEffect(() => {
    // Initial fetch
    // const fetchData = async () => {
    //   try {
    //     // Fetch queue
    //     const queueResponse = await fetch(
    //       `${process.env.REACT_APP_BASE_SERVER_URL}/queue`
    //     );
    //     if (queueResponse.ok) {
    //       const queueData = await queueResponse.json();
    //       dispatch(setQueue(queueData));
    //       dispatch(setQueueError(null));
    //     }

    //     // Fetch ceremonies
    //     const ceremoniesResponse = await fetch(
    //       `${process.env.REACT_APP_BASE_SERVER_URL}/list_active_ceremonies`
    //     );
    //     if (ceremoniesResponse.ok) {
    //       const ceremoniesData = await ceremoniesResponse.json();
    //       dispatch(setCeremonies(ceremoniesData));
    //       dispatch(setCeremonyError(null));
    //     }
    //   } catch (error) {
    //     console.error('Failed to fetch data:', error);
    //     if (error instanceof Error) {
    //       dispatch(setQueueError(error.message));
    //       dispatch(setCeremonyError(error.message));
    //     }
    //   }
    // };

    // Fetch immediately
    fetchData();

    // Set up polling interval
    const intervalId = setInterval(fetchData, POLLING_INTERVAL);

    // Cleanup on unmount
    return () => clearInterval(intervalId);
  }, []); // Empty dependency array since we want this to run once on mount

  // Effect to check for ceremonies that need signing
  useEffect(() => {
    if (!walletAddress || ceremonies.length === 0) {
      // Only reset if we haven't signed yet
      if (!hasSignedCeremony) {
        dispatch(setPendingCeremony(null));
      }
      return;
    }

    // Find the first ceremony where the user is a participant
    const userCeremony = ceremonies.find((ceremony) =>
      ceremony.participants.some((p: any) => p.address === walletAddress)
    );

    if (userCeremony) {
      // Check if user has already provided a witness
      const userPaymentCredentialHash = paymentCredentialOf(walletAddress).hash;
      const hasAlreadySigned = userCeremony.witnesses.some(
        (witness: string) => {
          try {
            const txWitness = CML.TransactionWitnessSet.from_cbor_hex(witness)
              .vkeywitnesses()
              ?.get(0);
            if (!txWitness) return false;
            const publicKey = txWitness.vkey();
            const witnessPaymentCredentialHash = publicKey.hash().to_hex();
            return witnessPaymentCredentialHash === userPaymentCredentialHash;
          } catch (error) {
            console.error('Error checking witness:', error);
            return false;
          }
        }
      );

      if (hasAlreadySigned) {
        // User has already signed, show status popup
        dispatch(setPendingCeremony(userCeremony));
        dispatch(setHasSignedCeremony(true));
      } else {
        // User needs to sign
        dispatch(setPendingCeremony(userCeremony));
        dispatch(setHasSignedCeremony(false));
      }
    } else if (!hasSignedCeremony) {
      // No ceremony found for user and they haven't signed anything
      dispatch(setPendingCeremony(null));
    }
  }, [ceremonies, walletAddress, hasSignedCeremony, dispatch]);

  // Effect to poll ceremony status after signing
  useEffect(() => {
    if (!hasSignedCeremony || !pendingCeremony) return;

    const pollStatus = async () => {
      try {
        const response = await fetch(
          `${process.env.REACT_APP_BASE_SERVER_URL}/ceremony_status?id=${pendingCeremony.id}`
        );
        const status = await response.text();
        dispatch(setCeremonyStatus(status));

        // If the ceremony is on-chain, stop polling
        if (status === 'on-chain') {
          return true;
        }

        // If the ceremony is still pending, fetch latest witness count
        if (status === 'pending') {
          const ceremoniesResponse = await fetch(
            `${process.env.REACT_APP_BASE_SERVER_URL}/list_active_ceremonies`
          );
          if (ceremoniesResponse.ok) {
            const ceremonies = await ceremoniesResponse.json();
            const updatedCeremony = ceremonies.find(
              (c: any) => c.id === pendingCeremony.id
            );
            if (updatedCeremony) {
              dispatch(setPendingCeremony(updatedCeremony));
              dispatch(updateCeremony(updatedCeremony));
            }
          }
        }

        return false;
      } catch (error) {
        console.error('Failed to fetch ceremony status:', error);
        return false;
      }
    };

    // Poll immediately
    pollStatus();

    // Set up polling interval
    const intervalId = setInterval(async () => {
      const shouldStop = await pollStatus();
      if (shouldStop) {
        clearInterval(intervalId);
      }
    }, POLLING_INTERVAL);

    // Cleanup
    return () => clearInterval(intervalId);
  }, [hasSignedCeremony, pendingCeremony, dispatch]);

  const handleSignCeremony = async (ceremonyId: string) => {
    try {
      const ceremony = ceremonies.find((c: any) => c.id === ceremonyId);
      if (!ceremony) {
        console.error('Ceremony not found');
        return;
      }
      const witness = await lucid
        .fromTx(ceremony.transaction)
        .partialSign.withWallet();
      console.log('witness', witness);
      const response = await fetch(
        `${process.env.REACT_APP_BASE_SERVER_URL}/submit_signature`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: ceremonyId, witness }),
        }
      );
      if (!response.ok) {
        throw new Error('Failed to submit signature');
      }
      console.log('Signature submitted successfully');
      dispatch(setHasSignedCeremony(true));
    } catch (error) {
      console.error('Failed to sign ceremony:', error);
    }
  };

  return (
    <div className="container">
      <div className="main">
        <HeadBox />
        {!selectedWallet && !showWalletSelect && (
          <div className="connect-wallet-container">
            <Button
              onClick={() => dispatch(setShowWalletSelect(true))}
              style={{ width: '100%', maxWidth: '400px' }}
            >
              Connect Wallet
            </Button>
            <Decoration />
          </div>
        )}
        {!selectedWallet && showWalletSelect && (
          <Card className="wallet-selection-card">
            <h3>Available Wallets</h3>
            <div className="animated-text">
              <p>
                Welcome to Turn Network, please connect your wallet to get
                started and begin protecting your financial data.
              </p>
            </div>
            {walletSelectList.length === 0 ? (
              <p>No wallets found. Please install a Cardano wallet.</p>
            ) : (
              <div className="wallet-list">
                {walletSelectList.map((wallet, index) => (
                  <button
                    key={index}
                    onClick={() => handleWalletSelect(wallet)}
                    className={`wallet-select-button ${selectedWallet === wallet ? 'selected' : ''
                      }`}
                  >
                    {wallet}
                  </button>
                ))}
              </div>
            )}
          </Card>
        )}

        {walletAddress && (
          <div className="post-wallet-container">
            <div className="nav-bar">
              <button
                className={`nav-button ${activeView === 'signup' ? 'active' : ''
                  }`}
                onClick={() => dispatch(setActiveView('signup'))}
              >
                Sign Up
              </button>
              <button
                className={`nav-button ${activeView === 'info' ? 'active' : ''
                  }`}
                onClick={() => dispatch(setActiveView('info'))}
              >
                Info
              </button>
            </div>

            {activeView === 'signup' && (
              <div className="signup-view">
                <Card>
                  {pendingCeremony &&
                    pendingCeremony.participants
                      .map((participant: any) => participant.address)
                      .includes(walletAddress) ? (
                    <>
                      <h2>
                        {hasSignedCeremony
                          ? 'Ceremony Status'
                          : 'Time to Sign!'}
                      </h2>
                      <div className="ceremony-status-container">
                        <div className="ceremony-details">
                          <p>
                            <strong>Ceremony ID:</strong> {pendingCeremony.id}
                          </p>
                          <p>
                            <strong>Total Participants:</strong>{' '}
                            {pendingCeremony.participants.length}
                          </p>
                          <p>
                            <strong>Signatures Collected:</strong>{' '}
                            {pendingCeremony.witnesses.length} of{' '}
                            {pendingCeremony.participants.length}
                          </p>
                          <p>
                            <strong>Transaction Hash:</strong>{' '}
                            <a
                              href={`https://preview.cardanoscan.io/transaction/${pendingCeremony.transactionHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="transaction-hash"
                            >
                              {pendingCeremony.transactionHash}
                            </a>
                          </p>
                        </div>

                        {hasSignedCeremony ? (
                          <div
                            className={`ceremony-status ${ceremonyStatus === 'on-chain'
                                ? 'ceremony-status-success'
                                : ceremonyStatus === 'pending'
                                  ? 'ceremony-status-pending'
                                  : 'ceremony-status-error'
                              }`}
                          >
                            {ceremonyStatus === 'pending' && (
                              <>
                                <div className="ceremony-status-icon">
                                  <div className="spinner"></div>
                                </div>
                                <div className="ceremony-status-content">
                                  <h3>Waiting for Other Signatures</h3>
                                  <p>
                                    The ceremony will be submitted once all
                                    participants have signed.
                                  </p>
                                </div>
                              </>
                            )}
                            {ceremonyStatus === 'on-chain' && (
                              <div className="ceremony-status-content">
                                <h3>Success!</h3>
                                <p>
                                  Transaction successfully submitted to chain!
                                </p>
                                {pendingCeremony.transactionHash && (
                                  <a
                                    href={`https://preview.cardanoscan.io/transaction/${pendingCeremony.transactionHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ceremony-transaction-link"
                                  >
                                    View Transaction
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            <div className="ceremony-action">
                              <div className="explanation-text">
                                <p>
                                  A ceremony has been created and is ready for
                                  your signature. Please review the details and
                                  sign the transaction to proceed with the
                                  mixing process.
                                </p>
                              </div>
                              <Button
                                onClick={() =>
                                  handleSignCeremony(pendingCeremony.id)
                                }
                                style={{
                                  width: '100%',
                                  marginTop: '1rem',
                                  backgroundColor: '#4CAF50',
                                  color: 'white',
                                }}
                              >
                                Sign Ceremony
                              </Button>
                            </div>
                            <div className="ceremony-participants">
                              <h4>Participants</h4>
                              {pendingCeremony.participants.map(
                                (participant: any, pIndex: number) => (
                                  <div
                                    key={pIndex}
                                    className={`ceremony-participant ${participant.address === walletAddress
                                        ? 'ceremony-participant-current'
                                        : ''
                                      }`}
                                  >
                                    <p>{participant.address}</p>
                                  </div>
                                )
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </>
                  ) : queue.some(
                    (participant) => participant.address === walletAddress
                  ) ? (
                    <>
                      <h2>Waiting for Participants</h2>
                      <div className="queue-status">
                        <div className="queue-status-icon">
                          <div className="spinner"></div>
                        </div>
                        <div className="queue-status-info">
                          {/* <p className="queue-position">
                            Position in Queue:{' '}
                            {queue.findIndex(
                              (p) => p.address === walletAddress
                            ) + 1}{' '}
                            of {queue.length}
                          </p> */}
                          <p className="queue-target">
                            Target Pool Size: {minParticipants} participants
                          </p>
                          <p className="queue-waiting">
                            Waiting for{' '}
                            {Math.max(0, minParticipants - queue.length)} more{' '}
                            {minParticipants - queue.length === 1
                              ? 'participant'
                              : 'participants'}{' '}
                            to join
                          </p>
                        </div>
                      </div>
                      <div className="explanation-text">
                        <p>
                          Once enough participants join the queue, a mixing
                          ceremony will be created automatically. You will be
                          notified when it's time to sign the transaction.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <h2></h2>
                      <div className="explanation-text">
                        <p>
                          Enter a receiving address. Click "Sign Up". You will
                          be prompted to sign a message expressing your
                          intention to participate in a Turn Mixing Ceremony.
                          Once signed you will be added to the queue. After
                          enough participants have joined the queue a
                          transaction will be created and you will be asked to
                          sign it. Once all participants have signed the
                          transaction it will be submitted to the chain.
                        </p>
                      </div>
                      <div className="signup-form">
                        <div className="mixing-amount-options">
                          <label className="form-label">Select Token</label>
                          <select className="currency-select">
                            <option value="ada">ADA</option>
                            <option value="rsbtc" disabled>
                              rsBTC (Coming Soon)
                            </option>
                            <option value="snek" disabled>
                              Snek (Coming Soon)
                            </option>
                            <option value="usdm" disabled>
                              USDM (Coming Soon)
                            </option>
                          </select>
                          <label className="form-label">Select Amount</label>
                          <button className="mixing-amount-button selected">
                            {(
                              parseInt(uniformOutputValue) / 1_000_000
                            ).toLocaleString()}{' '}
                            ADA
                          </button>
                          <button className="mixing-amount-button" disabled>
                            5,000 ADA
                          </button>
                          <button className="mixing-amount-button" disabled>
                            10,000 ADA
                          </button>
                          <button className="mixing-amount-button" disabled>
                            100,000 ADA
                          </button>
                        </div>
                        <label className="form-label">Recipient Address</label>
                        <input
                          type="text"
                          value={recipientAddress}
                          onChange={(e) =>
                            dispatch(setRecipientAddress(e.target.value))
                          }
                          placeholder="Enter recipient address"
                          className="signup-input"
                        />
                        {signupError && (
                          <p className="signup-error">{signupError}</p>
                        )}
                        <Button
                          onClick={handleSignup}
                          style={{ width: '100%' }}
                        >
                          Sign Up
                        </Button>
                        <div className="explanation-text">
                          <p>
                            To remain anonymous, please enter a receiving
                            address that is not associated with your wallet and
                            which you have not previously used for any purpose.
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </Card>
              </div>
            )}

            {activeView === 'info' && (
              <div className="info-container">
                <Card>
                  <h3>About Turn Network</h3>
                  <p>
                    Turn Network is a decentralized mixing service for Cardano.
                    It helps protect your financial privacy by breaking the
                    on-chain link between source and destination addresses.
                  </p>

                  <h4>How it Works</h4>
                  <ul>
                    <li>
                      Sign up with your source address and a fresh destination
                      address
                    </li>
                    <li>Wait for enough participants to join the queue</li>
                    <li>Sign the mixing transaction when prompted</li>
                    <li>
                      Receive your mixed funds at your destination address
                    </li>
                  </ul>

                  <h4>Security Features</h4>
                  <ul>
                    <li>Fully decentralized - no custodial risk</li>
                  </ul>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
