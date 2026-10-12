/**
 * No test may touch the network. Every test reads files in this repository and saved fixtures
 * (`test/fixtures`), so any call reaching the real `fetch` is a mistake and fails loudly.
 */
const blocked = async (input: unknown): Promise<never> => {
  const target = typeof input === 'string' ? input : String(input);
  throw new Error(
    `Network access is disabled in tests. Something tried to fetch ${target}. ` +
      'Read a saved fixture instead (scripts/record-tools-list.mjs records one).',
  );
};

globalThis.fetch = blocked as unknown as typeof fetch;
