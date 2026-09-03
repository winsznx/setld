# design.md

Canonical visual source of truth for setld. This document governs layout, typography,
color, structural devices, motion, component behavior, and every screen state. The PRD
(`docs/PRD.md`) governs product behavior, routes, data, lifecycle, and proof requirements
and always wins on those; this document never changes them. Where the two appear to
conflict on a user-facing state, the PRD's state list is authoritative and this document
describes how that state looks.

Status: passed its design audit against the PRD on 2026-09-03 (see §14). Implementation
proceeds against this file without further design approval.

---

## 1. What this product is, visually

setld is a settlement instrument, not an application with a brand. It clears bonded work
between a job creator and an executor using a cryptographic receipt as the deciding
authority. The nearest visual relatives are a letter of credit, a bill of lading, a
notary's register, a clearing-house statement, and a lab report — documents whose whole
job is to be trusted and independently checked.

Three consequences:

1. The interface presents itself as an **official record**, not a product surface. Its
   typeface is a civic document face. Its structure is a **bound ledger**: ruled
   boundaries that mean something, figures in aligned monospace columns, a lifecycle
   recorded as a dated spine.
2. The **verdict is the design**. Every screen is subordinate to one moment: a verified
   external transaction that setld either paid or refused. That moment gets the only bold
   treatment in the system.
3. Everything technical is **filed, not hidden**. Proof material, canonical hashes, replay
   keys, and predicate traces are one plain-labelled expander away on every record. The
   first line is always human; the evidence is always reachable.

Explicitly rejected, per brief and per this product's character: glassmorphism, decorative
gradients, filler metric cards, fake terminal windows, uniform rounded-card dashboards,
chain/hexagon/block motifs, neon-on-black "crypto" styling, warm-cream + terracotta
editorial styling, tracked-out all-caps eyebrows, `→` appended to buttons, meta strings
joined with middle dots, tinted-black standing in for black.

---

## 2. Color

The palette is a document palette: toner-paper ground, blue-black ink, and a two-tone
archival signal system for the only distinction that matters — **affirmed** vs **refused**.
Signal colors appear as *ink and edge*, never as large fills.

### 2.1 Light (default) — tokens on bare `:root`

| Token | Hex | Role |
|---|---|---|
| `--paper` | `#F7F8F9` | page ground (cool near-white, not cream) |
| `--surface` | `#FFFFFF` | records, inputs, panels that sit above the page |
| `--surface-sunk` | `#EEF0F2` | recessed areas, code/evidence blocks, disabled fields |
| `--ink` | `#16202A` | primary text, primary button fill (blue-black, never `#000`/`#111`) |
| `--ink-2` | `#4A5761` | secondary text, captions, resolved labels |
| `--ink-3` | `#8793A0` | placeholder, hint, timestamp |
| `--rule` | `#D5DADE` | hairline boundaries (1px) |
| `--rule-strong` | `#B4BCC3` | ledger spine / diptych gutter (2px) |
| `--indigo` | `#2D3A8C` | links, focus ring, interactive affordance, the Attestcoin verification mark |
| `--indigo-sunk` | `#E7E9F4` | active-phase edge-bar wash, link hover background |
| `--affirm` | `#1F5C3D` | affirmed verdict ink: FULFILLED, RELEASED, reward released, bond returned |
| `--affirm-sunk` | `#E7EFE9` | affirmed record ground tint (used once, on the verdict header only) |
| `--refuse` | `#9B2C1E` | refused verdict ink: INVALID_ATTEMPT, refunded, penalty applied, EXECUTION_REVERTED, TIMED_OUT |
| `--refuse-sunk` | `#F4E9E6` | refused record ground tint (verdict header only) |
| `--pending` | `#7A6320` | in-flight states: waiting for Attestcoin, proof generating, tx pending (olive, not amber) |
| `--pending-sunk` | `#F1EDE1` | pending phase edge-bar wash |

### 2.2 Dark — `:root:not([data-theme="light"])` under `@media (prefers-color-scheme: dark)`, and `:root[data-theme="dark"]`

Infra is operated at night. Dark mode is a "lit ledger", not an inverted document.

