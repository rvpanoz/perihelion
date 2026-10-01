import { isValidElement } from 'react';

/**
 * The web tests have no DOM, so handlers are read off a component's returned element tree: the props of every host
 * element of `type`, in document order. Child components are not rendered, so test them on their own.
 */
export function findElementProps<P>(node: unknown, type: string): P[] {
  if (Array.isArray(node)) {
    return node.flatMap((child: unknown) => findElementProps<P>(child, type));
  }
  if (!isValidElement<{ children?: unknown }>(node)) return [];
  const own = node.type === type ? [node.props as unknown as P] : [];
  return [...own, ...findElementProps<P>(node.props.children, type)];
}
