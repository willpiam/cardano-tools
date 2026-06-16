import type { CcVoteForProposal } from '../utils/ccVotesByProposalCache';
import type { CachedCcVoteMetadataDoc } from '../utils/ccVoteMetadataDocCache';

export function ccVoteDownloadFilename(voterHotId: string, proposalLabel: string): string {
  const voter = voterHotId.replace(/^cc_hot1/i, '').slice(0, 12);
  const safeVoter = voter.length > 0 ? voter : 'member';
  return `cc-vote-${safeVoter}-${proposalLabel}.json`;
}

export interface CcVoteDownloadBundle {
  proposal: {
    proposalId: string;
    proposalTxHash: string;
    proposalCertIndex: number;
  };
  onChain: {
    voteTxHash: string;
    voterHotId: string;
    vote: string;
    metadataUrl: string | null;
    metadataHash: string | null;
    blockTime?: number;
  };
  metadata: CachedCcVoteMetadataDoc['metadata'];
  rawMetadata: unknown | null;
  metadataAnchor: { url: string; hash: string | null } | null;
}

export function buildCcVoteDownloadBundle(
  vote: CcVoteForProposal,
  proposal: { proposalId: string; proposalTxHash: string; proposalCertIndex: number },
  metadataEntry: CachedCcVoteMetadataDoc | null
): CcVoteDownloadBundle {
  return {
    proposal: {
      proposalId: proposal.proposalId,
      proposalTxHash: proposal.proposalTxHash,
      proposalCertIndex: proposal.proposalCertIndex,
    },
    onChain: {
      voteTxHash: vote.voteTxHash,
      voterHotId: vote.voterHotId,
      vote: vote.vote,
      metadataUrl: vote.metadataUrl,
      metadataHash: vote.metadataHash,
      blockTime: vote.blockTime,
    },
    metadata: metadataEntry?.metadata ?? null,
    rawMetadata: metadataEntry?.rawPayload ?? null,
    metadataAnchor: vote.metadataUrl
      ? { url: vote.metadataUrl, hash: vote.metadataHash }
      : null,
  };
}

export async function downloadAllCcVoteBundles(
  bundles: { bundle: CcVoteDownloadBundle; filename: string }[]
): Promise<void> {
  const { downloadJson } = await import('./downloadJson');

  for (let i = 0; i < bundles.length; i++) {
    const { bundle, filename } = bundles[i];
    downloadJson(bundle, filename);
    if (i < bundles.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}
