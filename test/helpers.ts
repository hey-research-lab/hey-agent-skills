import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const SKILLS_DIR = join(ROOT, 'skills');

export const read = (path: string): string => readFileSync(join(ROOT, path), 'utf8');
export const readJson = <T = unknown>(path: string): T => JSON.parse(read(path)) as T;

/** Every regular file under a directory, as paths relative to the repository root. */
export function filesUnder(dir: string): string[] {
  const out: string[] = [];
  const walk = (abs: string) => {
    for (const entry of readdirSync(abs)) {
      const path = join(abs, entry);
      const st = statSync(path);
      if (st.isDirectory()) walk(path);
      else if (st.isFile()) out.push(relative(ROOT, path));
    }
  };
  walk(join(ROOT, dir));
  return out.sort();
}

/** The skill folders under `skills/` (each must hold a SKILL.md). */
export const skillFolders = (): string[] =>
  readdirSync(SKILLS_DIR)
    .filter((entry) => statSync(join(SKILLS_DIR, entry)).isDirectory())
    .sort();

export type Frontmatter = { data: Record<string, unknown>; body: string; raw: string };

/** Splits a SKILL.md into its YAML frontmatter and Markdown body, as the spec defines them. */
export function parseSkill(text: string): Frontmatter {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!match) throw new Error('SKILL.md must start with YAML frontmatter between --- lines');
  const raw = match[1] ?? '';
  const data: unknown = parseYaml(raw);
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('the frontmatter must be a YAML mapping');
  }
  return { data: data as Record<string, unknown>, body: match[2] ?? '', raw };
}

/** Words HEY's own copy must never contain (ecosystem conventions: forbidden output words). */
export const FORBIDDEN =
  /\b(rug|rugs|scam|scams|safe|unsafe|bullish|bearish|buy|buying|sell|selling|100x|alpha|undervalued|guaranteed|smart money|whale|whales|dev wallet|users|partnership|audited|official robinhood)\b/i;

/** The words the skill tells agents never to use; they appear once, in the never-say block. */
export const NEVER_SAY = [
  'rug',
  'scam',
  'safe',
  'unsafe',
  'bullish',
  'bearish',
  'buy',
  'sell',
  '100x',
  'alpha',
  'undervalued',
  'guaranteed',
  'smart money',
  'whale',
  'dev wallet',
  'users',
  'partnership',
  'audited',
  'official Robinhood',
];

const NEVER_SAY_BLOCK = /<!-- never-say:start -->([\s\S]*?)<!-- never-say:end -->/g;

/** The never-say blocks of a text (the only place a forbidden word may appear, as a quotation). */
export const neverSayBlocks = (text: string): string[] =>
  [...text.matchAll(NEVER_SAY_BLOCK)].map((m) => m[1] ?? '');

/** The text with its never-say blocks removed: what the forbidden-word scan reads. */
export const withoutNeverSay = (text: string): string => text.replace(NEVER_SAY_BLOCK, '');

/** Every absolute URL in a text, with `<placeholder>` segments kept whole. */
export function urlsIn(text: string): string[] {
  const found = text.match(/[a-z][a-z0-9+.-]*:\/\/(?:<[^>\n]*>|[^\s`"'()<>\]|])+/gi) ?? [];
  return found.map((u) => u.replace(/[.,;:]+$/, ''));
}

/** Relative Markdown link targets (`[text](references/x.md)`). */
export function relativeLinksIn(text: string): string[] {
  return [...text.matchAll(/\]\(([^)\s]+)\)/g)]
    .map((m) => m[1] ?? '')
    .filter((target) => !/^[a-z][a-z0-9+.-]*:/i.test(target) && !target.startsWith('#'));
}

export type JsonSchema = {
  type?: string;
  enum?: unknown[];
  const?: unknown;
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  required?: string[];
};
export type McpTool = { name: string; description: string; inputSchema: JsonSchema };

/** The hosted MCP server's `tools/list` answer, as recorded (scripts/record-fixtures.mjs). */
export const publishedTools = (): McpTool[] =>
  readJson<{ response: { result: { tools: McpTool[] } } }>('test/fixtures/mcp-tools-list.json')
    .response.result.tools;

/** The public API's paths, as recorded from https://heyresearch.xyz/openapi.json. */
export const publishedPaths = (): Record<string, string[]> =>
  readJson<{ paths: Record<string, string[]> }>('test/fixtures/openapi-paths.json').paths;

/** A tool call written in the docs as `tool_name({...json...})` or `tool_name()`. */
export type ToolCall = { file: string; name: string; args: Record<string, unknown> | null };

export function toolCallsIn(file: string, text: string): ToolCall[] {
  const calls: ToolCall[] = [];
  for (const span of text.match(/`[^`\n]+`/g) ?? []) {
    const m = /^`([a-z][a-z0-9]*(?:_[a-z0-9]+)+)\((.*)\)`$/.exec(span);
    if (!m) continue;
    const argText = (m[2] ?? '').trim();
    calls.push({
      file,
      name: m[1] ?? '',
      args: argText ? (JSON.parse(argText) as Record<string, unknown>) : null,
    });
  }
  return calls;
}

/** A placeholder value (`"<slug>"`) stands for a real one and is not checked against an enum. */
export const isPlaceholder = (value: unknown): boolean =>
  typeof value === 'string' && /<[^>]+>/.test(value);

export const exists = (path: string): boolean => existsSync(join(ROOT, path));
