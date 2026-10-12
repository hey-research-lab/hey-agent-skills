import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import {
  FORBIDDEN,
  NEVER_SAY,
  exists,
  filesUnder,
  isPlaceholder,
  neverSayBlocks,
  parseSkill,
  publishedPaths,
  publishedTools,
  read,
  readJson,
  relativeLinksIn,
  skillFolders,
  toolCallsIn,
  urlsIn,
  withoutNeverSay,
  type JsonSchema,
} from './helpers.js';

const SKILL = 'skills/hey-research';
const skillText = read(`${SKILL}/SKILL.md`);
const skill = parseSkill(skillText);
/** Every text file of the skill: SKILL.md, references/*.md and agents/openai.yaml. */
const skillFiles = filesUnder(SKILL);
const markdownFiles = skillFiles.filter((f) => f.endsWith('.md'));

// The Agent Skills specification (https://agentskills.io/specification), checked field by field.
const SPEC_FIELDS = new Set([
  'name',
  'description',
  'license',
  'compatibility',
  'metadata',
  'allowed-tools',
]);
const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

describe('Agent Skills frontmatter (every skill in skills/)', () => {
  const folders = skillFolders();

  it('ships exactly the hey-research skill', () => {
    expect(folders).toEqual(['hey-research']);
  });

  for (const folder of folders) {
    describe(folder, () => {
      const { data, body } = parseSkill(read(`skills/${folder}/SKILL.md`));

      it('uses only the fields the specification defines', () => {
        for (const key of Object.keys(data)) expect(SPEC_FIELDS, key).toContain(key);
      });

      it('has a valid name that matches its folder', () => {
        expect(typeof data.name).toBe('string');
        const name = data.name as string;
        expect(name.length).toBeGreaterThanOrEqual(1);
        expect(name.length).toBeLessThanOrEqual(64);
        expect(name).toMatch(NAME_RE); // lowercase a-z, 0-9 and single inner hyphens
        expect(name).not.toContain('--');
        expect(name).toBe(folder);
      });

      it('has a non-empty description of at most 1024 characters', () => {
        expect(typeof data.description).toBe('string');
        const description = (data.description as string).trim();
        expect(description.length).toBeGreaterThan(0);
        expect(description.length).toBeLessThanOrEqual(1024);
      });

      it('keeps the optional fields within their limits', () => {
        if ('compatibility' in data) {
          expect(typeof data.compatibility).toBe('string');
          const c = data.compatibility as string;
          expect(c.length).toBeGreaterThanOrEqual(1);
          expect(c.length).toBeLessThanOrEqual(500);
        }
        if ('metadata' in data) {
          // A map from string keys to string values.
          expect(data.metadata).toBeTypeOf('object');
          expect(Array.isArray(data.metadata)).toBe(false);
          for (const value of Object.values(data.metadata as Record<string, unknown>)) {
            expect(typeof value).toBe('string');
          }
        }
        if ('allowed-tools' in data) expect(typeof data['allowed-tools']).toBe('string');
        if ('license' in data) expect(typeof data.license).toBe('string');
      });

      it('keeps the body within the progressive-disclosure budget', () => {
        expect(body.trim().length).toBeGreaterThan(0);
        expect(body.split('\n').length).toBeLessThan(500);
        expect(Math.ceil(body.length / 4)).toBeLessThan(5000); // ~tokens
      });
    });
  }

  it('declares no license in SKILL.md (the repository LICENSE governs; ClawHub forbids overrides)', () => {
    expect(skill.data).not.toHaveProperty('license');
  });

  it('carries the package version in its metadata', () => {
    const { version } = readJson<{ version: string }>('package.json');
    expect((skill.data.metadata as Record<string, string>).version).toBe(version);
  });
});

describe('the description makes an agent load the skill', () => {
  const description = skill.data.description as string;

  it.each([
    'Robinhood Chain',
    '4663',
    '$TICKER',
    '0x contract',
    'still being built',
    'what did it ship',
    'what changed today or this week',
    'who deployed a contract',
    'what HEY does not know',
  ])('names "%s"', (phrase) => {
    expect(description).toContain(phrase);
  });

  it('says what the skill is not for', () => {
    expect(description).toMatch(/Not for price predictions, trading advice or safety verdicts\./);
  });
});

describe('the body teaches the three ways in, in order', () => {
  it('puts the hosted MCP server first, then REST, then the CLI', () => {
    const mcp = skill.body.indexOf('## 1. First choice: the hosted MCP server');
    const rest = skill.body.indexOf('## 2. Second choice: the public REST API');
    const cli = skill.body.indexOf('## 3. Third choice: the CLI');
    expect(mcp).toBeGreaterThan(-1);
    expect(rest).toBeGreaterThan(mcp);
    expect(cli).toBeGreaterThan(rest);
    expect(skill.body).toContain('https://heyresearch.xyz/mcp');
    expect(skill.body).toContain('@hey-research-lab/cli');
  });

  it('teaches how to read answers and how to cite', () => {
    for (const phrase of [
      'Unknown stays unknown',
      'market data is context',
      '`FACT`',
      '`DERIVED`',
      '`UNKNOWN`',
      'get_evidence',
      'https://heyresearch.xyz/project/<slug>',
      'Source: HEY Research Lab — heyresearch.xyz',
    ]) {
      expect(skill.body).toContain(phrase);
    }
  });

  it('says what never to claim', () => {
    expect(skill.body).toContain('## What never to claim');
    expect(skill.body).toMatch(/No price view/);
    expect(skill.body).toMatch(/No safety verdict/);
    expect(skill.body).toMatch(/No Robinhood affiliation/);
  });
});

