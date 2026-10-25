/** @type {import('@astryxdesign/cli/authoring').IntegrationTemplateDoc} */
export default {
  type: 'block',
  name: 'timeline-showcase',
  displayName: 'Timeline Showcase',
  description:
    'An activity feed grouped by day, with status labels and details behind disclosure buttons, in a fixed time zone. A Timeline in use.',
  isReady: true,
  exampleFor: 'Timeline',
  isShowcase: true,
  aspectRatio: 4 / 3,
  componentsUsed: ['Timeline', 'Heading', 'VStack'],
};
