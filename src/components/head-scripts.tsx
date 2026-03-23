"use client";

import { useEffect, useState } from "react";

import { COOKIE_CONSENT_EVENT, getCookieConsent } from "@/lib/cookie-consent";

type HeadScript = {
  id: string;
  label: string;
  content: string;
  consent_category: "essential" | "functional" | "analytics";
};

/**
 * Injects raw HTML snippets (script tags, meta tags, etc.) into <head>.
 * Runs once on mount. Content comes from admin-managed head_scripts table.
 */
export function HeadScriptsLoader({ scripts }: { scripts: HeadScript[] }) {
  const [consentVersion, setConsentVersion] = useState(0);

  useEffect(() => {
    const cleanupByScriptId = new Map<string, Node[]>();
    const consent = getCookieConsent();

    for (const scriptItem of scripts) {
      const shouldInject =
        scriptItem.consent_category === "essential" ||
        (scriptItem.consent_category === "functional" && consent?.functional) ||
        (scriptItem.consent_category === "analytics" && consent?.analytics);

      if (!shouldInject) continue;

      const html = scriptItem.content;
      const container = document.createElement("div");
      container.innerHTML = html;
      const createdNodes: Node[] = [];

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
          script.dataset.pododeskManagedScript = scriptItem.id;
          document.head.appendChild(script);
          createdNodes.push(script);
          container.removeChild(node);
        } else {
          if (node instanceof HTMLElement) {
            node.dataset.pododeskManagedScript = scriptItem.id;
          }
          document.head.appendChild(node);
          createdNodes.push(node);
        }
      }

      cleanupByScriptId.set(scriptItem.id, createdNodes);
    }

    return () => {
      for (const nodes of cleanupByScriptId.values()) {
        for (const node of nodes) {
          node.parentNode?.removeChild(node);
        }
      }
    };
  }, [scripts, consentVersion]);

  useEffect(() => {
    const handleConsentChange = () =>
      setConsentVersion((current) => current + 1);
    window.addEventListener(COOKIE_CONSENT_EVENT, handleConsentChange);
    return () =>
      window.removeEventListener(COOKIE_CONSENT_EVENT, handleConsentChange);
  }, []);

  return null;
}