describe('file references (progressive disclosure)', () => {
  it('links every reference from SKILL.md, one level deep, and each exists', () => {
    const targets = relativeLinksIn(skill.body);
    expect(targets.sort()).toEqual([
      'references/api.md',
      'references/mcp-tools.md',
      'references/vocabulary.md',
    ]);
    for (const target of targets) {
      expect(target).not.toContain('..');
      expect(target.split('/').length).toBe(2);
      expect(exists(`${SKILL}/${target}`), target).toBe(true);
    }
  });

  it('keeps references free of further relative links (no nested chains)', () => {
    for (const file of markdownFiles.filter((f) => f.includes('/references/'))) {
      expect(relativeLinksIn(read(file)), file).toEqual([]);
    }
  });

  it('has a reference file for every file in references/', () => {
    const referenced = new Set(relativeLinksIn(skill.body).map((t) => `${SKILL}/${t}`));
    for (const file of skillFiles.filter((f) => f.includes('/references/'))) {
      expect(referenced, file).toContain(file);
    }
  });
});

describe('links', () => {
  const allowed = (url: string): boolean => {
    const parsed = new URL(url.replace(/<[^>]*>/g, 'x'));
    if (parsed.protocol !== 'https:') return false;
    if (parsed.hostname === 'heyresearch.xyz') return true;
    return (
      parsed.hostname === 'github.com' &&
      (parsed.pathname === '/hey-research-lab' || parsed.pathname.startsWith('/hey-research-lab/'))
    );
  };

  it('finds links to check', () => {
    expect(skillFiles.flatMap((f) => urlsIn(read(f))).length).toBeGreaterThan(20);
  });

  for (const file of skillFiles) {
    it(`${file}: every link is absolute https on heyresearch.xyz or github.com/hey-research-lab`, () => {
      for (const url of urlsIn(read(file))) expect(allowed(url), url).toBe(true);
    });
  }

  it('never links the private repository', () => {
    for (const file of skillFiles) {
      expect(read(file)).not.toMatch(/github\.com\/hey-research-lab\/hey-research(?![-\w])/);
    }
  });
});

