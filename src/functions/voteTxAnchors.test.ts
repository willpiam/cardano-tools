import { readFileSync } from 'fs';
import { join } from 'path';
import { parseVoteAnchorsFromTxCbor } from './voteTxAnchors';
import type { ResolvedDRep } from './drepCredential';

const ETERNL_FIXTURE = join(
  __dirname,
  '../../eternl-debug-c2b4e67e73f4c28a81c8cf5c71fa45dfa8560cbfd3d3aea69f60f709ca106590-unsigned.json'
);

const DREP_KEY_HASH = '4281249b0696b2e347ae7cc1757d38e81fd5c7aa763903225b40e7c1';

const keyDrep: ResolvedDRep = {
  source: 'manual',
  kind: 'key',
  keyHashHex: DREP_KEY_HASH,
  drepIdBech32: 'drep1placeholder',
};

describe('parseVoteAnchorsFromTxCbor', () => {
  it('parses multi-vote tx with null anchors from eternl fixture', () => {
    const raw = JSON.parse(readFileSync(ETERNL_FIXTURE, 'utf8'));
    const cborHex = raw.txBuildRes[0].txCbor as string;
    const map = parseVoteAnchorsFromTxCbor(cborHex, keyDrep);

    expect(map.size).toBeGreaterThanOrEqual(4);
    for (const [, entry] of map) {
      expect(entry.hasAnchor).toBe(false);
      expect(entry.url).toBeUndefined();
    }

    const proposalTx = '73e171a4c0730b4b59ecae271ab89f12a9d56360b02920e1f95107dbdc1d6762';
    expect(map.get(`${proposalTx}#1`)).toEqual({ hasAnchor: false });
    expect(map.get(`${proposalTx}#2`)).toEqual({ hasAnchor: false });
  });

});
