"use client";
import { useRef, useState } from "react";
import { Copy, Check } from "lucide-react";
export default function CodeBlock({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLPreElement>(null);
  const [state, setState] = useState("");
  return (
    <div className="code-block">
      <button
        type="button"
        className="secondary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(ref.current?.textContent || "");
            setState("Copied");
          } catch {
            setState("Copy failed — select the code manually");
          }
        }}
        aria-label="Copy code"
      >
        {state === "Copied" ? <Check size={14} /> : <Copy size={14} />}{" "}
        {state === "Copied" ? "Copied" : "Copy code"}
      </button>
      <pre ref={ref}>{children}</pre>
      <span className="sr-only" role="status">
        {state}
      </span>
    </div>
  );
}