| Token | Hex |
|---|---|
| `--paper` | `#12171C` |
| `--surface` | `#1A2129` |
| `--surface-sunk` | `#232C35` |
| `--ink` | `#E8EBEE` |
| `--ink-2` | `#9BA7B2` |
| `--ink-3` | `#67727D` |
| `--rule` | `#2A333B` |
| `--rule-strong` | `#3C4650` |
| `--indigo` | `#93A2EE` |
| `--indigo-sunk` | `#242A44` |
| `--affirm` | `#63BE8C` |
| `--affirm-sunk` | `#18261E` |
| `--refuse` | `#E0876F` |
| `--refuse-sunk` | `#2A1B16` |
| `--pending` | `#C9AE63` |
| `--pending-sunk` | `#262114` |

### 2.3 Rules of use

- Primary action button: `--ink` fill, `--paper` text. Hover: 8% lighten in light / 8%
  darken in dark. There is exactly one primary action per view.
- Secondary action: transparent fill, `1px --rule-strong` border, `--ink` text.
- Destructive action (cancel mandate, revoke key): `--refuse` text on transparent, `1px
  --refuse` border. Never a red fill.
- `--affirm` / `--refuse` are permitted only as: verdict-word ink, the 3px phase edge-bar,
  the status glyph (§5.3), a 1px underline on a struck predicate row, and the single
  verdict-header ground tint. They never fill a button, badge pill, or full panel.
- No color is defined only inside a media/`[data-theme]` block. `body` always paints
  `background: var(--paper); color: var(--ink)`.
- Contrast floor: body text ≥ 7:1 on its ground, all interactive text ≥ 4.5:1, the status
  glyph never the sole carrier of meaning (always paired with a word).

---

## 3. Typography

Two families. No display serif — restraint is the point, and the evidence type carries the
texture.

| Family | Source | Role |
|---|---|---|
| **Public Sans** | Google Fonts (USWDS civic face) | everything: headings, UI chrome, body, labels, buttons |
| **IBM Plex Mono** | Google Fonts | every on-chain / evidence value: addresses, hashes, tx ids, block numbers, token amounts, selectors, predicate check names, canonical terms, JSON |

