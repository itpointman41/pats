"use client";

import React from 'react';

export default function AccountSettingsClient({ user }) {
  const fullName =
    user.firstName || user.lastName
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
      : user.username;

  return (
    <div>
      <div className="text-center sm:text-left space-y-2">
        <p className="text-xs uppercase tracking-[0.35em] text-[var(--color-text-muted)]">Account</p>
        <h1 className="text-3xl font-semibold text-[var(--color-text)]">Settings</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Manage your profile, security controls, and notifications from a single place.
        </p>
      </div>

      <div className="space-y-8 mt-6">
        <section className={`rounded-3xl bg-white/95 border border-[var(--color-border)] shadow-sm p-6`}>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Profile</h2>
            <p className="text-sm text-[var(--color-text-muted)]">Keep your personal information current.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 mt-4">
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-[0.2em]">Name</label>
              <input defaultValue={fullName} className="input-soft w-full mt-2" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-[0.2em]">Phone</label>
              <input defaultValue={user.phoneNumber || ''} className="input-soft w-full mt-2" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-[0.2em]">Email</label>
              <input defaultValue={user.email || ''} className="input-soft w-full mt-2" />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <button className="btn-primary w-full sm:w-auto">Update name</button>
            <button className="btn-secondary w-full sm:w-auto">Update email / phone</button>
          </div>
        </section>

        <section className={`rounded-3xl bg-white/95 border border-[var(--color-border)] shadow-sm p-6`}>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Security</h2>
            <p className="text-sm text-[var(--color-text-muted)]">Control access and keep your account safe.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 mt-4">
            {[
              { title: 'Change password', text: 'Update your credentials.' },
              { title: 'View active sessions', text: 'Review devices currently signed in.' }
            ].map((cardInfo) => (
              <button
                key={cardInfo.title}
                className="text-left border border-[var(--color-border)] rounded-2xl px-4 py-3 hover:border-[var(--color-secondary)] transition"
              >
                <p className="text-sm font-semibold text-[var(--color-text)]">{cardInfo.title}</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">{cardInfo.text}</p>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
