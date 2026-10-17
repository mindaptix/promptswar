import { describe, expect, it } from 'vitest';
import {
  decodeUtf8Text, detectDocumentKind, DocumentError, groundExplanation, MAX_DOCUMENT_CHARS, MAX_PASSAGE_CHARS, MAX_UPLOAD_BYTES,
  normalizeDocumentText, sanitizeFileName, splitIntoPassages,
} from '@/modules/documents/domain/documents';

const bytes = (text: string) => new TextEncoder().encode(text);
const codeOf = (fn: () => unknown) => { try { fn(); } catch (error) { return (error as DocumentError).code; } return 'no error'; };

describe('document format validation', () => {
  it.each([
    ['notice.pdf', 'application/pdf', '%PDF-1.7 ...', 'pdf'],
    ['NOTICE.PDF', '', '%PDF-1.4', 'pdf'],
    ['notice.pdf', 'application/octet-stream', '%PDF-1.4', 'pdf'],
    ['notes.txt', 'text/plain', 'hello', 'text'],
    ['notes.txt', 'text/plain; charset=utf-8', 'hello', 'text'],
  ])('accepts %s (%s)', (name, mime, content, kind) => {
    expect(detectDocumentKind(name, mime, bytes(content))).toBe(kind);
  });

  it.each([
    ['photo.jpg', 'image/jpeg', 'xxxx', 'unsupported_type'],
    ['report.docx', 'application/vnd.openxmlformats', 'PK..', 'unsupported_type'],
    ['noextension', 'text/plain', 'hello', 'unsupported_type'],
    ['fake.pdf', 'application/pdf', 'not a pdf', 'type_mismatch'],
    ['fake.pdf', 'text/html', '%PDF-1.4', 'type_mismatch'],
    ['notes.txt', 'application/pdf', 'hello', 'type_mismatch'],
    ['empty.txt', 'text/plain', '', 'empty_file'],
  ])('rejects %s (%s) with %s', (name, mime, content, code) => {
    expect(codeOf(() => detectDocumentKind(name, mime, bytes(content)))).toBe(code);
  });

  it('rejects files over the upload limit even if the route bound is bypassed', () => {
    expect(codeOf(() => detectDocumentKind('big.txt', 'text/plain', new Uint8Array(MAX_UPLOAD_BYTES + 1)))).toBe('too_large');
  });

  it('decodes UTF-8 including Hindi and rejects invalid bytes or NUL', () => {
    expect(decodeUtf8Text(bytes('भुगतान ₹500'))).toBe('भुगतान ₹500');
    expect(codeOf(() => decodeUtf8Text(new Uint8Array([0xff, 0xfe, 0x00])))).toBe('invalid_text');
    expect(codeOf(() => decodeUtf8Text(bytes('a\u0000b')))).toBe('invalid_text');
  });

  it('sanitizes file names', () => {
    expect(sanitizeFileName('C:\\Users\\me\\pay\u0007slip.pdf')).toBe('payslip.pdf');
    expect(sanitizeFileName('../../etc/passwd.txt')).toBe('passwd.txt');
    expect(sanitizeFileName('   ')).toBe('document');
    expect(sanitizeFileName(`${'a'.repeat(300)}.txt`)).toHaveLength(200);
  });
});

describe('text normalization and passages', () => {
  it('normalizes whitespace and rejects empty text', () => {
    expect(normalizeDocumentText('\uFEFF  Line  one \r\n\r\n\r\n\r\nLine\ttwo  ')).toEqual({ text: 'Line one\n\nLine two', truncated: false });
    expect(codeOf(() => normalizeDocumentText(' \n\t '))).toBe('no_text');
  });

  it('truncates very long documents and reports it', () => {
    const result = normalizeDocumentText('word '.repeat(MAX_DOCUMENT_CHARS));
    expect(result.truncated).toBe(true);
    expect(result.text.length).toBeLessThanOrEqual(MAX_DOCUMENT_CHARS);
  });

  it('numbers paragraphs and splits long ones without losing text', () => {
    const long = Array.from({ length: 40 }, (_, i) => `Sentence number ${i} is here.`).join(' ');
    const passages = splitIntoPassages(`First paragraph.\n\n${long}\n\nLast।`);
    expect(passages[0]).toEqual({ id: 'P1', text: 'First paragraph.' });
    expect(passages.at(-1)!.text).toBe('Last।');
    expect(passages.every((p) => p.text.length <= MAX_PASSAGE_CHARS)).toBe(true);
    expect(passages.map((p) => p.id)).toEqual(passages.map((_, i) => `P${i + 1}`));
    expect(passages.slice(1, -1).map((p) => p.text).join(' ')).toBe(long);
  });

  it('hard-splits a single unbroken run longer than a passage', () => {
    const passages = splitIntoPassages('x'.repeat(MAX_PASSAGE_CHARS * 2 + 5));
    expect(passages.map((p) => p.text.length)).toEqual([MAX_PASSAGE_CHARS, MAX_PASSAGE_CHARS, 5]);
  });
});

describe('source grounding', () => {
  const passages = [
    { id: 'P1', text: 'Your payout of Rs 4,250 for week 32 is on hold.' },
    { id: 'P2', text: 'Submit a dispute within 7 days through the partner app.' },
  ];
  const valid = {
    summary: 'Your weekly payout is on hold and you can dispute it.',
    summarySources: ['P1', 'P2'],
    points: [
      { text: 'Rs 4,250 is held.', sources: ['P1'], quote: 'payout of Rs 4,250' },
      { text: 'You have 7 days to dispute.', sources: ['P2'], quote: 'within  7 DAYS' },
    ],
    notInDocument: ['Why the payout was held', ''],
  };

  it('keeps points whose quote appears in a cited passage (whitespace and case-insensitive)', () => {
    const result = groundExplanation(valid, passages);
    expect(result.points).toHaveLength(2);
    expect(result.droppedPoints).toBe(0);
    expect(result.notInDocument).toEqual(['Why the payout was held']);
  });

  it('drops fabricated quotes, wrong citations, unknown passages, and malformed points', () => {
    const result = groundExplanation({
      ...valid,
      points: [
        ...valid.points,
        { text: 'You will get a bonus.', sources: ['P1'], quote: 'bonus of Rs 1000' },
        { text: 'Dispute in 7 days.', sources: ['P1'], quote: 'within 7 days' },
        { text: 'Invented.', sources: ['P9'], quote: 'payout' },
        { text: 'Too short.', sources: ['P1'], quote: 'Rs' },
        'not an object',
        { text: '', sources: ['P1'], quote: 'payout of' },
      ],
      summarySources: ['P1', 'P9', 'P1'],
    }, passages);
    expect(result.points.map((p) => p.quote)).toEqual(['payout of Rs 4,250', 'within  7 DAYS']);
    expect(result.droppedPoints).toBe(6);
    expect(result.summarySources).toEqual(['P1']);
  });

  it.each([
    null,
    'text',
    { ...valid, points: [] },
    { ...valid, summary: '  ' },
    { ...valid, summarySources: ['P9'] },
    { ...valid, points: [{ text: 'x', sources: ['P1'], quote: 'not in the document' }] },
  ])('rejects an explanation with nothing grounded %#', (raw) => {
    expect(codeOf(() => groundExplanation(raw, passages))).toBe('ungrounded');
  });
});
