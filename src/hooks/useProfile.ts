"use client";
import { useCallback, useEffect, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import type { ParsedProfile } from "@/types";

interface UseProfileReturn {
  profile: ParsedProfile | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateProfile: (updates: Partial<ParsedProfile>) => Promise<boolean>;
}

export function useProfile(): UseProfileReturn {
  const { profile, setProfile } = useAppStore();
  const [isLoading, setIsLoading] = useState(!profile);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/resume");
      if (!res.ok) throw new Error("Failed to load profile");
      const data = await res.json();
      setProfile(data.profile ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  }, [setProfile]);

  useEffect(() => {
    if (!profile) fetchProfile();
    else setIsLoading(false);
  }, []);

  const updateProfile = useCallback(
    async (updates: Partial<ParsedProfile>): Promise<boolean> => {
      try {
        const res = await fetch("/api/resume", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        if (!res.ok) return false;
        const data = await res.json();
        if (data.profile) setProfile(data.profile);
        return true;
      } catch {
        return false;
      }
    },
    [setProfile]
  );

  return { profile, isLoading, error, refetch: fetchProfile, updateProfile };
}
