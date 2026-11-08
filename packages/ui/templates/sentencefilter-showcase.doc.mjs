/** @type {import('@astryxdesign/cli/authoring').IntegrationTemplateDoc} */
export default {
  type: 'block',
  name: 'sentencefilter-showcase',
  displayName: 'SentenceFilter Showcase',
  description: 'A filter that reads as a sentence, with two changeable words and a removable token, as a page heading. A SentenceFilter in use.',
  isReady: true,
  exampleFor: 'SentenceFilter',
  isShowcase: true,
  aspectRatio: 4 / 3,
  componentsUsed: ['SentenceFilter', 'Text', 'VStack'],
};
