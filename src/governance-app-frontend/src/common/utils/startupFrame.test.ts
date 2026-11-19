import { afterEach, describe, expect, it } from 'vitest';

import { removeStartupFrameOnFirstCommit } from './startupFrame';

const flushMutations = () => new Promise((resolve) => setTimeout(resolve));

const setup = () => {
  document.body.innerHTML = '<div id="startup-frame"></div><div id="root"></div>';
  return document.getElementById('root') as HTMLElement;
};

describe('removeStartupFrameOnFirstCommit', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('keeps the frame while the root has no element', async () => {
    const root = setup();
    removeStartupFrameOnFirstCommit(root);

    root.append(document.createTextNode(''));
    await flushMutations();

    expect(document.getElementById('startup-frame')).not.toBeNull();
  });

  it('removes the frame when the root gets an element', async () => {
    const root = setup();
    removeStartupFrameOnFirstCommit(root);

    root.append(document.createElement('div'));
    await flushMutations();

    expect(document.getElementById('startup-frame')).toBeNull();
  });

  it('does nothing if the page has no frame', () => {
    document.body.innerHTML = '<div id="root"></div>';
    const root = document.getElementById('root') as HTMLElement;

    expect(() => removeStartupFrameOnFirstCommit(root)).not.toThrow();
  });
});
