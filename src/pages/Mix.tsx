import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import MixingInterface from '../components/MixingInterface';
// import SigningCeremonyStatus from '../components/SigningCeremonyStatus';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import {
  Shield,
  RefreshCw,
  Clock,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  ArrowRightLeft,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { useToast } from '../hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Progress } from '../components/ui/progress';
import ConnectWallet from '../components/ConnectWallet';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setCeremonyHistory, setCeremonyHistoryError } from '../store/ceremonyHistorySlice';
const mockTransactions = [
  {
    id: 'tx1',
    date: '2023-09-15T14:30:00',
    tokenAmount: '500',
    tokenSymbol: '₳',
    status: 'completed',
    txHash: '3a6eb0...7bc2d1',
  },
  {
    id: 'tx2',
    date: '2023-09-10T09:15:00',
    tokenAmount: '1000',
    tokenSymbol: 'MILK',
    status: 'completed',
    txHash: '8f12c3...4de9a7',
  },
  {
    id: 'tx3',
    date: '2023-09-05T16:45:00',
    tokenAmount: '250',
    tokenSymbol: 'MIN',
    status: 'pending',
    txHash: '5b23d7...1fa8e6',
  },
];

const mockActiveTransactions = [
  {
    id: 'atx1',
    startDate: '2023-09-18T10:30:00',
    endDate: '2023-09-19T10:30:00',
    tokenAmount: '750',
    tokenSymbol: '₳',
    progress: 65,
    remainingTime: '08:45:12',
  },
];

const mockParticipants = [
  {
    id: 'p1',
    name: 'Alice Johnson',
    avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=Alice',
    hasSigned: true,
  },
  {
    id: 'p2',
    name: 'Bob Smith',
    avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=Bob',
    hasSigned: true,
  },
  {
    id: 'p3',
    name: 'Charlie Wang',
    avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=Charlie',
    hasSigned: false,
  },
  {
    id: 'p4',
    name: 'Dana Lee',
    avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=Dana',
    hasSigned: false,
  },
  {
    id: 'p5',
    name: 'Ethan Miller',
    avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=Ethan',
    hasSigned: true,
  },
];

