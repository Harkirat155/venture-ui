/** @type {import('@astryxdesign/cli/authoring').ComponentDoc} */
export default {
  type: 'component',
  name: 'DiffView',
  displayName: 'Diff View',
  category: 'Table & List',
  keywords: ['diff', 'compare', 'changes', 'what changed', 'patch', 'review', 'side by side', 'unified', 'version history'],
  import: '@venture-ui/ui/DiffView',
  usage: {
    description:
      'A line-level diff of two texts, unified or side by side, for reviewing what changed in a config, a document, a rule set or a permission list. It compares the lines with jsdiff, shows a +N −M summary, and hides unchanged lines far from any change behind a "Show N unchanged lines" control. For one block of code with no comparison use CodeBlock.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Pass the two full texts and let context hide the unchanged parts. Pre-trimming them removes the line numbers a reviewer uses to find the place.',
      },
      {
        guidance: true,
        description:
          'Leave mode on auto unless a layout needs one view. Auto is side by side from 48rem of viewport width and unified below, so a phone gets one readable column.',
      },
      {
        guidance: true,
        description:
          'Use language="markdown" for prose documents: headings read in bold and code fences are dimmed. Lines are still compared whole; there is no word-level diff.',
      },
      {
        guidance: false,
        description:
          'Use it to compare structure, such as JSON or YAML objects with reordered keys. It compares lines, so a reordered key is a removed line and an added one.',
      },
    ],
    accessibility: [
      {
        name: 'Table',
        category: 'Semantics',
        criterion: '1.3.1 Info and Relationships',
        requirement: 'table with headers',
        description:
          'The diff is a table: one row per line, with column headings, so a screen reader announces each cell with its heading.',
      },
      {
        name: 'Added and removed',
        category: 'Content',
        criterion: '1.4.1 Use of Color',
        requirement: '+ or − and a spoken word',
        description:
          'A changed line carries a + or − marker and visually hidden text ("added", "removed", "unchanged"), as well as its green or red wash. Colour is never the only cue.',
      },
      {
        name: 'Summary',
        category: 'Content',
        criterion: '1.3.1 Info and Relationships',
        requirement: 'Spoken counts',
        description:
          'The "+3 −2 lines" summary is read as "3 lines added, 2 lines removed". The symbols are hidden from assistive technology.',
      },
      {
        name: 'Show unchanged lines',
        category: 'Keyboard',
        criterion: '2.1.1 Keyboard',
        requirement: 'Tab, Enter, Space',
        states: ['Collapsed', 'Expanded'],
        description:
          'Each collapsed run has a button with aria-expanded. It stays where it is when pressed (its label changes to "Hide ..."), so keyboard focus is not lost.',
      },
    ],
    anatomy: [
      { name: 'Summary', required: true, description: 'The +N −M lines count, or "No changes" when the texts are the same.' },
      { name: 'Column headings', required: true, description: 'Old and New over the line numbers in the unified view, Before and After over the two sides in the split view; the marker and text columns are named for screen readers.' },
      { name: 'Line', required: true, description: 'A line number, a +, − or blank marker, and the text, with a green or red wash when it changed.' },
      { name: 'Unchanged-lines control', required: false, description: 'A button standing for a collapsed run of unchanged lines.' },
    ],
  },
  props: [
    { name: 'before', type: 'string', description: 'The text before the change.', required: true },
    { name: 'after', type: 'string', description: 'The text after the change.', required: true },
    {
      name: 'mode',
      type: "'unified' | 'split' | 'auto'",
      description:
        'unified stacks removed and added lines in one column; split puts before and after side by side, pairing the nth removed line with the nth added line of each change; auto is split when the viewport is at least 48rem wide and unified below.',
      default: "'auto'",
    },
    {
      name: 'language',
      type: "'text' | 'markdown'",
      description: 'markdown sets headings in bold and dims code fences. Both compare and show whole lines in the code type.',
      default: "'text'",
    },
    {
      name: 'context',
      type: 'number',
      description:
        'Unchanged lines kept around each change. Longer runs of unchanged lines collapse behind a "Show N unchanged lines" button; a single leftover line is shown instead.',
      default: '3',
    },
    {
      name: 'normalizeLineEndings',
      type: 'boolean',
      description:
        'Treat CRLF and LF as the same line ending, so a Windows copy of a file is not all changes. Off, a line that differs only by a CR is a change and is shown with a visible ␍. A final line break is never a change either way.',
      default: 'true',
    },
    {
      name: 'labels',
      type: 'Partial<DiffViewLabels>',
      description:
        'Overrides for the built-in English text. DiffViewLabels is { noChanges: string; summary: (added: number, removed: number) => string; summarySpoken: (added: number, removed: number) => string; showUnchanged: (count: number) => string; hideUnchanged: (count: number) => string; added: string; removed: string; unchanged: string; before: string; after: string; beforeLine: string; afterLine: string; change: string; line: string }. Anything you leave out keeps its default.',
    },
  ],
  examples: [
    {
      label: 'Review a config change',
      code: `import {DiffView} from '@venture-ui/ui/DiffView';

<DiffView
  before={'replicas: 2\\nimage: web:1.4.2\\nlog: info\\n'}
  after={'replicas: 3\\nimage: web:1.5.0\\nlog: info\\n'}
/>`,
    },
    {
      label: 'A document, always side by side, with more context',
      code: `import {DiffView} from '@venture-ui/ui/DiffView';

<DiffView before={previousMarkdown} after={currentMarkdown} language="markdown" mode="split" context={5} />`,
    },
  ],
};
