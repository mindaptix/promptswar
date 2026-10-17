import { performance } from 'node:perf_hooks';
import { describe, expect, it } from 'vitest';
import { parseEarningsInput } from '@/modules/earnings/domain/earnings';
import { assessSchemes } from '@/modules/welfare/domain/schemes';
import { buildTemplateDraft, parseComplaintFacts } from '@/modules/complaints/domain/complaints';
import { splitIntoPassages } from '@/modules/documents/domain/documents';

/** Local CPU budgets. These are not a deployed load test; they show the pure logic stays bounded. */
function budget(name: string, iterations: number, limitMs: number, run: () => void) {
  const started = performance.now();
  for (let i = 0; i < iterations; i += 1) run();
  const elapsed = performance.now() - started;
  const heapMb = process.memoryUsage().heapUsed / 1048576;
  console.info(`${name} iterations=${iterations} ms=${elapsed.toFixed(1)} heapMB=${heapMb.toFixed(1)}`);
  expect(elapsed).toBeLessThan(limitMs);
  expect(heapMb).toBeLessThan(256);
}

const facts = parseComplaintFacts({
  category: 'payment',
  platform: 'FastCart',
  amount: 4250,
  description: 'Week 32 payout is still missing from my bank account after the promised date.',
});

describe('bounded local work', () => {
  it('validates earnings input without allocating without limit', () => {
    budget('earnings-validation', 20_000, 1_000, () => parseEarningsInput({ income: 10.25, expense: 2.5 }));
  });
  it('compares scheme criteria without a network call', () => {
    budget('scheme-assessment', 20_000, 1_000, () => assessSchemes(['pension'], { age: 30, monthlyIncome: 12_000 }));
  });
  it('builds a complaint template from facts only', () => {
    budget('complaint-template', 5_000, 1_000, () => buildTemplateDraft(facts, 'en'));
  });
  it('splits a long document into bounded passages', () => {
    const text = Array.from({ length: 40 }, (_, index) => `Sentence ${index} explains the payout hold.`).join(' ');
    budget('passage-split', 2_000, 1_000, () => splitIntoPassages(text));
  });
});
