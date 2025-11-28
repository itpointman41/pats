"use client";

import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { X, FilePlus2 } from 'lucide-react';

export default function PassportStatusModal({
  show,
  record = null,
  mode = 'edit', // 'edit' | 'create'
  applicants = [],
  onClose,
  onSave
}) {
  const [naNo, setNaNo] = useState('');
  const [applicantName, setApplicantName] = useState('');
  const [applicantId, setApplicantId] = useState('');
  const [applicantQuery, setApplicantQuery] = useState('');
  const [showApplicantDropdown, setShowApplicantDropdown] = useState(false);
  const [passportNos, setPassportNos] = useState('');
  const [passportExpiry, setPassportExpiry] = useState('');
  const [depositDate, setDepositDate] = useState('');
  const [withdrawalDate, setWithdrawalDate] = useState('');
  const [withdrawalReason, setWithdrawalReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!show) return;

    if (mode === 'edit' && record) {
      const src = record;
      setNaNo(src.naNo || '');
      setApplicantName(src.applicantName || '');
      setApplicantQuery(src.applicantName || '');
      setApplicantId(src.applicantId || '');
      setPassportNos(src.passportNos || '');
      setPassportExpiry(src.passportExpiry ? new Date(src.passportExpiry).toISOString().slice(0,10) : '');
      setDepositDate(src.depositDate ? new Date(src.depositDate).toISOString().slice(0,10) : '');
      setWithdrawalDate(src.withdrawalDate ? new Date(src.withdrawalDate).toISOString().slice(0,10) : '');
      setWithdrawalReason(src.withdrawalReason || '');
      setRemarks(src.remarks || '');
    } else if (mode === 'create') {
      setNaNo('');
      setApplicantName('');
      setApplicantQuery('');
      setApplicantId('');
      setPassportNos('');
      setPassportExpiry('');
      setDepositDate('');
      setWithdrawalDate('');
      setWithdrawalReason('');
      setRemarks('');
    }
  }, [show, mode, record]);

  const filteredApplicants = useMemo(() => {
    if (!applicantQuery) return applicants.slice(0, 8);
    const term = applicantQuery.toLowerCase();
    return applicants.filter(a => (a.name || '').toLowerCase().includes(term)).slice(0, 8);
  }, [applicants, applicantQuery]);

  if (!show) return null;

  const handleApplicantSelect = (applicant) => {
    setApplicantId(applicant._id);
    setApplicantName(applicant.name || '');
    setApplicantQuery(applicant.name || '');
    setShowApplicantDropdown(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const resolvedApplicantId = applicantId || record?.applicantId || null;
      if (!resolvedApplicantId || typeof resolvedApplicantId !== 'string' || !/^[a-fA-F0-9]{24}$/.test(resolvedApplicantId)) {
        Swal.fire('Error', 'Please select a valid applicant.', 'error');
        setSaving(false);
        return;
      }

      const body = {
        _id: record?._id,
        applicantId: resolvedApplicantId,
        naNo: naNo || null,
        applicantName: (applicantName || applicantQuery || '').trim() || null,
        passportNos: passportNos || null,
        passportExpiry: passportExpiry ? new Date(passportExpiry).toISOString() : null,
        depositDate: depositDate ? new Date(depositDate).toISOString() : null,
        withdrawalDate: withdrawalDate ? new Date(withdrawalDate).toISOString() : null,
        withdrawalReason: withdrawalReason || null,
        remarks: remarks || null,
        transmittalId: record?.transmittalId || null
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-white/95 rounded-3xl shadow-2xl border border-white/60 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center">
              <FilePlus2 size={20} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-gray-400">
                Passports
              </p>
              <h3 className="text-xl font-semibold text-gray-900">
                {mode === 'create' ? 'Add Passport Record' : 'Edit Passport Status'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">NA No.</label>
              <input type="text" value={naNo} onChange={(e) => setNaNo(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded" />
            </div>

            <div className="relative sm:col-span-2">
              <label className="block text-sm text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={applicantQuery}
                onChange={(e) => {
                  setApplicantQuery(e.target.value);
                  if (mode === 'create') {
                    setShowApplicantDropdown(true);
                    setApplicantId('');
                  }
                }}
                onFocus={() => mode === 'create' && setShowApplicantDropdown(true)}
                disabled={mode !== 'create'}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                placeholder={mode === 'create' ? 'Search applicant...' : ''}
              />
              {mode === 'create' && showApplicantDropdown && filteredApplicants.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded shadow max-h-48 overflow-y-auto">
                  {filteredApplicants.map(applicant => (
                    <button
                      type="button"
                      key={applicant._id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleApplicantSelect(applicant);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      <div className="font-medium text-gray-900">{applicant.name}</div>
                      <div className="text-xs text-gray-500">{applicant.position || applicant.company || ''}</div>
                    </button>
                  ))}
                  {filteredApplicants.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500">No matches</div>
                  )}
                </div>
              )}
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
