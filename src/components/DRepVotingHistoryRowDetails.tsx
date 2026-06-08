import { formatGovActionType, truncateHash } from '../functions/governanceActionsFetch';
import type { ProposalMetadataAnchorInfo } from '../utils/governanceExpiration';
import {
  formatGovernanceTimeRemaining,
  governanceTimeStatusTitle,
  timeRemainingColor,
  type GovernanceActionTimeStatus,
} from '../utils/governanceExpiration';
import type { CachedVoteAnchorInfo } from '../utils/drepVotingHistoryCache';

export interface IpfsModalRequest {
  url: string;
  hashHex?: string;
  title: string;
}

export interface MetadataModalRequest {
  url: string;
  hashHex?: string;
  proposalId: string;
  proposalTxHash: string;
  proposalCertIndex: number;
}

export interface DRepVotingHistoryRowData {
  proposalId: string;
  proposalTxHash: string;
  proposalCertIndex: number;
  govActionType: string;
  vote: string | null;
  voteTxHash: string | null;
  voteAnchor: CachedVoteAnchorInfo;
  actionMetadataAnchor: ProposalMetadataAnchorInfo;
  timeStatus: GovernanceActionTimeStatus;
}

function voteColor(vote: string | null): string {
  switch (vote) {
    case 'yes':
      return '#22c55e';
    case 'no':
      return '#ef4444';
    case 'abstain':
      return '#eab308';
    default:
      return '#6b7280';
  }
}

function voteLabel(vote: string | null): string {
  if (!vote) return 'Did Not Vote';
  return vote.charAt(0).toUpperCase() + vote.slice(1);
}

function VoteBadge({ vote }: { vote: string | null }) {
  return (
    <span
      style={{
        color: voteColor(vote),
        fontWeight: 'bold',
        padding: '2px 8px',
        borderRadius: '4px',
        backgroundColor: `${voteColor(vote)}20`,
      }}
    >
      {voteLabel(vote)}
    </span>
  );
}

interface DRepVotingHistoryRowDetailsProps {
  row: DRepVotingHistoryRowData;
  detailsId: string;
  anchorLoading: boolean;
  nowSec: number;
  copiedProposalId: string | null;
  onCopyProposalId: (id: string) => void;
  onOpenMetadataModal: (request: MetadataModalRequest) => void;
  onOpenIpfsModal: (request: IpfsModalRequest) => void;
}

export function DRepVotingHistoryRowDetails({
  row,
  detailsId,
  anchorLoading,
  nowSec,
  copiedProposalId,
  onCopyProposalId,
  onOpenMetadataModal,
  onOpenIpfsModal,
}: DRepVotingHistoryRowDetailsProps) {
  return (
    <div id={detailsId} className="drep-voting-history-row-details">
      <section className="drep-voting-history-row-details-section">
        <h3 className="drep-voting-history-row-details-heading">Governance action</h3>
        <div className="drep-voting-history-row-details-field">
          <span className="drep-voting-history-row-details-label">ID</span>
          <div className="drep-voting-history-row-details-id-row">
            <span className="drep-voting-history-row-details-id">{row.proposalId}</span>
            <button
              type="button"
              onClick={() => onCopyProposalId(row.proposalId)}
              className="btn text-xs py-1 px-2"
              title="Copy governance action ID"
            >
              {copiedProposalId === row.proposalId ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
        <div className="drep-voting-history-row-details-field">
          <span className="drep-voting-history-row-details-label">Type</span>
          <span>{formatGovActionType(row.govActionType)}</span>
        </div>
        <div className="drep-voting-history-row-details-field">
          <span className="drep-voting-history-row-details-label">Status</span>
          <span
            title={governanceTimeStatusTitle(row.timeStatus)}
            style={{
              color: timeRemainingColor(row.timeStatus, nowSec),
              fontWeight: row.timeStatus.kind === 'countdown' ? 'bold' : 'normal',
            }}
          >
            {formatGovernanceTimeRemaining(row.timeStatus, nowSec)}
          </span>
        </div>
        <div className="drep-voting-history-row-details-field">
          <span className="drep-voting-history-row-details-label">Explorer</span>
          <a
            href={`https://cardanoscan.io/govAction/${row.proposalId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="drep-voting-history-row-details-link"
          >
            {truncateHash(row.proposalId)} on Cardanoscan
          </a>
        </div>
        <div className="drep-voting-history-row-details-field">
          <span className="drep-voting-history-row-details-label">Action metadata</span>
          <div className="drep-voting-history-row-details-actions">
            {row.actionMetadataAnchor.status === 'present' && row.actionMetadataAnchor.url ? (
              <>
                <button
                  type="button"
                  onClick={() =>
                    onOpenIpfsModal({
                      url: row.actionMetadataAnchor.url!,
                      hashHex: row.actionMetadataAnchor.hashHex,
                      title: 'Open governance action metadata',
                    })
                  }
                  className="drep-voting-history-row-details-text-btn"
                >
                  Metadata
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onOpenMetadataModal({
                      url: row.actionMetadataAnchor.url!,
                      hashHex: row.actionMetadataAnchor.hashHex,
                      proposalId: row.proposalId,
                      proposalTxHash: row.proposalTxHash,
                      proposalCertIndex: row.proposalCertIndex,
                    })
                  }
                  className="btn text-xs py-1 px-2"
                  title="View governance metadata"
                >
                  View full metadata
                </button>
              </>
            ) : row.actionMetadataAnchor.status === 'absent' ? (
              <span className="drep-voting-history-row-details-muted">—</span>
            ) : (
              <span className="drep-voting-history-row-details-unknown">?</span>
            )}
          </div>
        </div>
      </section>

      <section className="drep-voting-history-row-details-section">
        <h3 className="drep-voting-history-row-details-heading">Your vote</h3>
        <div className="drep-voting-history-row-details-field">
          <span className="drep-voting-history-row-details-label">Vote</span>
          <VoteBadge vote={row.vote} />
        </div>
        <div className="drep-voting-history-row-details-field">
          <span className="drep-voting-history-row-details-label">Vote tx</span>
          {row.voteTxHash ? (
            <a
              href={`https://cardanoscan.io/vote/${row.voteTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="drep-voting-history-row-details-link font-mono"
            >
              {truncateHash(row.voteTxHash)}
            </a>
          ) : (
            <span className="drep-voting-history-row-details-muted">-</span>
          )}
        </div>
        <div className="drep-voting-history-row-details-field">
          <span className="drep-voting-history-row-details-label">Rationale</span>
          {!row.vote ? (
            <span className="drep-voting-history-row-details-muted">—</span>
          ) : anchorLoading ? (
            <span className="drep-voting-history-row-details-unknown">…</span>
          ) : row.voteAnchor.status === 'present' && row.voteAnchor.url ? (
            <button
              type="button"
              onClick={() =>
                onOpenIpfsModal({
                  url: row.voteAnchor.url!,
                  hashHex: row.voteAnchor.hashHex,
                  title: 'Open vote rationale',
                })
              }
              className="drep-voting-history-row-details-text-btn"
            >
              Rationale
            </button>
          ) : row.voteAnchor.status === 'absent' ? (
            <span className="drep-voting-history-row-details-muted">—</span>
          ) : (
            <span className="drep-voting-history-row-details-unknown">?</span>
          )}
        </div>
      </section>
    </div>
  );
}
