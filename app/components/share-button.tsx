"use client";

import { Check } from "lucide-react";
import { useState } from "react";

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, url: window.location.href });
        return;
      }

      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      const wasCanceled = error instanceof Error && (
        error.name === "AbortError" || error.message.toLowerCase().includes("cancel")
      );

      if (!wasCanceled) {
        setErrorMessage("Sharing was unavailable. Copy the address from your browser instead.");
      }
    }
  };

  return (
    <>
      <button type="button" className="share-button" onClick={() => void share()}>{copied && <Check size={16} />}{copied ? "Copied" : "Share"}</button>
      <span className="sr-only" role="status" aria-live="polite">{copied ? "Article link copied." : errorMessage}</span>
    </>
  );
}
