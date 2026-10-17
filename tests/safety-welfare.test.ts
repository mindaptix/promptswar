import { describe, expect, it } from 'vitest';
import { assessSchemes, SCHEMES, type WelfareNeed } from '@/modules/welfare/domain/schemes';
import { HELPLINES, SAFETY_GUIDES, helplineById } from '@/modules/safety/domain/safety';

const OFFICIAL_HOSTS = [/\.gov\.in$/, /^maandhan\.in$/];
const isOfficial = (url: string) => {
  const parsed = new URL(url);
  return parsed.protocol === 'https:' && OFFICIAL_HOSTS.some((pattern) => pattern.test(parsed.hostname));
};
const today = new Date().toISOString().slice(0, 10);

type Localized = { en: string; hi: string };
function collectLocalized(value: unknown, out: Localized[] = []): Localized[] {
  if (Array.isArray(value)) value.forEach((item) => collectLocalized(item, out));
  else if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.en === 'string' && typeof record.hi === 'string') out.push(record as Localized);
    else Object.values(record).forEach((item) => collectLocalized(item, out));
  }
  return out;
}
const allText = collectLocalized([SCHEMES, HELPLINES, SAFETY_GUIDES]);

// Phrases that would promise outcomes, decide eligibility, or assert legal rights.
const FORBIDDEN = [
  /guarantee/i, /\bassured\b/i, /you are eligible/i, /you qualify/i, /you will (get|receive|be paid)/i,
  /\bentitled\b/i, /legal right/i, /right to\b/i, /\billegal\b/i, /\bthe law (says|requires)\b/i, /must (pay|compensate) you/i, /\bsue\b/i,
];

describe('verified sources', () => {
  it.each(SCHEMES.map((scheme) => [scheme.id, scheme] as const))('scheme %s links to an official HTTPS source with a review date', (_id, scheme) => {
    expect(isOfficial(scheme.source.url)).toBe(true);
    expect(scheme.source.reviewedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(scheme.source.reviewedOn <= today).toBe(true);
    expect(scheme.source.publisher.en).toBeTruthy();
  });

  it.each(HELPLINES.map((helpline) => [helpline.number, helpline] as const))('helpline %s is a dialable number with an official source', (_number, helpline) => {
    expect(helpline.number).toMatch(/^\d{3,12}$/);
    expect(isOfficial(helpline.sourceUrl)).toBe(true);
    expect(helpline.reviewedOn <= today).toBe(true);
  });

  it('scheme helplines are dialable digits', () => {
    for (const scheme of SCHEMES) if (scheme.helpline) expect(scheme.helpline).toMatch(/^\d{3,12}$/);
  });

  it('scheme ids are unique', () => {
    expect(new Set(SCHEMES.map((scheme) => scheme.id)).size).toBe(SCHEMES.length);
  });
});

describe('content language and claims', () => {
  it('every text has English and Devanagari Hindi', () => {
    expect(allText.length).toBeGreaterThan(40);
    for (const text of allText) {
      expect(text.en.trim()).not.toBe('');
      expect(text.hi).toMatch(/[\u0900-\u097F]/);
    }
  });

  it.each(FORBIDDEN.map((pattern) => [String(pattern), pattern] as const))('no content matches %s', (_label, pattern) => {
    expect(allText.filter((text) => pattern.test(text.en)).map((text) => text.en)).toEqual([]);
  });
});

describe('scheme assessment never decides eligibility', () => {
  const ages = [undefined, null, Number.NaN, -1, 17, 18, 40, 41, 70];
  const incomes = [undefined, null, Number.NaN, -5, 0, 15000, 15001, 100000];
  const needSets: WelfareNeed[][] = [[], ['pension'], ['health'], ['registration', 'insurance'], ['pension', 'health', 'registration', 'insurance']];

  it('returns eligibility "unknown" for every combination of answers', () => {
    for (const age of ages) for (const monthlyIncome of incomes) for (const needs of needSets) {
      for (const result of assessSchemes(needs, { age, monthlyIncome })) expect(result.eligibility).toBe('unknown');
    }
  });

  it('filters by need and shows every scheme when nothing is selected', () => {
    expect(assessSchemes([]).map((r) => r.scheme.id)).toEqual(SCHEMES.map((s) => s.id));
    expect(assessSchemes(['health']).map((r) => r.scheme.id)).toEqual(['pm-jay']);
    expect(assessSchemes(['pension']).map((r) => r.scheme.id)).toEqual(['pm-sym', 'jan-suraksha']);
  });

  const pmSym = (age?: number | null, monthlyIncome?: number | null) =>
    assessSchemes(['pension'], { age, monthlyIncome }).find((r) => r.scheme.id === 'pm-sym')!.checks.map((c) => c.result);

  it.each([
    [30, 12000, ['check_yourself', 'matches_listed', 'matches_listed']],
    [18, 15000, ['check_yourself', 'matches_listed', 'matches_listed']],
    [41, 15001, ['check_yourself', 'outside_listed', 'outside_listed']],
    [17, 0, ['check_yourself', 'outside_listed', 'matches_listed']],
    [null, undefined, ['check_yourself', 'not_answered', 'not_answered']],
    [Number.NaN, -1, ['check_yourself', 'not_answered', 'not_answered']],
  ])('compares age %s and income %s only with criteria listed by the source', (age, income, expected) => {
    expect(pmSym(age, income)).toEqual(expected);
  });

  it('schemes without listed criteria report no checks rather than guessing', () => {
    for (const result of assessSchemes([], { age: 30, monthlyIncome: 10000 })) {
      if (result.scheme.criteria.length === 0) expect(result.checks).toEqual([]);
    }
  });
});

describe('safety guides', () => {
  it('reference only helplines that exist and offer at least one', () => {
    for (const guide of SAFETY_GUIDES) {
      expect(guide.helplines.length).toBeGreaterThan(0);
      for (const id of guide.helplines) expect(helplineById(id)).toBeDefined();
    }
  });

  it('link the emergency helpline whenever a step tells the user to call 112', () => {
    for (const guide of SAFETY_GUIDES) {
      if (guide.steps.some((step) => step.en.includes('112'))) expect(guide.helplines).toContain('emergency');
    }
  });

  it('mention only numbers that appear in the helpline list', () => {
    const known = new Set(HELPLINES.map((helpline) => helpline.number));
    for (const guide of SAFETY_GUIDES) for (const step of guide.steps) {
      for (const number of step.en.match(/\b\d{3,}\b/g) ?? []) expect(known.has(number)).toBe(true);
    }
  });

  it('marks numbers whose official page could not be re-read', () => {
    expect(HELPLINES.filter((helpline) => !helpline.pageConfirmed).map((helpline) => helpline.number).sort()).toEqual(['112', '1930']);
  });
});