Fallback stacks:
`"Public Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
`"IBM Plex Mono", ui-monospace, "SF Mono", "Cascadia Mono", Menlo, monospace`

### 3.1 Why this pairing is a choice, not a default

The generic infra choice is Inter (or IBM Plex Sans) + a generic mono used decoratively on
tiny labels. Here the split is semantic and load-bearing: **mono is the content**, because
the content of a settlement record is figures and identifiers that must align on the
character and be copy-checkable. Public Sans is deliberately unbranded — it says "this is
an official record, not a company's marketing", which is exactly setld's posture. The
identity comes from structure and the verdict panel, not from a distinctive headline face.

### 3.2 Scale (1.200 minor-third, 16px base)

| Token | Size / line-height | Weight / tracking | Use |
|---|---|---|---|
| `display` | 40 / 44 | 640, -0.015em | landing hero sentence, verdict word on `/proof` |
| `h1` | 28 / 34 | 620, -0.01em | page title |
| `h2` | 22 / 28 | 600, -0.005em | record section headers |
| `h3` | 18 / 24 | 600, 0 | sub-section, composer group |
| `body` | 16 / 25 | 400, 0 | prose, descriptions |
| `body-sm` | 14 / 21 | 400, 0 | secondary prose, help text |
| `label` | 13 / 16 | 560, 0.005em | field labels, table headers (sentence case, not all-caps) |
| `caption` | 12 / 16 | 400, 0 | timestamps, provenance, `--ink-3` |
| `mono` | 14 / 22 | 400, 0 | evidence values inline and in tables |
| `mono-sm` | 12.5 / 20 | 400, 0 | dense evidence blocks, JSON |
| `mono-fig` | 15 / 22 | 500, tabular-nums | figure columns (amounts, block numbers) — right-aligned |

Numeric columns use `font-variant-numeric: tabular-nums` always. Long identifiers use
middle-ellipsis (`0x1234…abcd`) with the full value in `title` and a copy control.

### 3.3 Prohibited treatments

No single-word accenting in headings. No all-caps labels (sentence case, weight and color
carry hierarchy). No typographic eyebrow above a heading unless it is a real datum (e.g. a
mandate id, which is content). Line length ≤ 74 characters for body prose.

---

## 4. Space, grid, shape

- Spacing scale (px): 2, 4, 8, 12, 16, 24, 32, 48, 64, 96. One scale, used everywhere.
- **Border radius: 3px** on inputs, buttons, and expanders. **0px** on records, panels,
  table cells, the verdict certificates, and the diptych. The ledger does not have rounded
  corners; only the things you touch do. No radius above 3px anywhere.
- **Shadows: none**, except one — the sticky action bar on mobile gets a single top hairline
  shadow `0 -1px 0 var(--rule)` so it reads as detached. Elevation is expressed with rules
  and ground tints, not blur.
- Page max width: 1200px. Reading column (prose, composer): 640px. Record column (mandate
  detail body): 720px. Diptych: up to 1120px.
- Global grid: 12 columns, 24px gutter, 24px page margin (16px below 640px).
- Everything is left-aligned. Figures are right-aligned within their column. Nothing is
  centered except the landing hero sentence and a genuinely empty state's single message.

---

## 5. Structural devices (these encode information)

### 5.1 The lifecycle spine

The mandate lifecycle (PRD 10.1 step 30) is a real sequence and is drawn as a **vertical
dated spine** on the left of every mandate/execution record:

```
Published        2026-09-13 14:02:11 UTC   ▪
│
Accepted         2026-09-13 14:09:40 UTC   ▪
│
Executed on Ethereum   0x8f2c…be31          ▪
│
Waiting for Attestcoin   src block 11627510  ◐   ← current, --pending
╎
Proof submitted                              ▫
╎
Settled                                      ▫
```

- Solid connector (`│`, `--rule-strong`) between reached nodes; dotted connector (`╎`,
  `--rule`) ahead of the front. Reached node glyph filled; current node `◐` in
  `--pending`; future nodes hollow `▫` in `--ink-3`.
- Each reached node carries a UTC timestamp and, where relevant, the identifier produced at
  that step (source tx hash, source block, settlement tx). These are `mono`.
- Terminal node label and glyph take `--affirm` (FULFILLED / RELEASED) or `--refuse`
  (INVALID_ATTEMPT / EXECUTION_REVERTED / TIMED_OUT / CANCELLED).
- The spine is `position: sticky` on desktop so it stays visible while the record body
  scrolls. On mobile it collapses to a horizontal stepper above the record (§11).

### 5.2 The phase edge-bar

Every record (mandate, execution, settlement certificate) has a **3px left edge bar**:
`--indigo` while the mandate is live (OPEN/ACCEPTED/awaiting proof), `--affirm` when
terminal-affirmed, `--refuse` when terminal-refused, `--pending` while an Attestcoin wait
is the active state. This is the fastest read of "where is this" and it survives being
seen at thumbnail size.

### 5.3 The status glyph

A filled square means affirmed/reached; a hollow square means refused/not-reached; a
half-filled circle means in-flight. Chosen over check/cross because a ledger tick is the
correct metaphor and check/cross is the generic default. The glyph is **always adjacent to
a word** (`Passed`, `Failed`, `Pending`) — it is never the only signal.

- `▪` reached / passed / affirmed — color inherits from context (`--affirm` on a verdict,
  `--ink` in the spine).
- `▫` not reached / failed / refused — `--refuse` on a predicate row, `--ink-3` in the spine.
- `◐` in flight — `--pending`.

### 5.4 Ruled boundaries

A full-width 1px `--rule` line denotes a boundary between record sections (what was
promised / what happened on Ethereum / what Attestcoin verified / how Creditcoin settled —
PRD 10.5 step 4). A 2px `--rule-strong` line is reserved for the diptych gutter and the
top/bottom of a settlement certificate. Rules are structural; they are not used to
separate every paragraph.

### 5.5 Progressive disclosure

Technical material is a plain `<details>` expander with a `13/560` summary in sentence
case and a `+`/`−` affordance (not a chevron):

- "Show the proof material" → chainKey, source block, tx index, Merkle root, continuity
  proof endpoints, `verifySingle` result, verifier tx.
- "Show canonical terms" → the encoded mandate terms and `termsHash`.
- "Show the full predicate trace" → all 17 ordered checks with expected/observed.
- "Show raw evidence (JSON)" → the `evidence.json` bundle, with a copy control.

Expanders are collapsed by default everywhere except `/verify` results and the
`Verify independently` panel, where the recomputation detail is the point.

---

## 6. Components

### 6.1 Buttons

- Primary: `--ink` fill / `--paper` text, 3px radius, 40px height (44px touch target via
  padding), `label` type. One per view. Label states exactly what happens: `Fund and
  publish`, `Accept and bond`, `Execute on Sepolia`, `Submit proof`, `Finalize timeout`.
- Secondary: hairline `--rule-strong` border, `--ink` text.
- Destructive: `--refuse` border and text.
- Disabled: `--surface-sunk` fill, `--ink-3` text, and an adjacent one-line reason in
  `body-sm` (`--ink-2`) — never a bare greyed button. E.g. "Connect to Creditcoin Testnet
  to publish."
- Loading: label swaps to the progressive verb (`Publishing…`) with an inline 12px
  indeterminate bar under the label; button stays the same width.

### 6.2 The evidence row (definition list)

Two-column: check/field name left (`label`, `--ink-2`), value right (`mono` or `mono-fig`,
`--ink`). Verdict rows add a leading glyph + word. A failed predicate row: the observed
value is `--refuse` with a 1px `--refuse` underline; expected value shown beneath in
`caption`. Rows are 40px min height, separated by 1px `--rule`, no zebra striping.

### 6.3 The settlement certificate

A bordered (`2px --rule-strong` top/bottom, `1px --rule` sides) 0-radius block with the
phase edge-bar. Structure, top to bottom:

```
┌ (edge-bar) ─────────────────────────────────────────┐
│  Mandate  0x9a3c…7f21        Treasury rebalance v1   │  ← header, mono id + template
│  ───────────────────────────────────────────────────│
│  Attestcoin proof            ▪ Verified              │  ← 4 verification rows
│  Executor identity           ▪ Match                 │
│  Receipt status              ▪ Success               │
│  Protected destination       ▪ Pass  /  ▫ Fail       │  ← the divergent row
│  ───────────────────────────────────────────────────│
│  Reward            1.00 tCTC   Released  /  Refunded  │  ← settlement rows, figures right
│  Executor bond     0.50 tCTC   Returned  /  Penalty  │
│  ───────────────────────────────────────────────────│
│  Source transaction   0x8f2c…be31   ↗ Sepolia        │  ← links open in evidence panel
│  Creditcoin settlement 0x41d0…9ee2  ↗ CC3            │
│  Replay          ▪ Rejected on re-submission         │
│  ───────────────────────────────────────────────────│
│  + Show the full predicate trace                     │
│  + Show the proof material                           │
└─────────────────────────────────────────────────────┘
```

The header's "Attestcoin proof: Verified" line is **visually identical** on both the
affirmed and refused certificate. The verdict-header ground tint (`--affirm-sunk` /
`--refuse-sunk`) is applied only to the header strip, so the eye lands on the divergence
in the rows below, not on a big colored panel.

### 6.4 The diptych (`/proof`, and the landing hero specimen)

Two settlement certificates, side by side, separated by a 2px `--rule-strong` vertical
gutter that runs the full height (the ledger spine/binding). Left = the canonical correct
settlement. Right = the canonical verified-but-wrong settlement. A single caption sits
above the gutter, centered on it:

> The same Attestcoin verifier proved both transactions. setld paid the correct executor
> and refused the wrong one, with no evaluator.

Below the diptych: `Verify independently`, explorer links, `Download evidence.json`, and
`Play the 2-minute demo`. On the landing page the diptych is rendered at 0.82 scale as a
"specimen" with a `View this proof` affordance; on `/proof` it is full size and live.

### 6.5 Wallet / network strip

A single-row strip under the header, present only on authenticated routes:

`Creditcoin Testnet · 0x2a…9f · 1.42 tCTC     Sepolia binding · 0x3b…7f · Active`

- Wrong network: the offending segment turns `--pending` and shows `Switch to Creditcoin
  Testnet` as an inline secondary button. All Creditcoin write actions in the view become
  disabled with the reason (§6.1).
- Wrong Sepolia account during execution: that segment turns `--refuse`, `Execute` is
  blocked, `Switch account` shown.
- Disconnected: strip shows `Wallet disconnected — read-only` and a `Reconnect` button;
  records remain visible.

### 6.6 Input fields

- 40px height, `1px --rule` border on `--surface`, 3px radius, `body` text.
- Focus: 2px `--indigo` outline, offset 1px. Visible on keyboard focus for every
  interactive element.
- Inline validation: on blur and before any signature. Error text `body-sm` `--refuse`
  directly beneath the field, plus a 1px `--refuse` left border on the field. Valid
  contract addresses show a `mono-sm` checksum echo and an allowlist/verification note when
  available (PRD 10.1 step 19).
- Never validate destructively while typing; never block the field, only the submit.

### 6.7 Toast / notification

Used only for non-terminal acknowledgements (draft saved, address copied, key revoked). A
`body-sm` line, `--surface` on a 1px `--rule` border, 3px radius, top-right, 4s, dismissible.
**No terminal outcome is ever a toast** (PRD 11.9) — settlement, timeout, invalid attempt
all land on the record with a permanent certificate.

---

## 7. Screen: `/` landing (PRD 11.13)

First screen, no scroll:

```
setld                                    Docs   Live proof   [ Connect ]
──────────────────────────────────────────────────────────────────────────
        The agent did not report completion. The receipt did.          ← display, centered

   [  correct settlement certificate  │  wrong settlement certificate  ]  ← diptych specimen
                    The same Attestcoin verifier proved both.

   setld posts a bonded execution mandate. The executor acts on Ethereum,
   Attestcoin proves the real transaction and receipt, and Creditcoin pays
   or penalizes from the committed rules.                               ← body, 640px

   [ Create mandate ]   Find work   View live proof                     ← 1 primary + 2 secondary
