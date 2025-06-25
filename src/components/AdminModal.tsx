import { Modal } from './Modal';
import { useAppSelector } from '../store/hooks';
import { paymentCredentialOf } from '@lucid-evolution/lucid';
import { Button } from './Button';
import { useState, useEffect } from 'react';
import { fromText } from '@lucid-evolution/lucid';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BlacklistEntry {
  cred: string;
  reason: string;
  timestamp: number;
  id: string;
}

interface CancelledCeremony {
  reason: string;
  timestamp: number;
  transactionHash: string;
  ceremonyId: string;
}

interface CeremonyDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ceremony: any; // Using any since we don't have the full type
}

const CeremonyDetailsModal: React.FC<CeremonyDetailsModalProps> = ({ isOpen, onClose, ceremony }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h3>Ceremony Details</h3>
      <pre style={{ 
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        maxHeight: '70vh',
        overflow: 'auto',
        padding: '1rem',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px',
        color: '#000000'
      }}>
        {JSON.stringify(ceremony, null, 2)}
      </pre>
    </Modal>
  );
};

export const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose }) => {
  const walletAddress = useAppSelector(state => state.wallet.address);
  const lucid = useAppSelector(state => state.wallet.lucid);
  const spendingCredential = walletAddress ? paymentCredentialOf(walletAddress).hash : null;
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [cancelledCeremonies, setCancelledCeremonies] = useState<CancelledCeremony[]>([]);
  const [isBlacklistExpanded, setIsBlacklistExpanded] = useState(false);
  const [isCancelledExpanded, setIsCancelledExpanded] = useState(false);
  const [isCeremoniesExpanded, setIsCeremoniesExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCeremony, setSelectedCeremony] = useState<any>(null);
  const ceremonies = useAppSelector((state) => state.ceremony.ceremonies);

  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen) return;
      
      setIsLoading(true);
      try {
        const [blacklistResponse, cancelledResponse] = await Promise.all([
          fetch(`${process.env.REACT_APP_BASE_SERVER_URL}/blacklist`),
          fetch(`${process.env.REACT_APP_BASE_SERVER_URL}/list_cancelled_ceremonies`)
        ]);

        if (!blacklistResponse.ok || !cancelledResponse.ok) {
          throw new Error('Failed to fetch data');
        }

        const blacklistData = await blacklistResponse.json();
        const cancelledData = await cancelledResponse.json();
        
        setBlacklist(blacklistData);
        setCancelledCeremonies(cancelledData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isOpen]);

  useEffect(() => {
    console.log("ceremonies", ceremonies);
  }, [ceremonies]);

  const handleReset = async () => {
    if (!walletAddress || !lucid) return;
    
    try {
      setIsResetting(true);
      setResetError(null);

      // Create the message to sign
      const message = fromText(JSON.stringify({
        context: "By signing this message, you confirm that you are the admin and intend to reset the database. This action cannot be undone.",
        address: walletAddress,
        timestamp: new Date().toISOString(),
        action: "reset_database"
      }));

      // Get the signed message from the wallet
      const signedMessage = await lucid.wallet().signMessage(walletAddress, message);

      // Send to API
      const response = await fetch(`${process.env.REACT_APP_BASE_SERVER_URL}/admin/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signedMessage,
          message
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      // Success! Close modal
      onClose();
    } catch (error) {
      console.error("Reset failed:", error);
      setResetError(error instanceof Error ? error.message : "Failed to reset database");
    } finally {
      setIsResetting(false);
    }
  };

  const handleRemoveBlacklistEntry = async (cred: string) => {
    if (!walletAddress || !lucid) return;

    try {
      // Create the message to sign
      const payload = fromText(JSON.stringify({
        context: "By signing this message, you confirm that you are the admin and intend to remove a blacklist entry.",
        adminAddress: walletAddress,
        cred,
        signupTimestamp: new Date()
      }));

      // Get the signed message from the wallet
      const signedMessage = await lucid.wallet().signMessage(walletAddress, payload);

      // Send to API
      const response = await fetch(
        `${process.env.REACT_APP_BASE_SERVER_URL}/admin/remove_blacklist_entry`, 
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            signedMessage,
            payload
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

    } catch {
      console.error("Failed to remove blacklist entry");
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2>Admin Portal</h2>
      <div className="admin-content">
        {walletAddress ? (
          <>
            <div className="admin-section">
              <h3>Wallet Information</h3>
              <div className="admin-info">
                <p><strong>Address:</strong> {walletAddress}</p>
                <p><strong>Spending Credential:</strong> {spendingCredential}</p>
              </div>
            </div>
            <div className="admin-section">
              <h3>Database Management</h3>
              <div className="admin-actions">
                <a
                  href={`${process.env.REACT_APP_BASE_SERVER_URL}/ceremony_history`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button"
                  style={{ marginRight: '10px' }}
                >
                  View History
                </a>
                <Button 
                  onClick={handleReset}
                  disabled={isResetting}
                  style={{ backgroundColor: '#d32f2f' }}
                >
                  {isResetting ? 'Resetting...' : 'Reset Database'}
                </Button>
                {resetError && (
                  <p className="admin-error">{resetError}</p>
                )}
              </div>
            </div>
            <div className="admin-section">
              <h3>Active Ceremonies</h3>
              <Button 
                onClick={() => setIsCeremoniesExpanded(!isCeremoniesExpanded)}
                style={{ marginBottom: '10px' }}
              >
                {isCeremoniesExpanded ? 'Hide Ceremonies' : 'Show Ceremonies'}
              </Button>
              {isCeremoniesExpanded && (
                <div className="admin-list">
                  {ceremonies.length === 0 ? (
                    <p>No active ceremonies</p>
                  ) : (
                    <ul>
                      {ceremonies.map((ceremony) => (
                        <li key={ceremony.id} style={{ marginBottom: '1rem' }}>
                          <strong>Ceremony ID:</strong> {ceremony.id}
                          <br />
                          <Button
                            onClick={() => setSelectedCeremony(ceremony)}
                            style={{ marginTop: '0.5rem' }}
                          >
                            View Details
                          </Button>
                          <hr />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <div className="admin-section">
              <h3>Blacklist</h3>
              <Button 
                onClick={() => setIsBlacklistExpanded(!isBlacklistExpanded)}
                style={{ marginBottom: '10px' }}
              >
                {isBlacklistExpanded ? 'Hide Blacklist' : 'Show Blacklist'}
              </Button>
              {isBlacklistExpanded && (
                <div className="admin-list">
                  {isLoading ? (
                    <p>Loading blacklist...</p>
                  ) : blacklist.length === 0 ? (
                    <p>No blacklisted addresses</p>
                  ) : (
                    <ul>
                      {blacklist.map((entry, index) => (
                        <li key={index}>
                         <strong>Credential:</strong> {entry?.cred}
                          <br />
                          <strong>Reason:</strong> {entry.reason}
                          <br />
                          <strong>Timestamp:</strong> {new Date(entry.timestamp).toLocaleString()}
                          <br />
                          <Button
                            onClick={() => handleRemoveBlacklistEntry(entry.cred)}
                          >
                            Remove
                          </Button>
                          <br />
                          <hr />
                          <br />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <div className="admin-section">
              <h3>Cancelled Ceremonies</h3>
              <Button 
                onClick={() => setIsCancelledExpanded(!isCancelledExpanded)}
                style={{ marginBottom: '10px' }}
              >
                {isCancelledExpanded ? 'Hide Cancelled Ceremonies' : 'Show Cancelled Ceremonies'}
              </Button>
              {isCancelledExpanded && (
                <div className="admin-list">
                  {isLoading ? (
                    <p>Loading cancelled ceremonies...</p>
                  ) : cancelledCeremonies.length === 0 ? (
                    <p>No cancelled ceremonies</p>
                  ) : (
                    <ul>
                      {cancelledCeremonies.map((ceremony) => (
                        <li key={ceremony.ceremonyId}>
                          <strong>Ceremony ID:</strong> {ceremony.ceremonyId}
                          <br />
                          <strong>Reason:</strong> {ceremony.reason}
                          <br />
                          <strong>Transaction Hash:</strong> {ceremony.transactionHash}
                          <br />
                          <strong>Timestamp:</strong> {new Date(ceremony.timestamp).toLocaleString()}
                          <br />
                          <hr />
                          <br />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            {selectedCeremony && (
              <CeremonyDetailsModal
                isOpen={!!selectedCeremony}
                onClose={() => setSelectedCeremony(null)}
                ceremony={selectedCeremony}
              />
            )}
          </>
        ) : (
          <p>Please connect your wallet to view admin information.</p>
        )}
      </div>
    </Modal>
  );
}; 