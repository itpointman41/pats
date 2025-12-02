"use client";

import React, { useState, useEffect, useCallback } from "react";
import TransmittalEncodeTab from "./TransmittalEncodeTab";
import TransmittalProcessTab from "./TransmittalProcessTab";
import ApplicantViewModal from "./ApplicantViewModal";
import FTWModal from './FTWModal';
import DeploymentEditModal from './DeploymentEditModal';
import PaginationControls from "./PaginationControls";
import Swal from 'sweetalert2';
import { Edit, Trash2, CircleCheckBig, ArrowLeft } from 'lucide-react';

export default function TransmittalTabs({
  data,
  activeTab,
  onTabChange,
  onPageChange,
  onRefreshStatus,
  onEdit,
  onDelete,
  onFTW,
  pageSize = 10,
  canManage = false
}) {
  const [active, setActive] = useState(activeTab || "pending");

  useEffect(() => {
    if (activeTab && activeTab !== active) {
      setActive(activeTab);
    }
  }, [activeTab, active]);

  const pendingData =
    data?.pending || { items: [], total: 0, page: 1, loading: false, error: null };
  const encodeData = data?.encode || { items: [], total: 0, page: 1, loading: false, error: null };
  const processData = data?.process || { items: [], total: 0, page: 1, loading: false, error: null };
  const deploymentData = data?.deployment || { items: [], total: 0, page: 1, loading: false, error: null };

  const pendingItems = pendingData.items || [];
  const encodeItems = encodeData.items || [];
  const processItems = processData.items || [];
  const deploymentItems = deploymentData.items || [];
  const depLoading = deploymentData.loading || false;
  const depError = deploymentData.error || null;
  // Track single expanded cell as a key 'id:field' so only one cell is expanded at a time
  const [expandedKey, setExpandedKey] = useState(null);
  const [viewApplicant, setViewApplicant] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTransmittal, setSelectedTransmittal] = useState(null);
  const [showFTWModal, setShowFTWModal] = useState(false);

  // Deployment-specific state
  const [allDepTransmittals, setAllDepTransmittals] = useState([]);
  const [showDepEditModal, setShowDepEditModal] = useState(false);
  const [editingDepTransmittal, setEditingDepTransmittal] = useState(null);

  const handleTabSelect = (key) => {
    setActive(key);
    onTabChange && onTabChange(key);
  };

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

  const pending = pendingItems;
  const encode = encodeItems;

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
    if (!canManage) return;
    setEditingDepTransmittal(t);
    setShowDepEditModal(true);
  };

  const openApplicantFromDep = (t) => {
    const applicant = t.applicant || (t.applicantId ? { _id: t.applicantId, name: t.applicantName, ro: t.applicant && t.applicant.ro } : null);
    setViewApplicant(applicant);
    setShowViewModal(true);
  };

  useEffect(() => {
    setAllDepTransmittals(deploymentItems);
  }, [deploymentItems]);

  const handleMarkDeployed = async (id) => {
    if (!canManage) return;
    const t = (allDepTransmittals || []).find(x => x._id === id) || (deploymentItems || []).find(x => x._id === id);
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
      onRefreshStatus && onRefreshStatus('deployment');
    } catch (err) {
      console.error('Mark deployed error', err);
      await Swal.fire('Error', 'Failed to update status', 'error');
    }
  };

  const handleDeploymentSave = async () => {
    onRefreshStatus && onRefreshStatus('deployment');
  };

  const handleReturnToProcess = async (id) => {
    if (!canManage) return;
    const result = await Swal.fire({
      title: 'Return to Process?',
      text: 'This will change the transmittal status from Deployment back to Process.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, return to Process',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch('/api/admin/transmittals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ _id: id, status: 'process' })
      });
      const data = await res.json();
      if (!res.ok) {
        await Swal.fire('Error', data.error || 'Failed to update status', 'error');
        return;
      }
      await Swal.fire('Updated', 'Transmittal returned to Process.', 'success');
      onRefreshStatus && onRefreshStatus('process');
      onRefreshStatus && onRefreshStatus('deployment');
    } catch (err) {
      console.error('Return to process error', err);
      await Swal.fire('Error', 'Failed to update status', 'error');
    }
  };

  const sortedDeployment = [...deploymentItems].sort((a, b) => {
    const aDate = a.deployedAt || a.updatedAt || a.createdAt || 0;
    const bDate = b.deployedAt || b.updatedAt || b.createdAt || 0;
    return new Date(bDate) - new Date(aDate);
  });

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
            onClick={() => handleTabSelect(tab.key)}
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
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-300 bg-gray-50">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Applicant Name</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date of Medical</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Medical Expiration</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Findings</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Clinic Remarks</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Clinic</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Payment</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Remarks</th>
                  {canManage && (
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pendingData.loading ? (
                  <tr>
                    <td colSpan={canManage ? 9 : 8} className="px-3 py-2.5 text-center text-gray-500 text-xs">
                      Loading pending transmittals...
                    </td>
                  </tr>
                ) : pendingItems.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 9 : 8} className="px-3 py-2.5 text-center text-gray-500 text-xs">No pending transmittals</td>
                  </tr>
                ) : (
                  [...pendingItems]
                    .sort((a, b) => {
                      const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
                      const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
                      return dateB - dateA; // Newest first
                    })
                    .map((transmittal, idx) => {
                    const expirationDate = transmittal.medicalExpiration ? new Date(transmittal.medicalExpiration) : null;
                    const isExpired = expirationDate && !isNaN(expirationDate.getTime()) && expirationDate < new Date();
                    const medicalDateClasses = `px-3 py-2.5 align-top ${isExpired ? 'bg-red-500 text-white rounded-lg' : ''}`;
                    const medicalExpirationClasses = `px-3 py-2.5 align-top ${isExpired ? 'bg-red-600 text-white rounded-lg' : ''}`;
                    return (
                      <tr key={transmittal._id} className={`hover:bg-green-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="px-3 py-2.5 align-top">
                      <button
                        onClick={() => handleRowClick(transmittal)}
                        className="text-left w-full font-semibold text-green-600 hover:text-green-800 cursor-pointer hover:underline transition-colors text-sm leading-tight"
                        type="button"
                        tabIndex={0}
                        aria-label="View applicant details"
                      >
                        {transmittal.applicantName || "—"}
                      </button>
                    </td>
                        <td className={medicalDateClasses}>
                          <span className="text-xs leading-tight">{transmittal.dateOfMedical ? new Date(transmittal.dateOfMedical).toLocaleDateString() : "—"}</span>
                        </td>
                        <td className={medicalExpirationClasses}>
                          <span className="text-xs leading-tight">{transmittal.medicalExpiration ? new Date(transmittal.medicalExpiration).toLocaleDateString() : "—"}</span>
                        </td>
                    <td className="px-3 py-2.5 align-top">
                      <span className="text-gray-900 text-xs leading-tight">{transmittal.findings || "—"}</span>
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      { (expandedKey === `${transmittal._id}:clinicRemarks`) ? (
                        <div className="break-words text-xs leading-tight text-gray-900" onClick={() => toggleExpand(transmittal._id, 'clinicRemarks')} style={{ cursor: 'pointer', maxWidth: '150px' }}>{transmittal.clinicRemarks || "—"}</div>
                      ) : (
                        <div className="whitespace-nowrap overflow-hidden truncate text-xs leading-tight text-gray-900" onClick={() => toggleExpand(transmittal._id, 'clinicRemarks')} style={{ cursor: 'pointer', maxWidth: '150px' }} title={transmittal.clinicRemarks || ''}>{transmittal.clinicRemarks || "—"}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <span className="text-gray-900 text-xs leading-tight">{transmittal.clinic || "—"}</span>
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <span className="text-gray-900 text-xs leading-tight">{transmittal.payment || "—"}</span>
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      { (expandedKey === `${transmittal._id}:remarks`) ? (
                        <div className="break-words text-xs leading-tight text-gray-900" onClick={() => toggleExpand(transmittal._id, 'remarks')} style={{ cursor: 'pointer', maxWidth: '150px' }}>{transmittal.remarks || "—"}</div>
                      ) : (
                        <div className="whitespace-nowrap overflow-hidden truncate text-xs leading-tight text-gray-900" onClick={() => toggleExpand(transmittal._id, 'remarks')} style={{ cursor: 'pointer', maxWidth: '150px' }} title={transmittal.remarks || ''}>{transmittal.remarks || "—"}</div>
                      )}
                    </td>
                    {canManage && (
                      <td className="px-3 py-2.5 align-top">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); onEdit(transmittal, 'pending'); }}
                            className="p-1.5 rounded-md hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-colors"
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
                            className="p-1.5 rounded-md hover:bg-red-100 text-red-600 hover:text-red-700 transition-colors"
                            aria-label={`Delete transmittal ${transmittal._id}`}
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTransmittal(transmittal);
                              setShowFTWModal(true);
                            }}
                            className="p-1.5 rounded-md hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 transition-colors"
                            aria-label={`Mark transmittal ${transmittal._id} as FTW`}
                            title="FTW"
                          >
                            <CircleCheckBig size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <PaginationControls
            currentPage={pendingData.page || 1}
            onPageChange={(page) => onPageChange && onPageChange('pending', page)}
            totalItems={pendingData.total ?? pendingItems.length}
            pageSize={pageSize}
            label="pending transmittals"
          />
        </div>
      )}

      {active === 'encode' && (
        <TransmittalEncodeTab
          transmittals={encodeItems}
          onEdit={onEdit}
          onDelete={onDelete}
          onFTW={onFTW}
          pageSize={pageSize}
          canManage={canManage}
          onRefresh={() => onRefreshStatus && onRefreshStatus('encode')}
        />
      )}
      {active === 'process' && (
        <TransmittalProcessTab
          transmittals={processItems}
          onEdit={onEdit}
          onDelete={onDelete}
          onFTW={onFTW}
          pageSize={pageSize}
          canManage={canManage}
          onRefresh={() => onRefreshStatus && onRefreshStatus('process')}
        />
      )}

      {active === 'deployment' && (
        <div>
          {depLoading && <div className="text-sm text-gray-500">Loading...</div>}
          {depError && <div className="text-sm text-red-600">{depError}</div>}

          {!depLoading && !depError && (
            <div className="card overflow-hidden">
              <div className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-300 bg-gray-50">
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Applicant Name</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">RO</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date EMed Uploaded</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date of Insurance</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Waiver</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Clinic Remarks</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Deployed Date</th>
                      {canManage && (
                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(deploymentItems.length === 0) ? (
                      <tr>
                        <td colSpan="9" className="px-3 py-2.5 text-center text-gray-500 text-xs">No transmittals</td>
                      </tr>
                    ) : (
                      deploymentItems.map((t, idx) => (
                        <tr key={t._id} className={`hover:bg-green-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                          <td className="px-3 py-2.5 align-top">
                            <button onClick={() => openApplicantFromDep(t)} className="text-left w-full font-semibold text-green-600 hover:text-green-800 cursor-pointer hover:underline transition-colors text-sm leading-tight">
                              {t.applicantName || (t.applicant && t.applicant.name) || '—'}
                            </button>
                          </td>
                          <td className="px-3 py-2.5 align-top">
                            <span className="text-gray-900 text-xs leading-tight">{(t.applicant && t.applicant.ro) || '—'}</span>
                          </td>
                          <td className="px-3 py-2.5 align-top">
                            <span className="text-gray-700 text-xs leading-tight">{t.dateOfEmedUploaded ? new Date(t.dateOfEmedUploaded).toLocaleString() : '—'}</span>
                          </td>
                          <td className="px-3 py-2.5 align-top">
                            <span className="text-gray-700 text-xs leading-tight">{t.dateOfInsurance ? new Date(t.dateOfInsurance).toLocaleDateString() : '—'}</span>
                          </td>
                          <td className="px-3 py-2.5 align-top">
                            {truthy(t.waiver) ? (
                              <span className="inline-flex items-center justify-center bg-green-100 rounded-full p-1">
                                <CircleCheckBig size={14} className="text-green-700" />
                              </span>
                            ) : (
                              <span className="text-gray-500 text-xs leading-tight">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 align-top">
                            <span className="text-gray-900 text-xs leading-tight break-words block max-w-[150px]">{t.clinicRemarks || '—'}</span>
                          </td>
                          <td className="px-3 py-2.5 align-top">
                            <span className="text-gray-700 text-xs leading-tight">{t.status || '—'}</span>
                          </td>
                          <td className="px-3 py-2.5 align-top">
                            <span className="text-gray-700 text-xs leading-tight">{t.deployedAt ? new Date(t.deployedAt).toLocaleDateString() : '—'}</span>
                          </td>
                          {canManage && (
                            <td className="px-3 py-2.5 align-top">
                              <div className="flex items-center justify-end gap-1.5">
                                <button onClick={() => openDepEditModal(t)} className="p-1.5 rounded-md hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-colors" aria-label={`Edit transmittal ${t._id}`} title="Edit"><Edit size={16} /></button>
                                <button onClick={() => onDelete(t._id)} className="p-1.5 rounded-md hover:bg-red-100 text-red-600 hover:text-red-700 transition-colors" aria-label={`Delete transmittal ${t._id}`} title="Delete"><Trash2 size={16} /></button>
                                {(t.status || '') === 'deployment' && (
                                  <>
                                    <button onClick={() => handleReturnToProcess(t._id)} className="p-1.5 rounded-md hover:bg-orange-100 text-orange-600 hover:text-orange-700 transition-colors" aria-label={`Return transmittal ${t._id} to Process`} title="Return to Process">
                                      <ArrowLeft size={16} />
                                    </button>
                                    <button onClick={() => handleMarkDeployed(t._id)} className="p-1.5 rounded-md hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 transition-colors" aria-label={`Mark transmittal ${t._id} as deployed`} title="Mark Deployed">
                                      <CircleCheckBig size={16} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <PaginationControls
                currentPage={deploymentData.page || 1}
                onPageChange={(page) => onPageChange && onPageChange('deployment', page)}
                totalItems={deploymentData.total ?? sortedDeployment.length}
                pageSize={pageSize}
                label="deployment records"
              />
            </div>
          )}

          {canManage && (
            <DeploymentEditModal
              show={showDepEditModal}
              transmittal={editingDepTransmittal}
              onClose={() => setShowDepEditModal(false)}
              onSave={handleDeploymentSave}
            />
          )}
        </div>
      )}



      <ApplicantViewModal
        show={showViewModal}
        applicant={viewApplicant}
        transmittals={selectedTransmittal ? [selectedTransmittal] : null}
        onClose={() => { setShowViewModal(false); setViewApplicant(null); setSelectedTransmittal(null); }}
      />
      {canManage && (
        <FTWModal
          show={showFTWModal}
          transmittal={selectedTransmittal}
          onClose={() => { setShowFTWModal(false); setSelectedTransmittal(null); }}
          onConfirm={(id, body) => onFTW(id, body)}
        />
      )}
    </div>
  );
}