```

Second screen (one scroll): the three-step mechanism as a horizontal ruled band —

```
  Mandate + reward + bond   │   External transaction   │   Verified receipt   │   Settlement
  escrowed on Creditcoin    │   on Ethereum Sepolia    │   proved by Attestcoin│   pay or penalize
```

then: current testnet status (contract addresses, chain, `submission-facts.json`-driven),
then a link to one completed correct record and one completed refused record. Architecture
diagrams, precompile addresses, SDK setup live at `/docs` — never above the fold.

Copy is plain and declarative. No feature list, no "powered by", no metrics that are not
measured.

---

## 8. Screen: creator flow

### 8.1 `/app/onboarding?intent=create` (PRD 11.4)

A single 640px column, three numbered steps shown as a checklist (a real sequence):

```
  Create a mandate

  1  Connect your Creditcoin wallet            ▫  [ Connect wallet ]
  2  Have testnet gas                          ▫
  3  Choose a template and publish             ▫

  One sentence: define the execution, fund the reward, and let the verified
  receipt decide settlement.
```

- Steps fill (`▪`) as satisfied. Step 2 failing shows "You need testnet gas before
  publishing" with `Open faucet` and `Recheck balance` (PRD 10.1 step 12) — not an RPC
  error.
- The domain-bound session signature prompt is preceded by a one-line explanation of what
  is being signed and "no funds move". Rejection returns here with `Signature cancelled,
  no funds moved` and `Try again`.

### 8.2 `/app/create` composer (PRD 10.1 steps 17–25)

640px column. Template picker first (`Treasury rebalance` is the only active card — a
bordered record, not a rounded tile, with its plain-language success rule visible). Then
the composer, grouped exactly as PRD 10.1 step 18:

```
  What must happen        assetIn, assetOut, target contract, expected event
  Acceptable bounds       max amount in, minimum output
  When it must happen     execution window (blocks), proof grace period
  Economics               reward, creator bond, required executor bond
