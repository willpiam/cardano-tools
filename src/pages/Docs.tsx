import { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Copy,
  Check,
  ChevronRight,
  FileText,
  Book,
  Code,
  MessageSquare,
  ArrowRight,
  ExternalLink,
  Search,
} from 'lucide-react';
import { cn } from '../lib/utils';
import Logo from '../components/Logo';

const docsCategories = [
  {
    title: 'Getting Started',
    icon: <Book className="h-5 w-5" />,
    items: [
      'Introduction',
      'How Turn Network Works',
      'Key Concepts',
      'Quick Start Guide',
    ],
  },
  {
    title: 'User Guides',
    icon: <FileText className="h-5 w-5" />,
    items: [
      'Mixing ADA',
      'Mixing Native Tokens',
      'Privacy Settings',
      'Managing Your Transactions',
    ],
  },
  {
    title: 'Technical Documentation',
    icon: <Code className="h-5 w-5" />,
    items: [
      'Protocol Specifications',
      // 'Zero-Knowledge Proofs',
      'Security Model',
      'API Reference',
    ],
  },
  {
    title: 'Resources',
    icon: <MessageSquare className="h-5 w-5" />,
    items: ['FAQ', 'Troubleshooting', 'Community Guidelines', 'Governance'],
  },
];

// const codeExample = `// Initialize a new mixing transaction
// const tx = await TurnNetwork.createMixingTx({
//   token: "ADA",
//   amount: 1000,
//   privacyLevel: 80,
//   timeDelay: "24h",
//   recipient: "addr1qy2k..."
// });

// // Sign and submit the transaction
// const signedTx = await wallet.signTx(tx);
// const txHash = await TurnNetwork.submitTx(signedTx);

// // Monitor transaction status
// const status = await TurnNetwork.getTxStatus(txHash);
// console.log(\`Transaction status: \${status}\`);`;

