import type { VoteRationaleMetadata } from '../functions/cip100RationaleDocument';
import { MarkdownContent } from './MarkdownContent';
import './IpfsLinkModal.css';

interface VoteRationaleViewProps {
  metadata: VoteRationaleMetadata;
}

export function VoteRationaleView({ metadata }: VoteRationaleViewProps) {
  if (!metadata.comment) {
    return (
      <p className="governance-metadata-body" style={{ color: '#9ca3af' }}>
        No rationale text in document.
      </p>
    );
  }

  return (
    <div className="governance-metadata-view governance-metadata-body">
      <MarkdownContent content={metadata.comment} />
    </div>
  );
}
