/** @type {import('@astryxdesign/cli/authoring').ComponentDoc} */
export default {
  type: 'component',
  name: 'SentenceFilter',
  displayName: 'SentenceFilter',
  category: 'Form Controls',
  keywords: ['filter', 'sentence', 'natural language filter', 'inline select', 'facet', 'refine results', 'heading filter'],
  import: '@venture-ui/ui/SentenceFilter',
  usage: {
    description:
      'A filter that reads as a sentence: "Newest books in any language". The current state is plain text, and each changeable word is a button that opens a list of options. It fetches nothing and holds no filter state: pass the sentence as parts and rebuild it in onChange. It can be a page heading or a small line of text. For a form with many fields, or filters people compare side by side, use labelled Selectors in a row instead.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Write the strings with their own spaces ("Newest ", " in "). The component joins parts as given and adds no spacing, so the heading text is exactly the sentence.',
      },
      {
        guidance: true,
        description:
          'Keep the sentence true in every state. Name the empty choice ("any language") so a word never reads as a blank.',
      },
      {
        guidance: true,
        description:
          'Give each word a name that says what it changes ("Language"). A screen reader hears "Language: any language", and the same name labels the popup.',
      },
      {
        guidance: true,
        description:
          'Keep word labels short. A word is never split across lines unless it is wider than the line, so long labels make an uneven sentence.',
      },
      {
        guidance: true,
        description:
          'Pass as="h1" (or h2, h3) when the sentence is the title of the page or section. A heading takes its size from the theme; with as="p" the sentence takes the font size of its parent.',
      },
      {
        guidance: true,
        description:
          'A word\'s label stays on one line, so a long label pushes the whole word to the next line. Keep labels short.',
      },
      {
        guidance: true,
        description:
          'Expect the open popup to cover the words after the one it belongs to. Choosing an option or pressing Escape closes it and shows them again. This is by design: the popup sits under its word and does not push the sentence apart.',
      },
      {
        guidance: false,
        description:
          'Use it for more than about four words. Past that the sentence stops being scannable; use a filter row or a dialog.',
      },
    ],
    accessibility: [
      {
        name: 'Word',
        category: 'Semantics',
        criterion: '4.1.2 Name, Role, Value',
        requirement: 'Button named "dimension: word" with aria-haspopup="dialog" and aria-expanded',
        description:
          'The visible text is contained in the accessible name, so voice control by what you see works. Open, the popup is a dialog named after the dimension holding a radio group.',
      },
      {
        name: 'Options',
        category: 'Keyboard',
        criterion: '2.1.1 Keyboard',
        requirement: 'Arrow keys move, Enter or Space chooses, Escape closes, Tab stays inside',
        description:
          'Arrow keys move through the options without choosing, unlike a bare radio group, so a keyboard user can browse. Enter, Space or a click chooses, closes the popup and returns focus to the word. Choosing the option that is already current closes the popup and returns focus the same way, but does not call onChange. Escape closes without choosing. Disabled options are skipped and a click on one does nothing. Tab and Shift+Tab keep focus inside the open popup, so focus never leaves while the word still reads as expanded.',
      },
      {
        name: 'Selected option',
        category: 'Content',
        criterion: '1.4.1 Use of Color',
        requirement: 'Radio mark and checked state',
        description: 'The current option has a filled radio mark and is exposed as checked, so it is never marked by colour alone.',
      },
      {
        name: 'Token remove button',
        category: 'Keyboard',
        criterion: '2.4.3 Focus Order',
        requirement: 'Focus moves to the word before the token',
        description:
          'Removing a token takes its button away. Focus moves to the control before it, else the control after it, instead of falling to the page.',
      },
      {
        name: 'Live updates',
        category: 'Content',
        criterion: '4.1.3 Status Messages',
        requirement: 'The product announces the new result',
        description:
          'The component does not announce a changed word, a removed token or the new result count. The product that owns the results owns a live region (role="status") for that message.',
      },
      {
        name: 'Target size',
        category: 'Content',
        criterion: '2.5.8 Target Size (Minimum)',
        requirement: 'At least 44 px tall',
        description:
          'Each control has a hit area of at least 44 px tall. The extra height is padding cancelled by a negative margin, so the lines of the sentence stay at the spacing of the text.',
      },
    ],
    anatomy: [
      { name: 'Text', required: true, description: 'The plain strings of the sentence.' },
      { name: 'Word', required: true, description: 'A dotted-underline button showing the current choice.' },
      { name: 'Popup', required: true, description: 'A list of options with an optional count each.' },
      { name: 'Token', required: false, description: 'A fixed phrase with a remove button.' },
    ],
  },
  props: [
    {
      name: 'parts',
      type: 'SentencePart[]',
      description:
        'The sentence in reading order. A string is plain text. A word is { type: "word"; id; name; label; value; options: { value; label; count?; disabled? }[] }: name is the dimension for screen readers, label is how the word reads now, value is the current option, columns (1 or 2, default 1) lays a long list out in two columns. A token is { type: "token"; id; label; removeLabel }.',
      required: true,
    },
    {
      name: 'onChange',
      type: '(id: string, value: string) => void',
      description:
        'An option was chosen in the word with that id, and it differs from the word\'s current value. Called once per choice, then the popup closes. Choosing the current option closes the popup without calling it.',
      required: true,
    },
    {
      name: 'onRemove',
      type: '(id: string) => void',
      description: 'The remove button of a token was pressed. Without it, tokens show no remove button.',
    },
    {
      name: 'as',
      type: "'h1' | 'h2' | 'h3' | 'p'",
      description: 'The element the sentence is. A heading takes the theme size for its level; p takes its size from the parent.',
      default: "'p'",
    },
    {
      name: 'formatCount',
      type: '(n: number) => string',
      description: 'Formats each option count. Defaults to toLocaleString.',
    },
  ],
  examples: [
    {
      label: 'A page title that filters',
      code: `import {SentenceFilter} from '@venture-ui/ui/SentenceFilter';

<SentenceFilter
  as="h1"
  onChange={(id, value) => setFilters({...filters, [id]: value})}
  parts={[
    'Newest ',
    {type: 'word', id: 'genre', name: 'Genre', label: 'books', value: 'books', options: [
      {value: 'books', label: 'books', count: 1204},
      {value: 'poetry', label: 'poetry', count: 87},
    ]},
    ' in ',
    {type: 'word', id: 'lang', name: 'Language', label: 'any language', value: 'any', options: [
      {value: 'any', label: 'any language'},
      {value: 'fr', label: 'French', count: 310},
    ]},
  ]}
/>`,
    },
    {
      label: 'A small line with a removable token',
      code: `import {SentenceFilter} from '@venture-ui/ui/SentenceFilter';

<SentenceFilter
  onChange={onChange}
  onRemove={(id) => removeFilter(id)}
  parts={[
    'Showing ',
    {type: 'word', id: 'sort', name: 'Order', label: 'newest', value: 'new', options: [
      {value: 'new', label: 'newest'},
      {value: 'old', label: 'oldest'},
    ]},
    ' ',
    {type: 'token', id: 'author', label: 'by Ada', removeLabel: 'Remove author filter: Ada'},
  ]}
/>`,
    },
  ],
};
