/** @type {import('@astryxdesign/cli/authoring').IntegrationTemplateDoc} */
export default {
  type: 'block',
  name: 'diffview-showcase',
  displayName: 'Diff View Showcase',
  description:
    'A config file before and after review, as a line diff with a +N -M summary and unchanged lines folded away. A DiffView in use.',
  isReady: true,
  exampleFor: 'DiffView',
  isShowcase: true,
  aspectRatio: 4 / 3,
  componentsUsed: ['DiffView', 'Heading', 'VStack'],
};
