import { Text } from '@astryxdesign/core/Text';
import { SentenceFilter, type SentenceFilterOption, type SentenceFilterProps, type SentencePart } from '@venture-ui/ui/SentenceFilter';
import { useState } from 'react';
import { defineStories } from '../defineStories';

// A library's books. Fixed data, so the baselines are stable.
const GENRES: SentenceFilterOption[] = [
  { value: 'any', label: 'any genre', count: 12345 },
  { value: 'poetry', label: 'poetry', count: 87 },
  { value: 'essays', label: 'essays', count: 215 },
  { value: 'drama', label: 'drama', count: 0, disabled: true },
  { value: 'travel', label: 'travel writing and field notes from the long journeys', count: 9 },
];
const LANGUAGES: SentenceFilterOption[] = [
  { value: 'any', label: 'any language' },
  { value: 'fr', label: 'French', count: 310 },
  { value: 'de', label: 'German', count: 144 },
];
const ORDERS: SentenceFilterOption[] = [
  { value: 'new', label: 'newest' },
  { value: 'old', label: 'oldest' },
];

const labelOf = (options: SentenceFilterOption[], value: string | undefined) => options.find((o) => o.value === value)?.label ?? '';

// The component holds no state; each story owns it, as a product would.
function Demo({ as, long = false, withToken = false }: { as: SentenceFilterProps['as']; long?: boolean; withToken?: boolean }) {
  const [values, setValues] = useState<Record<string, string>>({ genre: long ? 'travel' : 'any', lang: 'any', order: 'new' });
  const [author, setAuthor] = useState(withToken);
  const word = (id: string, name: string, options: SentenceFilterOption[]): SentencePart => ({
    type: 'word',
    id,
    name,
    label: labelOf(options, values[id]),
    value: values[id] ?? '',
    options,
  });
  const parts: SentencePart[] = [
    long ? 'The most recently catalogued ' : 'Newest ',
    word('genre', 'Genre', GENRES),
    ' in ',
    word('lang', 'Language', LANGUAGES),
    ...(long ? [', ordered ', word('order', 'Order', ORDERS), ' first, from every branch that has lent them out this year'] : []),
    ...(author ? [' ', { type: 'token', id: 'author', label: 'by Ada Lovelace', removeLabel: 'Remove author filter: Ada Lovelace' } as const] : []),
  ];
  return (
    <SentenceFilter
      as={as}
      parts={parts}
      onChange={(id, value) => setValues((current) => ({ ...current, [id]: value }))}
      onRemove={() => setAuthor(false)}
      formatCount={long ? (n) => `${n.toLocaleString()} books` : undefined}
    />
  );
}

export default defineStories({
  component: 'SentenceFilter',
  stories: {
    // The gallery page has an h1 and no h2 above the story, so the large sentence is an h2.
    LargeHeading: () => <Demo as="h2" />,
    SmallLine: () => (
      <Text as="div" size="xsm">
        <Demo as="p" />
      </Text>
    ),
    WithToken: () => <Demo as="h2" withToken />,
    LongSentence: () => <Demo as="h2" long withToken />,
    LongSentenceSmall: () => (
      <Text as="div" size="xsm">
        <Demo as="p" long withToken />
      </Text>
    ),
  },
});
