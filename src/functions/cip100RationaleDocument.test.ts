import { TextDecoder, TextEncoder } from 'util';
import {
  buildCip100RationaleBytes,
  hashGovernanceAnchorBytes,
  parseCip100RationaleBytes,
  parseCip100RationaleMetadata,
} from './cip100RationaleDocument';

Object.assign(global, { TextEncoder, TextDecoder });

describe('buildCip100RationaleBytes', () => {
  it('emits CIP-100 JSON-LD with body.comment', () => {
    const bytes = buildCip100RationaleBytes('test');
    const doc = parseCip100RationaleBytes(bytes) as Record<string, unknown>;

    expect(doc['@context']).toBeDefined();
    const ctx = doc['@context'] as Record<string, unknown>;
    expect(ctx.CIP100).toBe(
      'https://github.com/cardano-foundation/CIPs/blob/master/CIP-0100/README.md#'
    );

    expect(doc.authors).toEqual([]);

    const body = doc.body as Record<string, unknown>;
    expect(body.comment).toBe('test');
    expect(body.rationale).toBeUndefined();

    expect(doc.hashAlgorithm).toBe('blake2b-256');
  });

  it('pretty-prints with 2-space indent', () => {
    const text = new TextDecoder().decode(buildCip100RationaleBytes('x'));
    expect(text).toContain('\n  "@context"');
    expect(text).not.toMatch(/^\{"/);
  });

  it('orders top-level keys: @context, authors, body, hashAlgorithm', () => {
    const doc = parseCip100RationaleBytes(buildCip100RationaleBytes('x')) as Record<string, unknown>;
    expect(Object.keys(doc)).toEqual(['@context', 'authors', 'body', 'hashAlgorithm']);
  });

  it('produces stable hash for fixed input', () => {
    const bytes = buildCip100RationaleBytes('test');
    const hash1 = hashGovernanceAnchorBytes(bytes);
    const hash2 = hashGovernanceAnchorBytes(buildCip100RationaleBytes('test'));
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('parseCip100RationaleMetadata', () => {
  it('parses body.comment from CIP-100 documents', () => {
    const payload = parseCip100RationaleBytes(buildCip100RationaleBytes('Hello world'));
    expect(parseCip100RationaleMetadata(payload)).toEqual({ comment: 'Hello world' });
  });

  it('falls back to body.rationale for legacy documents', () => {
    expect(
      parseCip100RationaleMetadata({
        body: { rationale: 'Legacy rationale text' },
      })
    ).toEqual({ comment: 'Legacy rationale text' });
  });

  it('returns null when no comment or rationale text', () => {
    expect(parseCip100RationaleMetadata({ body: {} })).toBeNull();
    expect(parseCip100RationaleMetadata(null)).toBeNull();
    expect(parseCip100RationaleMetadata('not json')).toBeNull();
  });
});
