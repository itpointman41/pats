'use client';

import React, { useEffect, useState } from 'react';
import { X, CircleCheckBig } from 'lucide-react';

export default function ApplicantViewModal({ show, applicant, transmittals: initialTransmittals, onClose }) {
  const [transmittals, setTransmittals] = useState(initialTransmittals || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    // reset when modal closed or applicant changes
    if (!show) {
      setTransmittals(initialTransmittals || null);
      setLoading(false);
      setError(null);
      return;
    }

    if (initialTransmittals) {
      setTransmittals(initialTransmittals);
      return;
    }

    // fetch transmittals for the applicant if we have an applicant id
    const fetchTransmittals = async () => {
      if (!applicant || !applicant._id) {
        setTransmittals([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/transmittals?applicantId=${encodeURIComponent(applicant._id)}`, { credentials: 'include' });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || 'Failed to load transmittals');
          setTransmittals([]);
        } else {
          const data = await res.json();
          setTransmittals(data.transmittals || []);
        }
      } catch (err) {
        setError('Failed to load transmittals');
        setTransmittals([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTransmittals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, applicant, initialTransmittals]);

  if (!show || !applicant) return null;
  const rows = [
    { label: 'Name', value: applicant.name },
    { label: 'Position', value: applicant.position },
    { label: 'Company', value: applicant.company },
    { label: 'Phone Number', value: applicant.phoneNumber },
    { label: 'R.O.', value: applicant.ro },
    { label: 'Created At', value: applicant.createdAt ? new Date(applicant.createdAt).toLocaleString() : '' }
  ];

  const extraEntries = Object.keys(applicant || {}).filter(k => !['name','position','company','phoneNumber','ro','createdAt','updatedAt','_id'].includes(k));

  const truthy = (v) => {
    if (v === true || v === 1) return true;
    if (typeof v === 'string') {
      const s = v.toLowerCase().trim();
      return s === 'true' || s === 'yes' || s === '1';
    }
    return false;
  };

  const Field = ({ label, value, className = 'text-sm text-gray-900' }) => (
    <div className={"py-1 " + (className || '')}>
      <div className="text-xs text-gray-500">{label}</div>
      <div className={className}>{value || '—'}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="relative bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-lg">
        <div className="sticky top-0 bg-white z-30 border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Applicant Details</h2>
              <div className="text-xs text-gray-500">ID: {applicant._id}</div>
            </div>
            <div>
              <button onClick={onClose} aria-label="Close" title="Close" className="text-gray-500 hover:text-gray-800 p-2 rounded bg-white">
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {rows.map((r) => (
              <div key={r.label} className="p-3 bg-gray-50 rounded">
                <div className="text-xs text-gray-500">{r.label}</div>
                <div className="text-sm text-gray-900 font-medium">{r.value || '—'}</div>
              </div>
            ))}
          </div>

          

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Transmittals</h3>
            {loading && <div className="text-sm text-gray-500">Loading transmittals...</div>}
            {error && <div className="text-sm text-red-600">{error}</div>}
            {!loading && (!transmittals || transmittals.length === 0) && (
              <div className="text-sm text-gray-500">No transmittals found for this applicant.</div>
            )}

            {!loading && transmittals && transmittals.length > 0 && (
              <div className="mt-2 space-y-4">
                {transmittals.map((t) => (
                  <div key={t._id} className="p-4 border rounded shadow-sm bg-white">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-xs text-gray-500">Transmittal</div>
                        <div className="text-sm font-medium text-gray-900">{t._id}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Status</div>
                        <div className="text-sm font-medium text-gray-900">{t.status || 'pending'}</div>
                        <div className="text-xs text-gray-400">{t.createdAt ? new Date(t.createdAt).toLocaleString() : ''}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-800">
                      {/* Edit controls */}
                      <div className="sm:col-span-2 flex items-center justify-end space-x-2">
                        {editingId === t._id ? (
                          <>
                            <button
                              onClick={async () => {
                                // save
                                setSaveError(null);
                                setSaving(true);
                                try {
                                  const body = { _id: t._id, ...editForm };
                                  // normalize date fields to ISO or null
                                  ['dateOfMedical','medicalExpiration','dateOfEmedUploaded','dateOfInsurance','deployedAt'].forEach(f => {
                                    if (body[f]) {
                                      const d = new Date(body[f]);
                                      body[f] = isNaN(d.getTime()) ? null : d.toISOString();
                                    } else {
                                      body[f] = null;
                                    }
                                  });

                                  const res = await fetch('/api/admin/transmittals', {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    credentials: 'include',
                                    body: JSON.stringify(body)
                                  });
                                  const data = await res.json().catch(() => ({}));
                                  if (!res.ok) {
                                    setSaveError(data.error || 'Failed to save');
                                  } else {
                                    // update local list
                                    setTransmittals(prev => prev.map(x => x._id === t._id ? { ...x, ...body } : x));
                                    setEditingId(null);
                                  }
                                } catch (err) {
                                  setSaveError('Failed to save');
                                } finally {
                                  setSaving(false);
                                }
                              }}
                              className="btn-primary px-3 py-1 text-sm"
                              disabled={saving}
                            >
                              {saving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={() => { setEditingId(null); setEditForm({}); setSaveError(null); }}
                              className="px-3 py-1 text-sm bg-gray-100 rounded"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingId(t._id);
                              // initialize edit form with current values (dates as yyyy-mm-dd)
                              setEditForm({
                                findings: t.findings || '',
                                clinicRemarks: t.clinicRemarks || '',
                                clinic: t.clinic || '',
                                payment: t.payment || '',
                                remarks: t.remarks || '',
                                dateOfMedical: t.dateOfMedical ? new Date(t.dateOfMedical).toISOString().split('T')[0] : '',
                                medicalExpiration: t.medicalExpiration ? new Date(t.medicalExpiration).toISOString().split('T')[0] : '',
                                dateOfEmedUploaded: t.dateOfEmedUploaded ? new Date(t.dateOfEmedUploaded).toISOString().split('T')[0] : '',
                                dateOfInsurance: t.dateOfInsurance ? new Date(t.dateOfInsurance).toISOString().split('T')[0] : '',
                                deployedAt: t.deployedAt ? new Date(t.deployedAt).toISOString().split('T')[0] : '',
                                medicalCert: !!t.medicalCert,
                                vaccineCert: !!t.vaccineCert,
                                biometric: !!t.biometric,
                                stampVisa: !!t.stampVisa,
                                waiver: !!t.waiver,
                                visaCompany: t.visaCompany || '',
                                company: t.company || '',
                                visaPosition: t.visaPosition || '',
                                position: t.position || '',
                                passportNos: t.passportNos || '',
                                visaNo: t.visaNo || '',
                                sponsorNo: t.sponsorNo || ''
                              });
                            }}
                            className="px-3 py-1 text-sm bg-gray-100 rounded"
                          >
                            Edit
                          </button>
                        )}
                      </div>

                      {editingId === t._id ? (
                        <>
                          <div>
                            <div className="text-xs text-gray-500">Date of Medical</div>
                            <input type="date" className="input-soft w-full mt-1" value={editForm.dateOfMedical || ''} onChange={(e) => setEditForm(prev => ({ ...prev, dateOfMedical: e.target.value }))} />
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Medical Expiration</div>
                            <input type="date" className="input-soft w-full mt-1" value={editForm.medicalExpiration || ''} onChange={(e) => setEditForm(prev => ({ ...prev, medicalExpiration: e.target.value }))} />
                          </div>
                          <div className="flex items-center space-x-2">
                            <label className="text-xs text-gray-500">Med Cert</label>
                            <input type="checkbox" checked={!!editForm.medicalCert} onChange={(e) => setEditForm(prev => ({ ...prev, medicalCert: e.target.checked }))} />
                          </div>
                          <div className="flex items-center space-x-2">
                            <label className="text-xs text-gray-500">Vax Cert</label>
                            <input type="checkbox" checked={!!editForm.vaccineCert} onChange={(e) => setEditForm(prev => ({ ...prev, vaccineCert: e.target.checked }))} />
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Date EMed Uploaded</div>
                            <input type="date" className="input-soft w-full mt-1" value={editForm.dateOfEmedUploaded || ''} onChange={(e) => setEditForm(prev => ({ ...prev, dateOfEmedUploaded: e.target.value }))} />
                          </div>
                          <div className="flex items-center space-x-2">
                            <label className="text-xs text-gray-500">Biometric</label>
                            <input type="checkbox" checked={!!editForm.biometric} onChange={(e) => setEditForm(prev => ({ ...prev, biometric: e.target.checked }))} />
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Date of deployment</div>
                            <input type="date" className="input-soft w-full mt-1" value={editForm.deployedAt || ''} onChange={(e) => setEditForm(prev => ({ ...prev, deployedAt: e.target.value }))} />
                          </div>
                        </>
                      ) : (
                        <>
                          <Field label="Date of Medical" value={t.dateOfMedical ? new Date(t.dateOfMedical).toLocaleString() : ''} />
                          <Field label="Medical Expiration" value={t.medicalExpiration ? new Date(t.medicalExpiration).toLocaleString() : ''} />
                          <Field label="Med Cert" value={truthy(t.medicalCert) ? 'Yes' : '—'} />
                          <Field label="Vax Cert" value={truthy(t.vaccineCert) ? 'Yes' : '—'} />
                          <Field label="Date EMed Uploaded" value={t.dateOfEmedUploaded ? new Date(t.dateOfEmedUploaded).toLocaleDateString() : ''} />
                          <Field label="Biometric" value={truthy(t.biometric) ? 'Yes' : '—'} />
                          <Field label="Date of deployment" value={t.deployedAt ? new Date(t.deployedAt).toLocaleDateString() : ''} />
                        </>
                      )}
                      <div className="sm:col-span-2">
                        <div className="text-xs text-gray-500">Findings</div>
                        {editingId === t._id ? (
                          <textarea className="input-soft w-full mt-1" value={editForm.findings || ''} onChange={(e) => setEditForm(prev => ({ ...prev, findings: e.target.value }))} />
                        ) : (
                          <div className="text-sm text-gray-900">{t.findings || '—'}</div>
                        )}
                      </div>
                      <div className="sm:col-span-2">
                        <div className="text-xs text-gray-500">Clinic Remarks</div>
                        {editingId === t._id ? (
                          <textarea className="input-soft w-full mt-1" value={editForm.clinicRemarks || ''} onChange={(e) => setEditForm(prev => ({ ...prev, clinicRemarks: e.target.value }))} />
                        ) : (
                          <div className="text-sm text-gray-900">{t.clinicRemarks || '—'}</div>
                        )}
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Clinic</div>
                        {editingId === t._id ? (
                          <input className="input-soft w-full mt-1" value={editForm.clinic || ''} onChange={(e) => setEditForm(prev => ({ ...prev, clinic: e.target.value }))} />
                        ) : (
                          <div className="text-sm text-gray-900">{t.clinic || '—'}</div>
                        )}
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Payment</div>
                        {editingId === t._id ? (
                          <input className="input-soft w-full mt-1" value={editForm.payment || ''} onChange={(e) => setEditForm(prev => ({ ...prev, payment: e.target.value }))} />
                        ) : (
                          <div className="text-sm text-gray-900">{t.payment || '—'}</div>
                        )}
                      </div>
                      <Field label="Stamp Visa" value={truthy(t.stampVisa) ? 'Yes' : '—'} />
                      <Field label="Date of Insurance" value={t.dateOfInsurance ? new Date(t.dateOfInsurance).toLocaleDateString() : ''} />
                      <div className="sm:col-span-2">
                        <div className="text-xs text-gray-500">Remarks</div>
                        {editingId === t._id ? (
                          <textarea className="input-soft w-full mt-1" value={editForm.remarks || ''} onChange={(e) => setEditForm(prev => ({ ...prev, remarks: e.target.value }))} />
                        ) : (
                          <div className="text-sm text-gray-900">{t.remarks || '—'}</div>
                        )}
                      </div>

                      {/* Date fields */}
                      <div>
                        <div className="text-xs text-gray-500">E-med Uploaded</div>
                        {editingId === t._id ? (
                          <input type="date" className="input-soft w-full mt-1" value={editForm.dateOfEmedUploaded || ''} onChange={(e) => setEditForm(prev => ({ ...prev, dateOfEmedUploaded: e.target.value }))} />
                        ) : (
                          <div className="text-sm text-gray-900">{t.dateOfEmedUploaded ? new Date(t.dateOfEmedUploaded).toLocaleDateString() : '—'}</div>
                        )}
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Insurance Date</div>
                        {editingId === t._id ? (
                          <input type="date" className="input-soft w-full mt-1" value={editForm.dateOfInsurance || ''} onChange={(e) => setEditForm(prev => ({ ...prev, dateOfInsurance: e.target.value }))} />
                        ) : (
                          <div className="text-sm text-gray-900">{t.dateOfInsurance ? new Date(t.dateOfInsurance).toLocaleDateString() : '—'}</div>
                        )}
                      </div>

                      {/* Flags */}
                      <div className="sm:col-span-2 grid grid-cols-2 gap-3">
                        {['medicalCert','vaccineCert','biometric','stampVisa','waiver'].map(flag => (
                          <div key={flag} className="flex items-center space-x-2">
                            {editingId === t._id ? (
                              <label className="inline-flex items-center">
                                <input type="checkbox" checked={!!editForm[flag]} onChange={(e) => setEditForm(prev => ({ ...prev, [flag]: e.target.checked }))} />
                                <span className="ml-2 text-xs text-gray-600">{flag}</span>
                              </label>
                            ) : (
                              <>
                                <div className="text-xs text-gray-500">{flag}</div>
                                <div className="text-sm text-gray-900">{t[flag] ? 'Yes' : '—'}</div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>

                      {saveError && editingId === t._id ? <div className="sm:col-span-2 text-sm text-red-600">{saveError}</div> : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
