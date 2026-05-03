import { Link } from 'react-router';

const TOOL_LINKS = [
  {
    title: 'Governance Actions',
    description: 'Browse currently live governance actions, filter by action type, and sort treasury withdrawals by amount.',
    to: '/governance-actions',
  },
  {
    title: 'DRep Voting History',
    description: 'Look up a DRep and view voting activity across governance proposals.',
    to: '/drephistory',
  },
  {
    title: 'Asset CIP-20 messages',
    description: 'Scan an asset’s transaction history for CIP-20 (metadata 674) messages via Blockfrost.',
    to: '/cip20-asset',
  },
  {
    title: 'Governance Shortcuts',
    description: 'Wallet-connected actions for delegating and other governance shortcuts.',
    to: '/tools',
  },
  {
    title: 'Commit Tool',
    description: 'Use the commit helper utility page.',
    to: '/commit',
  },
  {
    title: 'Playground',
    description: 'Try development and testing utilities in the playground.',
    to: '/playground',
  },
];

const Home = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
        <div className="main-section" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start', justifyContent: 'center', width: '100%', maxWidth: '980px' }}>
          <h1>Toolbox Home</h1>
          <p>Select a tool below.</p>

          <div style={{ width: '100%', display: 'grid', gap: '0.75rem' }}>
            {TOOL_LINKS.map((tool) => (
              <Link
                key={tool.to}
                to={tool.to}
                style={{
                  display: 'block',
                  border: '1px solid #4b5563',
                  borderRadius: '8px',
                  padding: '0.95rem',
                  backgroundColor: '#1a1103',
                  color: '#e5e7eb',
                  textDecoration: 'none',
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: '0.35rem', color: '#93c5fd' }}>{tool.title}</div>
                <div style={{ fontSize: '0.92rem', color: '#d1d5db' }}>{tool.description}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
