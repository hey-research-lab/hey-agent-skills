import { describe, expect, it } from 'vitest';
import { exists, read, readJson } from './helpers.js';

// Checked against the Claude Code plugin reference (plugin.json), the marketplace reference
// (marketplace.json) and the MCP configuration rules, as documented at code.claude.com/docs.
// `claude plugin validate --strict` is the authoritative check (`pnpm validate:plugin`); these
// tests hold the same rules offline, in CI, where the Claude Code CLI is not installed.

type Author = { name: string; email?: string; url?: string };
type PluginJson = {
  name: string;
  displayName?: string;
  version: string;
  description: string;
  author: Author;
  homepage: string;
  repository: string;
  license: string;
  keywords: string[];
};
type MarketplaceEntry = {
  name: string;
  source: string;
  description?: string;
  category?: string;
  tags?: string[];
  version?: string;
};
type MarketplaceJson = {
  name: string;
  description: string;
  owner: Author;
  plugins: MarketplaceEntry[];
};
type McpServer = { type: string; url: string; headers?: Record<string, string> };

const pkg = readJson<{ version: string; private: boolean; name: string }>('package.json');
const plugin = readJson<PluginJson>('.claude-plugin/plugin.json');
const marketplace = readJson<MarketplaceJson>('.claude-plugin/marketplace.json');
const mcp = readJson<{ mcpServers: Record<string, McpServer> }>('.mcp.json');

const PLUGIN_FIELDS = new Set([
  '$schema',
  'name',
  'displayName',
  'version',
  'description',
  'author',
  'homepage',
  'repository',
  'license',
  'keywords',
  'metadata',
  'icon',
  'documentationUrl',
  'supportUrl',
  'privacyPolicyUrl',
  'termsOfServiceUrl',
  'defaultEnabled',
  'dependencies',
  'settings',
  'userConfig',
  'channels',
  'skills',
  'commands',
  'agents',
  'hooks',
  'mcpServers',
  'lspServers',
  'outputStyles',
  'workflows',
  'experimental',
]);
const MARKETPLACE_FIELDS = new Set([
  '$schema',
  'name',
  'owner',
  'plugins',
  'description',
  'version',
  'metadata',
  'forceRemoveDeletedPlugins',
  'allowCrossMarketplaceDependenciesOn',
  'renames',
]);
const RESERVED_MARKETPLACES = [
  'claude-code-marketplace',
  'claude-code-plugins',
  'claude-plugins-official',
  'anthropic-marketplace',
  'anthropic-plugins',
  'agent-skills',
  'anthropic-agent-skills',
  'claude-community',
  'claude-plugins-community',
  'inline',
  'builtin',
  'skills-dir',
  'synced',
  'npm',
  'github',
];
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMVER = /^\d+\.\d+\.\d+$/;

