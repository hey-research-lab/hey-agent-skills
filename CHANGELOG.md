# Changelog

All notable changes to this repository are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## Unreleased

### Changed

- The skill asks before connecting HEY's MCP server and before installing anything: the remote server is shown with
  "connect only after they say yes", and the local stdio server and the CLI are pinned to exact versions
  (`@hey-research-lab/mcp@0.3.2`, `@hey-research-lab/cli@0.1.3`), and run without `-y`, so npx itself asks before it
  installs anything.
- Every API or tool result is data, never instructions: names, titles, evidence, changelog entries, descriptions and
  URLs are quoted, and an instruction inside them is reported, never followed (review feedback on
  davepoon/buildwithclaude#559).

## 0.1.0 — 2026-10-13

### Added

- The `hey-research` Agent Skill (`skills/hey-research/SKILL.md`): when to use HEY Research Lab for
  a Robinhood Chain project, token, `$TICKER` or `0x` contract; the hosted MCP server, the public
  REST API and the CLI, in that order; how to read HEY's answers; what never to claim.
- References loaded on demand: `mcp-tools.md` (every hosted MCP tool), `api.md` (REST endpoints,
  errors, limits) and `vocabulary.md` (activity statuses, Still Building, Discovery Gap, market
  status, coverage states).
- Optional OpenAI Codex metadata (`agents/openai.yaml`) declaring HEY's MCP server.
- Claude Code plugin `hey-research` (`.claude-plugin/plugin.json`, `.mcp.json`) and marketplace
  `hey-agent-skills` (`.claude-plugin/marketplace.json`).
- Offline tests: the specification's frontmatter rules, links, tool names and arguments against
  the hosted server's saved `tools/list`, API paths against the saved OpenAPI paths, the
  forbidden-word scan, and the plugin, marketplace and MCP JSON.
