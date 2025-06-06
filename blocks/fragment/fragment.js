/* eslint-disable import/no-cycle */
/*
 * Fragment Block
 * Include content on a page as a fragment.
 * https://www.aem.live/developer/block-collection/fragment
 */

import { decorateMain } from '../../scripts/scripts.js';
import { getRootPath } from '../../scripts/configs.js';
import {
  loadSections,
} from '../../scripts/aem.js';

/**
 * Loads a fragment.
 * @param {string} path The path to the fragment
 * @returns {Promise<HTMLElement>} The root element of the fragment
 */
export async function loadFragment(path) {
  if (path && path.startsWith('/')) {
    const root = getRootPath().replace(/\/$/, '');
    const url = `${root}${path}.plain.html`;
    const resp = await fetch(url);
    if (resp.ok) {
      const main = document.createElement('main');
      main.innerHTML = await resp.text();

      if (path === '/nav') {
        const divs = main.querySelectorAll('div');

        if (divs.length >= 3) {
          const secondDiv = divs[1];
          secondDiv.innerHTML = '<ul><li><p><a href="https://healthyplanetcanada.local/vitamins-supplements.html" title="Vitamins &amp; Supplements">Vitamins &amp; Supplements</a></p><ul><li><p><a href="https://healthyplanetcanada.local/vitamins-supplements/supplements.html" title="Supplements">Supplements</a></p><ul><li><p><a href="https://healthyplanetcanada.local/vitamins-supplements/supplements/antioxidant.html" title="Antioxidants">Antioxidants</a></p></li></ul></li><li><p><a href="https://healthyplanetcanada.local/vitamins-supplements/vitamins.html" title="Vitamins (A-K)">Vitamins (A-K)</a></p><ul><li><p><a href="https://healthyplanetcanada.local/vitamins-supplements/vitamins/vitamin-a.html" title="Vitamin A">Vitamin A</a></p></li></ul></li></ul></li></ul>';
        }
      }
      // reset base path for media to fragment base
      const resetAttributeBase = (tag, attr) => {
        main.querySelectorAll(`${tag}[${attr}^="./media_"]`).forEach((elem) => {
          elem[attr] = new URL(elem.getAttribute(attr), new URL(path, window.location)).href;
        });
      };
      resetAttributeBase('img', 'src');
      resetAttributeBase('source', 'srcset');

      decorateMain(main);
      await loadSections(main);
      return main;
    }
  }
  return null;
}

export default async function decorate(block) {
  const link = block.querySelector('a');
  const path = link ? link.getAttribute('href') : block.textContent.trim();
  const fragment = await loadFragment(path);
  if (fragment) {
    const fragmentSection = fragment.querySelector(':scope .section');
    if (fragmentSection) {
      block.closest('.section').classList.add(...fragmentSection.classList);
      block.closest('.fragment').replaceWith(...fragment.childNodes);
    }
  }
}
