# Portfolio Cloudflare Pages credential runner V1

This project-owned, dependency-free Node.js runner admits one capability: static Cloudflare Pages
Direct Upload to the exact production project named and identified in `capability.json`. The
manifest fixes repository, credential identity, branch, target, build profile, and limits. Wrangler
`4.128.0` and its registry-integrity lock are runner-owned inert files under `runtime/`.

```text
/opt/homebrew/opt/node@24/bin/node tools/portfolio-credentials/bin/status.mjs
/opt/homebrew/opt/node@24/bin/node tools/portfolio-credentials/bin/enroll.mjs
/opt/homebrew/opt/node@24/bin/node tools/portfolio-credentials/bin/verify.mjs
/opt/homebrew/opt/node@24/bin/node tools/portfolio-credentials/bin/deploy.mjs
```

Run these commands without Node execution flags and with inherited Node diagnostic/loader,
proxy, and TLS/OpenSSL authority variables unset. V1 rejects that ambient authority before
reading its manifest or Keychain credential; this includes `NODE_OPTIONS`, `NODE_DEBUG`,
`NODE_PATH`, the conventional proxy variables, custom CA/OpenSSL configuration, and TLS key
logging.

All commands accept zero additional arguments. `status` checks metadata only. `enroll` first proves
the exact clean repository, then performs an explicitly authorized, non-model-visible transfer
through an inherited interactive TTY. It refuses replacement and invokes only
`/usr/bin/security add-generic-password ... -T /usr/bin/security -w`, with bare final `-w`. The
operator must then verify in Keychain Access that only `/usr/bin/security` is trusted and “Allow
all applications” is disabled. Enrollment cancellation proves the fixed immediate system process,
not an arbitrary descendant tree.

Immediately run `verify`. It re-proves the repository, reads and clears the credential buffer,
verifies the account-owned token ID and expiry, and makes one non-mutating read of the exact Direct
Upload Pages project. Its bounded receipt contains project name and immutable ID, commit, expiry,
and the full non-secret provider token ID for comparison with 1Password lifecycle metadata.

`deploy` proves a clean `main`, exact remote, and `HEAD == origin/main == live remote main`. Before
project code executes, it captures the exact Node bytes and full npm runtime tree. Command mode
copies the clean Git index, runs fixed npm `ci` and `build:cloudflare`, and rebinds Node/npm afterward.
Committed-tree mode runs only normal `git archive HEAD` extraction: no application checkout,
install, or build.

After the application phase, the runner creates a separate private tooling root, materializes its
pre-captured package and lock, and installs Wrangler with lifecycle scripts disabled and explicit
empty npm configuration. Project-owned Wrangler is never trusted. It validates and snapshots the
entire Wrangler/transitive tree and static artifact bytes. A separate fresh Wrangler home contains
the runner-owned `wrangler.json` discovery sentinel and explicit empty env file. Artifact, tool
tree, control home, source commit, and Node executable are rebound before Keychain read and again
after provider preflight immediately before the fixed upload spawn.

The authenticated preflight requires the manifest’s exact account, Pages project name and immutable
ID, production `main`, Direct Upload `source` omitted or `null`, and `uses_functions: false`. The post-upload API receipt must
match that project ID, clean exact commit, production `main`, non-skipped status, project-specific
Pages hostname, and `uses_functions: false`.

For `build.mode: "committed-tree"`, use committed `.gitattributes` `export-ignore` rules to exclude
`tools/portfolio-credentials` and every non-public path from the artifact. The runner rejects its
own directory, package/dependency directories, secrets, configuration, Functions, `_worker.js`,
symlinks, and other non-static entries anywhere in the selected artifact.

Do not edit generated runtime files. Re-running the central scaffold is an idempotent no-op only
when every byte plus file/directory mode and ownership remains current. Any drift is refused rather
than overwritten. Runtime or dependency upgrades require a reviewed template version and explicit
re-scaffolding.

## Trust and recovery boundary

V1 treats the reviewed committed runner, project dependencies, and build code as trusted. A
compromised command-mode dependency runs as the same unlocked user and can invoke the ACL-trusted
`/usr/bin/security` for a known service; the late isolated Wrangler install does not sandbox it.
Likewise, same-UID code can create a detached session, race file checks, or modify global binaries.
Put hostile build code behind a broker, separate principal, sandbox, or VM. The clean-repository
check cannot authenticate imported modules after they have already begun executing, so invoke only
the reviewed committed runner.

The bounded subprocess primitive supervises a dedicated process group, not every possible detached
descendant. An ambiguous group-termination or workspace-cleanup failure retains the capability lock
under private `~/Library/Application Support/portfolio-credential-locks-v1`. Its
`retained-workspace` marker records the non-secret temporary path for manual recovery. Do not remove
the marker or lock until process-group and workspace disposition are independently proven.

V1 requires exact supported macOS arm64 Node `24.20.0` and npm `11.19.0` at reviewed Homebrew-keg
paths. Runtime drift fails closed; update through a reviewed re-scaffold before support or security
deadlines, never by relaxing the guard.
