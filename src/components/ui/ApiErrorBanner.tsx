"use client";
import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import type { ApiErrorMessage } from "@/types";

interface Props {
  messages: ApiErrorMessage[];
}

export default function ApiErrorBanner({ messages }: Props) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const visible = messages.filter((m) => !dismissed.includes(m.service));

  if (visible.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {visible.map((msg) => (
        <div
          key={msg.service}
          className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 animate-fade-up"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
          <p className="flex-1 leading-relaxed">{msg.message}</p>
          <button
            onClick={() => setDismissed((d) => [...d, msg.service])}
            className="flex-shrink-0 text-amber-400/60 hover:text-amber-400 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
