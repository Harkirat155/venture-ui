'use client';

import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { SentenceFilter, type SentenceFilterOption, type SentencePart } from '@venture-ui/ui/SentenceFilter';
import { useState } from 'react';

const GENRES: SentenceFilterOption[] = [
  { value: 'any', label: 'any genre', count: 1204 },
  { value: 'poetry', label: 'poetry', count: 87 },
  { value: 'essays', label: 'essays', count: 215 },
];
const LANGUAGES: SentenceFilterOption[] = [
  { value: 'any', label: 'any language' },
  { value: 'fr', label: 'French', count: 310 },
  { value: 'de', label: 'German', count: 144 },
];

// The component holds no filter state: this page owns it and rebuilds the sentence from it.
export default function SentenceFilterShowcase() {
  const [values, setValues] = useState<Record<string, string>>({ genre: 'any', lang: 'any' });
  const [author, setAuthor] = useState(true);

  const label = (options: SentenceFilterOption[], id: string) => options.find((o) => o.value === values[id])?.label ?? '';
  const parts: SentencePart[] = [
    'Newest ',
    { type: 'word', id: 'genre', name: 'Genre', label: label(GENRES, 'genre'), value: values.genre ?? 'any', options: GENRES },
    ' in ',
    { type: 'word', id: 'lang', name: 'Language', label: label(LANGUAGES, 'lang'), value: values.lang ?? 'any', options: LANGUAGES },
    ...(author ? ([' ', { type: 'token', id: 'author', label: 'by Ada', removeLabel: 'Remove author filter: Ada' }] as SentencePart[]) : []),
  ];

  return (
    <VStack gap={3}>
      <SentenceFilter
        as="h2"
        parts={parts}
        onChange={(id, value) => setValues((current) => ({ ...current, [id]: value }))}
        onRemove={() => setAuthor(false)}
      />
      <Text type="supporting">Press a word to change it.</Text>
    </VStack>
  );
}
