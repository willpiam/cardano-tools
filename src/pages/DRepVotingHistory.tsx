import { useState, useEffect, useMemo } from 'react';
import { Settings } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setBlockfrostConfig } from '../store/blockfrostSlice';
import {
  getBlockfrostApiKeyFromStorage,
  getDRepHistoryConfigFromStorage,
  hasBlockfrostApiKeyInUrl,
  saveBlockfrostApiKeyToStorage,
  saveDRepHistoryConfigToStorage,
} from '../utils/toolConfigStorage';
import { Button } from '../components/Button';
import { DRepVotingHistorySettingsModal } from '../components/DRepVotingHistorySettingsModal';
import '../components/IpfsLinkModal.css';
import './DRepVotingHistory.css';
import { DRepMetadataModal } from '../components/DRepMetadataModal';
import { CommitteeVotesModal } from '../components/CommitteeVotesModal';
import { GovernanceActionMetadataModal } from '../components/GovernanceActionMetadataModal';
import { VoteRationaleMetadataModal } from '../components/VoteRationaleMetadataModal';
import { IpfsLinkModal } from '../components/IpfsLinkModal';
import { DRepVoteSummaryChart } from '../components/DRepVoteSummaryChart';
import {
  DRepVoteMetadataChart,
  type VoteAnchorStatus,
} from '../components/DRepVoteMetadataChart';
import { DRepVotingHistoryRow } from '../components/DRepVotingHistoryRow';
import {
  DRepCastVoteWizardModal,
  type CastVoteActionTarget,
} from '../components/DRepCastVoteWizardModal';
import { fetchAllPages, formatGovActionType } from '../functions/governanceActionsFetch';
import { formatAdaCompact } from '../utils/formatAda';
import { fetchVoteTxAnchorMap, proposalKey } from '../functions/voteTxAnchors';
import { ReloadingRecacheModal } from '../components/ReloadingRecacheModal';
import {
  clearGovernanceMetadataDocCache,
  isGovernanceMetadataDocCacheHit,
  loadAllMetadataDocCache,
  type CachedGovernanceMetadataDoc,
} from '../utils/governanceMetadataDocCache';
import { prefetchUncachedGovernanceMetadataDocs } from '../utils/governanceMetadataDocFetch';
import {
  clearVoteRationaleDocCache,
  isVoteRationaleDocCacheHit,
  loadVoteRationaleDocCacheForDrep,
  type CachedVoteRationaleDoc,
} from '../utils/voteRationaleDocCache';
import { prefetchUncachedVoteRationaleDocs } from '../utils/voteRationaleDocFetch';
import type { DrepMetadata } from '../functions/drepMetadata';
import {
  clearDrepMetadataDocCache,
  countDrepMetadataDocCache,
} from '../utils/drepMetadataDocCache';
import { ensureDrepMetadataDocCached } from '../utils/drepMetadataDocFetch';
import {
  clearCcVoteMetadataDocCache,
  countCcVoteMetadataDocCache,
} from '../utils/ccVoteMetadataDocCache';
import {
  clearCcVotesByProposalCache,
  countCcVotesByProposalCache,
} from '../utils/ccVotesByProposalCache';
import {
  formatMetadataPrefetchDescription,
  formatVoteRationalePrefetchDescription,
  METADATA_PREFETCH_MODAL_TITLE,
  VOTE_RATIONALE_PREFETCH_MODAL_TITLE,
} from '../utils/drepVotingHistoryRecacheHelpers';
import {
  drepVoteCacheKey,
  loadAllProposalCache,
  loadDrepVoteCache,
  proposalCacheKey,
  putDrepVoteCacheBatch,
  putProposalCacheBatch,
  type CachedDrepVoteEnrichment,
  type CachedProposalEnrichment,
  type CachedVoteAnchorInfo,
} from '../utils/drepVotingHistoryCache';
import {
  RECACHE_MODAL_TITLE,
  runPhasedRecache,
  type RecacheProgress,
} from '../utils/drepVotingHistoryRecache';
import {
  fetchGovernanceEpochContext,
  fetchProposalExpirationFields,
  hasGovernanceVotingDeadline,
  isGovernanceActionFinalized,
  type ProposalMetadataAnchorInfo,
  resolveGovernanceTimeStatus,
  type GovernanceActionTimeStatus,
} from '../utils/governanceExpiration';

interface BlockfrostProposal {
  id: string;
  tx_hash: string;
  cert_index: number;
  governance_type: string;
}

interface BlockfrostDRepVote {
  tx_hash: string;
  cert_index: number;
  proposal_id: string;
  proposal_tx_hash: string;
  proposal_cert_index: number;
  vote: string;
}

export type VoteAnchorInfo = CachedVoteAnchorInfo;

interface MergedProposal {
  proposalId: string;
  proposalTxHash: string;
  proposalCertIndex: number;
  govActionType: string;
  vote: string | null;
  voteTxHash: string | null;
  voteAnchor: VoteAnchorInfo;
  actionMetadataAnchor: ProposalMetadataAnchorInfo;
  timeStatus: GovernanceActionTimeStatus;
  treasuryWithdrawalTotalLovelace: number | null;
  treasuryWithdrawalRecipientCount: number | null;
}

function actionSearchHaystack(
  row: MergedProposal,
  cachedTitle?: string
): string {
  const parts = [
    formatGovActionType(row.govActionType),
    cachedTitle,
    row.proposalId,
    row.treasuryWithdrawalTotalLovelace != null
      ? formatAdaCompact(row.treasuryWithdrawalTotalLovelace)
      : null,
  ].filter(Boolean);
  return parts.join(' ').toLowerCase();
}

interface IpfsModalState {
  url: string;
  hashHex?: string;
  title: string;
}

interface MetadataModalState {
  url: string;
  hashHex?: string;
  proposalId: string;
  proposalTxHash: string;
  proposalCertIndex: number;
}

interface VoteRationaleModalState {
  url: string;
  hashHex?: string;
  proposalId: string;
  proposalTxHash: string;
  proposalCertIndex: number;
}

interface CcVotesModalState {
  proposalId: string;
  proposalTxHash: string;
  proposalCertIndex: number;
}

function truncateHash(hash: string): string {
  return hash.slice(0, 8) + '...' + hash.slice(-8);
}

function initialVoteAnchor(vote: string | null): VoteAnchorInfo {
  if (!vote) return { status: 'none' };
  return { status: 'unknown' };
}

function resolveVoteAnchor(
  vote: string | null,
  voteTxHash: string | null,
  proposalTxHash: string,
  proposalCertIndex: number,
  anchorByProposalKey: Map<string, { hasAnchor: boolean; url?: string; hashHex?: string }>,
  failedTxHashes: Set<string>
): VoteAnchorInfo {
  if (!vote) return { status: 'none' };
  if (!voteTxHash) return { status: 'unknown' };

  const normalizedTx = voteTxHash.trim().toLowerCase();
  if (failedTxHashes.has(normalizedTx)) {
    return { status: 'unknown' };
  }

  const key = proposalKey(proposalTxHash, proposalCertIndex);
  const entry = anchorByProposalKey.get(key);
  if (!entry) {
    return { status: 'unknown' };
  }

  if (entry.hasAnchor) {
    return {
      status: 'present',
      url: entry.url,
      hashHex: entry.hashHex,
    };
  }
  return { status: 'absent' };
}

