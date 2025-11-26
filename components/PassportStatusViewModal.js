"use client";

import React from 'react';

function fmtDateTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString();
  } catch (e) {
    return '—';
  }
}

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString();
  } catch (e) {
    return '—';
  }
}

export default function PassportStatusViewModal({ show, passport, onClose }) {
  if (!show) return null;

  // passport is expected to be the DB doc shape the collection uses
  const p = passport || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Passport Details</h3>
          <div className="flex items-center space-x-2">
            <button onClick={onClose} className="text-sm px-3 py-1 rounded border hover:bg-gray-50">Close</button>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-500">Applicant</div>
            <div className="mt-1 text-sm text-gray-900">{p.applicantName || '—'}</div>
          </div>

          <div>
            <div className="text-xs text-gray-500">Passport Nos.</div>
            <div className="mt-1 text-sm text-gray-900">{p.passportNos || '—'}</div>
          </div>

          <div>
            <div className="text-xs text-gray-500">NA No.</div>
            <div className="mt-1 text-sm text-gray-900">{p.naNo ?? '—'}</div>
          </div>

          <div>
            <div className="text-xs text-gray-500">Passport Expiry</div>
            <div className="mt-1 text-sm text-gray-900">{fmtDate(p.passportExpiry)}</div>
          </div>

          <div>
            <div className="text-xs text-gray-500">Deposit Date</div>
            <div className="mt-1 text-sm text-gray-900">{fmtDate(p.depositDate)}</div>
          </div>

          <div>
            <div className="text-xs text-gray-500">Withdrawal Date</div>
            <div className="mt-1 text-sm text-gray-900">{fmtDate(p.withdrawalDate)}</div>
          </div>

          <div className="sm:col-span-2">
            <div className="text-xs text-gray-500">Reason for Withdrawal</div>
            <div className="mt-1 text-sm text-gray-900">{p.withdrawalReason || '—'}</div>
          </div>

          <div className="sm:col-span-2">
            <div className="text-xs text-gray-500">Remarks</div>
            <div className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{p.remarks || '—'}</div>
          </div>

          <div>
            <div className="text-xs text-gray-500">Created At</div>
            <div className="mt-1 text-sm text-gray-900">{fmtDateTime(p.createdAt)}</div>
          </div>

          <div>
            <div className="text-xs text-gray-500">Updated At</div>
            <div className="mt-1 text-sm text-gray-900">{fmtDateTime(p.updatedAt)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