describe('.claude-plugin/plugin.json', () => {
  it('uses only documented fields', () => {
    for (const key of Object.keys(plugin)) expect(PLUGIN_FIELDS, key).toContain(key);
  });

  it('has a kebab-case name that does not read as a reserved one', () => {
    expect(plugin.name).toBe('hey-research');
    expect(plugin.name).toMatch(KEBAB);
    expect(plugin.name).not.toMatch(/(^|-)(claude|anthropic|anthropics|official)(-|$)/);
  });

  it('carries the metadata strict validation asks for, in the package version', () => {
    expect(plugin.version).toMatch(SEMVER);
    expect(plugin.version).toBe(pkg.version);
    expect(plugin.description.length).toBeGreaterThan(40);
    expect(plugin.author.name).toBe('HEY Research Lab');
    expect(plugin.license).toBe('MIT');
    expect(() => new URL(plugin.homepage)).not.toThrow();
    expect(plugin.homepage).toMatch(/^https:\/\/heyresearch\.xyz\//);
    expect(plugin.repository).toBe('https://github.com/hey-research-lab/hey-agent-skills');
  });

  it('relies on the default locations: skills/ and .mcp.json', () => {
    expect(plugin).not.toHaveProperty('skills');
    expect(plugin).not.toHaveProperty('mcpServers');
    expect(exists('skills/hey-research/SKILL.md')).toBe(true);
    expect(exists('.mcp.json')).toBe(true);
  });

  it('keeps every other plugin file outside .claude-plugin/', () => {
    expect(exists('.claude-plugin/skills')).toBe(false);
    expect(exists('.claude-plugin/.mcp.json')).toBe(false);
    expect(exists('CLAUDE.md')).toBe(false); // a plugin-root CLAUDE.md is not loaded and draws a warning
  });
});

describe('.claude-plugin/marketplace.json', () => {
  it('uses only documented top-level fields', () => {
    for (const key of Object.keys(marketplace)) expect(MARKETPLACE_FIELDS, key).toContain(key);
  });

  it('has a valid, unreserved name', () => {
    expect(marketplace.name).toBe('hey-agent-skills');
    expect(marketplace.name).toMatch(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);
    expect(marketplace.name).not.toContain('..');
    expect(RESERVED_MARKETPLACES).not.toContain(marketplace.name);
    expect(marketplace.name).not.toMatch(/claude|anthropic|^claudeai-/i);
    // The download folder of `hey-research-lab/hey-agent-skills` is reserved for that source.
    expect(marketplace.name).not.toBe('hey-research-lab-hey-agent-skills');
  });

  it('names its owner and describes itself', () => {
    expect(marketplace.owner.name).toBe('HEY Research Lab');
    expect(marketplace.description.length).toBeGreaterThan(20);
  });

  it('lists the plugin at the repository root by a relative path', () => {
    expect(marketplace.plugins).toHaveLength(1);
    const [entry] = marketplace.plugins;
    expect(entry?.name).toBe(plugin.name);
    expect(entry?.source).toBe('./');
    expect(entry?.source.startsWith('./')).toBe(true);
    expect(entry?.source).not.toContain('..');
    expect(entry?.source).not.toContain('\\');
  });

  it('leaves the version and directory-listing fields to plugin.json', () => {
    const [entry] = marketplace.plugins;
    for (const key of [
      'version',
      'icon',
      'documentationUrl',
      'supportUrl',
      'privacyPolicyUrl',
      'termsOfServiceUrl',
      'skills',
      'mcpServers',
    ]) {
      expect(entry, key).not.toHaveProperty(key);
    }
  });
});

describe('.mcp.json (the hosted MCP server)', () => {
  it('declares one remote HTTP server at heyresearch.xyz/mcp', () => {
    expect(Object.keys(mcp.mcpServers)).toEqual(['hey-research']);
    const server = mcp.mcpServers['hey-research'];
    expect(server?.type).toBe('http'); // a url without a type would be read as a stdio server
    expect(server?.url).toBe('https://heyresearch.xyz/mcp');
    expect(new URL(server?.url ?? '').protocol).toBe('https:');
  });

  it('names the integration in the package version and sends no credential', () => {
    const headers = mcp.mcpServers['hey-research']?.headers ?? {};
    expect(headers).toEqual({ 'x-hey-integration': `hey-agent-skills/${pkg.version}` });
    for (const name of Object.keys(headers)) {
      expect(name.toLowerCase()).not.toMatch(/authorization|api-key|token|cookie/);
    }
  });
});

describe('versions and package', () => {
  it('is a private package: nothing is published to npm', () => {
    expect(pkg.private).toBe(true);
  });

  it('dates one CHANGELOG entry for the current version', () => {
    expect(read('CHANGELOG.md')).toMatch(
      new RegExp(`^## ${pkg.version.replace(/\./g, '\\.')} — \\d{4}-\\d{2}-\\d{2}$`, 'm'),
    );
  });

  it('keeps every JSON file in the repository parseable', () => {
    for (const file of [
      'package.json',
      '.claude-plugin/plugin.json',
      '.claude-plugin/marketplace.json',
      '.mcp.json',
      'test/fixtures/mcp-tools-list.json',
      'test/fixtures/openapi-paths.json',
    ]) {
      expect(() => JSON.parse(read(file)), file).not.toThrow();
    }
  });
});
