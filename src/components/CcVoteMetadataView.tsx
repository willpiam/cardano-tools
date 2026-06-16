import type { CcVoteMetadata } from '../functions/cip136VoteMetadata';
import { MarkdownContent } from './MarkdownContent';
import './IpfsLinkModal.css';

interface CcVoteMetadataViewProps {
  metadata: CcVoteMetadata;
}

function TextBlock({ label, content }: { label: string; content: string | null }) {
  if (!content) return null;
  return (
    <section className="governance-metadata-section">
      <h3 className="governance-metadata-section-title">{label}</h3>
      <MarkdownContent content={content} />
    </section>
  );
}

export function CcVoteMetadataView({ metadata }: CcVoteMetadataViewProps) {
  if (
    !metadata.summary &&
    !metadata.rationaleStatement &&
    !metadata.precedentDiscussion &&
    !metadata.counterargumentDiscussion &&
    !metadata.conclusion &&
    !metadata.comment &&
    !metadata.internalVote
  ) {
    return (
      <p className="governance-metadata-body" style={{ color: '#9ca3af' }}>
        No CC vote metadata text in document.
      </p>
    );
  }

  return (
    <div className="governance-metadata-view governance-metadata-body">
      {metadata.summary && (
        <h3 className="governance-metadata-title" style={{ marginBottom: '1rem' }}>
          {metadata.summary}
        </h3>
      )}
      <TextBlock label="Rationale" content={metadata.rationaleStatement ?? metadata.comment} />
      <TextBlock label="Precedent discussion" content={metadata.precedentDiscussion} />
      <TextBlock label="Counterargument discussion" content={metadata.counterargumentDiscussion} />
      <TextBlock label="Conclusion" content={metadata.conclusion} />
      {metadata.internalVote && (
        <section className="governance-metadata-section">
          <h3 className="governance-metadata-section-title">Internal vote</h3>
          <ul className="governance-metadata-list">
            {metadata.internalVote.constitutional != null && (
              <li>Constitutional: {metadata.internalVote.constitutional}</li>
            )}
            {metadata.internalVote.unconstitutional != null && (
              <li>Unconstitutional: {metadata.internalVote.unconstitutional}</li>
            )}
            {metadata.internalVote.abstain != null && (
              <li>Abstain: {metadata.internalVote.abstain}</li>
            )}
            {metadata.internalVote.didNotVote != null && (
              <li>Did not vote: {metadata.internalVote.didNotVote}</li>
            )}
            {metadata.internalVote.againstVote != null && (
              <li>Against vote: {metadata.internalVote.againstVote}</li>
            )}
          </ul>
        </section>
      )}
    </div>
  );
}