const Mix = () => {
  const [activeTab, setActiveTab] = useState('mix');
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const { toast } = useToast();
  const { minParticipants, uniformOutputValue } = useAppSelector(
    (state) => state.protocol
  );
  const queue = useAppSelector((state) => state.queue.participants);
  const walletAddress = useAppSelector((state) => state.wallet.address);
  const ceremonyHistory = useAppSelector((state) => state.ceremonyHistory.records);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const fetchCeremonyHistory = async () => {
      try {
        const response = await fetch(
          `${process.env.REACT_APP_BASE_SERVER_URL}/ceremony_history`
        );
        if (!response.ok) {
          throw new Error('Failed to fetch ceremony history');
        }
        const data = await response.json();
        dispatch(setCeremonyHistory(data));
      } catch (error) {
        console.error('Failed to fetch ceremony history:', error);
        dispatch(
          setCeremonyHistoryError(
            error instanceof Error
              ? error.message
              : 'Failed to fetch ceremony history'
          )
        );
      }
    };

    fetchCeremonyHistory();
  }, [dispatch]);

  const connectWallet = () => {
    toast({
      title: 'Connecting wallet...',
      description: 'Attempting to connect to your wallet',
    });

    setTimeout(() => {
      setIsWalletConnected(true);
      toast({
        title: 'Wallet connected',
        description: 'Successfully connected to your wallet',
      });
    }, 1500);
  };

  const disconnectWallet = () => {
    setIsWalletConnected(false);
    toast({
      title: 'Wallet disconnected',
      description: 'Your wallet has been disconnected',
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">
              <span className="gradient-text">Mix Your Assets</span>
            </h1>
            <p className="text-muted-foreground">
              Enhance your privacy on the Cardano blockchain by mixing your
              tokens through our protocol
            </p>

            <div className="mt-6 flex justify-center">
              {/* {isWalletConnected ? (
                <Button
                  variant="outline"
                  className="bg-green-600/20 text-green-500 hover:bg-green-600/30 border border-green-600/30"
                  onClick={disconnectWallet}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Wallet Connected
                </Button>
              ) : (
                <Button
                  className="gradient-bg text-black hover:opacity-90 transition-opacity font-medium"
                  onClick={connectWallet}
                >
                  <Wallet className="mr-2 h-4 w-4" /> Connect Wallet
                </Button>
              )} */}
              <ConnectWallet />
            </div>
          </div>

          <Tabs
            defaultValue="mix"
            className="max-w-4xl mx-auto"
            onValueChange={setActiveTab}
          >
            <TabsList className="flex sm:hidden items-center justify-between gap-1 mb-8">
              <TabsTrigger
                value="mix"
                className="flex-grow data-[state=active]:bg-primary/10 data-[state=active]:text-primary py-1 px-1 md:px-2 text-xs sm:text-sm md:text-base truncate"
              >
                Mix Tokens
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="flex-grow data-[state=active]:bg-primary/10 data-[state=active]:text-primary py-1 px-1 md:px-2 text-xs sm:text-sm md:text-base truncate"
              >
                History
              </TabsTrigger>
              <TabsTrigger
                value="status"
                className="flex-grow data-[state=active]:bg-primary/10 data-[state=active]:text-primary py-1 px-1 md:px-2 text-xs sm:text-sm md:text-base truncate"
              >
                Queue Status
              </TabsTrigger>
            </TabsList>
            <TabsList className="hidden sm:grid grid-cols-3 gap-1 mb-8">
              <TabsTrigger
                value="mix"
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary py-1 px-1 md:px-2 text-xs sm:text-sm md:text-base truncate"
              >
                Mix Tokens
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary py-1 px-1 md:px-2 text-xs sm:text-sm md:text-base truncate"
              >
                History
              </TabsTrigger>
              <TabsTrigger
                value="status"
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary py-1 px-1 md:px-2 text-xs sm:text-sm md:text-base truncate"
              >
                Queue Status
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mix" className="animate-scale-in">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <MixingInterface />

                <div className="md:w-1/2 space-y-6">
                  <Card className="dark-blur border-primary/20">
                    <CardHeader>
                      <CardTitle>How It Works</CardTitle>
                      <CardDescription>
                        The mixing process explained
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 p-4 sm:p-6">
                      {/* Step 1 */}
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full gradient-bg flex items-center justify-center text-black font-bold text-sm sm:text-base">
                          1
                        </div>
                        <div>
                          <h3 className="font-medium text-sm sm:text-base mb-1">
                            Select Token & Amount
                          </h3>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Choose which token you want to mix and specify the
                            amount
                          </p>
                        </div>
                      </div>

                      {/* Step 2 */}
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full gradient-bg flex items-center justify-center text-black font-bold text-sm sm:text-base">
                          2
                        </div>
                        <div>
                          <h3 className="font-medium text-sm sm:text-base mb-1">
                            Join The Queue
                          </h3>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Sign the first transaction to join the lobby of
                            users waiting to mix their tokens.
                          </p>
                        </div>
                      </div>

                      {/* Step 3 */}
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full gradient-bg flex items-center justify-center text-black font-bold text-sm sm:text-base">
                          3
                        </div>
                        <div>
                          <h3 className="font-medium text-sm sm:text-base mb-1">
                            Mixing Ceremony
                          </h3>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            When the queue is full, you will be prompted to sign
                            the next transaction to join the ceremony and mix
                            your tokens.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="dark-blur border-primary/20">
                      <div className="p-4 pb-3">
                        <Shield className="h-6 w-6 text-primary mb-2" />
                        <CardTitle className="text-base">
                          Enhanced Privacy
                        </CardTitle>
                      </div>
                      <div className="text-xs text-muted-foreground pt-0 p-4">
                        {/* Provably-secure private transactions directly on-chain. */}
                        Private transactions directly on-chain.
                      </div>
                    </Card>

                    <Card className="dark-blur border-primary/20">
                      <div className="p-4 pb-3">
                        <RefreshCw className="h-6 w-6 text-primary mb-2" />
                        <CardTitle className="text-base">
                          Seamlessly Mix
                        </CardTitle>
                      </div>
                      <div className="text-xs text-muted-foreground pt-0 p-4">
                        Supporting all major Cardano native wallets.
                      </div>
                    </Card>

                    <Card className="dark-blur border-primary/20">
                      <div className="p-4 pb-3">
                        <Clock className="h-6 w-6 text-primary mb-2" />
                        <CardTitle className="text-base">
                          Transparent Process
                        </CardTitle>
                      </div>
                      <div className="text-xs text-muted-foreground pt-0 p-4">
                        Easily track every step of the mixing cycle.
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="status" className="animate-scale-in">
              <Card className="dark-blur border-primary/20">
                <CardHeader>
                  <CardTitle className="text-center">
                    Queue Status
                  </CardTitle>
                  <CardDescription className="text-center">
                    Track your position in the mixing queue
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {walletAddress ? (
                    queue.length > 0 ? (
                      <>
                        <h2 className="font-semibold text-center md:text-left mb-4">
                          {queue.some((p) => p.address === walletAddress)
                            ? "You're in Queue"
                            : "Current Queue Status"}
                        </h2>
                        <div className="queue-status">
                          <div className="queue-status-icon">
                            <div className="spinner"></div>
                          </div>
                          <div className="queue-status-info">
                            {queue.some((p) => p.address === walletAddress) ? (
                              <>
                                {/* <p className="queue-position">
                                  Your Position: {queue.findIndex((p) => p.address === walletAddress) + 1} of {queue.length}
                                </p> */}
                                <p className="queue-target">
                                  Target Pool Size: {minParticipants} participants
                                </p>
                                <p className="queue-waiting">
                                  Waiting for {Math.max(0, minParticipants - queue.length)} more {minParticipants - queue.length === 1 ? 'participant' : 'participants'} to join
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="queue-position">
                                  Active Participants: {queue.length}
                                </p>
                                <p className="queue-target">
                                  Target Pool Size: {minParticipants} participants
                                </p>
                                <p className="queue-waiting">
                                  Waiting for {Math.max(0, minParticipants - queue.length)} more {minParticipants - queue.length === 1 ? 'participant' : 'participants'} to join
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="explanation-text mt-4">
                          <p>
                            Once enough participants join the queue, a mixing ceremony will be created automatically. 
                            {queue.some((p) => p.address === walletAddress) && " You will be notified when it's time to sign the transaction."}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                          <CheckCircle2 className="h-6 w-6 text-primary" />
                        </div>
                        <p className="text-muted-foreground">
                          No participants in queue. Be the first to join!
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center justify-center w-full">
                      <div className="mx-auto">
                        <ConnectWallet />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="animate-scale-in">
              <Card className="dark-blur border-primary/20">
                <CardHeader>
                  <CardTitle className="text-center">
                    Transaction History
                  </CardTitle>
                  <CardDescription className="text-center">
                    View past mixing operations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!walletAddress ? (
                    <div className="flex items-center justify-center w-full">
                      <div className="mx-auto">
                        <ConnectWallet />
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-primary/10">
                            <TableHead>Ceremony ID</TableHead>
                            <TableHead>Transaction Hash</TableHead>
                            <TableHead>Expiration Time</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ceremonyHistory.map((record ) => (
                            <TableRow
                              key={record.id}
                              className="border-primary/5 hover:bg-primary/5"
                            >
                              <TableCell>{record.id}</TableCell>
                              <TableCell>
                                <a
                                  href={`https://preview.cardanoscan.io/transaction/${record.transactionHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary flex items-center hover:underline font-mono text-sm"
                                >
                                  {record.transactionHash}
                                  <ExternalLink className="h-3 w-3 ml-1 flex-shrink-0" />
                                </a>
                              </TableCell>
                              <TableCell>
                                {record?.expirationTime ? new Date(record?.expirationTime * 1000).toLocaleString() : 'N/A'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Mix;
