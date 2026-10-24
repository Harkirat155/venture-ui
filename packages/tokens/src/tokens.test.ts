import { fileURLToPath } from 'node:url';
import StyleDictionary from 'style-dictionary';
import { describe, expect, it } from 'vitest';
import config from '../style-dictionary.config.mjs';
import { baseTokens } from './index.js';

const source = fileURLToPath(new URL('../tokens/*.tokens.json', import.meta.url));

async function buildCss(): Promise<string> {
  const sd = new StyleDictionary({ ...config, source: [source], log: { verbosity: 'silent' } });
  const [file] = await sd.formatPlatform('css');
  if (typeof file?.output !== 'string') throw new Error('Style Dictionary produced no css output');
  return file.output;
}

describe('baseTokens', () => {
  it('is the DTCG base file: an accent seed, a spacing scale and radii', () => {
    expect(baseTokens).toMatchObject({
      color: { accent: { $value: '#3355ff' } },
      spacing: { '4': { $value: '1rem' } },
      radius: { element: { $value: '8px' } },
    });
  });

  it('declares a $type for every token (own or from its group)', () => {
    const missing: string[] = [];
    const visit = (group: Record<string, unknown>, path: string[], inherited: unknown) => {
      for (const [name, node] of Object.entries(group)) {
        if (name.startsWith('$') || typeof node !== 'object' || node === null) continue;
        const rec = node as Record<string, unknown>;
        const type = rec.$type ?? inherited;
        if ('$value' in rec) {
          if (type === undefined) missing.push([...path, name].join('.'));
        } else {
          visit(rec, [...path, name], type);
        }
      }
    };
    visit(baseTokens as Record<string, unknown>, [], baseTokens.$type);
    expect(missing).toEqual([]);
  });
});

describe('tokens.css build', () => {
  it('emits prefixed CSS custom properties on :root', async () => {
    const css = await buildCss();
    expect(css).toContain(':root {');
    expect(css).toContain('--vui-color-accent: #3355ff;');
    expect(css).toContain('--vui-spacing-4: 1rem;');
    expect(css).toContain('--vui-radius-element: 8px;');
  });

  it('never emits a variable that could collide with an Astryx token', async () => {
    const css = await buildCss();
    const names = [...css.matchAll(/^\s*(--[\w-]+):/gm)].map((m) => m[1]);
    expect(names.length).toBeGreaterThan(0);
    expect(names.filter((n) => !n?.startsWith('--vui-'))).toEqual([]);
  });
});
