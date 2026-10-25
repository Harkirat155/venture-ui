import type { StoryModule } from './defineStories';

// Every stories file registers itself: adding a component's gallery entry means adding one file, no list to edit.
const modules = import.meta.glob<{ default: StoryModule }>('./stories/*.stories.tsx', { eager: true });

export const storyModules: readonly StoryModule[] = Object.values(modules)
  .map((module) => module.default)
  .sort((a, b) => a.component.localeCompare(b.component));

export function findStory(component: string, story: string) {
  return storyModules.find((m) => m.component === component)?.stories[story];
}
