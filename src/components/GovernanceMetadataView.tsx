import type { GovernanceMetadata } from '../functions/governanceActionsFetch';
import { MarkdownContent } from './MarkdownContent';
import './IpfsLinkModal.css';

interface GovernanceMetadataViewProps {
  metadata: GovernanceMetadata;
  /** When set, shown as the primary heading above the abstract. */
  title?: string | null;
}

export function GovernanceMetadataView({ metadata, title }: GovernanceMetadataViewProps) {
  const displayTitle = title ?? metadata.title;

  return (
    <div className="governance-metadata-view governance-metadata-body">
      {displayTitle && <h3>{displayTitle}</h3>}
      {metadata.abstract && <MarkdownContent content={metadata.abstract} />}
      {(metadata.motivation ||
        metadata.rationale ||
        metadata.references.length > 0) && (
        <details>
          <summary style={{ cursor: 'pointer', color: '#94a3b8', fontSize: '0.85rem' }}>
            Show CIP-108 details
          </summary>
          <div
            className="governance-metadata-body"
            style={{ marginTop: '0.5rem', display: 'grid', gap: '0.75rem', color: '#d1d5db' }}
          >
            {metadata.motivation && (
              <div>
                <div className="governance-metadata-section-label">Motivation</div>
                <MarkdownContent content={metadata.motivation} />
              </div>
            )}
            {metadata.rationale && (
              <div>
                <div className="governance-metadata-section-label">Rationale</div>
                <MarkdownContent content={metadata.rationale} />
              </div>
            )}
            {metadata.references.length > 0 && (
              <div>
                <div className="governance-metadata-section-label">References</div>
                <ul className="governance-metadata-references">
                  {metadata.references.map((ref, idx) => (
                    <li key={`${ref.uri}-${idx}`}>
                      <a
                        href={ref.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {ref.label}
                      </a>
                      {ref.hashDigest ? ` · ${ref.hashDigest}` : ''}
                      {ref.hashAlgorithm ? ` (${ref.hashAlgorithm})` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
