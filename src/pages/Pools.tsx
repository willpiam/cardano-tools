import { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Info, Plus, Search, ArrowUpRight } from 'lucide-react';

const poolData = [
  {
    id: 'pool-1',
    name: 'ADA Mixer',
    token: 'ADA',
    tvl: '12.4M ADA',
    tvlFiat: '$6.2M',
    volume24h: '342K ADA',
    fees: '0.15%',
    status: 'active',
  },
  {
    id: 'pool-2',
    name: 'MILK Standard',
    token: 'MILK',
    tvl: '5.8M MILK',
    tvlFiat: '$580K',
    volume24h: '125K MILK',
    fees: '0.25%',
    status: 'active',
  },
  {
    id: 'pool-3',
    name: 'LQ Privacy',
    token: 'LQ',
    tvl: '2.1M LQ',
    tvlFiat: '$315K',
    volume24h: '85K LQ',
    fees: '0.20%',
    status: 'active',
  },
  {
    id: 'pool-4',
    name: 'MIN Mixer',
    token: 'MIN',
    tvl: '4.2M MIN',
    tvlFiat: '$420K',
    volume24h: '110K MIN',
    fees: '0.18%',
    status: 'active',
  },
];

const volumeData = [
  { date: 'Jan', volume: 4000 },
  { date: 'Feb', volume: 5000 },
  { date: 'Mar', volume: 3000 },
  { date: 'Apr', volume: 7000 },
  { date: 'May', volume: 4500 },
  { date: 'Jun', volume: 6000 },
  { date: 'Jul', volume: 8500 },
  { date: 'Aug', volume: 7800 },
  { date: 'Sep', volume: 9000 },
  { date: 'Oct', volume: 11000 },
  { date: 'Nov', volume: 9500 },
  { date: 'Dec', volume: 12000 },
];

const tvlData = [
  { date: 'Jan', tvl: 10000 },
  { date: 'Feb', tvl: 15000 },
  { date: 'Mar', tvl: 18000 },
  { date: 'Apr', tvl: 22000 },
  { date: 'May', tvl: 25000 },
  { date: 'Jun', tvl: 27000 },
  { date: 'Jul', tvl: 30000 },
  { date: 'Aug', tvl: 34000 },
  { date: 'Sep', tvl: 38000 },
  { date: 'Oct', tvl: 45000 },
  { date: 'Nov', tvl: 52000 },
  { date: 'Dec', tvl: 60000 },
];

const Pools = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPools = poolData.filter(
    (pool) =>
      pool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pool.token.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">
              <span className="gradient-text">Liquidity Pools</span>
            </h1>
            <p className="text-muted-foreground">
              Browse and interact with Turn Network's privacy-enhancing
              liquidity pools
            </p>
          </div>

          <Card className="dark-blur border-primary/20 mb-8">
            <CardHeader>
              <CardTitle>Pool Statistics</CardTitle>
              <CardDescription>
                Overview of Turn Network's mixing activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="volume" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger
                    value="volume"
                    className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                  >
                    Volume
                  </TabsTrigger>
                  <TabsTrigger
                    value="tvl"
                    className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                  >
                    TVL
                  </TabsTrigger>
                </TabsList>

                <TabsContent
                  value="volume"
                  className="animate-fade-in h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={volumeData}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="colorVolume"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="hsl(35, 100%, 50%)"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="hsl(35, 100%, 50%)"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" stroke="#888" />
                      <YAxis stroke="#888" />
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(18, 18, 18, 0.9)',
                          borderColor: 'hsl(35, 100%, 50%, 0.3)',
                          borderRadius: '0.5rem',
                        }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="volume"
                        stroke="hsl(35, 100%, 50%)"
                        fillOpacity={1}
                        fill="url(#colorVolume)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </TabsContent>

                <TabsContent value="tvl" className="animate-fade-in h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={tvlData}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="colorTvl"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="hsl(35, 100%, 50%)"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="hsl(35, 100%, 50%)"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" stroke="#888" />
                      <YAxis stroke="#888" />
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(18, 18, 18, 0.9)',
                          borderColor: 'hsl(35, 100%, 50%, 0.3)',
                          borderRadius: '0.5rem',
                        }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="tvl"
                        stroke="hsl(35, 100%, 50%)"
                        fillOpacity={1}
                        fill="url(#colorTvl)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </TabsContent>
              </Tabs>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                <StatCard title="Total TVL" value="$7.5M" />
                <StatCard title="24h Volume" value="$1.2M" />
                <StatCard title="Total Transactions" value="152,742" />
                <StatCard title="Active Pools" value="12" />
              </div>
            </CardContent>
          </Card>

          <div className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="search"
                placeholder="Search pools..."
                className="pl-10 bg-background/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Button className="gradient-bg text-black hover:opacity-90 transition-opacity font-medium w-full md:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Create Pool
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPools.map((pool) => (
              <PoolCard key={pool.id} pool={pool} />
            ))}
          </div>

          {filteredPools.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No pools match your search criteria
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

const StatCard = ({ title, value }: { title: string; value: string }) => {
  return (
    <div className="bg-secondary/50 rounded-lg p-4">
      <p className="text-muted-foreground text-sm mb-1">{title}</p>
      <p className="text-2xl font-bold gradient-text">{value}</p>
    </div>
  );
};

const PoolCard = ({ pool }: { pool: (typeof poolData)[0] }) => {
  return (
    <Card className="dark-blur border-primary/20 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 gradient-bg" />

      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle>{pool.name}</CardTitle>
          <div className="text-xs py-1 px-2 rounded-full bg-primary/20 text-primary">
            {pool.token}
          </div>
        </div>
        <CardDescription>
          {pool.status === 'active' ? 'Active' : 'Inactive'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              Total Value Locked
            </p>
            <p className="font-medium">{pool.tvl}</p>
            <p className="text-xs text-muted-foreground">{pool.tvlFiat}</p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">24h Volume</p>
            <p className="font-medium">{pool.volume24h}</p>
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-1">Fee</p>
          <p className="font-medium">{pool.fees}</p>
        </div>

        <div className="pt-2 flex justify-between">
          <Button
            variant="outline"
            size="sm"
            className="border-primary/30 hover:bg-primary/5"
          >
            <Info className="mr-2 h-4 w-4" /> Details
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="border-primary/30 hover:bg-primary/5 text-primary"
          >
            Use Pool <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default Pools;
