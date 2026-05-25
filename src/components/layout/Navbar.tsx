"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  KanbanSquare,
  User,
  Bell,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import toast from "react-hot-toast";

const navLinks = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/profile", label: "Profile", icon: User },
];

export default function Navbar() {
  const pathname = usePathname();
  const { unreadCount, isFetchingJobs, setIsFetchingJobs } = useAppStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const { notifications, markNotificationsRead, setNotifications } = useAppStore();

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        if (data.notifications) {
          setNotifications(data.notifications, data.unreadCount ?? 0);
        }
      })
      .catch(() => {});
  }, []);

  const handleRefreshJobs = async () => {
    if (isFetchingJobs) return;
    setIsFetchingJobs(true);
    const toastId = toast.loading("Fetching latest jobs…");
    try {
      const res = await fetch("/api/jobs/fetch", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success(`Found ${data.jobsFound} jobs, ${data.scored} scored`, { id: toastId });
        window.dispatchEvent(new CustomEvent("jobs-refreshed"));
      } else {
        toast.error(data.error || "Failed to fetch jobs", { id: toastId });
      }
    } catch {
      toast.error("Failed to connect to server", { id: toastId });
    } finally {
      setIsFetchingJobs(false);
    }
  };

  const handleMarkAllRead = async () => {
    markNotificationsRead();
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-white/[0.06] bg-signal-bg/90 backdrop-blur-xl">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 md:px-6">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="radar-icon h-8 w-8 rounded-full bg-signal-surface flex items-center justify-center">
            <div className="h-3 w-3 rounded-full bg-signal-cyan shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          </div>
          <span className="font-bold text-lg tracking-tight gradient-text hidden sm:block">
            JobRadar
          </span>
        </Link>

        {/* Nav Links */}
        <div className="flex items-center gap-1">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-signal-cyan/10 text-signal-cyan"
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.05]"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden md:block">{label}</span>
              </Link>
            );
          })}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Refresh Jobs Button */}
          <button
            onClick={handleRefreshJobs}
            disabled={isFetchingJobs}
            className={cn(
              "flex items-center gap-2 rounded-lg border border-white/[0.08] bg-signal-surface px-3 py-2 text-sm font-medium text-gray-300 transition-all hover:border-signal-cyan/30 hover:text-signal-cyan",
              isFetchingJobs && "opacity-50 cursor-not-allowed"
            )}
          >
            <RefreshCw className={cn("h-4 w-4", isFetchingJobs && "animate-spin")} />
            <span className="hidden sm:block">Refresh</span>
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-signal-surface text-gray-400 hover:text-gray-200 hover:border-signal-cyan/30 transition-all"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-signal-cyan text-[10px] font-bold text-signal-bg">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border border-white/[0.08] bg-signal-surface shadow-signal-lg animate-fade-in">
                <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                  <span className="text-sm font-semibold text-gray-200">Notifications</span>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="text-xs text-signal-cyan hover:underline">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-gray-500">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((n) => (
                      <div
                        key={n.id}
                        className={cn(
                          "flex gap-3 border-b border-white/[0.04] px-4 py-3 last:border-0",
                          !n.read && "bg-signal-cyan/5"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-200">{n.title}</p>
                          <p className="mt-0.5 text-xs text-gray-500 truncate">{n.message}</p>
                        </div>
                        {!n.read && (
                          <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-signal-cyan" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
