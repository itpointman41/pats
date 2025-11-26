"use client";

import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';

export default function DeploymentEditModal({ show, transmittal, onClose, onSave }) {
  const [dateOfEmedUploaded, setDateOfEmedUploaded] = useState('');
  const [dateOfInsurance, setDateOfInsurance] = useState('');
  const [deployedAt, setDeployedAt] = useState('');
  const [visaCompany, setVisaCompany] = useState('');
  const [company, setCompany] = useState('');
  const [visaPosition, setVisaPosition] = useState('');
  const [position, setPosition] = useState('');
  const [passportNos, setPassportNos] = useState('');
  const [visaNo, setVisaNo] = useState('');
  const [waiver, setWaiver] = useState(false);
  const [clinicRemarks, setClinicRemarks] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!show || !transmittal) return;
    setDateOfEmedUploaded(transmittal.dateOfEmedUploaded ? new Date(transmittal.dateOfEmedUploaded).toISOString().slice(0,19) : '');
    setDateOfInsurance(transmittal.dateOfInsurance ? new Date(transmittal.dateOfInsurance).toISOString().slice(0,10) : '');
    setVisaCompany(transmittal.visaCompany || '');
    setCompany(transmittal.company || '');
    setVisaPosition(transmittal.visaPosition || '');
    setPosition(transmittal.position || '');
    setPassportNos(transmittal.passportNos || '');
    setVisaNo(transmittal.visaNo || transmittal.sponsorNo || transmittal.visa_number || '');
    setWaiver(Boolean(transmittal.waiver));
    setClinicRemarks(transmittal.clinicRemarks || '');
    setStatus(transmittal.status || '');
    setDeployedAt(transmittal.deployedAt ? new Date(transmittal.deployedAt).toISOString().slice(0,10) : '');
  }, [show, transmittal]);

  if (!show || !transmittal) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        _id: transmittal._id,
        visaCompany: visaCompany || null,
        company: company || null,
        visaPosition: visaPosition || null,
        position: position || null,
        passportNos: passportNos || null,
        visaNo: visaNo || null,
        dateOfEmedUploaded: dateOfEmedUploaded ? new Date(dateOfEmedUploaded).toISOString() : null,
        dateOfInsurance: dateOfInsurance ? new Date(dateOfInsurance).toISOString() : null,
        deployedAt: deployedAt ? new Date(deployedAt).toISOString() : null,
        waiver,
        clinicRemarks,
        status
      };

      const res = await fetch('/api/admin/transmittals', {
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <form onSubmit={handleSave} className="bg-white rounded-lg p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Edit Deployment Details</h3>
          <button type="button" onClick={onClose} className="text-gray-500">Close</button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Date EMed Uploaded</label>
            <input type="datetime-local" value={dateOfEmedUploaded} onChange={(e) => setDateOfEmedUploaded(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded" />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Date of Insurance</label>
            <input type="date" value={dateOfInsurance} onChange={(e) => setDateOfInsurance(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded" />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Deployment Date</label>
            <input type="date" value={deployedAt} onChange={(e) => setDeployedAt(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded" />
          </div>

          <div className="flex items-center">
            <label className="flex items-center space-x-2"><input type="checkbox" checked={waiver} onChange={(e) => setWaiver(e.target.checked)} className="h-4 w-4 text-[#0d8c40]" /><span className="text-sm text-gray-700">Waiver</span></label>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Clinic Remarks</label>
            <textarea rows={3} value={clinicRemarks} onChange={(e) => setClinicRemarks(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded" />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded">
              <option value="">(select)</option>
              <option value="pending">pending</option>
              <option value="encode">encode</option>
              <option value="process">process</option>
              <option value="deployment">deployment</option>
              <option value="deployed">deployed</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end mt-4 space-x-3">
          <button type="button" onClick={onClose} className="px-3 py-2 border rounded">Cancel</button>
          <button type="submit" className="px-3 py-2 bg-[#0d8c40] text-white rounded" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}