const DRepVotingHistory = () => {
  const { drepId } = useParams<{ drepId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { apiKey } = useAppSelector((state) => state.blockfrost);

  const [localApiKey, setLocalApiKey] = useState(apiKey || '');
  const [loadedDrepId, setLoadedDrepId] = useState<string | null>(null);
  const [persistBlockfrostInUrl, setPersistBlockfrostInUrl] = useState(hasBlockfrostApiKeyInUrl);
  const [showLoadCachedSettings, setShowLoadCachedSettings] = useState(false);
  const [drepInput, setDrepInput] = useState(drepId || '');
  const activeDrepId = drepId ?? loadedDrepId ?? null;
  const [mergedData, setMergedData] = useState<MergedProposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [anchorLoading, setAnchorLoading] = useState(false);
  const [anchorCheckFailedCount, setAnchorCheckFailedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copiedProposalId, setCopiedProposalId] = useState<string | null>(null);
  const [ipfsModal, setIpfsModal] = useState<IpfsModalState | null>(null);
  const [metadataModal, setMetadataModal] = useState<MetadataModalState | null>(null);
  const [voteRationaleModal, setVoteRationaleModal] = useState<VoteRationaleModalState | null>(
    null
  );
  const [ccVotesModal, setCcVotesModal] = useState<CcVotesModalState | null>(null);
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  const [cachedClosedCount, setCachedClosedCount] = useState(0);
  const [cachedMetadataDocCount, setCachedMetadataDocCount] = useState(0);
  const [cachedVoteRationaleDocCount, setCachedVoteRationaleDocCount] = useState(0);
  const [recaching, setRecaching] = useState(false);
  const [prefetchingMetadata, setPrefetchingMetadata] = useState(false);
  const [prefetchingVoteRationale, setPrefetchingVoteRationale] = useState(false);
  const [recacheModalOpen, setRecacheModalOpen] = useState(false);
  const [prefetchModalOpen, setPrefetchModalOpen] = useState(false);
  const [votePrefetchModalOpen, setVotePrefetchModalOpen] = useState(false);
  const [recacheProgress, setRecacheProgress] = useState<RecacheProgress>({
    title: RECACHE_MODAL_TITLE,
    description: '',
  });
  const [prefetchProgress, setPrefetchProgress] = useState<RecacheProgress>({
    title: METADATA_PREFETCH_MODAL_TITLE,
    description: '',
  });
  const [votePrefetchProgress, setVotePrefetchProgress] = useState<RecacheProgress>({
    title: VOTE_RATIONALE_PREFETCH_MODAL_TITLE,
    description: '',
  });
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null);
  const [titleSearchQuery, setTitleSearchQuery] = useState('');
  const [metadataDocCache, setMetadataDocCache] = useState<
    Map<string, CachedGovernanceMetadataDoc>
  >(new Map());
  const [metadataTitleByKey, setMetadataTitleByKey] = useState<
    Map<string, { title: string; anchorUrl: string }>
  >(new Map());
  const [voteRationaleDocCache, setVoteRationaleDocCache] = useState<
    Map<string, CachedVoteRationaleDoc>
  >(new Map());
  const [voteRationaleExcerptByKey, setVoteRationaleExcerptByKey] = useState<
    Map<string, { excerpt: string; anchorUrl: string }>
  >(new Map());
  const [cachedDrepMetadataDocCount, setCachedDrepMetadataDocCount] = useState(0);
  const [cachedCcVotesByProposalCount, setCachedCcVotesByProposalCount] = useState(0);
  const [cachedCcVoteMetadataDocCount, setCachedCcVoteMetadataDocCount] = useState(0);
  const [drepProfileModalOpen, setDrepProfileModalOpen] = useState(false);
  const [drepProfileStatus, setDrepProfileStatus] = useState<
    'idle' | 'loading' | 'present' | 'absent' | 'failed'
  >('idle');
  const [drepProfileMetadata, setDrepProfileMetadata] = useState<DrepMetadata | null>(null);
  const [drepProfileError, setDrepProfileError] = useState<string | null>(null);
  const [castVoteWizardAction, setCastVoteWizardAction] = useState<CastVoteActionTarget | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const blockfrostApiKey = urlParams.get('blockfrostApiKey');
    if (blockfrostApiKey) {
      dispatch(setBlockfrostConfig({ useBlockfrost: true, apiKey: blockfrostApiKey }));
      setLocalApiKey(blockfrostApiKey);
      saveBlockfrostApiKeyToStorage(blockfrostApiKey);
    }
  }, [dispatch]);

  useEffect(() => {
    if (apiKey) {
      setLocalApiKey(apiKey);
      saveBlockfrostApiKeyToStorage(apiKey);
    }
  }, [apiKey]);

  useEffect(() => {
    if (drepId) {
      setLoadedDrepId(null);
      setDrepInput(drepId);
      saveDRepHistoryConfigToStorage({ drepId });
    }
  }, [drepId]);

  useEffect(() => {
    if (loadedDrepId) {
      setDrepInput(loadedDrepId);
    }
  }, [loadedDrepId]);

  useEffect(() => {
    setExpandedRowKey(null);
    setTitleSearchQuery('');
    setDrepProfileStatus('idle');
    setDrepProfileMetadata(null);
    setDrepProfileError(null);
  }, [activeDrepId]);

  useEffect(() => {
    if (!activeDrepId || !apiKey) return;
    fetchData(activeDrepId, apiKey);
  }, [activeDrepId, apiKey]);

  useEffect(() => {
    const cachedBlockfrost = getBlockfrostApiKeyFromStorage();
    const cachedHistory = getDRepHistoryConfigFromStorage();
    const urlHadBlockfrost = hasBlockfrostApiKeyInUrl();
    const canLoadBlockfrost = !apiKey && Boolean(cachedBlockfrost) && !urlHadBlockfrost;
    const canLoadDrep = !activeDrepId && Boolean(cachedHistory?.drepId);
    setShowLoadCachedSettings(canLoadBlockfrost || canLoadDrep);
  }, [apiKey, activeDrepId]);

  const refreshMetadataDocCacheState = async () => {
    const cache = await loadAllMetadataDocCache();
    const titles = new Map<string, { title: string; anchorUrl: string }>();
    for (const [key, entry] of cache) {
      const title = entry.metadata?.title?.trim();
      if (title) {
        titles.set(key, { title, anchorUrl: entry.anchorUrl });
      }
    }
    setMetadataDocCache(cache);
    setMetadataTitleByKey(titles);
    setCachedMetadataDocCount(cache.size);
  };

  const refreshVoteRationaleDocCacheState = async () => {
    if (!activeDrepId) return;
    const cache = await loadVoteRationaleDocCacheForDrep(activeDrepId);
    const excerpts = new Map<string, { excerpt: string; anchorUrl: string }>();
    for (const [key, entry] of cache) {
      const comment = entry.metadata?.comment?.trim();
      if (comment) {
        excerpts.set(key, { excerpt: comment, anchorUrl: entry.anchorUrl });
      }
    }
    setVoteRationaleDocCache(cache);
    setVoteRationaleExcerptByKey(excerpts);
    setCachedVoteRationaleDocCount(cache.size);
  };

  useEffect(() => {
    if (!activeDrepId) return;
    void refreshMetadataDocCacheState();
    void refreshVoteRationaleDocCacheState();
    void countDrepMetadataDocCache().then(setCachedDrepMetadataDocCount);
    void countCcVotesByProposalCache().then(setCachedCcVotesByProposalCount);
    void countCcVoteMetadataDocCache().then(setCachedCcVoteMetadataDocCount);
  }, [activeDrepId]);

  const loadDrepProfileMetadata = async (drepId: string, key: string) => {
    setDrepProfileStatus('loading');
    setDrepProfileMetadata(null);
    setDrepProfileError(null);

    const result = await ensureDrepMetadataDocCached({ drepId, apiKey: key });

    if (result.outcome === 'fetched') {
      void countDrepMetadataDocCache().then(setCachedDrepMetadataDocCount);
    }

    if (result.outcome === 'cached' || result.outcome === 'fetched') {
      setDrepProfileMetadata(result.metadata);
      setDrepProfileStatus('present');
      return;
    }

    if (result.outcome === 'absent') {
      setDrepProfileStatus('absent');
      return;
    }

    setDrepProfileError(result.metadataError?.message ?? 'Failed to load DRep profile metadata');
    setDrepProfileStatus('failed');
  };

  useEffect(() => {
    if (!activeDrepId || !apiKey) return;
    void loadDrepProfileMetadata(activeDrepId, apiKey);
  }, [activeDrepId, apiKey]);

  const uncachedMetadataCount = useMemo(
    () =>
      mergedData.filter((row) => {
        if (row.actionMetadataAnchor.status !== 'present' || !row.actionMetadataAnchor.url) {
          return false;
        }
        const key = proposalCacheKey(row.proposalTxHash, row.proposalCertIndex);
        return !isGovernanceMetadataDocCacheHit(
          metadataDocCache.get(key),
          row.actionMetadataAnchor.url
        );
      }).length,
    [mergedData, metadataDocCache]
  );

  const uncachedVoteRationaleCount = useMemo(() => {
    if (!activeDrepId) return 0;
    return mergedData.filter((row) => {
      if (!row.vote || row.voteAnchor.status !== 'present' || !row.voteAnchor.url) {
        return false;
      }
      const key = drepVoteCacheKey(
        activeDrepId,
        proposalCacheKey(row.proposalTxHash, row.proposalCertIndex)
      );
      return !isVoteRationaleDocCacheHit(voteRationaleDocCache.get(key), row.voteAnchor.url);
    }).length;
  }, [mergedData, voteRationaleDocCache, activeDrepId]);

  useEffect(() => {
    if (!mergedData.some((row) => hasGovernanceVotingDeadline(row.timeStatus))) return;
    const id = window.setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000));
    }, 60_000);
    return () => window.clearInterval(id);
  }, [mergedData]);

  const enrichAnchors = async (
    merged: MergedProposal[],
    id: string,
    key: string,
    ctx: import('../utils/governanceExpiration').GovernanceEpochContext
  ) => {
    const rowsNeedingCbor = merged.filter((row) => {
      if (!row.vote || !row.voteTxHash) return false;
      if (!isGovernanceActionFinalized(row.timeStatus)) return true;
      return row.voteAnchor.status === 'unknown';
    });

    const voteTxHashes = [
      ...new Set(rowsNeedingCbor.map((m) => m.voteTxHash).filter((h): h is string => Boolean(h))),
    ];

    if (voteTxHashes.length === 0) {
      setAnchorCheckFailedCount(0);
      return;
    }

    setAnchorLoading(true);
    const nowSec = Math.floor(Date.now() / 1000);
    try {
      const { anchorByProposalKey, failedTxHashes } = await fetchVoteTxAnchorMap(
        key,
        voteTxHashes,
        id
      );
      const failedSet = new Set(failedTxHashes.map((h) => h.toLowerCase()));
      setAnchorCheckFailedCount(failedTxHashes.length);

      const drepVoteWrites = new Map<string, CachedDrepVoteEnrichment>();

      setMergedData((prev) =>
        prev.map((row) => {
          const needsUpdate = rowsNeedingCbor.some(
            (r) =>
              r.proposalTxHash === row.proposalTxHash &&
              r.proposalCertIndex === row.proposalCertIndex
          );
          if (!needsUpdate) return row;

          const voteAnchor = resolveVoteAnchor(
            row.vote,
            row.voteTxHash,
            row.proposalTxHash,
            row.proposalCertIndex,
            anchorByProposalKey,
            failedSet
          );

          if (
            row.vote &&
            row.voteTxHash &&
            isGovernanceActionFinalized(row.timeStatus) &&
            voteAnchor.status !== 'unknown'
          ) {
            const pk = proposalCacheKey(row.proposalTxHash, row.proposalCertIndex);
            drepVoteWrites.set(pk, {
              vote: row.vote,
              voteTxHash: row.voteTxHash,
              voteAnchor,
              cachedAtSec: nowSec,
            });
          }

          return { ...row, voteAnchor };
        })
      );

      await putDrepVoteCacheBatch(id, drepVoteWrites);
    } catch (err) {
      console.error('Failed to enrich vote anchors', err);
      setMergedData((prev) =>
        prev.map((row) => ({
          ...row,
          voteAnchor: row.vote
            ? { status: 'unknown' as const }
            : { status: 'none' as const },
        }))
      );
    } finally {
      setAnchorLoading(false);
    }
  };

  const fetchData = async (id: string, key: string) => {
    setLoading(true);
    setError(null);
    setMergedData([]);
    setAnchorCheckFailedCount(0);
    setAnchorLoading(false);
    setCachedClosedCount(0);

    try {
      const [proposals, votes, ctx, proposalCache, drepVoteCache] = await Promise.all([
        fetchAllPages<BlockfrostProposal>('/governance/proposals', key),
        fetchAllPages<BlockfrostDRepVote>(`/governance/dreps/${id}/votes`, key),
        fetchGovernanceEpochContext(key),
        loadAllProposalCache(),
        loadDrepVoteCache(id),
      ]);

      const needsDetail: BlockfrostProposal[] = [];
      for (const p of proposals) {
        const cacheKey = proposalCacheKey(p.tx_hash, p.cert_index);
        const cached = proposalCache.get(cacheKey);
        if (!cached) {
          needsDetail.push(p);
          continue;
        }
        const status = resolveGovernanceTimeStatus(cached.expiration, ctx);
        if (!isGovernanceActionFinalized(status)) {
          needsDetail.push(p);
          continue;
        }
        if (
          p.governance_type === 'treasury_withdrawals' &&
          cached.treasuryWithdrawalTotalLovelace === undefined
        ) {
          needsDetail.push(p);
        }
      }

      const fetched =
        needsDetail.length > 0
          ? await fetchProposalExpirationFields(
              key,
              needsDetail.map((p) => ({
                tx_hash: p.tx_hash,
                cert_index: p.cert_index,
                id: p.id,
              }))
            )
          : {
              expirationByKey: new Map<string, import('../utils/governanceExpiration').BlockfrostProposalExpirationFields>(),
              metadataAnchorByKey: new Map<string, ProposalMetadataAnchorInfo>(),
              treasuryWithdrawalByKey: new Map<
                string,
                import('../functions/governanceActionsFetch').TreasuryWithdrawalSummary
              >(),
            };

      const expirationByKey = new Map(fetched.expirationByKey);
      const metadataAnchorByKey = new Map(fetched.metadataAnchorByKey);
      const treasuryWithdrawalByKey = new Map(fetched.treasuryWithdrawalByKey);
      for (const [cacheKey, cached] of proposalCache) {
        if (!expirationByKey.has(cacheKey)) {
          expirationByKey.set(cacheKey, cached.expiration);
        }
        if (!metadataAnchorByKey.has(cacheKey)) {
          metadataAnchorByKey.set(cacheKey, cached.metadataAnchor);
        }
        if (
          cached.treasuryWithdrawalTotalLovelace !== undefined &&
          !treasuryWithdrawalByKey.has(cacheKey)
        ) {
          treasuryWithdrawalByKey.set(cacheKey, {
            totalLovelace: cached.treasuryWithdrawalTotalLovelace,
            recipientCount: cached.treasuryWithdrawalRecipientCount ?? 0,
          });
        }
      }

      const nowSec = Math.floor(Date.now() / 1000);
      const proposalCacheWrites = new Map<string, CachedProposalEnrichment>();

      const voteMap = new Map<string, BlockfrostDRepVote>();
      for (const v of votes) {
        voteMap.set(proposalCacheKey(v.proposal_tx_hash, v.proposal_cert_index), v);
      }

      let closedFromCache = 0;

      const merged: MergedProposal[] = proposals.map((p) => {
        const proposalKeyStr = proposalCacheKey(p.tx_hash, p.cert_index);
        const vote = voteMap.get(proposalKeyStr);
        const expirationFields = expirationByKey.get(proposalKeyStr);
        const timeStatus = expirationFields
          ? resolveGovernanceTimeStatus(expirationFields, ctx, nowSec)
          : { kind: 'unknown' as const };
        const voteValue = vote?.vote ?? null;
        const voteTxHash = vote?.tx_hash ?? null;
        const finalized = isGovernanceActionFinalized(timeStatus);

        const fetchedFields = fetched.expirationByKey.has(proposalKeyStr);
        if (finalized && fetchedFields && expirationFields) {
          const meta = metadataAnchorByKey.get(proposalKeyStr);
          if (meta) {
            const treasury = treasuryWithdrawalByKey.get(proposalKeyStr);
            proposalCacheWrites.set(proposalKeyStr, {
              expiration: expirationFields,
              metadataAnchor: meta,
              ...(treasury
                ? {
                    treasuryWithdrawalTotalLovelace: treasury.totalLovelace,
                    treasuryWithdrawalRecipientCount: treasury.recipientCount,
                  }
                : {}),
              cachedAtSec: nowSec,
            });
          }
        }

        let voteAnchor: VoteAnchorInfo = initialVoteAnchor(voteValue);
        const cachedVote = drepVoteCache.get(proposalKeyStr);
        const proposalCached = proposalCache.has(proposalKeyStr);

        if (finalized && proposalCached) {
          const voteFullyCached =
            !voteValue ||
            (cachedVote &&
              cachedVote.vote === voteValue &&
              cachedVote.voteTxHash === voteTxHash &&
              cachedVote.voteAnchor.status !== 'unknown');
          if (voteFullyCached) closedFromCache += 1;
        }

        if (
          finalized &&
          voteValue &&
          voteTxHash &&
          cachedVote &&
          cachedVote.vote === voteValue &&
          cachedVote.voteTxHash === voteTxHash &&
          cachedVote.voteAnchor.status !== 'unknown'
        ) {
          voteAnchor = cachedVote.voteAnchor;
        }

        const treasury =
          p.governance_type === 'treasury_withdrawals'
            ? treasuryWithdrawalByKey.get(proposalKeyStr) ?? null
            : null;

        return {
          proposalId: p.id,
          proposalTxHash: p.tx_hash,
          proposalCertIndex: p.cert_index,
          govActionType: p.governance_type,
          vote: voteValue,
          voteTxHash,
          voteAnchor,
          actionMetadataAnchor: metadataAnchorByKey.get(proposalKeyStr) ?? { status: 'unknown' },
          timeStatus,
          treasuryWithdrawalTotalLovelace: treasury?.totalLovelace ?? null,
          treasuryWithdrawalRecipientCount: treasury?.recipientCount ?? null,
        };
      });

      await putProposalCacheBatch(proposalCacheWrites);

      setNowSec(nowSec);
      setMergedData(merged);
      setCachedClosedCount(closedFromCache);
      setLoading(false);

      void enrichAnchors(merged, id, key, ctx);
    } catch (err) {
      console.error('Failed to fetch DRep voting history', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setLoading(false);
    }
  };

  const handleForceRecache = async () => {
    if (!activeDrepId || !apiKey || recaching) return;

    setRecaching(true);
    setRecacheModalOpen(true);
    setRecacheProgress({ title: RECACHE_MODAL_TITLE, description: 'Loading governance actions…' });

    try {
      const [proposals, votes, ctx, proposalCache] = await Promise.all([
        fetchAllPages<BlockfrostProposal>('/governance/proposals', apiKey),
        fetchAllPages<BlockfrostDRepVote>(`/governance/dreps/${activeDrepId}/votes`, apiKey),
        fetchGovernanceEpochContext(apiKey),
        loadAllProposalCache(),
      ]);

      const nowSec = Math.floor(Date.now() / 1000);
      const finalizedProposals: { tx_hash: string; cert_index: number; id?: string }[] = [];

      for (const p of proposals) {
        const key = proposalCacheKey(p.tx_hash, p.cert_index);
        const cached = proposalCache.get(key);
        if (!cached) continue;
        const status = resolveGovernanceTimeStatus(cached.expiration, ctx, nowSec);
        if (isGovernanceActionFinalized(status)) {
          finalizedProposals.push({
            tx_hash: p.tx_hash,
            cert_index: p.cert_index,
            id: p.id,
          });
        }
      }

      if (mergedData.length > 0) {
        const seen = new Set(finalizedProposals.map((p) => proposalCacheKey(p.tx_hash, p.cert_index)));
        for (const row of mergedData) {
          if (!isGovernanceActionFinalized(row.timeStatus)) continue;
          const key = proposalCacheKey(row.proposalTxHash, row.proposalCertIndex);
          if (seen.has(key)) continue;
          seen.add(key);
          finalizedProposals.push({
            tx_hash: row.proposalTxHash,
            cert_index: row.proposalCertIndex,
            id: row.proposalId,
          });
        }
      }

      const recacheVotes = votes
        .filter((v) => {
          const key = proposalCacheKey(v.proposal_tx_hash, v.proposal_cert_index);
          return finalizedProposals.some(
            (p) => proposalCacheKey(p.tx_hash, p.cert_index) === key
          );
        })
        .map((v) => ({
          proposalTxHash: v.proposal_tx_hash,
          proposalCertIndex: v.proposal_cert_index,
          vote: v.vote,
          voteTxHash: v.tx_hash,
        }));

      if (finalizedProposals.length === 0) {
        setRecacheProgress({
          title: RECACHE_MODAL_TITLE,
          description: 'No closed governance actions in cache yet. Load history first.',
        });
        await new Promise((r) => window.setTimeout(r, 2500));
        return;
      }

      await runPhasedRecache({
        apiKey,
        drepId: activeDrepId,
        ctx,
        proposals: finalizedProposals,
        votes: recacheVotes,
        onProgress: setRecacheProgress,
      });

      setRecacheProgress({ title: RECACHE_MODAL_TITLE, description: 'Refreshing table…' });
      await fetchData(activeDrepId, apiKey);
    } catch (err) {
      console.error('Force recache failed', err);
      setError(err instanceof Error ? err.message : 'Recache failed');
    } finally {
      setRecaching(false);
      setRecacheModalOpen(false);
    }
  };

  const refreshMetadataDocCount = () => {
    void refreshMetadataDocCacheState();
  };

  const refreshVoteRationaleDocCount = () => {
    void refreshVoteRationaleDocCacheState();
  };

  const handleClearMetadataDocCache = async () => {
    await clearGovernanceMetadataDocCache();
    setCachedMetadataDocCount(0);
    setMetadataDocCache(new Map());
    setMetadataTitleByKey(new Map());
  };

  const handleClearVoteRationaleDocCache = async () => {
    await clearVoteRationaleDocCache();
    setCachedVoteRationaleDocCount(0);
    setVoteRationaleDocCache(new Map());
    setVoteRationaleExcerptByKey(new Map());
  };

  const refreshDrepMetadataDocCount = () => {
    void countDrepMetadataDocCache().then(setCachedDrepMetadataDocCount);
  };

  const handleClearDrepMetadataDocCache = async () => {
    await clearDrepMetadataDocCache();
    setCachedDrepMetadataDocCount(0);
    if (activeDrepId && apiKey) {
      await loadDrepProfileMetadata(activeDrepId, apiKey);
    } else {
      setDrepProfileStatus('idle');
      setDrepProfileMetadata(null);
      setDrepProfileError(null);
    }
  };

  const refreshCcVoteCacheCounts = () => {
    void countCcVotesByProposalCache().then(setCachedCcVotesByProposalCount);
    void countCcVoteMetadataDocCache().then(setCachedCcVoteMetadataDocCount);
  };

  const handleClearCcVotesByProposalCache = async () => {
    await clearCcVotesByProposalCache();
    setCachedCcVotesByProposalCount(0);
  };

  const handleClearCcVoteMetadataDocCache = async () => {
    await clearCcVoteMetadataDocCache();
    setCachedCcVoteMetadataDocCount(0);
  };

  const handleLoadUncachedMetadata = async () => {
    if (prefetchingMetadata || prefetchingVoteRationale || recaching) return;

    const items = mergedData
      .filter((row) => {
        if (row.actionMetadataAnchor.status !== 'present' || !row.actionMetadataAnchor.url) {
          return false;
        }
        const key = proposalCacheKey(row.proposalTxHash, row.proposalCertIndex);
        return !isGovernanceMetadataDocCacheHit(
          metadataDocCache.get(key),
          row.actionMetadataAnchor.url
        );
      })
      .map((row) => ({
        cacheKey: proposalCacheKey(row.proposalTxHash, row.proposalCertIndex),
        anchorUrl: row.actionMetadataAnchor.url!,
        hashHex: row.actionMetadataAnchor.hashHex,
      }));

    setPrefetchingMetadata(true);
    setPrefetchModalOpen(true);

    if (items.length === 0) {
      setPrefetchProgress({
        title: METADATA_PREFETCH_MODAL_TITLE,
        description: 'All governance metadata with anchors is already cached.',
      });
      await new Promise((r) => window.setTimeout(r, 2500));
      setPrefetchingMetadata(false);
      setPrefetchModalOpen(false);
      return;
    }

    try {
      setPrefetchProgress({
        title: METADATA_PREFETCH_MODAL_TITLE,
        description: formatMetadataPrefetchDescription(0, items.length, 0),
      });

      const result = await prefetchUncachedGovernanceMetadataDocs(items, {
        onProgress: (progress) => {
          setPrefetchProgress({
            title: METADATA_PREFETCH_MODAL_TITLE,
            description: formatMetadataPrefetchDescription(
              progress.current,
              progress.total,
              progress.failed
            ),
          });
        },
      });

      await refreshMetadataDocCacheState();

      if (result.failed > 0) {
        setPrefetchProgress({
          title: METADATA_PREFETCH_MODAL_TITLE,
          description: `Finished: ${result.fetched} loaded, ${result.failed} failed, ${result.skipped} already cached.`,
        });
        await new Promise((r) => window.setTimeout(r, 2500));
      }
    } catch (err) {
      console.error('Metadata prefetch failed', err);
      setError(err instanceof Error ? err.message : 'Metadata prefetch failed');
    } finally {
      setPrefetchingMetadata(false);
      setPrefetchModalOpen(false);
    }
  };

  const resolveCachedTitle = (row: MergedProposal): string | undefined => {
    if (row.actionMetadataAnchor.status !== 'present' || !row.actionMetadataAnchor.url) {
      return undefined;
    }
    const key = proposalCacheKey(row.proposalTxHash, row.proposalCertIndex);
    const cached = metadataTitleByKey.get(key);
    if (!cached || cached.anchorUrl !== row.actionMetadataAnchor.url) {
      return undefined;
    }
    return cached.title;
  };

  const resolveCachedRationaleExcerpt = (row: MergedProposal): string | undefined => {
    if (!activeDrepId || !row.vote || row.voteAnchor.status !== 'present' || !row.voteAnchor.url) {
      return undefined;
    }
    const key = drepVoteCacheKey(
      activeDrepId,
      proposalCacheKey(row.proposalTxHash, row.proposalCertIndex)
    );
    const cached = voteRationaleExcerptByKey.get(key);
    if (!cached || cached.anchorUrl !== row.voteAnchor.url) {
      return undefined;
    }
    return cached.excerpt;
  };

  const filteredMergedData = useMemo(() => {
    const query = titleSearchQuery.trim().toLowerCase();
    if (!query) return mergedData;
    return mergedData.filter((row) => {
      const cachedTitle = resolveCachedTitle(row);
      return actionSearchHaystack(row, cachedTitle).includes(query);
    });
  }, [mergedData, titleSearchQuery, metadataTitleByKey]);

  useEffect(() => {
    if (!expandedRowKey) return;
    const stillVisible = filteredMergedData.some(
      (row) => proposalCacheKey(row.proposalTxHash, row.proposalCertIndex) === expandedRowKey
    );
    if (!stillVisible) {
      setExpandedRowKey(null);
    }
  }, [filteredMergedData, expandedRowKey]);

  const handleLoadUncachedVoteRationale = async () => {
    if (!activeDrepId || prefetchingVoteRationale || recaching) return;

    const items = mergedData
      .filter((row) => {
        if (!row.vote || row.voteAnchor.status !== 'present' || !row.voteAnchor.url) {
          return false;
        }
        const key = drepVoteCacheKey(
          activeDrepId,
          proposalCacheKey(row.proposalTxHash, row.proposalCertIndex)
        );
        return !isVoteRationaleDocCacheHit(voteRationaleDocCache.get(key), row.voteAnchor.url);
      })
      .map((row) => ({
        cacheKey: drepVoteCacheKey(
          activeDrepId,
          proposalCacheKey(row.proposalTxHash, row.proposalCertIndex)
        ),
        anchorUrl: row.voteAnchor.url!,
        hashHex: row.voteAnchor.hashHex,
      }));

    setPrefetchingVoteRationale(true);
    setVotePrefetchModalOpen(true);

    if (items.length === 0) {
      setVotePrefetchProgress({
        title: VOTE_RATIONALE_PREFETCH_MODAL_TITLE,
        description: 'All vote rationales with anchors are already cached.',
      });
      await new Promise((r) => window.setTimeout(r, 2500));
      setPrefetchingVoteRationale(false);
      setVotePrefetchModalOpen(false);
      return;
    }

    try {
      setVotePrefetchProgress({
        title: VOTE_RATIONALE_PREFETCH_MODAL_TITLE,
        description: formatVoteRationalePrefetchDescription(0, items.length, 0),
      });

      const result = await prefetchUncachedVoteRationaleDocs(items, {
        onProgress: (progress) => {
          setVotePrefetchProgress({
            title: VOTE_RATIONALE_PREFETCH_MODAL_TITLE,
            description: formatVoteRationalePrefetchDescription(
              progress.current,
              progress.total,
              progress.failed
            ),
          });
        },
      });

      await refreshVoteRationaleDocCacheState();

      if (result.failed > 0) {
        setVotePrefetchProgress({
          title: VOTE_RATIONALE_PREFETCH_MODAL_TITLE,
          description: `Finished: ${result.fetched} loaded, ${result.failed} failed, ${result.skipped} already cached.`,
        });
        await new Promise((r) => window.setTimeout(r, 2500));
      }
    } catch (err) {
      console.error('Vote rationale prefetch failed', err);
      setError(err instanceof Error ? err.message : 'Vote rationale prefetch failed');
    } finally {
      setPrefetchingVoteRationale(false);
      setVotePrefetchModalOpen(false);
    }
  };

  const handleApplyKey = () => {
    if (!localApiKey.trim()) return;
    const trimmed = localApiKey.trim();
    dispatch(setBlockfrostConfig({ useBlockfrost: true, apiKey: trimmed }));
    saveBlockfrostApiKeyToStorage(trimmed);
    if (persistBlockfrostInUrl) {
      const url = new URL(window.location.href);
      url.searchParams.set('blockfrostApiKey', trimmed);
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleLookup = () => {
    const trimmed = drepInput.trim();
    if (!trimmed) return;
    saveDRepHistoryConfigToStorage({ drepId: trimmed });
    navigate(`/drephistory/${encodeURIComponent(trimmed)}`);
  };

  const handleLoadCachedSettings = () => {
    const cachedBlockfrost = getBlockfrostApiKeyFromStorage();
    if (cachedBlockfrost && !apiKey) {
      dispatch(setBlockfrostConfig({ useBlockfrost: true, apiKey: cachedBlockfrost }));
      setLocalApiKey(cachedBlockfrost);
    }
    const cachedHistory = getDRepHistoryConfigFromStorage();
    if (cachedHistory?.drepId && !drepId) {
      setLoadedDrepId(cachedHistory.drepId);
      setDrepInput(cachedHistory.drepId);
    }
  };

  const copyGovActionId = (id: string) => {
    void navigator.clipboard.writeText(id).then(() => {
      setCopiedProposalId(id);
      window.setTimeout(() => {
        setCopiedProposalId((cur) => (cur === id ? null : cur));
      }, 2000);
    });
  };

  const openCastVoteWizard = (row: MergedProposal) => {
    setCastVoteWizardAction({
      proposalId: row.proposalId,
      proposalTxHash: row.proposalTxHash,
      proposalCertIndex: row.proposalCertIndex,
      govActionType: row.govActionType,
      cachedTitle: resolveCachedTitle(row),
    });
  };

  const handleVoteSubmitted = () => {
    if (activeDrepId && apiKey) {
      void fetchData(activeDrepId, apiKey);
    }
  };

  const votedCount = mergedData.filter((m) => m.vote !== null).length;
  const missedCount = mergedData.filter((m) => m.vote === null).length;

  const liveVoteStats = useMemo(() => {
    let live = 0;
    let liveUnvoted = 0;
    for (const row of mergedData) {
      if (!isGovernanceActionFinalized(row.timeStatus)) {
        live += 1;
        if (row.vote === null) liveUnvoted += 1;
      }
    }
    return { live, liveUnvoted };
  }, [mergedData]);

  const withAnchorCount = useMemo(
    () => mergedData.filter((m) => m.voteAnchor.status === 'present').length,
    [mergedData]
  );

  const anchorPct =
    votedCount > 0 && !anchorLoading
      ? Math.round((withAnchorCount / votedCount) * 100)
      : null;

  return (
    <div className="min-h-screen flex flex-col">
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
        <div className="main-section drep-voting-history-page" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start', justifyContent: 'center' }}>
          <h1>DRep Voting History</h1>

          {showLoadCachedSettings && (
            <div style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '4px', width: '100%' }}>
              <p style={{ margin: '0 0 0.75rem' }}>
                Saved settings from a previous visit are available in this browser.
              </p>
              <Button onClick={handleLoadCachedSettings}>Load saved settings from this browser</Button>
            </div>
          )}

          {!apiKey && (
            <div style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '4px', width: '100%' }}>
              <p style={{ marginBottom: '0.5rem' }}>
                A Blockfrost API key is required to look up voting history. Get one from{' '}
                <a href="https://blockfrost.io" target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc', textDecoration: 'underline' }}>
                  blockfrost.io
                </a>
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Enter your Blockfrost API key"
                  value={localApiKey}
                  onChange={(e) => setLocalApiKey(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyKey()}
                  style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                />
                <Button onClick={handleApplyKey}>Set Key</Button>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={persistBlockfrostInUrl}
                  onChange={(e) => setPersistBlockfrostInUrl(e.target.checked)}
                />
                <span>Save API key to URL (survives refresh)</span>
              </label>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#666' }}>
                Your API key is saved in this browser and may be stored in the URL if enabled above. Be careful when
                screensharing or sharing links.
              </p>
            </div>
          )}

          <div style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '4px', width: '100%' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              DRep ID
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="drep1..."
                value={drepInput}
                onChange={(e) => setDrepInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', fontFamily: 'monospace', fontSize: '0.85rem' }}
              />
              <Button onClick={handleLookup} disabled={!drepInput.trim() || !apiKey}>
                Lookup
              </Button>
            </div>
          </div>

          {activeDrepId && (
            <div
              className="drep-voting-history-profile-card"
              style={{
                width: '100%',
                border: '1px solid #ccc',
                borderRadius: '4px',
                padding: '1rem',
              }}
            >
              {drepProfileStatus === 'loading' && (
                <p style={{ margin: 0, color: '#6b7280' }}>Loading DRep profile…</p>
              )}

              {drepProfileStatus === 'present' && drepProfileMetadata && (
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  {drepProfileMetadata.image?.contentUrl && (
                    <img
                      src={drepProfileMetadata.image.contentUrl}
                      alt={
                        drepProfileMetadata.givenName
                          ? `${drepProfileMetadata.givenName} profile`
                          : 'DRep profile'
                      }
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '8px',
                        objectFit: 'cover',
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: '12rem' }}>
                    {drepProfileMetadata.givenName && (
                      <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.35rem' }}>
                        {drepProfileMetadata.givenName}
                      </div>
                    )}
                    <code
                      style={{
                        fontSize: '0.75rem',
                        wordBreak: 'break-all',
                        display: 'block',
                        color: '#6b7280',
                        marginBottom: '0.5rem',
                      }}
                    >
                      {activeDrepId}
                    </code>
                    <Button onClick={() => setDrepProfileModalOpen(true)}>View profile</Button>
                  </div>
                </div>
              )}

              {drepProfileStatus === 'absent' && (
                <div>
                  <p style={{ margin: '0 0 0.5rem', color: '#6b7280' }}>
                    No CIP-119 profile metadata
                  </p>
                  <code style={{ fontSize: '0.75rem', wordBreak: 'break-all', display: 'block' }}>
                    {activeDrepId}
                  </code>
                </div>
              )}

              {drepProfileStatus === 'failed' && (
                <div>
                  <p style={{ margin: '0 0 0.5rem', color: '#c00' }}>
                    {drepProfileError ?? 'Failed to load DRep profile metadata'}
                  </p>
                  <code
                    style={{
                      fontSize: '0.75rem',
                      wordBreak: 'break-all',
                      display: 'block',
                      marginBottom: '0.5rem',
                    }}
                  >
                    {activeDrepId}
                  </code>
                  {apiKey && (
                    <Button onClick={() => void loadDrepProfileMetadata(activeDrepId, apiKey)}>
                      Retry
                    </Button>
                  )}
                </div>
              )}

              {drepProfileStatus === 'idle' && (
                <code style={{ fontSize: '0.8rem', wordBreak: 'break-all', display: 'block' }}>
                  {activeDrepId}
                </code>
              )}
            </div>
          )}

          {loading && <p>Loading voting history...</p>}

          {error && (
            <div style={{ padding: '0.75rem', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '4px', color: '#c00', width: '100%' }}>
              Error: {error}
            </div>
          )}

          {!loading && !error && mergedData.length > 0 && (
            <>
              {liveVoteStats.live > 0 && (
                <div
                  className={`drep-voting-history-live-widget${
                    liveVoteStats.liveUnvoted > 0 ? ' drep-voting-history-live-widget--attention' : ''
                  }`}
                >
                  <div
                    className={`drep-voting-history-live-widget-count${
                      liveVoteStats.liveUnvoted === 0
                        ? ' drep-voting-history-live-widget-count--complete'
                        : ''
                    }`}
                  >
                    {liveVoteStats.liveUnvoted}
                  </div>
                  <div className="drep-voting-history-live-widget-body">
                    <p className="drep-voting-history-live-widget-title">
                      {liveVoteStats.liveUnvoted === 0
                        ? 'All live actions voted on'
                        : liveVoteStats.liveUnvoted === 1
                          ? 'Live action not yet voted on'
                          : 'Live actions not yet voted on'}
                    </p>
                    <p className="drep-voting-history-live-widget-detail">
                      {liveVoteStats.liveUnvoted === 0 ? (
                        <>
                          This DRep has voted on all {liveVoteStats.live} currently live governance
                          actions.
                        </>
                      ) : liveVoteStats.liveUnvoted === liveVoteStats.live ? (
                        <>
                          {liveVoteStats.liveUnvoted === 1 ? 'This action is' : 'These actions are'}{' '}
                          still open for voting and this DRep has not cast a vote.
                        </>
                      ) : (
                        <>
                          This DRep has not voted on {liveVoteStats.liveUnvoted} of{' '}
                          {liveVoteStats.live} live actions still open for voting.
                        </>
                      )}
                    </p>
                    {liveVoteStats.liveUnvoted > 0 && (
                      <Link to="/bulk-vote" className="drep-voting-history-live-widget-link">
                        Open bulk vote tool
                      </Link>
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span>Total proposals: <strong>{mergedData.length}</strong></span>
                    <span style={{ color: '#22c55e' }}>Voted: <strong>{votedCount}</strong></span>
                    <span style={{ color: '#6b7280' }}>Did not vote: <strong>{missedCount}</strong></span>
                    {cachedClosedCount > 0 && (
                      <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
                        Cached <strong>{cachedClosedCount}</strong> closed actions
                      </span>
                    )}
                    <button
                      type="button"
                      className="voting-history-settings-icon-btn"
                      onClick={() => setSettingsModalOpen(true)}
                      disabled={
                        loading || recaching || prefetchingMetadata || prefetchingVoteRationale
                      }
                      title="Settings"
                      aria-label="Open voting history settings"
                    >
                      <Settings size={18} aria-hidden="true" />
                    </button>
                  </div>
                  {votedCount > 0 && (
                    <span style={{ fontSize: '0.9rem', color: '#14b8a6' }}>
                      {anchorLoading ? (
                        'Checking CIP-100 vote anchors…'
                      ) : anchorPct !== null ? (
                        <>
                          <strong>{withAnchorCount}</strong> of <strong>{votedCount}</strong> voted actions
                          include a CIP-100 anchor ({anchorPct}%)
                        </>
                      ) : null}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <DRepVoteSummaryChart
                    rows={mergedData.map((row) => ({
                      vote: row.vote,
                      timeStatus: row.timeStatus,
                    }))}
                  />
                  <DRepVoteMetadataChart
                    rows={mergedData.map((row) => ({
                      vote: row.vote,
                      anchorStatus: row.voteAnchor.status,
                      timeStatus: row.timeStatus,
                    }))}
                    anchorCheckFailedCount={anchorCheckFailedCount}
                    loading={anchorLoading}
                  />
                </div>
              </div>

              <div className="drep-voting-history-search-bar">
                <input
                  type="search"
                  className="drep-voting-history-search-input"
                  placeholder="Search proposals..."
                  value={titleSearchQuery}
                  onChange={(e) => setTitleSearchQuery(e.target.value)}
                  aria-label="Search proposals by title, type, or ID"
                />
                {titleSearchQuery.trim() ? (
                  <span className="drep-voting-history-search-count">
                    Showing {filteredMergedData.length} of {mergedData.length}
                  </span>
                ) : uncachedMetadataCount > 0 ? (
                  <span className="drep-voting-history-search-hint">
                    Titles appear after metadata is loaded via Settings.
                  </span>
                ) : null}
              </div>

              {filteredMergedData.length === 0 && mergedData.length > 0 && (
                <p className="drep-voting-history-search-empty">No proposals match your search.</p>
              )}

              {filteredMergedData.length > 0 && (
                <div className="overflow-x-auto drep-voting-history-table-wrap">
                  <table className="drep-voting-history-table text-left border-collapse">
                    <thead>
                      <tr className="bg-[#1a1103]">
                        <th className="col-expand py-2 border-b" aria-label="Expand" />
                        <th className="col-action py-2 border-b">Action</th>
                        <th className="col-time-left py-2 border-b">Time left</th>
                        <th className="col-vote py-2 border-b">Vote</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMergedData.map((row, index) => {
                        const rowKey = proposalCacheKey(row.proposalTxHash, row.proposalCertIndex);
                        const detailsId = `drep-vh-details-${rowKey}`;
                        const alternateStripe = index % 2 === 1;
                        return (
                          <DRepVotingHistoryRow
                            key={rowKey}
                            row={row}
                            rowKey={rowKey}
                            detailsId={detailsId}
                            expanded={expandedRowKey === rowKey}
                            alternateStripe={alternateStripe}
                            cachedTitle={resolveCachedTitle(row)}
                            cachedRationaleExcerpt={resolveCachedRationaleExcerpt(row)}
                            anchorLoading={anchorLoading}
                            nowSec={nowSec}
                            copiedProposalId={copiedProposalId}
                            onToggle={() =>
                              setExpandedRowKey((current) => (current === rowKey ? null : rowKey))
                            }
                            onCopyProposalId={copyGovActionId}
                            onOpenMetadataModal={setMetadataModal}
                            onOpenVoteRationaleModal={setVoteRationaleModal}
                            onOpenIpfsModal={setIpfsModal}
                            onOpenCcVotesModal={setCcVotesModal}
                            onOpenCastVoteWizard={openCastVoteWizard}
                          />
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          <DRepVotingHistorySettingsModal
            open={settingsModalOpen}
            onClose={() => setSettingsModalOpen(false)}
            cachedClosedCount={cachedClosedCount}
            cachedMetadataDocCount={cachedMetadataDocCount}
            uncachedMetadataCount={uncachedMetadataCount}
            cachedVoteRationaleDocCount={cachedVoteRationaleDocCount}
            uncachedVoteRationaleCount={uncachedVoteRationaleCount}
            cachedDrepMetadataDocCount={cachedDrepMetadataDocCount}
            cachedCcVotesByProposalCount={cachedCcVotesByProposalCount}
            cachedCcVoteMetadataDocCount={cachedCcVoteMetadataDocCount}
            onReloadClosedActions={() => void handleForceRecache()}
            onLoadUncachedMetadata={() => void handleLoadUncachedMetadata()}
            onClearMetadataDocs={() => void handleClearMetadataDocCache()}
            onLoadUncachedVoteRationale={() => void handleLoadUncachedVoteRationale()}
            onClearVoteRationaleDocs={() => void handleClearVoteRationaleDocCache()}
            onClearDrepMetadataDocs={() => void handleClearDrepMetadataDocCache()}
            onClearCcVotesByProposal={() => void handleClearCcVotesByProposalCache()}
            onClearCcVoteMetadataDocs={() => void handleClearCcVoteMetadataDocCache()}
            reloadDisabled={
              loading ||
              anchorLoading ||
              recaching ||
              prefetchingMetadata ||
              prefetchingVoteRationale
            }
            loadUncachedDisabled={
              uncachedMetadataCount === 0 ||
              loading ||
              anchorLoading ||
              recaching ||
              prefetchingMetadata ||
              prefetchingVoteRationale
            }
            clearMetadataDisabled={
              cachedMetadataDocCount === 0 ||
              loading ||
              recaching ||
              prefetchingMetadata ||
              prefetchingVoteRationale
            }
            loadUncachedVoteRationaleDisabled={
              uncachedVoteRationaleCount === 0 ||
              loading ||
              anchorLoading ||
              recaching ||
              prefetchingMetadata ||
              prefetchingVoteRationale
            }
            clearVoteRationaleDisabled={
              cachedVoteRationaleDocCount === 0 ||
              loading ||
              recaching ||
              prefetchingMetadata ||
              prefetchingVoteRationale
            }
            clearDrepMetadataDisabled={
              cachedDrepMetadataDocCount === 0 ||
              loading ||
              recaching ||
              prefetchingMetadata ||
              prefetchingVoteRationale
            }
            clearCcVotesByProposalDisabled={
              cachedCcVotesByProposalCount === 0 ||
              loading ||
              recaching ||
              prefetchingMetadata ||
              prefetchingVoteRationale
            }
            clearCcVoteMetadataDisabled={
              cachedCcVoteMetadataDocCount === 0 ||
              loading ||
              recaching ||
              prefetchingMetadata ||
              prefetchingVoteRationale
            }
          />

          {activeDrepId && apiKey && (
            <DRepMetadataModal
              open={drepProfileModalOpen}
              drepId={activeDrepId}
              apiKey={apiKey}
              onClose={() => setDrepProfileModalOpen(false)}
              onCacheUpdated={() => {
                refreshDrepMetadataDocCount();
                void loadDrepProfileMetadata(activeDrepId, apiKey);
              }}
            />
          )}

          <ReloadingRecacheModal
            open={recacheModalOpen}
            title={recacheProgress.title}
            description={recacheProgress.description}
          />

          <ReloadingRecacheModal
            open={prefetchModalOpen}
            title={prefetchProgress.title}
            description={prefetchProgress.description}
          />

          <ReloadingRecacheModal
            open={votePrefetchModalOpen}
            title={votePrefetchProgress.title}
            description={votePrefetchProgress.description}
          />

          <GovernanceActionMetadataModal
            open={metadataModal !== null}
            cacheKey={
              metadataModal
                ? proposalCacheKey(metadataModal.proposalTxHash, metadataModal.proposalCertIndex)
                : ''
            }
            anchorUrl={metadataModal?.url ?? ''}
            hashHex={metadataModal?.hashHex}
            proposalLabel={metadataModal ? truncateHash(metadataModal.proposalId) : ''}
            onClose={() => setMetadataModal(null)}
            onCacheUpdated={refreshMetadataDocCount}
          />

          <VoteRationaleMetadataModal
            open={voteRationaleModal !== null}
            cacheKey={
              voteRationaleModal && activeDrepId
                ? drepVoteCacheKey(
                    activeDrepId,
                    proposalCacheKey(
                      voteRationaleModal.proposalTxHash,
                      voteRationaleModal.proposalCertIndex
                    )
                  )
                : ''
            }
            anchorUrl={voteRationaleModal?.url ?? ''}
            hashHex={voteRationaleModal?.hashHex}
            proposalLabel={
              voteRationaleModal ? truncateHash(voteRationaleModal.proposalId) : ''
            }
            onClose={() => setVoteRationaleModal(null)}
            onCacheUpdated={refreshVoteRationaleDocCount}
          />

          {ccVotesModal && apiKey && (
            <CommitteeVotesModal
              open={ccVotesModal !== null}
              proposalId={ccVotesModal.proposalId}
              proposalTxHash={ccVotesModal.proposalTxHash}
              proposalCertIndex={ccVotesModal.proposalCertIndex}
              proposalLabel={truncateHash(ccVotesModal.proposalId)}
              apiKey={apiKey}
              onClose={() => setCcVotesModal(null)}
              onCacheUpdated={refreshCcVoteCacheCounts}
            />
          )}

          <IpfsLinkModal
            open={ipfsModal !== null}
            url={ipfsModal?.url ?? ''}
            hashHex={ipfsModal?.hashHex}
            title={ipfsModal?.title}
            onClose={() => setIpfsModal(null)}
          />

          <DRepCastVoteWizardModal
            open={castVoteWizardAction !== null}
            action={castVoteWizardAction}
            viewedDrepId={activeDrepId}
            onClose={() => setCastVoteWizardAction(null)}
            onVoteSubmitted={handleVoteSubmitted}
          />

          {!loading && !error && activeDrepId && apiKey && mergedData.length === 0 && (
            <p>No governance proposals found.</p>
          )}

          <div style={{ width: '100%', marginTop: '2rem', textAlign: 'center' }}>
            <a
              href="https://projects.williamdoyle.ca"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#0066cc', textDecoration: 'underline' }}
            >
              Other work projects
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DRepVotingHistory;
