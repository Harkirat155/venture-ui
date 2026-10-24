import type { AstryxIntegration } from '@astryxdesign/cli/authoring';

// The Astryx CLI reads the integration manifest from a default export.
// No components yet (M0): a component moves here when a second product needs it.
const integration: AstryxIntegration = {
  issuesUrl: 'https://github.com/Harkirat155/venture-ui/issues',
};

export default integration;
