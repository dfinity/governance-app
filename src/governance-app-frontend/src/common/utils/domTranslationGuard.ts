/**
 * Hardens `Node.prototype.insertBefore` / `removeChild` against DOM mutations
 * performed by in-browser page translators (most notably Google Translate).
 *
 * Translators rewrite text nodes in place — wrapping them in their own `<font>`
 * elements — without React's knowledge. React keeps references to the original
 * text nodes, so when it later reconciles it can call
 * `parent.insertBefore(newNode, referenceNode)` (or `parent.removeChild(child)`)
 * with a reference/child that the translator has since re-parented. The browser
 * then throws:
 *
 *   Failed to execute 'insertBefore' on 'Node': The node before which the new
 *   node is to be inserted is not a child of this node.
 *
 * which is uncaught during commit and takes down the whole route via the
 * router's error boundary. Users vote successfully but then see "Something went
 * wrong".
 *
 * The guard below intervenes only in that exact pathological case (the
 * reference/child is not a child of `this`), falling back to appending /
 * no-op so React's commit completes without throwing. In every other case it
 * delegates to the native implementation unchanged.
 *
 * This is the widely-adopted mitigation for the React + Google Translate crash;
 * see facebook/react#11538. Keeping translation working (rather than disabling
 * it) matters for a governance app used worldwide.
 */

let installed = false;

export const installDomTranslationGuard = (): void => {
  if (installed) return;
  if (typeof Node !== 'function' || !Node.prototype) return;
  installed = true;

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(
    this: Node,
    newNode: T,
    referenceNode: Node | null,
  ): T {
    // A translator re-parented the reference node: append instead of throwing.
    if (referenceNode && referenceNode.parentNode !== this) {
      if (import.meta.env.DEV) {
        console.warn(
          '[domTranslationGuard] insertBefore reference node is not a child; appending instead.',
          { newNode, referenceNode, parent: this },
        );
      }
      return this.appendChild(newNode);
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    // A translator already detached/re-parented the child: skip the removal.
    if (child.parentNode !== this) {
      if (import.meta.env.DEV) {
        console.warn('[domTranslationGuard] removeChild target is not a child; skipping removal.', {
          child,
          parent: this,
        });
      }
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };
};
