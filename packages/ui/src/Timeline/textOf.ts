import { isValidElement, type ReactNode } from 'react';

/** Plain text of a ReactNode, for a screen-reader-only label; elements without text contribute nothing. */
export function textOf(node: ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number' || typeof node === 'bigint') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return '';
}
