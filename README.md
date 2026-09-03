# Education Framework

A developmental education framework for 0-18 yr old learners, implemented as an Astro application.

- Canonical URL: <https://education-framework.pages.dev/education-framework/>
- Production host: Cloudflare Pages project `education-framework`
- Deployment mode: Wrangler Direct Upload

## Start here

- [Capacity-governed execution layer](docs/execution-layer.md): exact weekly budgets, school-overlay/hybrid/full-school boundaries, guarantees, choose-N alternatives, rotations, temporary intensives, longitudinal hardship scheduling, deletion rules, individual/group allocation, progression, additional support, and staffing ownership.
- [`config/capacity-model.json`](config/capacity-model.json): machine-readable capacity model.
- [`config/hardship-model.json`](config/hardship-model.json): canonical twelve-domain hardship progression, phase cadences, and typed v2 count/duration/milestone requirements.
- [Markdown authoring contract](docs/markdown-authoring.md): source, data, presentation and validation boundaries; semantic conventions; stable-ID workflow.
- [Example hardship plan and evidence ledger](docs/examples/hardship-plan.age-14-16.json): complete, machine-auditable planning example.
- [`src/content/phases/`](src/content/phases/): framework and age-phase content.

## Two different engines

Do not confuse product correctness with educational effectiveness.

| Engine | Question | Mechanism |
|---|---|---|
| Software/content integrity | Does the application build, link, and represent its content correctly? | Build and content-integrity tests |
| Educational execution/evaluation | Can a real child execute the portfolio without overload, cover every non-substitutable hardship domain, and test a term hypothesis with restrained evidence? | Capacity and hardship audits plus baseline → hypothesis → indicators/work samples → quarterly continue/modify/stop review |

Passing the first says nothing about educational outcomes. Passing the second establishes structural feasibility, not causal proof of effectiveness.

## Commands

```sh
npm install
npm run dev
npm run build
npm test
npm run audit:content
npm run audit:capacity
npm run audit:hardship
npm run audit:markdown
```

Audit a proposed weekly plan:

```sh
node tools/audit-capacity.mjs --plan path/to/plan.json
node tools/audit-hardship.mjs --plan path/to/hardship-plan.json
```

The capacity audit rejects stacking, missing guarantees or owners, invalid rotations, consumed buffers, insufficient protected sleep/unstructured time, and 168-hour ledger overload. The hardship audit rejects missing or substituted domains, weakened cadences, counts, durations or milestones, incomplete scheduling/evidence fields, manufactured moral tests, and physical-exhaustion plans that violate the one-stressor contract. Both deliberately constrain evidence collection; continuous child surveillance and vanity metrics are outside the model.

## Deployment

This repository uses the reviewed static Cloudflare Pages Direct Upload V1 runner at
[`tools/portfolio-credentials/`](tools/portfolio-credentials/README.md). It rejects Functions,
`_worker.js`, Wrangler configuration, caller-selected targets, dirty or non-current `main`, and
artifact or toolchain drift.

| Fixed capability field | Value |
|---|---|
| Cloudflare account | `82675093f8de0440782f81032b6a33d1` |
| Pages project | `education-framework` |
| Immutable project ID | `ceae98f3-a8e5-4997-ab40-6b89a524d9b0` |
| Production branch | `main` |
| Static artifact | `.cloudflare-pages/` |
| 1Password lifecycle record | `Education Framework Cloudflare Pages Deploy` |
| Local execution replica | login Keychain service `com.velkan.education-framework.cloudflare.pages-deploy`, account `api-token` |

Build and prepare the path-preserving artifact without reading a credential:

```sh
npm ci
npm run build:cloudflare
```

The prepared site is emitted to `.cloudflare-pages/`. It retains the
`/education-framework/` base path and redirects the project root to that path.

The dedicated account-owned token permits Pages Write only in the fixed account and prohibits
Workers, storage, DNS, WAF, Billing, and token administration. Cloudflare exposes Pages Write at
account scope, so its danger case includes replacement or deletion of other Pages projects in that
account. The runner's immutable target checks reduce operator error; they do not narrow that
provider-side grant.

Provision the token with a 180-day expiry and begin replacement at least 30 days before expiry.
Keep recovery and lifecycle metadata in the named 1Password item; enroll only its concealed
`api-token` into the exact local Keychain service. Then use:

```sh
npm run cloudflare:status  # metadata only; MISSING until enrollment
npm run cloudflare:enroll  # one explicitly authorized hidden transfer
npm run cloudflare:verify  # live identity plus non-mutating project read
npm run deploy             # production mutation; requires separate current authorization
```

Credential retrieval is not deployment authorization. Do not deploy merely because the Keychain
replica exists. On rotation, verify the replacement before revoking its predecessor; on exposure,
revoke immediately and remove the exact replica. Never use the broad legacy `Cloudflare` item,
environment variables, `wrangler login`, or ad hoc `npx wrangler`. Do not re-enable GitHub Pages,
add a GitHub Pages `CNAME`, add Pages Functions, or convert this Direct Upload project to Git-backed
deployment without a separately reviewed architecture and credential change.
