"use client";

import { useEffect } from "react";

/**
 * Injects raw HTML snippets (script tags, meta tags, etc.) into <head>.
 * Runs once on mount. Content comes from admin-managed head_scripts table.
 */
export function HeadScriptsLoader({ scripts }: { scripts: string[] }) {
  useEffect(() => {
    for (const html of scripts) {
      const container = document.createElement("div");
      container.innerHTML = html;

      // Move each parsed node into <head>
      while (container.firstChild) {
        const node = container.firstChild;

        // Script elements inserted via innerHTML don't execute.
        // We must recreate them for the browser to run them.
        if (node instanceof HTMLScriptElement) {
          const script = document.createElement("script");
          for (const attr of node.attributes) {
            script.setAttribute(attr.name, attr.value);
          }
          if (node.textContent) script.textContent = node.textContent;
          document.head.appendChild(script);
          container.removeChild(node);
        } else {
          document.head.appendChild(node);
        }
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
