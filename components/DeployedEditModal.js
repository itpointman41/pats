"use client";

import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';

export default function DeployedEditModal({ show, transmittal, onClose, onSave, deployment }) {
  const [visaCompany, setVisaCompany] = useState('');
  const [company, setCompany] = useState('');
  const [visaPosition, setVisaPosition] = useState('');
  const [position, setPosition] = useState('');
  const [passportNos, setPassportNos] = useState('');
  const [visaNo, setVisaNo] = useState('');
  const [deployedAt, setDeployedAt] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!show || !transmittal) return;
    // Prefer deployment data (from deployments collection), fallback to transmittal data
    const source = deployment || transmittal;
    setVisaCompany(source.visaCompany || '');
    setCompany(source.company || '');
    setVisaPosition(source.visaPosition || '');
    setPosition(source.position || '');
    setPassportNos(source.passportNos || '');
    setVisaNo(source.visaNo || transmittal.sponsorNo || transmittal.visa_number || '');
    setDeployedAt(source.deployedAt ? new Date(source.deployedAt).toISOString().slice(0,10) : '');
  }, [show, transmittal, deployment]);

  if (!show || !transmittal) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Determine which endpoint and ID to use
      const isDeployment = !!deployment && deployment._id;
      const endpoint = isDeployment ? '/api/admin/deployments' : '/api/admin/transmittals';
      const recordId = isDeployment ? deployment._id : transmittal._id;

      const body = {
        _id: recordId,
        visaCompany: visaCompany || null,
        company: company || null,
        visaPosition: visaPosition || null,
        position: position || null,
        passportNos: passportNos || null,
        visaNo: visaNo || null,
        deployedAt: deployedAt ? new Date(deployedAt).toISOString() : null
      };

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');

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
        <form onSubmit={handleSave} className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold">Edit Deployed Details</h3>
            <button type="button" onClick={onClose} className="text-gray-500">Close</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Visa Company</label>
            <input type="text" value={visaCompany} onChange={(e) => setVisaCompany(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded" />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Actual Company</label>
            <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded" />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Visa Position</label>
            <input type="text" value={visaPosition} onChange={(e) => setVisaPosition(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded" />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Actual Position</label>
            <input type="text" value={position} onChange={(e) => setPosition(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded" />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Passport Nos.</label>
            <input type="text" value={passportNos} onChange={(e) => setPassportNos(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded" />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Visa No./ Sponsor No.</label>
            <input type="text" value={visaNo} onChange={(e) => setVisaNo(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded" />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Date of deployment</label>
            <input type="date" value={deployedAt} onChange={(e) => setDeployedAt(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded" />
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
