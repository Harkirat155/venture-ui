import type { AstryxIntegration } from '@astryxdesign/cli/authoring';

// The Astryx CLI reads the integration manifest from a default export.
// Each component lives in src/<Name>/ with its <Name>.doc.mjs beside it; a component moves here
// when a second product needs it. Each has a showcase block in templates/ so the Astryx CLI can show it in use.
const integration: AstryxIntegration = {
  issuesUrl: 'https://github.com/Harkirat155/venture-ui/issues',
  components: './src',
  templates: './templates',
};

export default integration;
