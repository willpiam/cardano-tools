import React, { useState } from 'react';
import { Button } from '../components/Button';

interface CommitInfo {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  html_url: string;
}

const Playground = () => {
  const [commitInfo, setCommitInfo] = useState<CommitInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLatestCommit = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // GitHub API endpoint for the latest commit
      const response = await fetch('https://api.github.com/repos/willpiam/cardano-tools/commits/master');
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }
      
      const commit: CommitInfo = await response.json();
      setCommitInfo(commit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch commit information');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center', 
        padding: '2rem' 
      }}>
        <div className="main-section" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1rem', 
          alignItems: 'flex-start', 
          justifyContent: 'center', 
          width: '100%', 
          maxWidth: '800px' 
        }}>
          <h1>Playground</h1>
          
          <div style={{ 
            border: '1px solid #ccc', 
            padding: '1rem', 
            borderRadius: '4px',
            width: '100%'
          }}>
            <h3>GitHub Repository Latest Commit</h3>
            <p>Click the button below to fetch the latest commit from the cardano-tools repository.</p>
            
            <Button 
              onClick={fetchLatestCommit} 
              disabled={loading}
            >
              {loading ? 'Fetching...' : 'Get Latest Commit'}
            </Button>

            {error && (
              <div style={{ 
                marginTop: '1rem', 
                padding: '0.5rem', 
                backgroundColor: '#fee', 
                border: '1px solid #fcc', 
                borderRadius: '4px',
                color: '#c00'
              }}>
                Error: {error}
              </div>
            )}

            {commitInfo && (
              <div style={{ 
                marginTop: '1rem', 
                padding: '1rem', 
                backgroundColor: '#f9f9f9', 
                border: '1px solid #ddd', 
                borderRadius: '4px'
              }}>
                <h4>Latest Commit Information:</h4>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Short SHA:</strong> <code>{commitInfo.sha.substring(0, 7)}</code>
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Full SHA:</strong> <code style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>{commitInfo.sha}</code>
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Message:</strong> {commitInfo.commit.message}
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Author:</strong> {commitInfo.commit.author.name}
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <strong>Date:</strong> {formatDate(commitInfo.commit.author.date)}
                </div>
                
                <div>
                  <strong>View Code at This Commit:</strong>
                  <br />
                  <a 
                    href={`https://github.com/willpiam/cardano-tools/tree/${commitInfo.sha}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ 
                      color: '#0066cc', 
                      textDecoration: 'underline',
                      marginTop: '0.5rem',
                      display: 'inline-block'
                    }}
                  >
                    🔗 Open Repository at Commit {commitInfo.sha.substring(0, 7)}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Playground;
