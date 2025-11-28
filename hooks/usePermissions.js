"use client";

import { useEffect, useState, useCallback, useRef } from "react";

const READ_LEVELS = new Set(["read", "full"]);
const DEFAULT_REFRESH_INTERVAL = 15000; // 15 seconds
const BROADCAST_CHANNEL = "permissions-updates";

export function usePermissions(refreshInterval = DEFAULT_REFRESH_INTERVAL) {
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);
  const channelRef = useRef(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (channelRef.current) {
        channelRef.current.close();
      }
    };
  }, []);

  const fetchPermissions = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) setLoading(true);
        const res = await fetch("/api/permissions", {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error("Failed to fetch permissions");
        }
        const data = await res.json();
        if (!isMountedRef.current) return;
        const map = data?.permissions?.permissions || data?.permissions || {};
        setPermissions(map);
        setError(null);
      } catch (err) {
        if (!isMountedRef.current) return;
        console.error("Permissions fetch error:", err);
        setPermissions(null);
        setError(err.message || "Failed to load permissions");
      } finally {
        if (!silent && isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let intervalId;
    if (refreshInterval && refreshInterval > 0) {
      intervalId = setInterval(() => {
        fetchPermissions({ silent: true });
      }, refreshInterval);
    }

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchPermissions({ silent: true });
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    channelRef.current = new BroadcastChannel(BROADCAST_CHANNEL);
    channelRef.current.onmessage = (event) => {
      if (event?.data === "permissions:refresh") {
        fetchPermissions({ silent: true });
      }
    };

    return () => {
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (channelRef.current) {
        channelRef.current.close();
        channelRef.current = null;
      }
    };
  }, [fetchPermissions, refreshInterval]);

  const getLevel = (resource) => {
    if (!resource) return "none";
    return permissions?.[resource] || "none";
  };

  const canRead = (resource) => READ_LEVELS.has(getLevel(resource));
  const canWrite = (resource) => getLevel(resource) === "full";

  const refreshPermissions = () => fetchPermissions();

  return {
    permissions,
    loading,
    error,
    canRead,
    canWrite,
    getLevel,
    refreshPermissions,
  };
}
