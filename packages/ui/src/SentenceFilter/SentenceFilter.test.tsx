import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SentenceFilter, type SentencePart } from './SentenceFilter.js';

// jsdom has no Popover API. This stand-in opens and closes the popup the way the browser reports it.
const originalMatches = HTMLElement.prototype.matches;
beforeEach(() => {
  HTMLElement.prototype.showPopover = vi.fn(function (this: HTMLElement) {
    this.setAttribute('popover-open', '');
    const event = new Event('toggle');
    Object.defineProperty(event, 'newState', { value: 'open' });
    this.dispatchEvent(event);
  });
  HTMLElement.prototype.hidePopover = vi.fn(function (this: HTMLElement) {
    this.removeAttribute('popover-open');
    const event = new Event('toggle');
    Object.defineProperty(event, 'newState', { value: 'closed' });
    this.dispatchEvent(event);
  });
  Object.defineProperty(HTMLElement.prototype, 'matches', {
    configurable: true,
    value: function (this: HTMLElement, selector: string): boolean {
      return selector === ':popover-open' ? this.hasAttribute('popover-open') : originalMatches.call(this, selector);
    },
  });
});
afterEach(cleanup);

// jsdom treats a [popover] as hidden whatever the mock says, so the popup is queried with hidden: true.
const radio = (name: RegExp) => screen.getByRole('radio', { name, hidden: true }) as HTMLInputElement;

const parts: SentencePart[] = [
  'Newest ',
  {
    type: 'word',
    id: 'genre',
    name: 'Genre',
    label: 'any genre',
    value: 'any',
    options: [
      { value: 'any', label: 'any genre', count: 12345 },
      { value: 'poetry', label: 'poetry', count: 87 },
      { value: 'drama', label: 'drama', count: 0, disabled: true },
      { value: 'essays', label: 'essays' },
    ],
  },
  ' in ',
  {
    type: 'word',
    id: 'lang',
    name: 'Language',
    label: 'any language',
    value: 'any',
    options: [
      { value: 'any', label: 'any language' },
      { value: 'fr', label: 'French' },
    ],
  },
  ' ',
  { type: 'token', id: 'author', label: 'with Ada', removeLabel: 'Remove author filter: Ada' },
];

describe('SentenceFilter reading', () => {
  it('names each word "dimension: word" and makes the heading text the sentence', () => {
    render(<SentenceFilter as="h2" parts={parts} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Genre: any genre' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Language: any language' })).toBeTruthy();
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toBe('Newest any genre in any language with Ada');
  });

  it('renders a paragraph by default, and each heading level on request', () => {
    const { container, rerender } = render(<SentenceFilter parts={parts} onChange={() => {}} />);
    expect(container.querySelector('p')).toBeTruthy();
    expect(screen.queryByRole('heading')).toBeNull();
    rerender(<SentenceFilter as="h1" parts={parts} onChange={() => {}} />);
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
    rerender(<SentenceFilter as="h3" parts={parts} onChange={() => {}} />);
    expect(screen.getByRole('heading', { level: 3 })).toBeTruthy();
  });
});

