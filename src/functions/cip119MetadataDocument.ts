import type { DrepMetadata, DrepMetadataReference } from './drepMetadata';
import { hashGovernanceAnchorBytes } from './cip100RationaleDocument';
export const CIP119_INLINE_CONTEXT = {
  CIP100: 'https://github.com/cardano-foundation/CIPs/blob/master/CIP-0100/README.md#',
  CIP119: 'https://github.com/cardano-foundation/CIPs/blob/master/CIP-0119/README.md#',
  hashAlgorithm: 'CIP100:hashAlgorithm',
  body: {
    '@id': 'CIP119:body',
    '@context': {
      references: {
        '@id': 'CIP119:references',
        '@container': '@set',
      },
      paymentAddress: 'CIP119:paymentAddress',
      givenName: 'CIP119:givenName',
      image: { '@id': 'CIP119:image' },
      objectives: 'CIP119:objectives',
      motivations: 'CIP119:motivations',
      qualifications: 'CIP119:qualifications',
      doNotList: 'CIP119:doNotList',
    },
  },
} as const;

export interface DrepMetadataFormInput {
  givenName: string;
  objectives?: string;
  motivations?: string;
  qualifications?: string;
  paymentAddress?: string;
  doNotList?: boolean;
  imageContentUrl?: string;
  imageSha256?: string;
  references?: DrepMetadataReference[];
}

export interface Cip119ValidationError {
  field: string;
  message: string;
}

const GIVEN_NAME_MAX = 80;
const NARRATIVE_MAX = 1000;

function trimOptional(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function buildReferenceEntry(ref: DrepMetadataReference): Record<string, string> {
  return {
    '@type': ref.type.trim() || 'Other',
    label: ref.label.trim(),
    uri: ref.uri.trim(),
  };
}

function buildBody(fields: DrepMetadataFormInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    givenName: fields.givenName.trim(),
  };

  const objectives = trimOptional(fields.objectives);
  if (objectives) body.objectives = objectives;

  const motivations = trimOptional(fields.motivations);
  if (motivations) body.motivations = motivations;

  const qualifications = trimOptional(fields.qualifications);
  if (qualifications) body.qualifications = qualifications;

  const paymentAddress = trimOptional(fields.paymentAddress);
  if (paymentAddress) body.paymentAddress = paymentAddress;

  if (fields.doNotList === true) {
    body.doNotList = true;
  }

  const imageUrl = trimOptional(fields.imageContentUrl);
  if (imageUrl) {
    const image: Record<string, string> = {
      '@type': 'ImageObject',
      contentUrl: imageUrl,
    };
    const sha256 = trimOptional(fields.imageSha256);
    if (sha256) image.sha256 = sha256;
    body.image = image;
  }

  const refs = (fields.references ?? []).filter((r) => r.label.trim() && r.uri.trim());
  if (refs.length > 0) {
    body.references = refs.map(buildReferenceEntry);
  }

  return body;
}

/** Validate CIP-119 form fields before building a document. */
export function validateCip119Form(fields: DrepMetadataFormInput): Cip119ValidationError[] {
  const errors: Cip119ValidationError[] = [];

  const givenName = fields.givenName?.trim() ?? '';
  if (!givenName) {
    errors.push({ field: 'givenName', message: 'Given name is required.' });
  } else if (givenName.length > GIVEN_NAME_MAX) {
    errors.push({
      field: 'givenName',
      message: `Given name must be at most ${GIVEN_NAME_MAX} characters.`,
    });
  }

  for (const [field, value] of [
    ['objectives', fields.objectives],
    ['motivations', fields.motivations],
    ['qualifications', fields.qualifications],
  ] as const) {
    const trimmed = value?.trim();
    if (trimmed && trimmed.length > NARRATIVE_MAX) {
      errors.push({
        field,
        message: `${field} must be at most ${NARRATIVE_MAX} characters.`,
      });
    }
  }

  for (let i = 0; i < (fields.references ?? []).length; i++) {
    const ref = fields.references![i];
    const hasLabel = Boolean(ref.label.trim());
    const hasUri = Boolean(ref.uri.trim());
    if (hasLabel !== hasUri) {
      errors.push({
        field: `references[${i}]`,
        message: 'Each reference must have both a label and a URI.',
      });
    }
  }

  const imageUrl = trimOptional(fields.imageContentUrl);
  const imageSha256 = trimOptional(fields.imageSha256);
  if (imageSha256 && !/^[0-9a-fA-F]{64}$/.test(imageSha256)) {
    errors.push({
      field: 'imageSha256',
      message: 'Image sha256 must be a 64-character hex string.',
    });
  }
  if (imageSha256 && !imageUrl) {
    errors.push({
      field: 'imageContentUrl',
      message: 'Image URL is required when sha256 is provided.',
    });
  }

  return errors;
}

/** Build a CIP-100 + CIP-119 JSON-LD document as UTF-8 bytes. */
export const buildCip119MetadataBytes = (fields: DrepMetadataFormInput): Uint8Array => {
  const errors = validateCip119Form(fields);
  if (errors.length > 0) {
    throw new Error(errors.map((e) => e.message).join(' '));
  }

  const doc = {
    '@context': CIP119_INLINE_CONTEXT,
    hashAlgorithm: 'blake2b-256' as const,
    authors: [] as [],
    body: buildBody(fields),
  };

  return new TextEncoder().encode(JSON.stringify(doc, null, 2));
};

/** Convert form fields to DrepMetadata for preview (no validation). */
export function formInputToDrepMetadata(fields: DrepMetadataFormInput): DrepMetadata {
  const refs = (fields.references ?? []).filter((r) => r.label.trim() && r.uri.trim());
  const imageUrl = trimOptional(fields.imageContentUrl);
  return {
    givenName: trimOptional(fields.givenName),
    objectives: trimOptional(fields.objectives),
    motivations: trimOptional(fields.motivations),
    qualifications: trimOptional(fields.qualifications),
    paymentAddress: trimOptional(fields.paymentAddress),
    doNotList: fields.doNotList === true ? true : null,
    image: imageUrl
      ? { contentUrl: imageUrl, sha256: trimOptional(fields.imageSha256) }
      : null,
    references: refs,
  };
}

/** Convert parsed DRep metadata into form input for editing. */
export function drepMetadataToFormInput(metadata: DrepMetadata): DrepMetadataFormInput {
  return {
    givenName: metadata.givenName ?? '',
    objectives: metadata.objectives ?? undefined,
    motivations: metadata.motivations ?? undefined,
    qualifications: metadata.qualifications ?? undefined,
    paymentAddress: metadata.paymentAddress ?? undefined,
    doNotList: metadata.doNotList === true,
    imageContentUrl: metadata.image?.contentUrl ?? undefined,
    imageSha256: metadata.image?.sha256 ?? undefined,
    references: metadata.references.length > 0 ? [...metadata.references] : undefined,
  };
}

export { hashGovernanceAnchorBytes };
