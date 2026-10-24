import type { AstryxIntegration } from '@astryxdesign/cli/authoring';

// The Astryx CLI reads the integration manifest from a default export.
// Each component lives in src/<Name>/ with its <Name>.doc.mjs beside it; a component moves here
// when a second product needs it.
const integration: AstryxIntegration = {
  issuesUrl: 'https://github.com/Harkirat155/venture-ui/issues',
  components: './src',
};

export default integration;
