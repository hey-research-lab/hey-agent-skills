# hey-agent-skills

An Agent Skill (`SKILL.md`) and a Claude Code plugin that teach AI agents when and how to use HEY
Research Lab to answer questions about Robinhood Chain projects: is it still being built, what did
it ship, what changed, who made this contract.

[![CI](https://github.com/hey-research-lab/hey-agent-skills/actions/workflows/ci.yml/badge.svg)](https://github.com/hey-research-lab/hey-agent-skills/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22-informational.svg)](package.json)
[![Robinhood Chain 4663](https://img.shields.io/badge/Robinhood%20Chain-4663-informational.svg)](https://heyresearch.xyz)

## Why it exists

HEY Research Lab already answers these questions through a hosted MCP server, a public REST API and
a CLI. An agent only uses them if it knows they exist and when they apply. This repository is that
knowledge in the open Agent Skills format, so any agent that reads `SKILL.md` — Claude Code, OpenAI
Codex, GitHub Copilot, OpenClaw, Cursor, Gemini CLI and others — picks HEY when someone asks about a
Robinhood Chain project, token, `$TICKER` or `0x` contract, and reads its answers the way HEY means
them.

## Why Robinhood Chain only

HEY researches Robinhood Chain (chain id 4663, `eip155:4663`) and no other chain. The skill tells
the agent so; HEY's API answers another chain with `unsupported_chain` (or `invalid_request` on the
agent contract), and the skill never suggests otherwise.

## Install

One skill, `hey-research`. Pick the line for your agent.

### Any agent — skills.sh (`npx skills`)

```sh
npx skills add hey-research-lab/hey-agent-skills                       # choose agents interactively
npx skills add hey-research-lab/hey-agent-skills -a claude-code -a codex -a github-copilot
npx skills add hey-research-lab/hey-agent-skills --skill hey-research -g -y   # user scope, no prompts
```

The skills CLI copies `skills/hey-research` into each agent's skills directory (for example
`.claude/skills/`, `.agents/skills/`, `skills/` for OpenClaw).

### Claude Code — plugin (skill + MCP server)

```text
/plugin marketplace add hey-research-lab/hey-agent-skills
/plugin install hey-research@hey-agent-skills
```

or from a shell:

```sh
claude plugin marketplace add hey-research-lab/hey-agent-skills
claude plugin install hey-research@hey-agent-skills
```

The plugin brings the `hey-research` skill and connects HEY's hosted MCP server
(`https://heyresearch.xyz/mcp`, read-only, no key). To use the skill without the plugin, copy
`skills/hey-research` into `~/.claude/skills/` (or `.claude/skills/` in a project) and add the
server yourself: `claude mcp add --transport http hey-research https://heyresearch.xyz/mcp`.

### OpenAI Codex

Codex reads skills from `.agents/skills/` in a repository (from the working directory up to the
repository root) and `~/.agents/skills/` for the user. Either:

```sh
npx skills add hey-research-lab/hey-agent-skills -a codex
```

or ask Codex to run its built-in installer:
`$skill-installer install https://github.com/hey-research-lab/hey-agent-skills/tree/main/skills/hey-research`.
The skill's `agents/openai.yaml` declares HEY's MCP server as its tool dependency; to add it
yourself:

```sh
codex mcp add hey-research --url https://heyresearch.xyz/mcp
```

(or in `~/.codex/config.toml`: `[mcp_servers.hey-research]` with
`url = "https://heyresearch.xyz/mcp"`).

### GitHub Copilot

Copilot (cloud agent, code review, Copilot CLI, and agent mode in VS Code and JetBrains) reads
skills from `.github/skills/`, `.claude/skills/` or `.agents/skills/` in a repository, and from
`~/.copilot/skills/` or `~/.agents/skills/` for the user. With GitHub CLI 2.90 or later:

```sh
gh skill install hey-research-lab/hey-agent-skills hey-research                 # project scope
gh skill install hey-research-lab/hey-agent-skills hey-research --scope user    # every project
```

For the MCP server in VS Code, add to `.vscode/mcp.json`:
`{"servers": {"hey-research": {"type": "http", "url": "https://heyresearch.xyz/mcp"}}}`.

### OpenClaw / ClawHub

OpenClaw loads skills from `skills/` in its workspace and `~/.openclaw/skills/`:

```sh
npx skills add hey-research-lab/hey-agent-skills -a openclaw
```

Once the skill is published on ClawHub, `openclaw skills install <owner>/hey-research` or
`clawhub install <owner>/hey-research` installs it from the registry (the owner is the account
that publishes it). The skill needs no binary and no environment variable; it reaches HEY over
HTTPS.

### Any other agent

Copy the folder `skills/hey-research` (with `references/`) into the agent's skills directory. The
skill follows the [Agent Skills specification](https://agentskills.io/specification) and uses only
its standard fields.

## Smallest working example

After installing, ask your agent:

```text
Is the $HEY project on Robinhood Chain still being built? What did it ship last, and what does HEY not know about it?
```

The skill leads the agent to HEY's tools, for example `find_projects` to turn `$HEY` into a slug,
`research_answer` with `builder_status`, and `get_evidence` for the claim it repeats, and to end
with `Source: HEY Research Lab — heyresearch.xyz` and the project link. The same answer without an
agent, over REST:

```sh
curl -s "https://heyresearch.xyz/api/agent/builder_status?project=hey-research-lab"
```

## What the skill teaches

- **Three ways in, in order:** the hosted MCP server (each of its tools with the question it
  answers), the public REST API (key endpoints with `curl`, the optional free key), and the CLI
  `@hey-research-lab/cli`.
- **How to read answers:** unknown stays unknown, activity status is about building while market
  data is context with a date, `FACT`/`DERIVED`/`UNKNOWN`, evidence ids, and citing
  `https://heyresearch.xyz/project/<slug>`.
- **What never to claim:** no price view, no safety verdict, no Robinhood affiliation, none of
  HEY's excluded words.

```text
skills/hey-research/
├── SKILL.md                  # loaded when the skill triggers (~2k tokens)
├── references/
│   ├── mcp-tools.md          # every hosted MCP tool, its arguments and examples
│   ├── api.md                # REST endpoints, parameters, errors and limits
│   └── vocabulary.md         # activity statuses, Still Building, Discovery Gap, market status …
└── agents/openai.yaml        # optional Codex metadata (display name, MCP dependency)
.claude-plugin/
├── plugin.json               # the Claude Code plugin "hey-research"
└── marketplace.json          # the marketplace "hey-agent-skills"
.mcp.json                     # the plugin's MCP server: https://heyresearch.xyz/mcp
```

The references are loaded only when the agent needs them (the specification's progressive
disclosure). The vocabulary is copied from HEY's public methodology, OpenAPI document and
`llms.txt`.

## How it relates to HEY Research Lab

The skill describes HEY's public, read-only surfaces — https://heyresearch.xyz/mcp, the API
documented at https://heyresearch.xyz/docs/public-api and https://heyresearch.xyz/openapi.json, and
[`@hey-research-lab/cli`](https://github.com/hey-research-lab/hey-cli). It adds no data of its own
and calls nothing itself. HEY's own quality gate decides what is published, verified or counted as
building; the skill only teaches an agent to ask HEY and to relay its answers faithfully. The tests
hold every tool name, argument and API path in the skill to HEY's published tool list and OpenAPI
document (saved fixtures).

## What it does NOT prove

The skill teaches an agent how to read HEY's public record. An agent's answer is the agent's, not
HEY's: a well-formed answer that cites HEY is not proof that its claims are true or current. Nothing
the skill leads to is investment advice, a safety verdict or a recommendation; activity status is a
record of development, not a view on a token, and an unknown value means HEY does not know — not
zero.

HEY Research Lab is an independent research project and is not affiliated with, endorsed by or
partnered with Robinhood Markets, Inc. or Robinhood Chain.

## Security

See [SECURITY.md](SECURITY.md). The skill contains instructions and Markdown only: no scripts, no
binaries, no credentials. An agent following it makes HTTPS requests to `heyresearch.xyz` only, and
is told to treat text from a source as data, never as instructions. The plugin's MCP entry sends
no credential.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). `pnpm test` runs offline over saved fixtures;
`pnpm scan` is the leak and attribution scan.

## Licence

[MIT](LICENSE) © 2026 HEY Research Lab. Skills published on ClawHub are distributed there under
MIT-0, ClawHub's licence for every skill.