```

Each group is a section with a header rule (§5.4). Fields validate inline (§6.6). A
persistent right-side (desktop) / bottom (mobile) **validation panel** shows the eight
preflight checks (PRD 12.4) as evidence rows with live glyphs, and one summary line:
`Ready to publish` / `Needs changes` / `Source state changed, simulate again`.

`Review mandate` opens a full settlement-certificate-shaped preview of the *terms* (not yet
a result): the exact action in plain language, reward, both bonds, deadlines, penalty
schedule, and a collapsed `Show canonical terms` with the `termsHash`. A required checkbox
`I understand the reward and bond rules` gates the primary button `Fund and publish`.

### 8.3 `/app/mandates/[id]` after publish

The record: lifecycle spine (§5.1) sticky left, record body right (720px). Body sections:
`What was promised` / `Executor` (once accepted: identity, bound source address, bond,
deadline) / `Source execution` / `Attestcoin verification` / `Settlement`. Before an
executor accepts, the primary action is `Share mandate`, secondary `Duplicate as new
draft`; a note states published terms cannot be edited. `Cancel mandate` (destructive
style) is available only in OPEN and shows the exact refund before signature.

---

## 9. Screen: executor flow

### 9.1 `/app/onboarding?intent=execute` — adds source binding

After the Creditcoin steps, a fourth step `Bind a Sepolia execution address`:

```
  4  Bind a Sepolia execution address          ▫

     This address will be credited or penalized. It binds to your
     Creditcoin executor identity 0x2a…9f.

     [ Connect source wallet ]  → switch to Sepolia → sign binding → switch
     back to Creditcoin → submit binding transaction
