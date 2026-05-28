import * as CML from '@anastasia-labs/cardano-multiplatform-lib-browser';

/** Ledger limit for `TransactionMetadatum::Text` (UTF-8 bytes). Matches CIP-20 chunk size. */
const MAX_METADATA_TEXT_UTF8_BYTES = 64;

/**
 * Split a string into chunks each ≤ {@link MAX_METADATA_TEXT_UTF8_BYTES} UTF-8 bytes,
 * never splitting inside a Unicode scalar value.
 */
const chunkMetadatumText = (text: string): string[] => {
  const encoder = new TextEncoder();
  const chunks: string[] = [];
  let current = '';
  for (const char of text) {
    const next = current + char;
    if (encoder.encode(next).length <= MAX_METADATA_TEXT_UTF8_BYTES) {
      current = next;
      continue;
    }
    if (current.length > 0) chunks.push(current);
    current = char;
    if (encoder.encode(current).length > MAX_METADATA_TEXT_UTF8_BYTES) {
      throw new Error(
        `Metadata contains a character that exceeds ${MAX_METADATA_TEXT_UTF8_BYTES} UTF-8 bytes`,
      );
    }
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
};

export const buildCip20AuxiliaryData = (metadata: string[]): CML.AuxiliaryData => {
  const list = CML.MetadatumList.new();
  for (const entry of metadata) {
    for (const chunk of chunkMetadatumText(entry)) {
      list.add(CML.TransactionMetadatum.new_text(chunk));
    }
  }
  const md = CML.Metadata.new();
  md.set(BigInt(674), CML.TransactionMetadatum.new_list(list));
  return CML.AuxiliaryData.new_shelley(md);
};
