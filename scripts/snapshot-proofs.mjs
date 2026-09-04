import { proofProvider } from '@gluwa/usc-sdk';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
const facts = JSON.parse(readFileSync('evidence/submission-facts.json','utf8'));
const PB = facts.attestcoin.proofBuilder;
const pb = new proofProvider.service.ProofBuilder(1, PB);
mkdirSync('apps/web/data/proofs', { recursive: true });
const cases = {
  'canonical-correct': facts.canonicalDemoTransactions.correct.sepoliaExecute,
  'canonical-wrong-cap': facts.canonicalDemoTransactions.verifiedButWrong.sepoliaExecute,
};
for (const [label, tx] of Object.entries(cases)) {
  const r = await pb.getProof(tx);
  if (!r.success) { console.error(label, 'FAIL', r.error); process.exit(1); }
  writeFileSync(`apps/web/data/proofs/${label}.json`, JSON.stringify(r.data, (k,v)=>typeof v==='bigint'?v.toString():v, 2));
  console.log(label, 'header', r.data.headerNumber, 'txIndex', r.data.txIndex, 'txBytes', r.data.txBytes.length);
}
