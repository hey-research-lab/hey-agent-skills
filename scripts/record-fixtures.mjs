#!/usr/bin/env node
// Re-records the two fixtures the tests read: the hosted MCP server's tool list and the public
// API's OpenAPI paths. Read-only (one MCP `tools/list` call and one GET). Never runs in CI.
// Usage: HEY_LIVE=1 node scripts/record-fixtures.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

if (process.env.HEY_LIVE !== '1') {
  console.error('Refusing to touch the network: set HEY_LIVE=1 to re-record the fixtures.');
  process.exit(2);
}

const { version } = JSON.parse(
  readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'),
);
const integration = `hey-agent-skills/${version}`;
const today = new Date().toISOString().slice(0, 10);
const out = (name) => fileURLToPath(new URL(`../test/fixtures/${name}`, import.meta.url));
const fetchJson = async (url, init) => {
  const res = await fetch(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  return res.json();
};

const tools = await fetchJson('https://heyresearch.xyz/mcp', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    accept: 'application/json, text/event-stream',
    'x-hey-integration': integration,
  },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
});
writeFileSync(
  out('mcp-tools-list.json'),
  `${JSON.stringify({ source: 'https://heyresearch.xyz/mcp', method: 'tools/list', recordedAt: today, response: tools }, null, 2)}\n`,
);

const openapi = await fetchJson('https://heyresearch.xyz/openapi.json', {
  headers: { 'x-hey-integration': integration },
});
const methods = ['get', 'post', 'put', 'patch', 'delete'];
const paths = Object.fromEntries(
  Object.entries(openapi.paths).map(([path, item]) => [
    path,
    Object.keys(item)
      .filter((m) => methods.includes(m))
      .map((m) => m.toUpperCase()),
  ]),
);
writeFileSync(
  out('openapi-paths.json'),
  `${JSON.stringify({ source: 'https://heyresearch.xyz/openapi.json', recordedAt: today, openapi: openapi.openapi, apiVersion: openapi.info.version, paths }, null, 2)}\n`,
);

console.log(`recorded ${tools.result.tools.length} tools and ${Object.keys(paths).length} paths`);
