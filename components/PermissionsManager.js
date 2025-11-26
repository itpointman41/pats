"use client";

import React, { useEffect, useState } from "react";

const RESOURCES = [
  "applicants",
  "transmittals",
  "passports",
  "users",
  "dashboard",
  "deployment",
  "profile",
  "settings",
];

export default function PermissionsManager({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [permissionsDoc, setPermissionsDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    fetch("/api/admin/users", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.users) setUsers(data.users);
      })
      .catch((err) => console.error("Failed to load users", err));
  }, []);

  useEffect(() => {
    if (!selectedUserId) {
      setPermissionsDoc(null);
      return;
    }

    setLoading(true);

    fetch(`/api/permissions?userId=${selectedUserId}`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        const p =
          data.permissions?.permissions ??
          data.permissions ??
          {};

        setPermissionsDoc(p);
      })
      .catch(() => setPermissionsDoc(null))
      .finally(() => setLoading(false));
  }, [selectedUserId]);

  const setPerm = (key, value) => {
    if (!isAdmin) return; // protect non-admin
    setPermissionsDoc((p) => ({ ...(p || {}), [key]: value }));
  };

  const handleSave = async () => {
    if (!isAdmin) return; // safety
    if (!selectedUserId) return setMessage("Select a user");

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/permissions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId,
          permissions: permissionsDoc || {},
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      setMessage("Permissions saved");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">

      {/* ADMIN CHECK (but still show UI) */}
      {!isAdmin && (
        <div className="card p-4 border border-red-300 text-red-600">
          You are not an administrator — viewing only.
        </div>
      )}

      {/* USER SELECT */}
      <div className="card p-4 flex items-center gap-4">
        <div className="w-1/3">
          <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">
            Select user
          </label>

          <select
            className="input-soft w-full mt-2"
            value={selectedUserId || ""}
            disabled={!isAdmin}
            onChange={(e) => setSelectedUserId(e.target.value || null)}
          >
            <option value="" hidden>-- Select user --</option>
            {users.map((u) => (
              <option key={u._id} value={u._id}>
                {u.username} — {u.role}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 text-sm text-[var(--color-text-muted)]">
          Select a user to view or modify permissions.
        </div>
      </div>

      {/* PERMISSIONS */}
      <div className="card p-6">
        {loading ? (
          <div className="text-[var(--color-text-muted)]">Loading…</div>
        ) : (
          <div>
            <h3 className="text-lg font-semibold">Permissions</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {RESOURCES.map((r) => (
                <div
                  key={r}
                  className="flex items-center justify-between border rounded p-3"
                >
                  <div className="capitalize">{r.replace("_", " ")}</div>

                  <select
                    className="input-soft"
                    disabled={!isAdmin}
                    value={(permissionsDoc && permissionsDoc[r]) || "none"}
                    onChange={(e) => setPerm(r, e.target.value)}
                  >
                    <option value="full">Full</option>
                    <option value="read">Read</option>
                    <option value="none">None</option>
                  </select>
                </div>
              ))}
            </div>

            {/* SAVE BUTTON */}
            <div className="mt-4 flex items-center gap-3">
              <button
                className="btn-primary"
                disabled={!isAdmin || saving}
                onClick={handleSave}
              >
                {saving ? "Saving…" : "Save permissions"}
              </button>

              {message && (
                <div className="text-sm text-[var(--color-text-muted)]">
                  {message}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
