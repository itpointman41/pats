"use client";

import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';

export default function PassportStatusModal({ show, transmittal, onClose, onSave }) {
  const [naNo, setNaNo] = useState('');
  const [applicantName, setApplicantName] = useState('');
  const [passportNos, setPassportNos] = useState('');
  const [passportExpiry, setPassportExpiry] = useState('');
  const [depositDate, setDepositDate] = useState('');
  const [withdrawalDate, setWithdrawalDate] = useState('');
  const [withdrawalReason, setWithdrawalReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!show || !transmittal) return;
    // Prefer passport collection fields when available (transmittal.passport)
    const src = transmittal.passport || transmittal;
    setNaNo(src.naNo || null || '');
    setApplicantName(src.applicantName || (transmittal.applicant && transmittal.applicant.name) || '');
    setPassportNos(src.passportNos || '');
    setPassportExpiry(src.passportExpiry ? new Date(src.passportExpiry).toISOString().slice(0,10) : '');
    setDepositDate(src.depositDate ? new Date(src.depositDate).toISOString().slice(0,10) : '');
    setWithdrawalDate(src.withdrawalDate ? new Date(src.withdrawalDate).toISOString().slice(0,10) : '');
    setWithdrawalReason(src.withdrawalReason || '');
    setRemarks(src.remarks || '');
  }, [show, transmittal]);

  if (!show || !transmittal) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Save passport record to passports collection (upsert by applicantId)

      const applicantId = transmittal.applicantId || (transmittal.applicant && transmittal.applicant._id) || null;
      // Log applicantId for debugging
      console.log('PassportStatusModal: applicantId to save:', applicantId);
      // Validate applicantId is a valid MongoDB ObjectId (24 hex chars)
      if (!applicantId || typeof applicantId !== 'string' || !/^[a-fA-F0-9]{24}$/.test(applicantId)) {
        Swal.fire('Error', 'Invalid applicantId: ' + applicantId + '\nCannot save passport record.', 'error');
        setSaving(false);
        return;
      }

      const body = {
        applicantId: applicantId,
        naNo: naNo || null,
        applicantName: applicantName || null,
        passportNos: passportNos || null,
        passportExpiry: passportExpiry ? new Date(passportExpiry).toISOString() : null,
        depositDate: depositDate ? new Date(depositDate).toISOString() : null,
        withdrawalDate: withdrawalDate ? new Date(withdrawalDate).toISOString() : null,
        withdrawalReason: withdrawalReason || null,
        remarks: remarks || null,
        transmittalId: transmittal._id || null
      };

      const res = await fetch('/api/admin/passports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      // handle non-JSON or error responses safely
      if (!res.ok) {
        const text = await res.text().catch(() => null);
        console.error('Passports API error response', res.status, text);
        throw new Error(text || `Request failed (${res.status})`);
      }

      // parse JSON only after checking OK
      const data = await res.json().catch(async (err) => {
        const text = await res.text().catch(() => null);
        console.error('Failed to parse passports API JSON', err, text);
        throw err;
      });

      onSave && onSave();
      onClose && onClose();
    } catch (err) {
      console.error('Save error', err);
      Swal.fire('Error', err?.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4">
      <div className="w-full max-w-2xl">
        <form onSubmit={handleSave} className="bg-white rounded-lg p-4 sm:p-6 w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold">Edit Passport Status</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">NA No.</label>
              <input type="text" value={naNo} onChange={(e) => setNaNo(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded" />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Name</label>
              <input type="text" value={applicantName} onChange={(e) => setApplicantName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded" disabled />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">PPT No.</label>
              <input type="text" value={passportNos} onChange={(e) => setPassportNos(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded" />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Expiry Date</label>
              <input type="date" value={passportExpiry} onChange={(e) => setPassportExpiry(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded" />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Deposit Date</label>
              <input type="date" value={depositDate} onChange={(e) => setDepositDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded" />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Withdrawal Date</label>
              <input type="date" value={withdrawalDate} onChange={(e) => setWithdrawalDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded" />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm text-gray-700 mb-1">Reason for Withdrawal</label>
              <input type="text" value={withdrawalReason} onChange={(e) => setWithdrawalReason(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded" />
            </div>

            {/* Position field removed — not required for this modal */}

            {/* R.O. removed from this modal */}

            <div className="sm:col-span-2">
              <label className="block text-sm text-gray-700 mb-1">Remarks</label>
              <textarea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded" />
            </div>
          </div>

          <div className="flex justify-end mt-4 space-x-3 sticky bottom-0 bg-white/0 pt-4">
            <button type="button" onClick={onClose} className="px-3 py-2 border rounded">Cancel</button>
            <button type="submit" className="px-3 py-2 bg-[#0d8c40] text-white rounded" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
