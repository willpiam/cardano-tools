import { ChevronDown, ChevronRight } from 'lucide-react';
import { formatGovActionType, truncateHash } from '../functions/governanceActionsFetch';
import {
  formatGovernanceTimeRemaining,
  governanceTimeStatusTitle,
  timeRemainingColor,
} from '../utils/governanceExpiration';
import {
  DRepVotingHistoryRowDetails,
  type DRepVotingHistoryRowData,
  type IpfsModalRequest,
  type MetadataModalRequest,
} from './DRepVotingHistoryRowDetails';

function govActionTypeColor(type: string): { bg: string; fg: string } {
  switch (type) {
    case 'treasury_withdrawals':
      return { bg: '#022c22', fg: '#34d399' };
    case 'parameter_change':
      return { bg: '#1e1b4b', fg: '#a5b4fc' };
    case 'hard_fork_initiation':
      return { bg: '#3f1d2e', fg: '#f9a8d4' };
    case 'new_committee':
      return { bg: '#172554', fg: '#93c5fd' };
    case 'new_constitution':
      return { bg: '#3f2a00', fg: '#facc15' };
    case 'no_confidence':
      return { bg: '#450a0a', fg: '#fca5a5' };
    case 'info_action':
      return { bg: '#1f2937', fg: '#d1d5db' };
    default:
      return { bg: '#111827', fg: '#d1d5db' };
  }
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

interface DRepVotingHistoryRowProps {
  row: DRepVotingHistoryRowData;
  rowKey: string;
  detailsId: string;
  expanded: boolean;
  stripeClass: string;
  cachedTitle?: string;
  anchorLoading: boolean;
  nowSec: number;
  copiedProposalId: string | null;
  onToggle: () => void;
  onCopyProposalId: (id: string) => void;
  onOpenMetadataModal: (request: MetadataModalRequest) => void;
  onOpenIpfsModal: (request: IpfsModalRequest) => void;
}

export function DRepVotingHistoryRow({
  row,
  rowKey,
  detailsId,
  expanded,
  stripeClass,
  cachedTitle,
  anchorLoading,
  nowSec,
  copiedProposalId,
  onToggle,
  onCopyProposalId,
  onOpenMetadataModal,
  onOpenIpfsModal,
}: DRepVotingHistoryRowProps) {
  const typeColors = govActionTypeColor(row.govActionType);

  return (
    <>
      <tr
        className={`${stripeClass} drep-voting-history-summary-row`}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        tabIndex={0}
        role="button"
        aria-expanded={expanded}
        aria-controls={detailsId}
      >
        <td className="col-expand border-b">
          <button
            type="button"
            className="drep-voting-history-expand-btn"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            aria-expanded={expanded}
            aria-controls={detailsId}
            aria-label={expanded ? 'Collapse details' : 'Expand details'}
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        </td>
        <td className="col-action border-b">
          <div className="drep-voting-history-action-cell">
            <span
              className="drep-voting-history-type-badge"
              style={{ backgroundColor: typeColors.bg, color: typeColors.fg }}
            >
              {formatGovActionType(row.govActionType)}
            </span>
            {cachedTitle && (
              <span className="drep-voting-history-action-title">{cachedTitle}</span>
            )}
            <a
              href={`https://cardanoscan.io/govAction/${row.proposalId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="drep-voting-history-action-id"
              onClick={(e) => e.stopPropagation()}
            >
              {truncateHash(row.proposalId)}
            </a>
          </div>
        </td>
        <td
          className="col-time-left border-b"
          title={governanceTimeStatusTitle(row.timeStatus)}
        >
          <span
            style={{
              color: timeRemainingColor(row.timeStatus, nowSec),
              fontWeight: row.timeStatus.kind === 'countdown' ? 'bold' : 'normal',
            }}
          >
            {formatGovernanceTimeRemaining(row.timeStatus, nowSec)}
          </span>
        </td>
        <td className="col-vote border-b">
          <span
            style={{
              color: voteColor(row.vote),
              fontWeight: 'bold',
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: `${voteColor(row.vote)}20`,
            }}
          >
            {voteLabel(row.vote)}
          </span>
        </td>
      </tr>
      {expanded && (
        <tr className={`${stripeClass} drep-voting-history-details-row`} data-row-key={rowKey}>
          <td colSpan={4} className="py-2 border-b">
            <DRepVotingHistoryRowDetails
              row={row}
              detailsId={detailsId}
              anchorLoading={anchorLoading}
              nowSec={nowSec}
              copiedProposalId={copiedProposalId}
              onCopyProposalId={onCopyProposalId}
              onOpenMetadataModal={onOpenMetadataModal}
              onOpenIpfsModal={onOpenIpfsModal}
            />
          </td>
        </tr>
      )}
    </>
  );
}
