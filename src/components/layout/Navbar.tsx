"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard, Briefcase, KanbanSquare, User as UserIcon,
  Bell, RefreshCw, Settings, LogOut, ChevronDown, Sparkles, Linkedin, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import type { User } from "@supabase/supabase-js";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/ats-checker", label: "ATS Check", icon: FileText },
  { href: "/profile", label: "Profile", icon: UserIcon },
];

interface Props {
  user: User;
  profile: { full_name: string | null; avatar_url: string | null; email: string } | null;
}

export default function Navbar({ user, profile }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { unreadCount, isFetchingJobs, setIsFetchingJobs, notifications, setNotifications, markNotificationsRead } = useAppStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        if (data.notifications) setNotifications(data.notifications, data.unreadCount ?? 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-menu]")) {
        setShowMenu(false);
        setShowNotifications(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleRefreshJobs = async () => {
    if (isFetchingJobs) return;
    setIsFetchingJobs(true);
    const toastId = toast.loading("Fetching latest jobs…");
    try {
      const res = await fetch("/api/jobs/fetch", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success(`Found ${data.jobsFound} jobs, ${data.scored ?? 0} scored`, { id: toastId, duration: 5000 });
        window.dispatchEvent(new CustomEvent("jobs-refreshed"));
      } else {
        const detail = data.details?.map((e: { service: string; message: string }) => `${e.service}: ${e.message}`).join(" | ");
        toast.error(detail || data.error || "Failed to fetch jobs", { id: toastId, duration: 8000 });
      }
    } catch (err) {
      toast.error(`Failed to connect: ${err instanceof Error ? err.message : "unknown"}`, { id: toastId, duration: 8000 });
    } finally {
      setIsFetchingJobs(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.push("/login");
    router.refresh();
  };

  const handleMarkAllRead = async () => {
    markNotificationsRead();
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
  };

  const displayName = profile?.full_name || user.email?.split("@")[0] || "User";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <nav className="sticky top-0 z-50 h-16 border-b border-signal-cyan/10 bg-signal-bg/90 backdrop-blur-xl">
      <div className="flex h-full w-full items-center justify-between px-4 md:px-8">

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="radar-icon h-8 w-8 rounded-full bg-signal-surface flex items-center justify-center">
            <div className="h-3 w-3 rounded-full bg-signal-cyan shadow-[0_0_8px_rgba(13,148,136,0.8)]" />
          </div>
          <span className="font-bold text-lg gradient-text hidden sm:block">JobRadar</span>
        </Link>

        {/* Center nav links in a floating pill */}
        <div className="hidden md:flex items-center bg-signal-surface/60 backdrop-blur-sm rounded-full px-2 py-1 border border-white/[0.06]">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                  active
                    ? "bg-signal-cyan/10 text-signal-cyan"
                    : "text-gray-400 hover:text-gray-100"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>

        {/* Mobile nav links (icon-only) */}
        <div className="flex md:hidden items-center gap-0.5">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full transition-all",
                  active
                    ? "bg-signal-cyan/10 text-signal-cyan"
                    : "text-gray-400 hover:text-gray-100"
                )}
              >
                <Icon className="h-4 w-4" />
              </Link>
            );
          })}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-1.5">

          {/* Refresh button — icon only with teal border */}
          <button
            onClick={handleRefreshJobs}
            disabled={isFetchingJobs}
            aria-label="Refresh jobs"
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full border border-signal-cyan/30 text-signal-cyan transition-all hover:bg-signal-cyan/10 hover:shadow-[0_0_12px_rgba(13,148,136,0.3)]",
              isFetchingJobs && "opacity-50 cursor-not-allowed"
            )}
          >
            <RefreshCw className={cn("h-4 w-4", isFetchingJobs && "animate-spin")} />
          </button>

          {/* Notifications */}
          <div className="relative" data-menu>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              aria-label="Notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:text-gray-200 hover:bg-white/[0.06] transition-all"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-signal-cyan text-[10px] font-bold text-signal-bg">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-white/[0.08] bg-signal-surface shadow-signal-lg animate-fade-in">
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
                    <div className="px-4 py-8 text-center text-sm text-gray-500">No notifications yet</div>
                  ) : (
                    notifications.slice(0, 10).map((n) => (
                      <div key={n.id} className={cn("flex gap-3 border-b border-white/[0.04] px-4 py-3 last:border-0", !n.read && "bg-signal-cyan/5")}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-200">{n.title}</p>
                          <p className="mt-0.5 text-xs text-gray-500 truncate">{n.message}</p>
                        </div>
                        {!n.read && <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-signal-cyan" />}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative" data-menu>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-signal-surface/80 px-2 py-1.5 hover:border-signal-cyan/20 hover:bg-signal-surface transition-all"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-6 w-6 rounded-full" />
              ) : (
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-signal-cyan to-signal-violet flex items-center justify-center text-[10px] font-bold text-white">
                  {initials}
                </div>
              )}
              <ChevronDown className="h-3 w-3 text-gray-500" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-white/[0.08] bg-signal-surface shadow-signal-lg animate-fade-in">
                <div className="border-b border-white/[0.06] px-4 py-3">
                  <p className="text-sm font-medium text-gray-200 truncate">{displayName}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
                <div className="p-1">
                  {[
                    { href: "/settings/ai", label: "AI Settings", icon: Sparkles },
                    { href: "/linkedin-analyzer", label: "LinkedIn Analyzer", icon: Linkedin },
                    { href: "/settings/account", label: "Account", icon: Settings },
                  ].map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setShowMenu(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-400 hover:text-gray-200 hover:bg-white/[0.05] transition-all"
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Link>
                  ))}
                </div>
                <div className="border-t border-white/[0.06] p-1">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
