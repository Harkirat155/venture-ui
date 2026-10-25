'use client';

import { Heading } from '@astryxdesign/core/Heading';
import { VStack } from '@astryxdesign/core/VStack';
import { DiffView } from '@venture-ui/ui/DiffView';

const before = `name: web
replicas: 2
image: registry.example.org/web:1.4.2
env:
  LOG_LEVEL: info
  REGION: eu-west
  TIMEOUT: 30s
  RETRIES: 3
resources:
  memory: 256Mi
`;

const after = `name: web
replicas: 3
image: registry.example.org/web:1.5.0
env:
  LOG_LEVEL: debug
  REGION: eu-west
  TIMEOUT: 30s
  RETRIES: 3
  TRACING: "on"
resources:
  memory: 512Mi
`;

export default function DiffViewShowcase() {
  return (
    <VStack gap={3}>
      <Heading level={2}>Review the change</Heading>
      <DiffView before={before} after={after} context={1} />
    </VStack>
  );
}
