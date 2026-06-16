export interface CcVoteInternalVote {
  constitutional?: number;
  unconstitutional?: number;
  abstain?: number;
  didNotVote?: number;
  againstVote?: number;
}

export interface CcVoteMetadata {
  summary: string | null;
  rationaleStatement: string | null;
  precedentDiscussion: string | null;
  counterargumentDiscussion: string | null;
  conclusion: string | null;
  internalVote: CcVoteInternalVote | null;
  comment: string | null;
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseInternalVote(value: unknown): CcVoteInternalVote | null {
  const obj = asObject(value);
  if (!obj) return null;

  const result: CcVoteInternalVote = {};
  let hasField = false;

  for (const key of [
    'constitutional',
    'unconstitutional',
    'abstain',
    'didNotVote',
    'againstVote',
  ] as const) {
    const raw = obj[key];
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      result[key] = raw;
      hasField = true;
    }
  }

  return hasField ? result : null;
}

/** Parse a fetched CIP-136 CC vote metadata document (extends CIP-100). */
export function parseCip136VoteMetadata(payload: unknown): CcVoteMetadata | null {
  const root = asObject(payload);
  if (!root) return null;

  const body = asObject(root.body) ?? root;

  const summary = asText(body.summary);
  const rationaleStatement = asText(body.rationaleStatement);
  const precedentDiscussion = asText(body.precedentDiscussion);
  const counterargumentDiscussion = asText(body.counterargumentDiscussion);
  const conclusion = asText(body.conclusion);
  const comment = asText(body.comment) ?? asText(body.rationale);
  const internalVote = parseInternalVote(body.internalVote);

  if (
    !summary &&
    !rationaleStatement &&
    !precedentDiscussion &&
    !counterargumentDiscussion &&
    !conclusion &&
    !comment &&
    !internalVote
  ) {
    return null;
  }

  return {
    summary,
    rationaleStatement,
    precedentDiscussion,
    counterargumentDiscussion,
    conclusion,
    internalVote,
    comment,
  };
}
