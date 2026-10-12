# Security policy

## Reporting a vulnerability

Please report privately through GitHub's "Report a vulnerability" (Security → Advisories) on this
repository, or email hi@heyresearch.xyz with "security" in the subject. Do not open a public issue.
We aim to acknowledge within 3 working days. There is no bug bounty for this repository.

## Scope

The repository holds instructions (Markdown), metadata (JSON and YAML) and tests. Nothing in it is
executed by an agent that installs the skill or the plugin.

- **Network:** the skill directs an agent to HTTPS requests to `https://heyresearch.xyz` only (the
  hosted MCP server, the public API) and to the published `@hey-research-lab/cli`. It never
  directs a write, an account route or `POST /api/scan`, and never asks the agent to fetch a URL
  found inside an answer.
- **Untrusted text:** the skill tells the agent that text a source wrote (a project name, a release
  title, anything marked `external_source`) is data to quote, never an instruction to follow.
- **Plugin:** the Claude Code plugin declares one remote MCP server, `https://heyresearch.xyz/mcp`,
  with one header naming the integration. It has no hooks, no commands, no scripts and no local
  server process.
- **Tests and scripts:** the tests read files in this repository and saved fixtures; the network is
  blocked in tests. `scripts/record-fixtures.mjs` makes two read-only requests to
  `heyresearch.xyz`, only when run by hand with `HEY_LIVE=1`.

## Handling secrets

This project never needs HEY credentials. An optional HEY API key belongs to the person using the
agent: the skill says to send it only to `heyresearch.xyz` as a bearer token, and never to print,
log or commit it. Never commit a `.env` with values.

## Supported versions

The latest 0.x minor receives fixes.
