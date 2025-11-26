"use client";

import React from 'react';
import Swal from 'sweetalert2';

export default function ProcessModal({ show, transmittal, onClose, onConfirm }) {
  if (!show || !transmittal) return null;

  const name = transmittal.applicantName || 'this applicant';

  const handleConfirm = async () => {
    // Validation: require transmittal fields are filled before sending to Process
    const missing = [];
    const truthy = (v) => {
      if (v === true || v === 1) return true;
      if (typeof v === 'string') {
        const s = v.toLowerCase().trim();
        return s === 'true' || s === 'yes' || s === '1' || s.length > 0;
      }
      return false;
    };

    // Basic fields
    if (!transmittal.findings || String(transmittal.findings).trim() === '') missing.push('Findings');
    if (!transmittal.clinic || String(transmittal.clinic).trim() === '') missing.push('Clinic');
    if (!transmittal.clinicRemarks || String(transmittal.clinicRemarks).trim() === '') missing.push('Clinic Remarks');
    if (!transmittal.remarks || String(transmittal.remarks).trim() === '') missing.push('Remarks');

    // Process-specific checks — skip these when moving FROM FTW (status === 'encode')
    const fromFTW = String(transmittal.status || '').toLowerCase() === 'encode';
    if (!fromFTW) {
      // Require date uploaded and date of insurance
      if (!transmittal.dateOfEmedUploaded || String(transmittal.dateOfEmedUploaded).trim() === '') missing.push('Date EMed Uploaded');
      if (!transmittal.dateOfInsurance || String(transmittal.dateOfInsurance).trim() === '') missing.push('Date of Insurance');

      // Require biometric and stampVisa to be truthy
      if (!truthy(transmittal.biometric)) missing.push('Biometric');
      if (!truthy(transmittal.stampVisa)) missing.push('Stamp Visa');

      // Waiver: require truthy
      if (!truthy(transmittal.waiver)) missing.push('Waiver');

      // At least one cert (medical or vaccine) must be present
      if (!truthy(transmittal.medicalCert) && !truthy(transmittal.vaccineCert)) missing.push('Medical or Vaccine Certificate (at least one)');
    }

    if (missing.length > 0) {
      Swal.fire('Missing required fields', `Please fill/check: ${missing.join(', ')} before sending to Process.`, 'warning');
      return;
    }

    try {
      await onConfirm(transmittal._id, { status: 'process' });
      Swal.fire('Sent!', `${name} moved to Process.`, 'success');
      onClose();
    } catch (err) {
      Swal.fire('Error', err?.message || 'Failed to update', 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Send to Process</h3>
          <button onClick={onClose} className="text-gray-500">Close</button>
        </div>

        <div className="space-y-3 text-sm text-gray-800">
          <div><strong>Applicant:</strong> {name}</div>
          <div><strong>Findings:</strong> {transmittal.findings || '—'}</div>
          <div><strong>Clinic Remarks:</strong> {transmittal.clinicRemarks || '—'}</div>
          <div><strong>Payment:</strong> {transmittal.payment || '—'}</div>
        </div>

        <div className="flex justify-end mt-6 space-x-3">
          <button onClick={onClose} className="px-3 py-2 bg-gray-200 rounded">Cancel</button>
          <button onClick={handleConfirm} className="px-3 py-2 bg-[#0d8c40] text-white rounded">Confirm Send</button>
        </div>
      </div>
    </div>
  );
}
