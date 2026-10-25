import { Heading } from '@astryxdesign/core/Heading';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { Fragment, useSyncExternalStore, type ReactNode } from 'react';
import { findStory, storyModules } from './registry';

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}
const currentHash = () => window.location.hash;

/** Paints the page. Theme sets colour-scheme only, so the body colour comes from here, as AppShell does in a product. */
function Page({ children }: { children: ReactNode }) {
  return (
    <VStack minHeight="100vh" style={{ background: 'var(--color-background-body)' }}>
      {children}
    </VStack>
  );
}

/**
 * `#/` lists every story; `#/<Component>/<Story>` renders one on its own, which is what the Playwright tests
 * open. Both pages are a `main` landmark under an h1, so axe judges the story and not the harness.
 */
export function App() {
  const [, component, story] = useSyncExternalStore(subscribe, currentHash).split('/');
  const render = component && story ? findStory(component, story) : undefined;

  if (render) {
    return (
      <Page>
        <VStack as="main" gap={4} padding={4} maxWidth="48rem" data-story-page={`${component}/${story}`}>
          <Link href="#/">All stories</Link>
          <Heading level={1}>{`${component}: ${story}`}</Heading>
          {/* Keyed, so no state (an open disclosure, say) carries over from the previous story. */}
          <Fragment key={`${component}/${story}`}>{render()}</Fragment>
        </VStack>
      </Page>
    );
  }

  return (
    <Page>
      <VStack as="main" gap={6} padding={4} maxWidth="48rem">
        <Heading level={1}>venture-ui gallery</Heading>
        {storyModules.map((module) => (
          <VStack as="section" key={module.component} gap={2} aria-labelledby={`h-${module.component}`}>
            <Heading level={2} id={`h-${module.component}`}>
              {module.component}
            </Heading>
            <VStack as="ul" gap={1}>
              {Object.keys(module.stories).map((name) => (
                <VStack as="li" key={name}>
                  <Text>
                    <Link href={`#/${module.component}/${name}`} data-story={`${module.component}/${name}`}>
                      {name}
                    </Link>
                  </Text>
                </VStack>
              ))}
            </VStack>
          </VStack>
        ))}
      </VStack>
    </Page>
  );
}
