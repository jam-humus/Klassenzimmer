import { describe, it, expect } from 'vitest';
import { filterPaletteEntries } from '~/ui/shortcut/matcher';
import { shouldIgnoreHotkey } from '~/ui/shortcut/guards';

describe('filterPaletteEntries', () => {
  it('matches substrings without case sensitivity', () => {
    const items = [
      { label: 'Hausaufgabe' },
      { label: 'Feedback geben' },
      { label: 'Quiz' },
    ];
    const result = filterPaletteEntries(items, 'auf');
    expect(result).toHaveLength(1);
    expect(result[0]?.label).toBe('Hausaufgabe');
  });

  it('returns all entries when query is empty', () => {
    const items = [{ label: 'A' }, { label: 'B' }];
    const result = filterPaletteEntries(items, '');
    expect(result).toHaveLength(2);
  });
});

describe('shouldIgnoreHotkey', () => {
  const baseTarget = {
    closest: () => null,
    isContentEditable: false,
    getAttribute: () => null,
  } as unknown as HTMLElement;

  it('ignores key presses inside text inputs', () => {
    const inputTarget = {
      ...baseTarget,
      tagName: 'INPUT',
      type: 'text',
      readOnly: false,
    } as unknown as HTMLInputElement;
    const event = { target: inputTarget, defaultPrevented: false } as unknown as KeyboardEvent;
    expect(shouldIgnoreHotkey(event)).toBe(true);
  });

  it('handles contentEditable elements', () => {
    const editableTarget = {
      ...baseTarget,
      tagName: 'DIV',
      isContentEditable: true,
    } as unknown as HTMLElement;
    const event = { target: editableTarget, defaultPrevented: false } as unknown as KeyboardEvent;
    expect(shouldIgnoreHotkey(event)).toBe(true);
  });

  it('allows shortcuts on regular buttons', () => {
    const buttonTarget = {
      ...baseTarget,
      tagName: 'BUTTON',
    } as unknown as HTMLElement;
    const event = { target: buttonTarget, defaultPrevented: false } as unknown as KeyboardEvent;
    expect(shouldIgnoreHotkey(event)).toBe(false);
  });
});
