"use client";

import React from 'react';
import Swal from 'sweetalert2';

export default function FTWModal({ show, transmittal, onClose, onConfirm }) {
  if (!show || !transmittal) return null;

  const name = transmittal.applicantName || 'this applicant';

  const handleConfirm = async () => {
    // Validation: ensure required fields are filled before moving to FTW
    const missing = [];
    const truthy = (v) => {
      if (v === true || v === 1) return true;
      if (typeof v === 'string') return v.trim().length > 0;
      return false;
    };

    if (!transmittal.findings || String(transmittal.findings).trim() === '') missing.push('Findings');
    if (!transmittal.clinic || String(transmittal.clinic).trim() === '') missing.push('Clinic');
    if (!transmittal.clinicRemarks || String(transmittal.clinicRemarks).trim() === '') missing.push('Clinic Remarks');
    if (!transmittal.remarks || String(transmittal.remarks).trim() === '') missing.push('Remarks');
    // Waiver is not required at this FTW step (pending table doesn't include it)

    if (missing.length > 0) {
      Swal.fire('Missing required fields', `Please fill: ${missing.join(', ')} before marking FTW.`, 'warning');
      return;
    }

    try {
      await onConfirm(transmittal._id, { status: 'encode', findings: 'FTW' });
      Swal.fire('Marked!', `${name} moved to FTW.`, 'success');
      onClose();
    } catch (err) {
      Swal.fire('Error', err?.message || 'Failed to update', 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Mark as FTW</h3>
          <button onClick={onClose} className="text-gray-500">Close</button>
        </div>

        <div className="space-y-3 text-sm text-gray-800">
          <div><strong>Applicant:</strong> {name}</div>
          <div><strong>Findings:</strong> {transmittal.findings || '—'}</div>
          <div><strong>Clinic:</strong> {transmittal.clinic || '—'}</div>
          <div><strong>Remarks:</strong> {transmittal.remarks || '—'}</div>
        </div>

        <div className="flex justify-end mt-6 space-x-3">
          <button onClick={onClose} className="px-3 py-2 bg-gray-200 rounded">Cancel</button>
          <button onClick={handleConfirm} className="px-3 py-2 bg-[#0d8c40] text-white rounded">Confirm FTW</button>
        </div>
      </div>
    </div>
  );
}