```

The EIP-712 binding challenge contents (executor id, Creditcoin account, Sepolia chain id
11155111, source address, deployment, nonce, expiry) are shown in a `mono-sm` block before
the signature. Network switches are explicit steps with their own buttons; the session is
never lost (PRD 11.7).

### 9.2 `/app/jobs`

A ledger list, not cards. Each row: mandate id (`mono`), template, reward (`mono-fig`
right), bond at risk (`mono-fig` right), execution deadline (relative + absolute on hover),
target, and a preflight glyph. Local filters (allowed templates, max bond, min reward,
allowed targets, min time-to-deadline) sit in a left rail and are labelled as "your
filters, not protocol rules". Excluded jobs can be revealed with the reason per job
(`Bond above your limit`, `Deadline too close`).

### 9.3 `/app/executions/[mandateId]`

Same record shape as the mandate detail, with the executor action surface:

- `Run preflight` → simulates the current source action, result shown as evidence rows.
  `Accept` stays disabled with an explicit reason if simulation is stale/impossible or the
  deadline is too short.
- After `Accept and bond`: the canonical source transaction is generated and shown —
  target, calldata summary (decoded, human), value, gas estimate, expiry. Protected fields
  are not editable; a note says so.
- `Execute on Sepolia` → source-wallet signature → the source tx hash pins to the spine
  and the record states: `Broadcast is not completion. Waiting for the verified receipt.`
- The record then advances through `Source receipt confirmed` → `Waiting for Attestcoin`
  → `Proof submitted` → `Evaluating` → terminal, each a spine node. `Submit proof now`
  appears (idempotent, disables after consumption) only if automated submission lags and
  proof material is ready.

### 9.4 Agent activity surface (PRD 18.4A, `/app` for autonomous operators)

Not a chat window. A **decision log**: a reverse-chronological ledger of the agent's
OBSERVE→ANALYZE→DECIDE→AUTHORIZE→EXECUTE→RECONCILE→FEEDBACK loop. Each decision is a record:

```
  ▪ ACCEPT   mandate 0x9a3c…7f21              2026-09-13 14:09:40 UTC
    reward 1.00 tCTC · bond 0.50 tCTC · gas est 0.0007 tCTC · margin +0.41
    route: direct vault rebalance (only approved route)
    tools: listMandates → getMandate → simulateMandate → estimateExecutionCost
    "Reward exceeds worst-case gas and bond exposure; simulation passes at
     current source state; deadline gives 42 blocks of margin."

  ▫ ABSTAIN  mandate 0x2b71…04ac              2026-09-13 14:07:12 UTC
    reason: DEADLINE_TOO_CLOSE — 6 blocks to execution end, preflight needs ≥ 20
