/**
 * Seeds OPEN mandates for the agent-loop demo: one the agent should ACCEPT on economics,
 * one it should ABSTAIN on (thin margin vs bond at risk), one blocked by a deterministic
 * guardrail (deadline too close). Run before `setld-agent`.
 */
import { keccak256, toUtf8Bytes, formatEther } from 'ethers';
import { cc3, sepolia, signers, contract, C, S, TEMPLATE_ID, deployments } from '@setld/orchestrator/env';

const E = (n: number | bigint) => BigInt(n) * 10n ** 18n;
const MAX = (1n << 256n) - 1n;

async function main() {
  const creator = signers.cc3Deployer();
  const core = contract('SetldCore', C.SetldCore, creator);
  const token = contract('MockERC20', C.tSETLD, creator);

  if ((await token.allowance(creator.address, C.SetldVault)) < E(1000)) {
    await (await token.approve(C.SetldVault, MAX)).wait();
  }

  const sepHead = await sepolia.getBlockNumber();
  const cc3Head = await cc3.getBlockNumber();
  const terms = {
    router: S.SetldExecutionRouter,
    vault: S.DemoTreasuryVault,
    assetIn: S.assetIn,
    assetOut: S.assetOut,
    maxAmountIn: E(10_000),
    minAmountOut: E(9_000),
    selector: '0x' + keccak256(toUtf8Bytes('execute(bytes32,address,address,address,uint256,uint256)')).slice(2, 10),
    routePolicyHash: keccak256(toUtf8Bytes('treasury-rebalance-v1-route')),
  };
  const base = {
    acceptanceDeadline: Math.floor(Date.now() / 1000) + 7200,
    proofDeadline: cc3Head + 500_000,
  };

  const specs = [
    { label: 'agent-healthy-3', reward: E(15), bond: E(2), execEnd: sepHead + 400, note: 'ACCEPT expected (7.5x bond)' },
    { label: 'agent-thin-margin-3', reward: (E(3) * 1020n) / 1000n, bond: E(3), execEnd: sepHead + 400, note: 'ABSTAIN expected (model: 2% net vs full bond at risk)' },
  ];

  for (const s of specs) {
    const econ = { rewardToken: C.tSETLD, rewardAmount: s.reward, bondToken: C.tSETLD, executorBond: s.bond, creatorBond: E(1), relayerBudget: E(1) };
    const tx = await core.createMandate(
      TEMPLATE_ID, 1, terms, econ, base.acceptanceDeadline, sepHead - 10, s.execEnd, base.proofDeadline,
      keccak256(toUtf8Bytes(s.label)), BigInt(Date.now()) + BigInt(specs.indexOf(s)),
    );
    const rc = await tx.wait();
    const ev = rc.logs.find((l: { fragment?: { name?: string } }) => l.fragment?.name === 'MandateCreated');
    console.log(`${s.label.padEnd(20)} ${ev.args[0]}  reward ${formatEther(s.reward)} bond ${formatEther(s.bond)} endBlock ${s.execEnd}  (${s.note})`);
  }
  console.log(`\nseeded at sepolia head ${sepHead}, cc3 head ${cc3Head}. run: pnpm --filter @setld/agent exec setld-agent`);
  void deployments;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
