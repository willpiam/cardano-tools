import { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  // CardFooter,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
// import { Input } from '../components/ui/input';
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from '../components/ui/select';
// import { Switch } from '../components/ui/switch';
// import { Slider } from '../components/ui/slider';
// import { Label } from '../components/ui/label';
import {
  // ArrowRightLeft,
  // Shield,
  // Clock,
  // Info,
  // AlertTriangle,
  Wallet,
  // CheckCircle2,
} from 'lucide-react';
// import { useToast } from '../hooks/use-toast';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { CML, fromText, paymentCredentialOf } from '@lucid-evolution/lucid';
import {
  resetSignupForm,
  setRecipientAddress,
  setSignupError,
} from '../store/signupSlice';
import {
  setCeremonies,
  setCeremonyError,
  setCeremonyStatus,
  setHasSignedCeremony,
  setPendingCeremony,
  updateCeremony,
} from '../store/ceremonySlice';
import ConnectWallet from './ConnectWallet';
import { setQueue, setQueueError } from '../store/queueSlice';
import {
  setProtocolError,
  setProtocolParameters,
} from '../store/protocolSlice';

// const tokens = [
//   {
//     id: 'ada',
//     name: 'ADA',
//     symbol: '₳',
//     logo: 'https://cryptologos.cc/logos/cardano-ada-logo.png?v=026',
//     balance: '2,450.75',
//   },
//   {
//     id: 'milk',
//     name: 'MILK',
//     symbol: 'MILK',
//     logo: 'https://muesliswap.com/static/tokens/milk.png',
//     balance: '10,000.00',
//   },
//   {
//     id: 'lq',
//     name: 'LQ',
//     symbol: 'LQ',
//     logo: 'https://liqwid.finance/assets/tokens/lq.svg',
//     balance: '500.00',
//   },
//   {
//     id: 'min',
//     name: 'MIN',
//     symbol: 'MIN',
//     logo: 'https://minswap.org/assets/min-symbol.png',
//     balance: '1,275.50',
//   },
// ];

// Mock transaction history data
// const mockTransactions = [
//   {
//     id: 'tx1',
//     date: new Date().toISOString(),
//     amount: '100',
//     token: 'ADA',
//     status: 'completed',
//   },
//   {
//     id: 'tx2',
//     date: new Date(Date.now() - 86400000).toISOString(),
//     amount: '500',
//     token: 'MILK',
//     status: 'pending',
//   },
// ];
const POLLING_INTERVAL = 30000;
// const POLLING_INTERVAL = 10000;
const MixingInterface = () => {
  // const [selectedToken, setSelectedToken] = useState('ada');
  // const [amount, setAmount] = useState('');
  const dispatch = useAppDispatch();
  // const [privacyLevel, setPrivacyLevel] = useState([70]);
  // const [advancedPrivacy, setAdvancedPrivacy] = useState(false);
  // const [isLoading, setIsLoading] = useState(false);
  // const { toast } = useToast();
  const ceremonyStatus = useAppSelector(
    (state) => state.ceremony.ceremonyStatus
  );
  const signupError = useAppSelector((state) => state.signup.error);
  const recipientAddress = useAppSelector(
    (state) => state.signup.recipientAddress
  );
  const { minParticipants, uniformOutputValue } = useAppSelector(
    (state) => state.protocol
  );
  const queue = useAppSelector((state) => state.queue.participants);
  const walletAddress = useAppSelector((state) => state.wallet.address);
  const hasSignedCeremony = useAppSelector(
    (state) => state.ceremony.hasSignedCeremony
  );
  const ceremonies = useAppSelector((state) => state.ceremony.ceremonies);
  const { activeView, showWalletSelect } = useAppSelector(
    (state) => state.modal
  );
  const { isWalletConnected } = useAppSelector(
    (state) => state.walletConnected
  );
  const lucid = useAppSelector((state) => state.wallet.lucid);
  const pendingCeremony = useAppSelector(
    (state) => state.ceremony.pendingCeremony
  );

  const [ isLoading, setIsLoading ] = useState(false);

  // const handleMix = () => {
  //   if (!isWalletConnected) {
  //     toast({
  //       title: 'Wallet not connected',
  //       description: 'Please connect your wallet first',
  //       variant: 'destructive',
  //     });
  //     return;
  //   }

  //   if (!amount || parseFloat(amount) <= 0) {
  //     toast({
  //       title: 'Invalid amount',
  //       description: 'Please enter a valid amount to mix',
  //       variant: 'destructive',
  //     });
  //     return;
  //   }

  //   // setIsLoading(true);
  //   // Simulate mixing process
  //   setTimeout(() => {
  //     toast({
  //       title: 'Mixing initiated',
  //       description: `Your ${amount} ${
  //         tokens.find((t) => t.id === selectedToken)?.symbol || selectedToken
  //       } is being mixed`,
  //     });
  //     // setIsLoading(false);
  //     // Add to transaction history
  //     mockTransactions.unshift({
  //       id: `tx${mockTransactions.length + 1}`,
  //       date: new Date().toISOString(),
  //       amount: amount,
  //       token:
  //         tokens.find((t) => t.id === selectedToken)?.symbol || selectedToken,
  //       status: 'pending',
  //     });
  //   }, 2000);
  // };

  // const connectWallet = () => {
  //   toast({
  //     title: 'Connecting wallet...',
  //     description: 'Attempting to connect to your wallet',
  //   });

  //   setTimeout(() => {
  //     toast({
  //       title: 'Wallet connected',
  //       description: 'Successfully connected to your wallet',
  //     });
  //   }, 1500);
  // };
  const handleSignup = async () => {
    if (!walletAddress || !recipientAddress) {
      dispatch(setSignupError('Please provide both addresses'));
      return;
    }

    try {
      // Create the payload
      setIsLoading(true);
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

      // fetch queue again

    } catch (error) {
      console.error('Signup failed:', error);
      dispatch(
        setSignupError(
          error instanceof Error ? error.message : 'Failed to sign up'
        )
      );
    }
    finally {
      setIsLoading(false);
    }
  };
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

  useEffect(() => {
    // Initial fetch
    const fetchData = async () => {
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

    // Fetch immediately
    fetchData();

    // Set up polling interval
    const intervalId = setInterval(fetchData, POLLING_INTERVAL);

    // Cleanup on unmount
    return () => clearInterval(intervalId);
  }, []);

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

  // const disconnectWallet = () => {
  //   // setIsWalletConnected(false);
  //   toast({
  //     title: 'Wallet disconnected',
  //     description: 'Your wallet has been disconnected',
  //   });
  // };

  // const selectedTokenInfo = tokens.find((t) => t.id === selectedToken);

  return (
    <Card className="w-full max-w-md mx-auto dark-blur border-primary/20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          <span className="gradient-text">Mix Your Tokens</span>
        </CardTitle>
        <CardDescription className="text-center text-muted-foreground">
          Enhanced privacy for your Cardano assets
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {!walletAddress ? (
          <div className="py-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Wallet className="h-8 w-8 text-primary" />
            </div>
            <p className="text-muted-foreground mb-6">
              Connect your wallet to start mixing tokens
            </p>
            {/* <Button
              className="gradient-bg text-black hover:opacity-90 transition-opacity font-medium"
              onClick={connectWallet}
            >
              <Wallet className="mr-2 h-4 w-4" /> Connect Wallet
            </Button> */}
            <ConnectWallet />
          </div>
        ) : (
          // <>
          //   <div className="flex items-center justify-between mb-4">
          //     <div className="flex items-center">
          //       <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center mr-2">
          //         <CheckCircle2 className="h-4 w-4 text-green-500" />
          //       </div>
          //       <span className="text-sm font-medium">Wallet Connected</span>
          //     </div>
          //     <Button
          //       variant="outline"
          //       size="sm"
          //       className="text-xs"
          //       onClick={disconnectWallet}
          //     >
          //       Disconnect
          //     </Button>
          //   </div>

          //   <div className="space-y-3">
          //     <Label htmlFor="token-select">Select Token</Label>
          //     <Select value={selectedToken} onValueChange={setSelectedToken}>
          //       <SelectTrigger
          //         id="token-select"
          //         className="w-full bg-background/50"
          //       >
          //         <SelectValue placeholder="Select token" />
          //       </SelectTrigger>
          //       <SelectContent>
          //         {tokens.map((token) => (
          //           <SelectItem
          //             key={token.id}
          //             value={token.id}
          //             className="flex items-center"
          //           >
          //             <div className="flex items-center">
          //               <img
          //                 src={token.logo}
          //                 alt={token.name}
          //                 className="w-5 h-5 mr-2 rounded-full"
          //                 onError={(e) => {
          //                   (e.target as HTMLImageElement).src =
          //                     'https://via.placeholder.com/20?text=?';
          //                 }}
          //               />
          //               <span>{token.name}</span>
          //             </div>
          //           </SelectItem>
          //         ))}
          //       </SelectContent>
          //     </Select>

          //     {selectedTokenInfo && (
          //       <div className="text-sm text-right text-muted-foreground">
          //         Balance: {selectedTokenInfo.balance}{' '}
          //         {selectedTokenInfo.symbol}
          //       </div>
          //     )}
          //   </div>

          //   <div className="space-y-3">
          //     <Label htmlFor="amount-input">Amount</Label>
          //     <div className="relative">
          //       <Input
          //         id="amount-input"
          //         type="number"
          //         placeholder="0.00"
          //         className="w-full bg-background/50 pr-16"
          //         value={amount}
          //         onChange={(e) => setAmount(e.target.value)}
          //         min="0"
          //       />
          //       <div className="absolute inset-y-0 right-3 flex items-center text-muted-foreground">
          //         {selectedTokenInfo?.symbol || ''}
          //       </div>
          //     </div>
          //   </div>

          //   <div className="space-y-3">
          //     <div className="flex items-center justify-between">
          //       <Label htmlFor="privacy-slider" className="flex items-center">
          //         <Shield className="w-4 h-4 mr-2 text-primary" />
          //         Privacy Level
          //       </Label>
          //       <span className="text-sm text-muted-foreground">
          //         {privacyLevel}%
          //       </span>
          //     </div>
          //     <Slider
          //       id="privacy-slider"
          //       defaultValue={[70]}
          //       max={100}
          //       step={1}
          //       onValueChange={setPrivacyLevel}
          //       className="[&>span]:bg-primary"
          //     />
          //   </div>

          //   <div className="flex items-center justify-between space-x-2">
          //     <div className="flex items-center space-x-2">
          //       <Switch
          //         id="advanced-privacy"
          //         checked={advancedPrivacy}
          //         onCheckedChange={setAdvancedPrivacy}
          //       />
          //       <Label
          //         htmlFor="advanced-privacy"
          //         className="text-sm cursor-pointer"
          //       >
          //         Advanced Privacy
          //       </Label>
          //     </div>
          //     <Button
          //       variant="ghost"
          //       size="icon"
          //       className="h-6 w-6 rounded-full"
          //       asChild
          //     >
          //       <div className="relative group">
          //         <Info className="h-4 w-4" />
          //         <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-48 p-2 bg-popover text-popover-foreground text-xs rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
          //           Advanced privacy uses multiple rounds of mixing with time
          //           delays for enhanced anonymity.
          //         </div>
          //       </div>
          //     </Button>
          //   </div>

          //   {advancedPrivacy && (
          //     <div className="space-y-3 animate-fade-in">
          //       <div className="flex items-center justify-between">
          //         <Label htmlFor="time-delay" className="flex items-center">
          //           <Clock className="w-4 h-4 mr-2 text-primary" />
          //           Time Delay
          //         </Label>
          //         <span className="text-sm text-muted-foreground">24h</span>
          //       </div>
          //       <Select defaultValue="24h">
          //         <SelectTrigger
          //           id="time-delay"
          //           className="w-full bg-background/50"
          //         >
          //           <SelectValue placeholder="Select delay" />
          //         </SelectTrigger>
          //         <SelectContent>
          //           <SelectItem value="1h">1 hour</SelectItem>
          //           <SelectItem value="6h">6 hours</SelectItem>
          //           <SelectItem value="24h">24 hours</SelectItem>
          //           <SelectItem value="48h">48 hours</SelectItem>
          //           <SelectItem value="random">Random (6-48h)</SelectItem>
          //         </SelectContent>
          //       </Select>
          //     </div>
          //   )}

          //   <div className="px-4 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md flex items-start">
          //     <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
          //     <p className="text-sm text-yellow-200">
          //       This is a demo application. No real tokens will be mixed and no
          //       transactions will be sent to the blockchain.
          //     </p>
          //   </div>
          // </>
          <>
            {activeView === 'signup' && isWalletConnected && walletAddress && (
              <div>
                <div>
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
                            className={`ceremony-status ${
                              ceremonyStatus === 'on-chain'
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
                                    className={`ceremony-participant ${
                                      participant.address === walletAddress
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
                      <h2 className="text-lg font-semibold text-center md:text-left">
                        Waiting for Participants
                      </h2>
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
                          </p>  */}
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
                      <h2 className="gradient-text font-bold pb-2 text-xl">
                        Sign Up
                      </h2>
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
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto' }}></div>
                          ) : (
                            <span className="flex items-center">
                              Sign Up
                            </span>
                          )}
                        </Button>
                        <div className="explanation-text pt-3">
                          <p>
                            To remain anonymous, please enter a receiving
                            address that is not associated with your wallet and
                            which you have not previously used for any purpose.
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* {isWalletConnected && (
        <CardFooter>
          <Button
            className="w-full gradient-bg text-black hover:opacity-90 transition-opacity font-medium group relative overflow-hidden"
            disabled={isLoading}
            onClick={handleMix}
          >
            <span className="relative z-10 flex items-center">
              <ArrowRightLeft className="mr-2 h-4 w-4 group-hover:animate-spin transition-all duration-700" />
              {isLoading ? 'Processing...' : 'Mix Tokens'}
            </span>
            <span className="absolute inset-0 bg-primary-light opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
          </Button>
        </CardFooter>
      )} */}
    </Card>
  );
};

export default MixingInterface;
