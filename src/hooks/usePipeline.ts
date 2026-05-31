"use client";
import { useCallback, useEffect, useState } from "react";
import type { PipelineItem, PipelineStage } from "@/types";

interface UsePipelineReturn {
  items: PipelineItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  moveItem: (itemId: string, stage: PipelineStage) => Promise<boolean>;
  removeItem: (itemId: string) => Promise<boolean>;
  addItem: (jobId: string, stage?: PipelineStage) => Promise<PipelineItem | null>;
  updateNotes: (itemId: string, notes: string) => Promise<boolean>;
}

export function usePipeline(): UsePipelineReturn {
  const [items, setItems] = useState<PipelineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPipeline = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pipeline");
      if (!res.ok) throw new Error("Failed to load pipeline");
      const data = await res.json();
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pipeline");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  const moveItem = useCallback(async (itemId: string, stage: PipelineStage): Promise<boolean> => {
    // Optimistic update
    setItems((prev) => prev.map((it) => it.id === itemId ? { ...it, stage } : it));
    try {
      const res = await fetch(`/api/pipeline/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      if (!res.ok) {
        // Revert on failure
        await fetchPipeline();
        return false;
      }
      return true;
    } catch {
      await fetchPipeline();
      return false;
    }
  }, [fetchPipeline]);

  const removeItem = useCallback(async (itemId: string): Promise<boolean> => {
    setItems((prev) => prev.filter((it) => it.id !== itemId));
    try {
      const res = await fetch(`/api/pipeline/${itemId}`, { method: "DELETE" });
      if (!res.ok) { await fetchPipeline(); return false; }
      return true;
    } catch {
      await fetchPipeline();
      return false;
    }
  }, [fetchPipeline]);

  const addItem = useCallback(async (
    jobId: string,
    stage: PipelineStage = "saved"
  ): Promise<PipelineItem | null> => {
    try {
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, stage }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.item) {
        setItems((prev) => {
          const exists = prev.some((it) => it.id === data.item.id);
          return exists ? prev : [...prev, data.item];
        });
      }
      return data.item ?? null;
    } catch {
      return null;
    }
  }, []);

  const updateNotes = useCallback(async (itemId: string, notes: string): Promise<boolean> => {
    setItems((prev) => prev.map((it) => it.id === itemId ? { ...it, notes } : it));
    try {
      const res = await fetch(`/api/pipeline/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  return { items, isLoading, error, refetch: fetchPipeline, moveItem, removeItem, addItem, updateNotes };
}
