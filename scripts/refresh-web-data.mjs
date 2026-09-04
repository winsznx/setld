/** Copies published evidence + Attestcoin ABIs + canonical proof snapshots into apps/web/data
 *  so the static export can `import` them. Run from repo root (pnpm --filter @setld/web prebuild). */
import { cpSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const R = resolve(import.meta.dirname, '..');
const D = resolve(R, 'apps/web/data');
mkdirSync(resolve(D, 'completed-mandates'), { recursive: true });
mkdirSync(resolve(D, 'campaigns/ablations'), { recursive: true });
mkdirSync(resolve(D, 'agent'), { recursive: true });
const copies = [
  ['evidence/submission-facts.json', 'submission-facts.json'],
  ['evidence/completed-mandates/canonical-correct.json', 'completed-mandates/canonical-correct.json'],
  ['evidence/completed-mandates/canonical-wrong-cap.json', 'completed-mandates/canonical-wrong-cap.json'],
  ['evidence/campaigns/ablations/reporter-compromise.json', 'campaigns/ablations/reporter-compromise.json'],
  ['evidence/agent/decision-log.json', 'agent/decision-log.json'],
  ['node_modules/@gluwa/usc-sdk/dist/utils/evmV1DecoderAbi.json', 'evmV1DecoderAbi.json'],
  ['node_modules/@gluwa/usc-sdk/dist/block-prover/block_prover.json', 'block_prover.json'],
  ['node_modules/@gluwa/usc-sdk/dist/chain-info/chain_info.json', 'chain_info.json'],
];
for (const [from, to] of copies) {
  try { cpSync(resolve(R, from), resolve(D, to)); console.log('copied', to); }
  catch (e) { console.warn('skip', to, e.message); }
}
