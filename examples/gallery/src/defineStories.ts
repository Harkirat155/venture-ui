import type { ReactNode } from 'react';

/** The default export of a `stories/<Component>.stories.tsx` file. */
export type StoryModule = {
  /** The component's name, as products import it from `@venture-ui/ui/<Component>`. */
  component: string;
  /** Each story renders one state of the component. Keys are PascalCase and become the URL. */
  stories: Record<string, () => ReactNode>;
};

/** Identity function that types a story file; the gallery finds every `stories/*.stories.tsx` on its own. */
export function defineStories(module: StoryModule): StoryModule {
  return module;
}
