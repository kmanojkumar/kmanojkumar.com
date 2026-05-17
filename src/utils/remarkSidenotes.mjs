/**
 * remark-sidenotes — Pandoc-style inline footnotes that render as marginalia.
 *
 * Syntax in markdown:
 *   The Harness AI report^[Harness, *State of AI 2025*, [harness.io](https://harness.io)]
 *   confirms ...
 *
 * Why this is not a one-line regex:
 *   By the time remark hands us the AST, inline markdown inside the brackets
 *   (`*emphasis*`, `[link](url)`) has already been parsed into sibling
 *   `emphasis` / `link` nodes. The `^[` and `]` characters end up in different
 *   text nodes. So we walk paragraph children looking for `^[` in a text
 *   child, then scan forward across siblings (text, emphasis, link, anything)
 *   until we find a text sibling that contains `]`. Everything between
 *   becomes the sidenote's inner AST — nested markdown survives intact.
 *
 * Output for `paragraph: "X^[content with *em* and [link](url)]Y"`:
 *   paragraph
 *     text: "X"
 *     html: <sup class="sidenote-ref" id="snref-N"><a href="#sn-N">N</a></sup>
 *           <span class="sidenote" id="sn-N">
 *             <sup class="sidenote-num">N</sup>
 *     text/emphasis/link: …content nodes…
 *     html: </span>
 *     text: "Y"
 *
 * Plugin order: register AFTER remark-math (so `$…$` is consumed first) and
 * BEFORE remark-lazy-load-images (which only touches image nodes).
 */
import { visit } from "unist-util-visit";

export function remarkSidenotes() {
  return tree => {
    let counter = 0;

    visit(tree, "paragraph", paragraph => {
      let i = 0;
      while (i < paragraph.children.length) {
        const child = paragraph.children[i];

        // Look for the opening `^[` marker. Must be in a text node.
        if (child.type !== "text" || !child.value.includes("^[")) {
          i += 1;
          continue;
        }

        const startIdx = child.value.indexOf("^[");
        const before = child.value.slice(0, startIdx);
        const afterOpen = child.value.slice(startIdx + 2);

        // Try to find `]` in the same text node first (simple case).
        const closeSame = afterOpen.indexOf("]");

        let endChildIdx;
        let trailingText;
        const innerNodes = [];

        if (closeSame !== -1) {
          // `^[...]` fits inside a single text node.
          endChildIdx = i;
          const innerText = afterOpen.slice(0, closeSame);
          if (innerText) innerNodes.push({ type: "text", value: innerText });
          trailingText = afterOpen.slice(closeSame + 1);
        } else {
          // `]` lives in a later sibling. Scan forward.
          if (afterOpen) innerNodes.push({ type: "text", value: afterOpen });

          let j = i + 1;
          let found = false;
          while (j < paragraph.children.length) {
            const sib = paragraph.children[j];
            if (sib.type === "text" && sib.value.includes("]")) {
              const idx = sib.value.indexOf("]");
              const pre = sib.value.slice(0, idx);
              if (pre) innerNodes.push({ type: "text", value: pre });
              trailingText = sib.value.slice(idx + 1);
              endChildIdx = j;
              found = true;
              break;
            }
            innerNodes.push(sib);
            j += 1;
          }

          if (!found) {
            // Unbalanced `^[` with no closing `]`. Skip it and move on.
            i += 1;
            continue;
          }
        }

        counter += 1;
        const id = counter;

        const openHtml =
          `<sup class="sidenote-ref" id="snref-${id}">` +
          `<a href="#sn-${id}">${id}</a>` +
          `</sup>` +
          `<span class="sidenote" id="sn-${id}">` +
          `<sup class="sidenote-num">${id}</sup> `;
        const closeHtml = `</span>`;

        const replacements = [];
        if (before) replacements.push({ type: "text", value: before });
        replacements.push({ type: "html", value: openHtml });
        replacements.push(...innerNodes);
        replacements.push({ type: "html", value: closeHtml });
        if (trailingText) {
          replacements.push({ type: "text", value: trailingText });
        }

        const removeCount = endChildIdx - i + 1;
        paragraph.children.splice(i, removeCount, ...replacements);

        // Advance past the inserted nodes — but if we tacked on a trailing
        // text node, leave i pointing AT it so the next iteration re-scans
        // it (it may contain another `^[` further along the same paragraph).
        i += replacements.length - (trailingText ? 1 : 0);
      }
    });
  };
}