describe('SentenceFilter choosing', () => {
  it('calls onChange once with the id and value, closes the popup and returns focus to the word', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SentenceFilter parts={parts} onChange={onChange} />);
    const word = screen.getByRole('button', { name: 'Genre: any genre' });
    await user.click(word);
    expect(word.getAttribute('aria-expanded')).toBe('true');
    await user.click(radio(/poetry/));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('genre', 'poetry');
    expect(word.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(word);
  });

  it('closes on Escape, returns focus to the word and does not call onChange', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SentenceFilter parts={parts} onChange={onChange} />);
    const word = screen.getByRole('button', { name: 'Language: any language' });
    await user.click(word);
    expect(word.getAttribute('aria-expanded')).toBe('true');
    await user.keyboard('{Escape}');
    expect(word.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(word);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('closes and returns focus without calling onChange when the already-chosen option is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SentenceFilter parts={parts} onChange={onChange} />);
    const word = screen.getByRole('button', { name: 'Genre: any genre' });
    await user.click(word);
    await user.click(radio(/any genre/));
    expect(onChange).not.toHaveBeenCalled();
    expect(word.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(word);
  });

  it('keeps the popup open when a disabled option is clicked', async () => {
    const user = userEvent.setup();
    render(<SentenceFilter parts={parts} onChange={() => {}} />);
    const word = screen.getByRole('button', { name: 'Genre: any genre' });
    await user.click(word);
    await user.click(radio(/drama/));
    expect(word.getAttribute('aria-expanded')).toBe('true');
  });

  it('shows the new value as checked when value changes while the popup is open', async () => {
    const user = userEvent.setup();
    const withValue = (value: string, label: string): SentencePart[] =>
      parts.map((part) => (typeof part !== 'string' && part.type === 'word' && part.id === 'genre' ? { ...part, value, label } : part));
    const view = render(<SentenceFilter parts={withValue('any', 'any genre')} onChange={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Genre: any genre' }));
    expect(radio(/any genre/).checked).toBe(true);
    view.rerender(<SentenceFilter parts={withValue('poetry', 'poetry')} onChange={() => {}} />);
    expect(radio(/poetry/).checked).toBe(true);
    expect(radio(/any genre/).checked).toBe(false);
  });

  it('opens from the keyboard with Enter', async () => {
    const user = userEvent.setup();
    render(<SentenceFilter parts={parts} onChange={() => {}} />);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Genre: any genre' }));
    await user.keyboard('{Enter}');
    expect(radio(/poetry/)).toBeTruthy();
  });
});

describe('SentenceFilter open cycles and counts', () => {
  const genreWord = () => screen.getByRole('button', { name: /^Genre: / });

  it('chooses a different option after reopening from a no-change choice', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SentenceFilter parts={parts} onChange={onChange} />);
    await user.click(genreWord());
    await user.click(radio(/any genre/));
    expect(onChange).not.toHaveBeenCalled();
    await user.click(genreWord());
    expect(genreWord().getAttribute('aria-expanded')).toBe('true');
    await user.click(radio(/poetry/));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('genre', 'poetry');
    expect(genreWord().getAttribute('aria-expanded')).toBe('false');
  });

  it('chooses again after reopening when the parent ignored the first choice', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SentenceFilter parts={parts} onChange={onChange} />);
    await user.click(genreWord());
    await user.click(radio(/poetry/));
    expect(genreWord().getAttribute('aria-expanded')).toBe('false');
    await user.click(genreWord());
    await user.click(radio(/essays/));
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith('genre', 'essays');
    expect(genreWord().getAttribute('aria-expanded')).toBe('false');
  });

  it('does not remount the options when value changes while the popup is open', async () => {
    const user = userEvent.setup();
    const withValue = (value: string, label: string): SentencePart[] =>
      parts.map((part) => (typeof part !== 'string' && part.type === 'word' && part.id === 'genre' ? { ...part, value, label } : part));
    const view = render(<SentenceFilter parts={withValue('any', 'any genre')} onChange={() => {}} />);
    await user.click(genreWord());
    // No remount: the same radio element stays in the DOM. (jsdom never moves focus into the popup, so this does not
    // test focus itself.)
    const before = radio(/any genre/);
    view.rerender(<SentenceFilter parts={withValue('poetry', 'poetry')} onChange={() => {}} />);
    expect(radio(/any genre/)).toBe(before);
    expect(radio(/poetry/).checked).toBe(true);
  });

  // jsdom does not move radios on arrow keys or focus inside the popup, so replay what a browser sends: the arrow's
  // keydown, the click it makes on the new radio, then the keyup.
  const arrowTo = (from: RegExp, to: RegExp) => {
    fireEvent.keyDown(radio(from), { key: 'ArrowDown' });
    fireEvent.click(radio(to));
    fireEvent.keyUp(radio(to), { key: 'ArrowDown' });
  };

  it('counts one onChange for Space after an arrow, and one for a click on an arrow-moved option', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SentenceFilter parts={parts} onChange={onChange} />);
    await user.click(genreWord());
    arrowTo(/any genre/, /poetry/);
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.keyDown(radio(/poetry/), { key: ' ' });
    fireEvent.keyUp(radio(/poetry/), { key: ' ' });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('genre', 'poetry');
    await user.click(genreWord());
    arrowTo(/any genre/, /essays/);
    await user.click(radio(/essays/));
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith('genre', 'essays');
  });

  it('counts no onChange for Enter or Space on the unchanged option', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SentenceFilter parts={parts} onChange={onChange} />);
    await user.click(genreWord());
    fireEvent.keyDown(radio(/any genre/), { key: 'Enter' });
    expect(genreWord().getAttribute('aria-expanded')).toBe('false');
    await user.click(genreWord());
    fireEvent.keyDown(radio(/any genre/), { key: ' ' });
    fireEvent.keyUp(radio(/any genre/), { key: ' ' });
    expect(genreWord().getAttribute('aria-expanded')).toBe('false');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('drops a browse position when the parent sets a new value while the popup is open', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const withValue = (value: string): SentencePart[] =>
      parts.map((part) => (typeof part !== 'string' && part.type === 'word' && part.id === 'genre' ? { ...part, value } : part));
    const view = render(<SentenceFilter parts={withValue('any')} onChange={onChange} />);
    await user.click(genreWord());
    arrowTo(/any genre/, /poetry/);
    expect(radio(/poetry/).checked).toBe(true);
    view.rerender(<SentenceFilter parts={withValue('essays')} onChange={onChange} />);
    expect(radio(/essays/).checked).toBe(true);
    expect(radio(/poetry/).checked).toBe(false);
    fireEvent.keyDown(radio(/essays/), { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
    expect(genreWord().getAttribute('aria-expanded')).toBe('false');
  });

  it('counts one onChange for a plain click and none for a click on the checked option', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SentenceFilter parts={parts} onChange={onChange} />);
    await user.click(genreWord());
    await user.click(radio(/essays/));
    expect(onChange).toHaveBeenCalledTimes(1);
    await user.click(genreWord());
    await user.click(radio(/any genre/));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe('SentenceFilter options', () => {
  async function open() {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const view = render(<SentenceFilter parts={parts} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Genre: any genre' }));
    return { onChange, user, ...view };
  }

  it('exposes the word as a dialog trigger and the popup as a dialog named for the dimension', async () => {
    await open();
    const word = screen.getByRole('button', { name: 'Genre: any genre' });
    expect(word.getAttribute('aria-haspopup')).toBe('dialog');
    expect(screen.getByRole('dialog', { name: 'Genre', hidden: true })).toBeTruthy();
  });

  it('marks the current option as checked', async () => {
    await open();
    expect(radio(/any genre/).checked).toBe(true);
    expect(radio(/poetry/).checked).toBe(false);
  });

  it('shows counts through toLocaleString by default and through formatCount when given', async () => {
    const { unmount } = await open();
    expect(screen.getByText((12345).toLocaleString())).toBeTruthy();
    expect(screen.getByText('87')).toBeTruthy();
    unmount();
    cleanup();
    const user = userEvent.setup();
    render(<SentenceFilter parts={parts} onChange={() => {}} formatCount={(n) => `${n} books`} />);
    await user.click(screen.getByRole('button', { name: 'Genre: any genre' }));
    expect(screen.getByText('87 books')).toBeTruthy();
  });

  it('cannot choose a disabled option', async () => {
    const { onChange, user } = await open();
    const drama = radio(/drama/);
    expect(drama.disabled).toBe(true);
    await user.click(drama);
    expect(onChange).not.toHaveBeenCalled();
  });

  // Arrow keys, Enter and Space need real focus and radio-group behaviour, which jsdom does not model well enough:
  // they are tested in the browser (e2e/tests/SentenceFilter.spec.ts).
});

describe('SentenceFilter token', () => {
  it('shows its label and a remove button that calls onRemove with the id', async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    render(<SentenceFilter parts={parts} onChange={() => {}} onRemove={onRemove} />);
    expect(screen.getByText('with Ada')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Remove author filter: Ada' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith('author');
  });

  it('moves focus to the word before the token when it is removed', async () => {
    const user = userEvent.setup();
    function Host() {
      const [shown, setShown] = useState(true);
      const list = shown ? parts : parts.slice(0, -2);
      return <SentenceFilter parts={list} onChange={() => {}} onRemove={() => setShown(false)} />;
    }
    render(<Host />);
    await user.click(screen.getByRole('button', { name: 'Remove author filter: Ada' }));
    expect(screen.queryByText('with Ada')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Language: any language' }));
  });

  it('moves focus to the sentence itself when the last control is removed', async () => {
    const user = userEvent.setup();
    function Host() {
      const [shown, setShown] = useState(true);
      const list: SentencePart[] = shown ? ['Showing ', parts[parts.length - 1] as SentencePart] : ['Showing '];
      return <SentenceFilter parts={list} onChange={() => {}} onRemove={() => setShown(false)} />;
    }
    const { container } = render(<Host />);
    await user.click(screen.getByRole('button', { name: 'Remove author filter: Ada' }));
    expect(document.activeElement).toBe(container.querySelector('p'));
  });

  it('renders no remove button without onRemove', () => {
    render(<SentenceFilter parts={parts} onChange={() => {}} />);
    expect(screen.queryByRole('button', { name: /Remove author/ })).toBeNull();
    expect(within(screen.getByText('with Ada')).queryByRole('button')).toBeNull();
  });
});
