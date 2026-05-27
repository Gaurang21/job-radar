import { create } from "zustand";
import type { Job, PipelineItem, Notification, ApiStatus, JobFilters, JobSortBy, ParsedProfile } from "@/types";

interface AppState {
  profile: ParsedProfile | null;
  setProfile: (profile: ParsedProfile | null) => void;

  jobs: Job[];
  totalJobs: number;
  currentPage: number;
  totalPages: number;
  isLoadingJobs: boolean;
  setJobs: (jobs: Job[], total: number, page: number, totalPages: number) => void;
  updateJob: (id: string, updates: Partial<Job>) => void;
  setLoadingJobs: (loading: boolean) => void;

  filters: JobFilters;
  sortBy: JobSortBy;
  setFilters: (filters: Partial<JobFilters>) => void;
  setSortBy: (sort: JobSortBy) => void;
  resetFilters: () => void;

  pipelineItems: PipelineItem[];
  setPipelineItems: (items: PipelineItem[]) => void;
  updatePipelineItem: (id: string, updates: Partial<PipelineItem>) => void;
  addPipelineItem: (item: PipelineItem) => void;
  removePipelineItem: (id: string) => void;

  notifications: Notification[];
  unreadCount: number;
  setNotifications: (notifications: Notification[], unreadCount: number) => void;
  markNotificationsRead: (ids?: string[]) => void;

  apiStatus: ApiStatus | null;
  setApiStatus: (status: ApiStatus) => void;

  selectedJobId: string | null;
  setSelectedJobId: (id: string | null) => void;
  isFetchingJobs: boolean;
  setIsFetchingJobs: (loading: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),

  jobs: [],
  totalJobs: 0,
  currentPage: 1,
  totalPages: 1,
  isLoadingJobs: false,
  setJobs: (jobs, total, page, totalPages) => set({ jobs, totalJobs: total, currentPage: page, totalPages }),
  updateJob: (id, updates) => set((state) => ({ jobs: state.jobs.map((j) => (j.id === id ? { ...j, ...updates } : j)) })),
  setLoadingJobs: (loading) => set({ isLoadingJobs: loading }),

  filters: {},
  sortBy: "score",
  setFilters: (newFilters) => set((state) => ({ filters: { ...state.filters, ...newFilters } })),
  setSortBy: (sortBy) => set({ sortBy }),
  resetFilters: () => set({ filters: {} }),

  pipelineItems: [],
  setPipelineItems: (items) => set({ pipelineItems: items }),
  updatePipelineItem: (id, updates) => set((state) => ({
    pipelineItems: state.pipelineItems.map((item) => (item.id === id ? { ...item, ...updates } : item)),
  })),
  addPipelineItem: (item) => set((state) => ({
    pipelineItems: [...state.pipelineItems.filter((i) => i.id !== item.id), item],
  })),
  removePipelineItem: (id) => set((state) => ({
    pipelineItems: state.pipelineItems.filter((item) => item.id !== id),
  })),

  notifications: [],
  unreadCount: 0,
  setNotifications: (notifications, unreadCount) => set({ notifications, unreadCount }),
  markNotificationsRead: (ids) => set((state) => ({
    notifications: state.notifications.map((n) => (!ids || ids.includes(n.id) ? { ...n, read: true } : n)),
    unreadCount: ids ? Math.max(0, state.unreadCount - ids.filter((id) => state.notifications.find((n) => n.id === id && !n.read)).length) : 0,
  })),

  apiStatus: null,
  setApiStatus: (status) => set({ apiStatus: status }),

  selectedJobId: null,
  setSelectedJobId: (id) => set({ selectedJobId: id }),
  isFetchingJobs: false,
  setIsFetchingJobs: (loading) => set({ isFetchingJobs: loading }),
}));
