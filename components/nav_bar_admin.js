"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Applicants", href: "/applicants" },
  { label: "Transmittal", href: "/transmittal" },
  { label: "Deployed", href: "/deployment" },
  { label: "PPT Status", href: "/passport_status" },
  { label: "Users", href: "/users" },
];

export default function NavBarAdmin({ username, role }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isDropdownOpen]);

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: 'include'
      });

      if (response.ok) {
        router.push("/");
      }
    } catch (error) {
      console.error("Logout error:", error);
      router.push("/");
    }
  };

  const handleProfile = () => {
    setIsDropdownOpen(false);
    router.push("/profile");
  };

  const handleSettings = () => {
    setIsDropdownOpen(false);
    router.push("/settings");
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-primary)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-primary)]/85 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-6">
            <a href="/dashboard" className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-[url('/img/logo.png')] bg-cover bg-center flex items-center justify-center">

              </div>
              <div>
                <h1 className="text-lg font-semibold text-[var(--color-text)]">PATS</h1>
                <span className="pill uppercase">{role}</span>
              </div>
            </a>
            <nav className="hidden lg:flex items-center space-x-1">
              {navItems.map((item) => {
                const isActive = pathname?.startsWith(item.href);
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-2 text-sm font-medium rounded-full transition-colors ${isActive
                        ? "bg-[var(--color-secondary)] text-white shadow-sm"
                        : "text-[var(--color-text)] hover:text-[var(--color-secondary)] hover:bg-white/70"
                      }`}
                    style={isActive ? { color: "#ffffff" } : undefined}
                  >
                    {item.label}
                  </a>
                );
              })}
            </nav>
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-3 px-3 py-1.5 rounded-full border border-[var(--color-border)] bg-white/80 shadow-sm hover:shadow transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)] focus:ring-offset-2"
              aria-label="User menu"
            >
              <div className="w-8 h-8 bg-[var(--color-secondary)] rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {username ? username.charAt(0).toUpperCase() : "-"}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium text-[var(--color-text)] leading-tight">{username || "User"}</p>
                <p className="text-xs text-[var(--color-text-muted)] capitalize">{role || "admin"}</p>
              </div>
              <svg
                className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform ${isDropdownOpen ? "rotate-180" : ""
                  }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-3 w-56 card py-2 z-50">
                <div className="px-4 pb-3 border-b border-[var(--color-border)]">
                  <p className="text-sm font-semibold text-[var(--color-text)]">{username}</p>
                  <p className="text-xs text-[var(--color-text-muted)] capitalize">{role}</p>
                </div>
                <button
                  onClick={handleProfile}
                  className="w-full text-left px-4 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--surface-muted)] transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  <span>Profile</span>
                </button>
                <button
                  onClick={handleSettings}
                  className="w-full text-left px-4 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--surface-muted)] transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span>Settings</span>
                </button>
                <div className="border-t border-[var(--color-border)] my-1" />
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

