# Education Framework

A developmental education framework for 0-18 yr old learners, implemented as an Astro application.

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