```

The structured tool inputs/outputs are a `Show tool transcript` expander. Model prose is
shown as the stated rationale but labelled `agent rationale` and never presented as proof.
Deterministic guardrail checks that gate the decision (template, max bond, max gas,
allowlist) are their own evidence rows with glyphs, visually distinct from the model's
rationale.

---

## 10. Screen: public verifier

### 10.1 `/proof`

The live diptych (§6.4) at full size, both sides real completed records pulled from
`submission-facts.json` / chain. No wallet prompt ever. Below: `Verify independently`
(runs the recomputation inline, streaming each check as an evidence row), explorer links,
`Download evidence.json`, replay-rejection row, and the demo.

### 10.2 `/mandates/[id]` (read-only)

The full record, wallet-free. Opens with the terminal outcome stated in one plain
sentence, then the four expandable sections (`What was promised` / `What happened on
Ethereum` / `What Attestcoin verified` / `How Creditcoin settled`). `Verify independently`
recomputes canonical hash, source key, decoded fields, predicate trace, and conservation
from public data and reports match/mismatch per line.

### 10.3 `/verify`

A single input accepting a mandate id, source tx hash, or Creditcoin settlement tx. Resolves
to the matching record or states plainly `No setld record matches this identifier`. On a
match, the same independent recomputation runs and an `evidence.json` download is offered.
Exit-code semantics of the CLI verifier are mirrored in a `Result: match` / `Result:
mismatch` / `Result: evidence unavailable` line.

### 10.4 `/executors/[id]` and `/templates`

`/executors/[id]`: objective history as a ledger — each past mandate, role, value,
outcome, bound source address at the time. Value-weighted totals in `mono-fig`. No opaque
composite score (PRD 11.2).

`/templates`: each approved template version as a record — supported action, active/
deprecated status, plain-language success rule, links to implementation and reference
model. `Treasury rebalance v1` is the only active entry.

---

## 11. Responsive behavior

- **≥ 1024px**: diptych side-by-side; lifecycle spine sticky-left beside the record;
  validation panel docked right.
- **640–1023px**: diptych still side-by-side but at reduced scale, certificates drop the
  source/settlement link rows into an expander to keep both verdicts visible without
  horizontal scroll; spine becomes a top horizontal stepper; validation panel moves below
  the composer.
- **< 640px**: diptych **stacks vertically** — correct certificate then wrong certificate —
  each keeping its phase edge-bar and verdict header so the contrast survives the stack; a
  small `Correct ▪ / Wrong ▫` pager lets the reader jump between them; the shared caption
  sits between. Spine is a horizontal scrollable stepper pinned under the header. Action
  buttons become a sticky bottom bar (the one place a shadow is used, §4). Page margin 16px.
- Tables never scroll the page horizontally: figure columns collapse under their labels in
  a stacked row below 480px, wrapped in `overflow-x: auto` only for genuinely wide evidence
  blocks (raw JSON, Merkle sibling lists).
- Touch targets ≥ 44px. Hover-only information (absolute timestamps, full identifiers) is
  also available on tap via a disclosure.

---

## 12. State coverage (maps to PRD 11.8)

Every state below has a defined look. First line is always human and actionable; raw
contract reverts live under `Show technical detail`.

| State | Visual treatment |
|---|---|
| First visit (role unset) | single 640px column, one primary action, no dashboard chrome |
| Empty creator | record-shaped empty block: "No mandates yet." + `Create first mandate` |
| Empty executor jobs | filter rail visible + "No jobs match your filters." + per-filter counts |
| Loading | skeleton rules and blocks matching final layout; no spinners on the page body; actions hidden, not greyed |
| Validating | validation panel rows animate to their glyph one by one; primary button `Checking…` |
| Awaiting wallet | primary button `Awaiting wallet approval…`, record frozen with a `--pending` edge-bar, draft explicitly "saved" |
| Wrong network | wallet strip segment `--pending` + inline `Switch to Creditcoin Testnet`; writes disabled with reason |
| Wrong account (source) | wallet strip segment `--refuse`; `Execute` disabled + `Switch account` |
| Wallet disconnected | strip `Wallet disconnected — read-only`; records stay; `Reconnect` |
| Transaction pending | spine node `◐ --pending` + tx hash link + `Safe to leave this page` once hash known |
| Transaction rejected | inline `Wallet request cancelled`, no stack trace, `Try again` |
| RPC submission ambiguous | `Your wallet may have broadcast this. Resolving on-chain before retry.` + no retry button until resolved |
| Source receipt pending | spine `Executed on Ethereum ◐`, note that broadcast ≠ completion |
| Source reverted | spine node `--refuse`; record explains a reverted receipt can still be proof-relevant; awaits settlement policy |
| Waiting for Attestcoin | spine current node `◐ --pending`, shows source block vs latest attested height, `Safe to leave` |
| Proof generating | spine `Proof submitted ◐`, worker job id under expander, auto-retry stated |
| Proof ready | `Submit proof now` primary enabled (idempotent) |
| Proof rejected | spine node `▫ --refuse`, exact class shown (transport vs schema vs invalid), no settlement; retry only offered for transport/schema |
| Predicate failed | terminal refused certificate; the failed row struck with `--refuse` underline; full trace one expander away |
| Indexer delayed | thin `--pending` note bar: `Live chain state may be newer` + `Refresh from chain` |
| Stale simulation | `Accept` / `Execute` disabled + `Source state changed — run preflight again` |
| Rate limited | action preserved, `body-sm` countdown, retries automatically |
| Dependency unavailable | names the dependency (`Proof builder unavailable`), on-chain actions stay safe, `ATTESTCOIN_UNAVAILABLE` shown verbatim under technical detail |
| Contract paused | read-only banner with pause reason and block; history and withdrawals still reachable |
| Unsupported template | action disabled + `Update your client to act on this mandate` |
| Cancelled / Released / Timed out | terminal certificate, `--refuse` edge-bar, exact asset movements, `Duplicate as new draft` |
| Fulfilled | terminal certificate, `--affirm` edge-bar, transfers, evidence export |
| Invalid attempt | terminal certificate, `--refuse` edge-bar, exact failed field + penalty |
| Session expired | `Session expired. Re-authenticate to continue.` on protected actions only; reads keep working; drafts recoverable |
| Partial outage | degraded-service list; direct-chain path surfaced where safe |

---

## 13. Motion

One orchestrated moment, and answer-to-action feedback. Nothing else.

- **Lifecycle advance**: when polling detects a new reached node, the spine draws the
  connector segment down to it (180ms, ease-out) and the node glyph fills (120ms). This is
  the single non-user-triggered motion and it exists to show what changed.
- **Verify independently**: each recomputed check appears as it resolves (staggered 60ms),
  because the streaming *is* the reassurance.
- Expanders open/close 120ms height ease. Focus rings appear instantly. Buttons: 80ms
  background transition only.
- No section entrance animations. No parallax. No hover-lift on records or rows.
- `@media (prefers-reduced-motion: reduce)`: spine nodes appear already filled; checks
  appear all at once; all transitions 0ms.

---

## 14. Design audit against the PRD

Checked before implementation, 2026-09-03:

- **Does not alter product architecture / routes / lifecycle / proof requirements.** Every
  screen here maps to a PRD route (§7–§10 ↔ PRD 11.2); every state maps to PRD 11.8; the
  lifecycle spine nodes are exactly PRD 10.1 step 30; the certificate rows are exactly PRD
  5A. No route added or removed. No proof step visualized that the PRD does not require.
- **Centerpiece is the dual settlement proof.** It is the landing hero, the whole of
  `/proof`, and the shape every terminal record inherits. Boldness is spent here and
  nowhere else.
- **Reads as settlement/assurance infrastructure.** Civic document typeface, ledger
  structure, archival two-tone signal system, zero-radius records, no shadows, no
  gradients, no chain motifs, no metric cards, no fake terminals.
- **Progressive disclosure for technical detail.** Merkle/continuity proofs, tx index,
  replay key, canonical hash, predicate internals, raw JSON are all behind plain-labelled
  expanders; first line is always human (PRD 11.1).
- **Generic-default check.** Ground is cool near-white, not cream; no terracotta; no
  all-caps eyebrows; no `→` on buttons; no middle-dot meta strings; no tinted-black; mono
  is semantic content not label decoration; numbered markers used only for the two real
  sequences (onboarding checklist, lifecycle spine).
- **Quality floor.** Responsive to 320px with the verdict contrast preserved; visible
  keyboard focus on all interactives; reduced-motion honored; contrast ≥ 7:1 body / 4.5:1
  interactive; status never carried by color or glyph alone.
- **Copy.** Active voice, sentence case, action names stable through each flow
  (`Fund and publish` → `Publishing…` → `Published`), errors state what happened and the
  fix, empty states invite the next action.

One accessory removed (Chanel rule): an earlier draft gave each certificate a full-panel
`--affirm-sunk` / `--refuse-sunk` wash. Cut to a header-strip tint only, so the reader's
eye lands on the divergent predicate row, not on a block of color.
