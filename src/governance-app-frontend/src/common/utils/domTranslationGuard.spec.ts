import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { installDomTranslationGuard } from '@utils/domTranslationGuard';

/**
 * Reproduces the Google Translate DOM-mutation crash: a text node that React
 * still references gets re-parented (wrapped in a `<font>`) by the translator,
 * then React tries to use it as an insertBefore reference / removeChild target.
 *
 * The guard patches `Node.prototype` once (idempotent), so the suite installs
 * it a single time and asserts native behaviour via the captured originals.
 */
describe('domTranslationGuard', () => {
  const nativeInsertBefore = Node.prototype.insertBefore;
  const nativeRemoveChild = Node.prototype.removeChild;

  beforeAll(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    installDomTranslationGuard();
  });

  afterAll(() => {
    Node.prototype.insertBefore = nativeInsertBefore;
    Node.prototype.removeChild = nativeRemoveChild;
    vi.restoreAllMocks();
  });

  describe('insertBefore', () => {
    it('natively throws when the reference node was re-parented', () => {
      const parent = document.createElement('div');
      const orphanReference = document.createTextNode('translated');
      const newNode = document.createElement('span');

      expect(() => nativeInsertBefore.call(parent, newNode, orphanReference)).toThrow();
    });

    it('inserts before the wrapper when the reference was wrapped in place', () => {
      const parent = document.createElement('div');
      // Translator wrapped the reference text node in a <font> that is still a
      // direct child of the parent (the common Google Translate case).
      const tail = document.createElement('span');
      const fontWrapper = document.createElement('font');
      const reference = document.createTextNode('translated');
      fontWrapper.appendChild(reference);
      parent.append(fontWrapper, tail);
      const newNode = document.createElement('b');

      expect(() => parent.insertBefore(newNode, reference)).not.toThrow();
      // Order is preserved: new node lands before the wrapper, not appended.
      expect(Array.from(parent.childNodes)).toEqual([newNode, fontWrapper, tail]);
    });

    it('appends when the re-parented reference has no ancestor under the parent', () => {
      const parent = document.createElement('div');
      const existing = document.createElement('span');
      parent.appendChild(existing);
      // Reference lives in an unrelated subtree entirely.
      const detached = document.createElement('font');
      const reference = document.createTextNode('translated');
      detached.appendChild(reference);
      const newNode = document.createElement('b');

      expect(() => parent.insertBefore(newNode, reference)).not.toThrow();
      expect(Array.from(parent.childNodes)).toEqual([existing, newNode]);
    });

    it('preserves normal ordering for a real child reference', () => {
      const parent = document.createElement('div');
      const existing = document.createElement('span');
      parent.appendChild(existing);
      const newNode = document.createElement('b');

      parent.insertBefore(newNode, existing);

      expect(Array.from(parent.childNodes)).toEqual([newNode, existing]);
    });

    it('appends to the end when reference is null (native contract)', () => {
      const parent = document.createElement('div');
      const first = document.createElement('span');
      parent.appendChild(first);
      const newNode = document.createElement('b');

      parent.insertBefore(newNode, null);

      expect(Array.from(parent.childNodes)).toEqual([first, newNode]);
    });
  });

  describe('removeChild', () => {
    it('natively throws when the child was already re-parented', () => {
      const parent = document.createElement('div');
      const fontWrapper = document.createElement('font');
      const orphan = document.createElement('span');
      fontWrapper.appendChild(orphan);

      expect(() => nativeRemoveChild.call(parent, orphan)).toThrow();
    });

    it('skips silently when the child was already re-parented', () => {
      const parent = document.createElement('div');
      const fontWrapper = document.createElement('font');
      const orphan = document.createElement('span');
      fontWrapper.appendChild(orphan);

      expect(() => parent.removeChild(orphan)).not.toThrow();
      expect(orphan.parentNode).toBe(fontWrapper);
    });

    it('still removes a real child', () => {
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);

      parent.removeChild(child);

      expect(parent.childNodes.length).toBe(0);
    });
  });
});
