import type { DrepMetadata } from '../functions/drepMetadata';
import './IpfsLinkModal.css';

interface DRepMetadataViewProps {
  metadata: DrepMetadata;
}

export function DRepMetadataView({ metadata }: DRepMetadataViewProps) {
  return (
    <div className="governance-metadata-view governance-metadata-body">
      {metadata.doNotList && (
        <p
          style={{
            margin: '0 0 0.75rem',
            padding: '0.35rem 0.6rem',
            borderRadius: '4px',
            background: '#422006',
            color: '#fcd34d',
            fontSize: '0.85rem',
          }}
        >
          This DRep has opted out of campaign/directory listing (doNotList).
        </p>
      )}

      {metadata.givenName && <h3>{metadata.givenName}</h3>}

      {metadata.image?.contentUrl && (
        <img
          src={metadata.image.contentUrl}
          alt={metadata.givenName ? `${metadata.givenName} profile` : 'DRep profile'}
          style={{
            maxWidth: '120px',
            maxHeight: '120px',
            borderRadius: '8px',
            marginBottom: '0.75rem',
            objectFit: 'cover',
          }}
        />
      )}

      {metadata.objectives && (
        <div style={{ marginBottom: '0.75rem' }}>
          <div className="governance-metadata-section-label">Objectives</div>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{metadata.objectives}</p>
        </div>
      )}

      {metadata.motivations && (
        <div style={{ marginBottom: '0.75rem' }}>
          <div className="governance-metadata-section-label">Motivations</div>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{metadata.motivations}</p>
        </div>
      )}

      {metadata.qualifications && (
        <div style={{ marginBottom: '0.75rem' }}>
          <div className="governance-metadata-section-label">Qualifications</div>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{metadata.qualifications}</p>
        </div>
      )}

      {metadata.paymentAddress && (
        <div style={{ marginBottom: '0.75rem' }}>
          <div className="governance-metadata-section-label">Payment address</div>
          <code className="ipfs-link-modal-code" style={{ display: 'block', wordBreak: 'break-all' }}>
            {metadata.paymentAddress}
          </code>
        </div>
      )}

      {metadata.references.length > 0 && (
        <div>
          <div className="governance-metadata-section-label">References</div>
          <ul className="governance-metadata-references">
            {metadata.references.map((ref, idx) => (
              <li key={`${ref.uri}-${idx}`}>
                <span
                  style={{
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    color: '#94a3b8',
                    marginRight: '0.35rem',
                  }}
                >
                  {ref.type}
                </span>
                <a href={ref.uri} target="_blank" rel="noopener noreferrer">
                  {ref.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
