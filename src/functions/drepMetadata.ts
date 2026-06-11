export type DrepReferenceType = 'Link' | 'Identity' | 'Other' | 'GovernanceMetadata' | string;

export interface DrepMetadataReference {
  type: DrepReferenceType;
  label: string;
  uri: string;
}

export interface DrepMetadataImage {
  contentUrl: string;
  sha256?: string | null;
}

export interface DrepMetadata {
  givenName: string | null;
  objectives: string | null;
  motivations: string | null;
  qualifications: string | null;
  paymentAddress: string | null;
  doNotList: boolean | null;
  image: DrepMetadataImage | null;
  references: DrepMetadataReference[];
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asText(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  const wrapped = asObject(value);
  if (wrapped && '@value' in wrapped) {
    return asText(wrapped['@value']);
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return null;
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  const wrapped = asObject(value);
  if (wrapped && '@value' in wrapped) {
    return asBoolean(wrapped['@value']);
  }
  return null;
}

function parseReferences(body: Record<string, unknown>): DrepMetadataReference[] {
  const rawReferencesValue = body.references;
  const rawRefs = Array.isArray(rawReferencesValue)
    ? rawReferencesValue
    : Array.isArray(asObject(rawReferencesValue)?.['@set'])
      ? (asObject(rawReferencesValue)?.['@set'] as unknown[])
      : [];

  const references: DrepMetadataReference[] = [];
  for (const entry of rawRefs) {
    const ref = asObject(entry);
    if (!ref) continue;
    const label = asText(ref.label);
    const uri = asText(ref.uri);
    if (!label || !uri) continue;
    const type = asText(ref['@type']) ?? 'Other';
    references.push({ type, label, uri });
  }
  return references;
}

function parseImage(body: Record<string, unknown>): DrepMetadataImage | null {
  const image = asObject(body.image);
  if (!image) return null;
  const contentUrl = asText(image.contentUrl);
  if (!contentUrl) return null;
  return {
    contentUrl,
    sha256: asText(image.sha256),
  };
}

/** Extract CIP-119 DRep profile fields from a JSON-LD metadata document. */
export function parseCip119Metadata(payload: unknown): DrepMetadata | null {
  const root = asObject(payload);
  if (!root) return null;

  const body = asObject(root.body) ?? root;
  const givenName = asText(body.givenName);
  const objectives = asText(body.objectives);
  const motivations = asText(body.motivations);
  const qualifications = asText(body.qualifications);
  const paymentAddress = asText(body.paymentAddress);
  const doNotList = asBoolean(body.doNotList);
  const image = parseImage(body);
  const references = parseReferences(body);

  if (
    !givenName &&
    !objectives &&
    !motivations &&
    !qualifications &&
    !paymentAddress &&
    doNotList === null &&
    !image &&
    references.length === 0
  ) {
    return null;
  }

  return {
    givenName,
    objectives,
    motivations,
    qualifications,
    paymentAddress,
    doNotList,
    image,
    references,
  };
}

export function drepMetadataDownloadFilename(
  givenName: string | null | undefined,
  drepId: string,
): string {
  const base = (givenName?.trim() || drepId).replace(/ /g, '-');
  return `${base}.json`;
}