const Docs = () => {
  // const [copied, setCopied] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Getting Started');

  // const copyToClipboard = () => {
  //   navigator.clipboard.writeText(codeExample);
  //   setCopied(true);
  //   setTimeout(() => setCopied(false), 2000);
  // };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="col-span-1">
              <Card className="dark-blur border-primary/20 sticky top-24">
                <CardContent className="p-4">
                  <div className="mb-6">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search docs..."
                        className="pl-10 bg-background/50"
                      />
                    </div>
                  </div>

                  <nav className="space-y-1">
                    {docsCategories.map((category) => (
                      <div key={category.title} className="space-y-1">
                        <Button
                          variant="ghost"
                          className={cn(
                            'w-full justify-start font-medium',
                            activeCategory === category.title
                              ? 'bg-primary/10 text-primary'
                              : 'hover:bg-primary/5'
                          )}
                          onClick={() => setActiveCategory(category.title)}
                        >
                          {category.icon}
                          <span className="ml-2">{category.title}</span>
                          <ChevronRight className="ml-auto h-4 w-4" />
                        </Button>

                        {activeCategory === category.title && (
                          <div className="pl-9 space-y-1">
                            {category.items.map((item) => (
                              <Button
                                key={item}
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-sm text-muted-foreground hover:text-foreground"
                              >
                                {item}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </nav>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="col-span-1 lg:col-span-3 space-y-8">
              <div>
                <h1 className="text-4xl font-bold mb-4">
                  <span className="gradient-text">Documentation</span>
                </h1>
                <p className="text-muted-foreground">
                  Welcome to the Turn Network documentation. Learn how to use
                  our privacy-focused mixing protocol for Cardano assets.
                </p>
              </div>

              <Card className="dark-blur border-primary/20">
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold mb-4">Introduction</h2>

                  <div className="prose prose-invert max-w-none">
                    <p className="text-muted-foreground">
                      {/* Turn Network is <del>a cutting-edge</del> mixing protocol designed */}
                      Turn Network is a mixing protocol designed
                      for the Cardano blockchain, enabling users to conduct
                      private transactions with ADA and native tokens. By
                      breaking the on-chain link between source and destination
                      addresses, Turn Network provides robust privacy protection
                      against blockchain analysis.
                    </p>

                    <h3 className="text-xl font-semibold mt-6 mb-3">
                      How It Works
                    </h3>

                    <p className="text-muted-foreground">
                      {/* When you use Turn Network to mix your assets<del>, the protocol
                        employs advanced cryptographic techniques including
                        zero-knowledge proofs to ensure that your transaction
                        history cannot be traced. </del>Your assets are pooled with
                      those of other users<del>, and through a series of
                      cryptographic operations, </del>the connection between inputs
                      and outputs is severed. */}

                         When you use Turn Network to mix your assets they are pooled with
                      those of other users breaking the connection between inputs
                      and outputs.
                    </p>

                    <h3 className="text-xl font-semibold mt-6 mb-3">
                      Key Features
                    </h3>

                    <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                      <li>Support for ADA and all Cardano native tokens</li>
                      {/* <li>
                        <del>
                          Zero-knowledge cryptography for complete transaction
                          privacy
                        </del>
                      </li> */}
                      {/* <li>
                        <del>
                          Adjustable privacy levels to suit your needs
                        </del>
                      </li> */}
                      {/* <li>
                        <del>Time-delayed transactions for enhanced anonymity</del>
                      </li> */}
                      <li>
                        Non-custodial design - you always control your assets
                      </li>
                      <li>
                        {/* Open-source <del>and audited</del> codebase */}
                        Open-source codebase
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card className="dark-blur border-primary/20">
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold mb-4">Quick Start Guide</h2>

                  <div className="prose prose-invert max-w-none">
                    <p className="text-muted-foreground mb-4">
                      Follow these steps to start using Turn Network for private
                      transactions:
                    </p>

                    <div className="space-y-4">
                      <div className="flex">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-black font-bold mr-4">
                          1
                        </div>
                        <div>
                          <h4 className="text-lg font-medium">
                            Connect Your Wallet
                          </h4>
                          <p className="text-muted-foreground">
                            Connect your Cardano wallet to the Turn Network
                            interface. We support Nami, Eternl, Flint, and other
                            Cardano wallets.
                          </p>
                        </div>
                      </div>

                      <div className="flex">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-black font-bold mr-4">
                          2
                        </div>
                        <div>
                          <h4 className="text-lg font-medium">
                            Select Token and Amount
                          </h4>
                          <p className="text-muted-foreground">
                            Choose which token you want to mix and specify the
                            amount. The minimum amount varies by token.
                          </p>
                        </div>
                      </div>

                      <div className="flex">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-black font-bold mr-4">
                          3
                        </div>
                        <div>
                          <h4 className="text-lg font-medium">
                            Configure Privacy Settings
                          </h4>
                          <p className="text-muted-foreground">
                            Adjust the privacy level and other settings
                            according to your needs. Higher privacy levels use
                            more mixing rounds.
                          </p>
                        </div>
                      </div>

                      <div className="flex">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-black font-bold mr-4">
                          4
                        </div>
                        <div>
                          <h4 className="text-lg font-medium">
                            Initiate Mixing
                          </h4>
                          <p className="text-muted-foreground">
                            Review your settings and initiate the mixing
                            process. You'll need to sign the transaction with
                            your wallet.
                          </p>
                        </div>
                      </div>

                      <div className="flex">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-black font-bold mr-4">
                          5
                        </div>
                        <div>
                          <h4 className="text-lg font-medium">
                            Receive Mixed Assets
                          </h4>
                          <p className="text-muted-foreground">
                            Once the mixing is complete, you'll receive your
                            assets at the specified address with no connection
                            to the source.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* <Card className="dark-blur border-primary/20">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Code Example</h2>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-primary/30 hover:bg-primary/5"
                      onClick={copyToClipboard}
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Code
                        </>
                      )}
                    </Button>
                  </div>

                  <pre className="bg-black/50 rounded-lg p-4 overflow-x-auto text-sm font-mono text-muted-foreground">
                    {codeExample}
                  </pre>
                </CardContent>
              </Card> */}

              <div className="flex flex-col sm:flex-row justify-between items-center dark-blur border border-primary/20 rounded-lg p-6">
                <div className="flex items-center mb-4 sm:mb-0">
                  <Logo size="sm" />
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button className="gradient-bg text-black hover:opacity-90 transition-opacity font-medium">
                    Start Mixing <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>

                  <Button
                    variant="outline"
                    className="border-primary/30 hover:bg-primary/5"
                  >
                    GitHub <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Docs;
