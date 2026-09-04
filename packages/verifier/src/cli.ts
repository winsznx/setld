import { verifyMandate } from './verify.js';

const args = process.argv.slice(2);
const idIdx = args.findIndex((a) => a === '--id');
const settleIdx = args.findIndex((a) => a === "--settle");
const settleTxHash = settleIdx >= 0 ? args[settleIdx + 1] : undefined;
const id = idIdx >= 0 ? args[idIdx + 1] : args[0];
const tamper = args.includes('--tamper');
const srcIdx = args.findIndex((a) => a === '--source');
const sourceTxHash = srcIdx >= 0 ? args[srcIdx + 1] : undefined;

if (!id) {
  console.error('usage: setld-verify --id <mandateId> [--source <sepoliaTxHash>] [--tamper]');
  process.exit(2);
}

verifyMandate(id, { tamper, sourceTxHash, settleTxHash }).then((r) => {
  console.log(`\nmandate ${r.mandateId}`);
  for (const c of r.checks) console.log(`  ${c.pass ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? `  (${c.detail})` : ''}`);
  console.log(`\nResult: ${r.result}`);
  console.log(JSON.stringify(r.evidence, null, 2));
  process.exit(r.result === 'match' ? 0 : r.result === 'evidence-unavailable' ? 2 : 1);
}).catch((e) => {
  console.error(e);
  process.exit(2);
});
