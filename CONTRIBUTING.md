# Contributing

Thank you for helping. This repository teaches agents to use HEY Research Lab well; changes that
make the skill clearer, shorter or more accurate are welcome.

## Setup

```sh
corepack enable
pnpm install
pnpm scan          # leak and attribution scan (scripts/scan.mjs)
pnpm lint
pnpm typecheck
pnpm test          # offline: files and saved fixtures only, the network is blocked
pnpm format:check
pnpm validate:skill    # optional: the specification's reference validator (needs uv)
pnpm validate:plugin   # optional: needs the Claude Code CLI (`claude plugin validate --strict`)
```

Node.js 22+, pnpm 9.15.1. There is no build step: the skill is the Markdown itself.

## Rules

- **Follow the Agent Skills specification** (https://agentskills.io/specification): `name` and
  `description` required, only the specification's fields, `name` equal to its folder, the body
  short, detail in `references/`, one level deep. The tests enforce it.
- **Say only what HEY publishes.** Every MCP tool, argument and value must exist in the hosted
  server's tool list, and every `/api/...` path in the OpenAPI document. Re-record the fixtures when
  HEY's surface changes (below) and let the tests show what drifted.
- **Links** in the skill are absolute `https://` on `heyresearch.xyz` or
  `github.com/hey-research-lab`, apart from relative links to its own reference files.
- **Wording:** no investment advice, no safety verdicts, no trading language, no word that turns
  an address into a person, no claim of Robinhood affiliation. The forbidden-word test reads every
  skill file, this file, the README and the manifests; the words themselves appear once, in the
  never-say block of `SKILL.md`.
- **Formatting:** Prettier formats everything except the skill's Markdown, which keeps compact
  tables because agents read it token by token.
- **Versions** move together: `package.json`, `.claude-plugin/plugin.json`, the skill's
  `metadata.version`, the `x-hey-integration` header in `.mcp.json`, and a `CHANGELOG.md` entry.
- **No secrets** in files, fixtures, commits or logs.
- Conventional commit messages (`feat:`, `fix:`, `docs:`, `test:`, `chore:`, `ci:`).

## Re-recording fixtures (maintainers)

```sh
HEY_LIVE=1 node scripts/record-fixtures.mjs
pnpm test
```
