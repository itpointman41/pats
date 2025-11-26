"use client";

import React, { useState, useEffect, useCallback } from "react";
import TransmittalEncodeTab from "./TransmittalEncodeTab";
import TransmittalProcessTab from "./TransmittalProcessTab";
import ApplicantViewModal from "./ApplicantViewModal";
import FTWModal from './FTWModal';
import DeploymentEditModal from './DeploymentEditModal';
import PaginationControls from "./PaginationControls";
import Swal from 'sweetalert2';
import { Edit, Trash2, CircleCheckBig } from 'lucide-react';

const DEPLOYMENT_REFRESH_INTERVAL = 20000; // 20 seconds
const TAB_PAGE_SIZE = 10;

export default function TransmittalTabs({ transmittals, onEdit, onDelete, onFTW }) {
  const [active, setActive] = useState("pending");
  // Track single expanded cell as a key 'id:field' so only one cell is expanded at a time
  const [expandedKey, setExpandedKey] = useState(null);
  const [viewApplicant, setViewApplicant] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTransmittal, setSelectedTransmittal] = useState(null);
  const [showFTWModal, setShowFTWModal] = useState(false);

  // Deployment-specific state
  const [depTransmittals, setDepTransmittals] = useState([]);
  const [allDepTransmittals, setAllDepTransmittals] = useState([]);
  const [depLoading, setDepLoading] = useState(true);
  const [depError, setDepError] = useState(null);
  const [showDepEditModal, setShowDepEditModal] = useState(false);
  const [editingDepTransmittal, setEditingDepTransmittal] = useState(null);
  const [pendingPage, setPendingPage] = useState(1);
  const [deploymentPage, setDeploymentPage] = useState(1);

  const toggleExpand = (id, field) => {
    const key = `${id}:${field}`;
    setExpandedKey(prev => (prev === key ? null : key));
  };

  const truthy = (v) => {
    if (v === true || v === 1) return true;
    if (typeof v === 'string') {
      const s = v.toLowerCase().trim();
      return s === 'true' || s === 'yes' || s === '1';
    }
    return false;
  };

  useEffect(() => {
    // Debug: log first few transmittals to help inspect checkbox fields
    if (transmittals && transmittals.length) {
      console.debug('TransmittalTabs: sample transmittals', transmittals.slice(0,5));
    }
  }, [transmittals]);

  const pending = transmittals.filter(t => (t.status || 'pending') === 'pending');
  const encode = transmittals.filter(t => (t.status || '') === 'encode');

  useEffect(() => {
    setPendingPage(1);
  }, [pending.length]);

  useEffect(() => {
    setDeploymentPage(1);
  }, [depTransmittals.length]);

  const handleRowClick = async (transmittal) => {
    // If transmittal already contains embedded applicant object, use it.
    if (transmittal.applicant) {
      setViewApplicant(transmittal.applicant);
      setShowViewModal(true);
      return;
    }

    // Otherwise fetch applicant by applicantId
    try {
      const applicantId = transmittal.applicantId;
      if (!applicantId) {
        setViewApplicant(null);
        setShowViewModal(true);
        return;
      }
      const res = await fetch(`/api/admin/applicants?_id=${encodeURIComponent(applicantId)}`, { credentials: 'include' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Failed to load applicant', err);
        setViewApplicant(null);
        setShowViewModal(true);
        return;
      }
      const data = await res.json();
  setViewApplicant(data.applicant || null);
  setSelectedTransmittal(transmittal);
  setShowViewModal(true);
    } catch (err) {
      console.error('Error fetching applicant', err);
      setViewApplicant(null);
      setShowViewModal(true);
    }
  };

  // Deployment handlers
  const openDepEditModal = (t) => {
    setEditingDepTransmittal(t);
    setShowDepEditModal(true);
  };

  const openApplicantFromDep = (t) => {
    const applicant = t.applicant || (t.applicantId ? { _id: t.applicantId, name: t.applicantName, ro: t.applicant && t.applicant.ro } : null);
    setViewApplicant(applicant);
    setShowViewModal(true);
  };

  const fetchDepTransmittals = useCallback(async (silent = false) => {
    if (!silent) setDepLoading(true);
    try {
      const res = await fetch('/api/admin/transmittals', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) {
        setDepError(data.error || 'Failed to load transmittals');
        setDepTransmittals([]);
        setAllDepTransmittals([]);
      } else {
        const deploymentOnly = (data.transmittals || []).filter(t => (t.status || '') === 'deployment');
        setAllDepTransmittals(data.transmittals || []);
        setDepTransmittals(deploymentOnly);
        setDeploymentPage(1);
      }
    } catch (err) {
      setDepError('Failed to load transmittals');
      setDepTransmittals([]);
      setAllDepTransmittals([]);
    } finally {
      setDepLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepTransmittals();
  }, [fetchDepTransmittals]);

  useEffect(() => {
    const interval = setInterval(() => fetchDepTransmittals(true), DEPLOYMENT_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchDepTransmittals]);

  const handleDepDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Confirm delete',
      text: 'This will permanently delete the transmittal.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/admin/transmittals?_id=${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) {
        await Swal.fire('Error', data.error || 'Failed to delete transmittal', 'error');
        return;
      }
      setDepTransmittals((prev) => prev.filter((x) => x._id !== id));
      setAllDepTransmittals((prev) => prev.filter((x) => x._id !== id));
      await Swal.fire('Deleted', 'Transmittal deleted', 'success');
    } catch (err) {
      console.error('Delete error', err);
      await Swal.fire('Error', 'Failed to delete transmittal', 'error');
    }
  };

  const handleMarkDeployed = async (id) => {
    const t = (allDepTransmittals || []).find(x => x._id === id) || (depTransmittals || []).find(x => x._id === id);
    if (!t) {
      await Swal.fire('Error', 'Transmittal not found', 'error');
      return;
    }

    const missing = [];
    if (!t.dateOfEmedUploaded || String(t.dateOfEmedUploaded).trim() === '') missing.push('Date EMed Uploaded');
    if (!t.dateOfInsurance || String(t.dateOfInsurance).trim() === '') missing.push('Date of Insurance');
    if (!truthy(t.biometric)) missing.push('Biometric');
    if (!truthy(t.stampVisa)) missing.push('Stamp Visa');
    if (!truthy(t.waiver)) missing.push('Waiver');
    if (!truthy(t.medicalCert) && !truthy(t.vaccineCert)) missing.push('Medical or Vaccine Certificate (at least one)');

    if (missing.length > 0) {
      await Swal.fire('Missing required fields', `Please fill/check: ${missing.join(', ')} before marking deployed.`, 'warning');
      return;
    }

    const result = await Swal.fire({
      title: 'Mark as Deployed?',
      text: 'This will change the transmittal status to Deployed.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, mark deployed',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    try {
      const body = { _id: id, status: 'deployed' };
      // Preserve an existing deployedAt if present; only set it when missing.
      if (!t.deployedAt) body.deployedAt = new Date().toISOString();

      const res = await fetch('/api/admin/transmittals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) {
        await Swal.fire('Error', data.error || 'Failed to update status', 'error');
        return;
      }
      await Swal.fire('Updated', 'Transmittal marked as deployed.', 'success');
      await fetchDepTransmittals();
    } catch (err) {
      console.error('Mark deployed error', err);
      await Swal.fire('Error', 'Failed to update status', 'error');
    }
  };

  const handleDeploymentSave = async () => {
    await fetchDepTransmittals();
  };

  const paginate = (items, page) => {
    const start = (page - 1) * TAB_PAGE_SIZE;
    return items.slice(start, start + TAB_PAGE_SIZE);
  };

  const sortedPending = [...pending].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
    const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
    return dateB - dateA; // Newest first
  });

  const paginatedPending = paginate(sortedPending, pendingPage);

  // Use parent-provided `transmittals` (already filtered by the global search) for deployment
  const deploymentOnly = transmittals.filter(t => (t.status || '') === 'deployment');
  const sortedDeployment = [...deploymentOnly].sort((a, b) => {
    const aDate = a.deployedAt || a.updatedAt || a.createdAt || 0;
    const bDate = b.deployedAt || b.updatedAt || b.createdAt || 0;
    return new Date(bDate) - new Date(aDate);
  });
  const paginatedDeployment = paginate(sortedDeployment, deploymentPage);

  useEffect(() => {
    setDeploymentPage(1);
  }, [sortedDeployment.length]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-3">
        {[
          { key: 'pending', label: 'Pending' },
          { key: 'encode', label: 'FTW - For Encode' },
          { key: 'process', label: 'Process' },
          { key: 'deployment', label: 'Deployment' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              active === tab.key
                ? 'bg-[var(--color-secondary)] text-white shadow-md'
                : 'bg-white border border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-secondary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === 'pending' && (
        // Keep the table container flexible so no internal vertical scrollbar appears.
        <div className="card overflow-hidden">
          <div className="overflow-hidden">
            {/* use table-fixed so truncation widths behave predictably */}
            <table className="min-w-full divide-y divide-gray-200 table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applicant Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date of Medical</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medical Expiration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Findings</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clinic Remarks</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clinic</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedPending.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-4 text-center text-gray-500">No pending transmittals</td>
                  </tr>
                ) : (
                  paginatedPending.map((transmittal) => (
                  <tr key={transmittal._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-normal break-words">
                      <button
                        onClick={() => handleRowClick(transmittal)}
                        className="text-left w-full text-indigo-600 hover:underline"
                        type="button"
                        tabIndex={0}
                        aria-label="View applicant details"
                      >
                        {transmittal.applicantName || "—"}
                      </button>
                    </td>
                      <td className="px-6 py-4 whitespace-normal text-sm text-gray-500">{transmittal.dateOfMedical ? new Date(transmittal.dateOfMedical).toLocaleDateString() : "—"}</td>
                      <td className="px-6 py-4 whitespace-normal text-sm text-gray-500">{transmittal.medicalExpiration ? new Date(transmittal.medicalExpiration).toLocaleDateString() : "—"}</td>
                      {/* Findings: truncate to keep table width stable */}
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-[20rem] whitespace-nowrap overflow-hidden truncate">{transmittal.findings || "—"}</td>
                      {/* Clinic remarks: truncated with ellipsis; expand on click */}
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-[16rem]">
                        { (expandedKey === `${transmittal._id}:clinicRemarks`) ? (
                          <div className="break-words" onClick={() => toggleExpand(transmittal._id, 'clinicRemarks')} style={{ cursor: 'pointer' }}>{transmittal.clinicRemarks || "—"}</div>
                        ) : (
                          <div className="whitespace-nowrap overflow-hidden truncate" onClick={() => toggleExpand(transmittal._id, 'clinicRemarks')} style={{ cursor: 'pointer' }} title={transmittal.clinicRemarks || ''}>{transmittal.clinicRemarks || "—"}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-normal text-sm text-gray-900">{transmittal.clinic || "—"}</td>
                      <td className="px-6 py-4 whitespace-normal text-sm text-gray-900">{transmittal.payment || "—"}</td>
                      {/* Remarks: truncated with ellipsis; expand on click */}
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-30">
                        { (expandedKey === `${transmittal._id}:remarks`) ? (
                          <div className="break-words" onClick={() => toggleExpand(transmittal._id, 'remarks')} style={{ cursor: 'pointer' }}>{transmittal.remarks || "—"}</div>
                        ) : (
                          <div className="whitespace-nowrap overflow-hidden truncate" onClick={() => toggleExpand(transmittal._id, 'remarks')} style={{ cursor: 'pointer' }} title={transmittal.remarks || ''}>{transmittal.remarks || "—"}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium min-w-[10rem]">
                        <button
                          onClick={(e) => { e.stopPropagation(); onEdit(transmittal, 'pending'); }}
                          className="text-[#0d8c40] hover:text-[#0b7335] mr-4"
                          aria-label={`Edit transmittal ${transmittal._id}`}
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>

                        <button
                          onClick={(e) => {
                             e.stopPropagation();
                             e.preventDefault();
                             onDelete(transmittal._id); 
                            }}
                          className="text-red-600 hover:text-red-900 mr-4"
                          aria-label={`Delete transmittal ${transmittal._id}`}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>

                        {/* FTW button only for pending with confirmation */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTransmittal(transmittal);
                            setShowFTWModal(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-900"
                          aria-label={`Mark transmittal ${transmittal._id} as FTW`}
                          title="FTW"
                        >
                            <CircleCheckBig size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <PaginationControls
            currentPage={pendingPage}
            onPageChange={setPendingPage}
            totalItems={sortedPending.length}
            pageSize={TAB_PAGE_SIZE}
            label="pending transmittals"
          />
        </div>
      )}

      {active === 'encode' && (
        <TransmittalEncodeTab transmittals={encode} onEdit={onEdit} onDelete={onDelete} onFTW={onFTW} />
      )}
      {active === 'process' && (
        <TransmittalProcessTab transmittals={transmittals.filter(t => (t.status || '') === 'process')} onEdit={onEdit} onDelete={onDelete} onFTW={onFTW} />
      )}

      {active === 'deployment' && (
        <div>
          {depLoading && <div className="text-sm text-gray-500">Loading...</div>}
          {depError && <div className="text-sm text-red-600">{depError}</div>}

          {!depLoading && !depError && (
            <div className="card overflow-hidden">
              <div className="overflow-hidden">
                <table className="w-full table-auto divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applicant Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RO</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date EMed Uploaded</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date of Insurance</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Waiver</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clinic Remarks</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deployed Date</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(paginatedDeployment.length === 0) ? (
                        <tr>
                          <td colSpan="9" className="px-6 py-4 text-center text-gray-500">No transmittals</td>
                        </tr>
                      ) : (
                        paginatedDeployment.map((t) => (
                          <tr key={t._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <button onClick={() => openApplicantFromDep(t)} className="text-left w-full text-indigo-600 hover:underline">
                                {t.applicantName || (t.applicant && t.applicant.name) || '—'}
                              </button>
                            </td>
                            <td className="px-6 py-4 whitespace-normal text-sm text-gray-700">{(t.applicant && t.applicant.ro) || '—'}</td>
                            <td className="px-6 py-4 whitespace-normal text-sm text-gray-700">{t.dateOfEmedUploaded ? new Date(t.dateOfEmedUploaded).toLocaleString() : '—'}</td>
                            <td className="px-6 py-4 whitespace-normal text-sm text-gray-700">{t.dateOfInsurance ? new Date(t.dateOfInsurance).toLocaleDateString() : '—'}</td>
                            <td className="px-6 py-4 whitespace-normal text-sm text-gray-700">{truthy(t.waiver) ? (<span className="inline-flex items-center justify-center bg-green-100 rounded-full p-1"><CircleCheckBig size={16} className="text-green-700" /></span>) : '—'}</td>
                            <td className="px-6 py-4 text-sm text-gray-900 max-w-xl break-words">{t.clinicRemarks || '—'}</td>
                            <td className="px-6 py-4 whitespace-normal text-sm text-gray-700">{t.status || '—'}</td>
                            <td className="px-6 py-4 whitespace-normal text-sm text-gray-700">{t.deployedAt ? new Date(t.deployedAt).toLocaleDateString() : '—'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end space-x-2">
                                <button onClick={() => openDepEditModal(t)} className="p-1 rounded hover:bg-gray-100 text-[#0d8c40]" aria-label={`Edit transmittal ${t._id}`} title="Edit"><Edit size={16} /></button>
                                <button onClick={() => onDelete(t._id)} className="p-1 rounded hover:bg-gray-100 text-red-600" aria-label={`Delete transmittal ${t._id}`} title="Delete"><Trash2 size={16} /></button>
                                {(t.status || '') === 'deployment' && (<button onClick={() => handleMarkDeployed(t._id)} className="p-1 rounded hover:bg-gray-100 text-indigo-600" aria-label={`Mark transmittal ${t._id} as deployed`} title="Mark Deployed"><CircleCheckBig size={16} /></button>)}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                </table>
              </div>
              <PaginationControls
                currentPage={deploymentPage}
                onPageChange={setDeploymentPage}
                totalItems={sortedDeployment.length}
                pageSize={TAB_PAGE_SIZE}
                label="deployment records"
              />
            </div>
          )}

          <DeploymentEditModal show={showDepEditModal} transmittal={editingDepTransmittal} onClose={() => setShowDepEditModal(false)} onSave={handleDeploymentSave} />
        </div>
      )}



      <ApplicantViewModal
        show={showViewModal}
        applicant={viewApplicant}
        transmittals={selectedTransmittal ? [selectedTransmittal] : null}
        onClose={() => { setShowViewModal(false); setViewApplicant(null); setSelectedTransmittal(null); }}
      />
      <FTWModal
        show={showFTWModal}
        transmittal={selectedTransmittal}
        onClose={() => { setShowFTWModal(false); setSelectedTransmittal(null); }}
        onConfirm={(id, body) => onFTW(id, body)}
      />
    </div>
  );
}