describe('MCP tools named in the skill exist on the hosted server (saved tools/list)', () => {
  const tools = new Map(publishedTools().map((t) => [t.name, t]));
  const calls = markdownFiles.flatMap((f) => toolCallsIn(f, read(f)));

  it('reads a non-empty published tool list', () => {
    expect(tools.size).toBeGreaterThan(10);
  });

  it('finds the tool calls the skill teaches', () => {
    expect(calls.length).toBeGreaterThan(20);
    expect(toolCallsIn('SKILL.md', skill.body).length).toBeGreaterThan(10);
  });

  it('names only published tools, with published arguments and values', () => {
    for (const call of calls) {
      const where = `${call.file}: ${call.name}`;
      const tool = tools.get(call.name);
      expect(tool, `${where} is not a published tool`).toBeDefined();
      if (!tool) continue;
      const properties = tool.inputSchema.properties ?? {};
      const args = call.args ?? {};
      for (const required of tool.inputSchema.required ?? []) {
        expect(args, `${where} lacks required ${required}`).toHaveProperty(required);
      }
      for (const [key, value] of Object.entries(args)) {
        const schema: JsonSchema | undefined = properties[key];
        expect(schema, `${where} has no argument ${key}`).toBeDefined();
        if (!schema) continue;
        const values = Array.isArray(value) ? value : [value];
        const allowed = schema.enum ?? schema.items?.enum;
        if (allowed) {
          for (const v of values)
            if (!isPlaceholder(v)) expect(allowed, `${where}.${key}`).toContain(v);
        }
        if (schema.const !== undefined && !isPlaceholder(value)) expect(value).toBe(schema.const);
        if (schema.type === 'integer')
          expect(Number.isInteger(value), `${where}.${key}`).toBe(true);
        if (schema.type === 'array') expect(Array.isArray(value), `${where}.${key}`).toBe(true);
        if (schema.type === 'string') expect(typeof value, `${where}.${key}`).toBe('string');
      }
    }
  });

  it('documents every published tool once in references/mcp-tools.md, and no other', () => {
    const headings = [...read(`${SKILL}/references/mcp-tools.md`).matchAll(/^## (\S+)$/gm)].map(
      (m) => m[1],
    );
    expect(headings.sort()).toEqual([...tools.keys()].sort());
  });

  it('names a published tool wherever it writes a backticked tool name', () => {
    // Bare mentions such as `find_projects` in prose: anything that looks like a tool name and is
    // not one must be one of HEY's own vocabulary values, listed here on purpose.
    const notTools = new Set([
      'research_project',
      'what_changed',
      'builder_status',
      'verify_project',
      'compare_builders',
      'external_source',
      'chain_evidence_contradicts',
      'stillBuilding',
    ]);
    const toolish = /^(?:find|get|research|explain|project|ask|chain|market)_[a-z_]+$/;
    for (const file of markdownFiles) {
      for (const span of read(file).match(/`([a-z_]+)`/g) ?? []) {
        const word = span.slice(1, -1);
        if (!toolish.test(word) || notTools.has(word)) continue;
        if (word.startsWith('market_') && !tools.has(word)) continue; // reason codes (market_too_thin …)
        expect(tools.has(word), `${file}: ${word}`).toBe(true);
      }
    }
  });
});

describe('REST paths named in the skill exist in the published OpenAPI document', () => {
  const published = Object.keys(publishedPaths());
  const matches = (docPath: string): boolean => {
    const segments = docPath.split('/');
    return published.some((p) => {
      const parts = p.split('/');
      return (
        parts.length === segments.length &&
        parts.every((part, i) => part === segments[i] || /^\{.+\}$/.test(part))
      );
    });
  };

  const paths = markdownFiles.flatMap((file) =>
    [
      ...read(file)
        .replace(/<[^>\n]*>/g, 'X')
        .matchAll(/\/api(?:\/[A-Za-z0-9_.{}-]+)+/g),
    ].map((m) => ({ file, path: m[0].replace(/\.$/, '') })),
  );

  it('finds the paths the skill teaches', () => {
    expect(paths.length).toBeGreaterThan(20);
  });

  it('names only published paths', () => {
    for (const { file, path } of paths) expect(matches(path), `${file}: ${path}`).toBe(true);
  });
});

describe('CLI commands named in the skill exist in @hey-research-lab/cli', () => {
  // The commands of @hey-research-lab/cli 0.1.3 (https://github.com/hey-research-lab/hey-cli).
  const COMMANDS = new Set([
    'project',
    'research',
    'token',
    'scan',
    'search',
    'ships',
    'builders',
    'changes',
    'unknowns',
    'evidence',
    'pulse',
    'this-week',
    'help',
  ]);

  it('uses only real commands', () => {
    const used = markdownFiles.flatMap((f) =>
      [...read(f).matchAll(/@hey-research-lab\/cli ([a-z-]+)/g)].map((m) => m[1] ?? ''),
    );
    expect(used.length).toBeGreaterThanOrEqual(5);
    for (const command of used) expect(COMMANDS, command).toContain(command);
  });
});

describe('forbidden words', () => {
  it('lists the words to avoid exactly once, in the never-say block of SKILL.md', () => {
    const blocks = neverSayBlocks(skillText);
    expect(blocks).toHaveLength(1);
    const quoted = [...(blocks[0] ?? '').matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    expect(quoted).toEqual(NEVER_SAY);
    for (const file of skillFiles.filter((f) => !f.endsWith('/SKILL.md'))) {
      expect(neverSayBlocks(read(file)), file).toEqual([]);
    }
  });

  const scanned = [
    ...skillFiles,
    'README.md',
    'CHANGELOG.md',
    'CONTRIBUTING.md',
    'SECURITY.md',
    '.claude-plugin/plugin.json',
    '.claude-plugin/marketplace.json',
    'package.json',
  ];
  for (const file of scanned) {
    it(`${file} uses no forbidden word outside the never-say block`, () => {
      const text = withoutNeverSay(read(file));
      const hit = FORBIDDEN.exec(text);
      expect(hit ? text.slice(Math.max(0, hit.index - 60), hit.index + 60) : null).toBeNull();
    });
  }

  it('never claims Robinhood affiliation', () => {
    for (const file of scanned) {
      const text = read(file);
      expect(text, file).not.toMatch(
        /\b(?:by|with|from) Robinhood\b(?! Markets, Inc\. or Robinhood Chain)/i,
      );
      expect(text, file).not.toMatch(/\bHood Chain\b|tokenized stocks/i);
    }
  });
});

describe('agents/openai.yaml (Codex metadata)', () => {
  const meta = parseYaml(read(`${SKILL}/agents/openai.yaml`)) as {
    interface: Record<string, string>;
    dependencies: { tools: Array<Record<string, string>> };
  };

  it('declares the hosted MCP server as its tool dependency', () => {
    expect(meta.dependencies.tools).toEqual([
      {
        type: 'mcp',
        value: 'hey-research',
        description: expect.any(String) as unknown as string,
        transport: 'streamable_http',
        url: 'https://heyresearch.xyz/mcp',
      },
    ]);
  });

  it('keeps its interface text short and plain', () => {
    expect(meta.interface.display_name).toBe('HEY Research');
    expect(meta.interface.short_description?.length).toBeLessThanOrEqual(100);
  });
});
