"use client";

import React, { useState, useEffect } from "react";
import { Edit, Trash2, CircleCheckBig, AlertCircle, ArrowLeft } from 'lucide-react';
import Swal from 'sweetalert2';
import ApplicantViewModal from './ApplicantViewModal';
import PaginationControls from './PaginationControls'; // make sure this exists

export default function TransmittalProcessTab({
  transmittals,
  onEdit,
  onDelete,
  onFTW,
  pageSize = 20,
  canManage = false,
  onRefresh,
}) {
  const [expandedKey, setExpandedKey] = useState(null);
  const [viewApplicant, setViewApplicant] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTransmittal, setSelectedTransmittal] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

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

  const handleRowClick = async (t) => {
    if (t.applicant) {
      setViewApplicant(t.applicant);
      setSelectedTransmittal(t);
      setShowViewModal(true);
      return;
    }
    try {
      const applicantId = t.applicantId;
      if (!applicantId) {
        setViewApplicant(null);
        setSelectedTransmittal(t);
        setShowViewModal(true);
        return;
      }
      const res = await fetch(`/api/admin/applicants?_id=${encodeURIComponent(applicantId)}`, { credentials: 'include' });
      const data = await res.json();
      setViewApplicant(data.applicant || null);
      setSelectedTransmittal(t);
      setShowViewModal(true);
    } catch (err) {
      console.error('Error fetching applicant', err);
      setViewApplicant(null);
      setSelectedTransmittal(t);
      setShowViewModal(true);
    }
  };

  // Sort and paginate transmittals
  const sortedTransmittals = [...transmittals].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
    const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
    return dateB - dateA; // Newest first
  });
  
  const totalItems = sortedTransmittals.length;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedTransmittals = sortedTransmittals.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [totalItems, pageSize]);

  const handleReturnToEncode = async (id) => {
    if (!canManage) return;
    const result = await Swal.fire({
      title: 'Return to Encode?',
      text: 'This will change the transmittal status from Process back to Encode.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, return to Encode',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch('/api/admin/transmittals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ _id: id, status: 'encode' })
      });
      const data = await res.json();
      if (!res.ok) {
        await Swal.fire('Error', data.error || 'Failed to update status', 'error');
        return;
      }
      await Swal.fire('Updated', 'Transmittal returned to Encode.', 'success');
      // Trigger a refresh
      if (onRefresh) {
        onRefresh();
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.error('Return to encode error', err);
      await Swal.fire('Error', 'Failed to update status', 'error');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-300 bg-gray-50">
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Med/Vax Cert</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date EMed Uploaded</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Biometric</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Stamp Visa</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date of Insurance</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Waiver</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Remarks</th>
              {canManage && (
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedTransmittals.length === 0 ? (
              <tr>
                <td colSpan="9" className="px-3 py-2.5 text-center text-gray-500 text-xs">No transmittals in Process</td>
              </tr>
            ) : (
              paginatedTransmittals.map((t, idx) => {
                const expirationDate = t.medicalExpiration ? new Date(t.medicalExpiration) : null;
                const isExpired = expirationDate && !isNaN(expirationDate.getTime()) && expirationDate < new Date();
                const hasRemed = truthy(t.remed);
                const isNotExpired = expirationDate && !isNaN(expirationDate.getTime()) && expirationDate >= new Date();
                const showYellow = hasRemed && isNotExpired;
                
                return (
                <tr key={t._id} className={`hover:bg-green-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <td className="px-3 py-2.5 align-top">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRowClick(t); }}
                        className={`text-left flex-1 font-semibold hover:text-green-800 cursor-pointer hover:underline transition-colors text-sm leading-tight ${isExpired ? 'text-red-600' : showYellow ? 'text-yellow-600' : 'text-green-600'}`}
                        aria-label={`View applicant ${t.applicantName || t.applicantId || ''}`}
                        title="View applicant"
                      >
                        {t.applicantName || '—'}
                      </button>
                      {isExpired && (
                        <div className="relative group flex-shrink-0">
                          <AlertCircle size={16} className="text-red-600 cursor-help" />
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                            Expired Medical
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                      )}
                      {showYellow && (
                        <div className="relative group flex-shrink-0">
                          <AlertCircle size={16} className="text-yellow-600 cursor-help" />
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                            Re-Medical
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1">
                        {truthy(t.medicalCert) ? <span className="text-green-600" title="Medical Cert"><CircleCheckBig size={14} /></span> : <span className="text-gray-300" title="Medical Cert">—</span>}
                        <span className="text-xs text-gray-600">Med</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {truthy(t.vaccineCert) ? <span className="text-green-600" title="Vaccine Cert"><CircleCheckBig size={14} /></span> : <span className="text-gray-300" title="Vaccine Cert">—</span>}
                        <span className="text-xs text-gray-600">Vax</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <span className="text-gray-700 text-xs leading-tight">{t.dateOfEmedUploaded ? new Date(t.dateOfEmedUploaded).toLocaleString() : '—'}</span>
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <span className="text-gray-900 text-xs leading-tight">{truthy(t.biometric) ? <CircleCheckBig size={14} className="text-green-600" /> : '—'}</span>
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <span className="text-gray-900 text-xs leading-tight">{truthy(t.stampVisa) ? <CircleCheckBig size={14} className="text-green-600" /> : '—'}</span>
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <span className="text-gray-700 text-xs leading-tight">{t.dateOfInsurance ? new Date(t.dateOfInsurance).toLocaleDateString() : '—'}</span>
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <span className="text-gray-900 text-xs leading-tight">{truthy(t.waiver) ? <CircleCheckBig size={14} className="text-green-600" /> : '—'}</span>
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    {(expandedKey === `${t._id}:remarks`) ? (
                      <div className="break-words text-xs leading-tight text-gray-900" onClick={(e) => { e.stopPropagation(); toggleExpand(t._id, 'remarks'); }} style={{ cursor: 'pointer' }}>{t.remarks || '—'}</div>
                    ) : (
                      <div className="whitespace-nowrap overflow-hidden truncate text-xs leading-tight text-gray-900" onClick={(e) => { e.stopPropagation(); toggleExpand(t._id, 'remarks'); }} style={{ cursor: 'pointer', maxWidth: '120px' }} title={t.remarks || ''}>{t.remarks || '—'}</div>
                    )}
                  </td>
                  {canManage && (
                    <td className="px-3 py-2.5 align-top">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={(e) => { e.stopPropagation(); onEdit(t, 'process'); }} className="p-1.5 rounded-md hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-colors" aria-label={`Edit transmittal ${t._id}`} title="Edit"><Edit size={16} /></button>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(t._id); }} className="p-1.5 rounded-md hover:bg-red-100 text-red-600 hover:text-red-700 transition-colors" aria-label={`Delete transmittal ${t._id}`} title="Delete"><Trash2 size={16} /></button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReturnToEncode(t._id);
                          }}
                          className="p-1.5 rounded-md hover:bg-orange-100 text-orange-600 hover:text-orange-700 transition-colors"
                          aria-label={`Return transmittal ${t._id} to Encode`}
                          title="Return to Encode"
                        >
                          <ArrowLeft size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const missing = [];
                            if (!t.dateOfEmedUploaded) missing.push('Date EMed Uploaded');
                            if (!t.dateOfInsurance) missing.push('Date of Insurance');
                            if (!truthy(t.biometric)) missing.push('Biometric');
                            if (!truthy(t.stampVisa)) missing.push('Stamp Visa');
                            if (!truthy(t.waiver)) missing.push('Waiver');
                            if (!truthy(t.medicalCert) && !truthy(t.vaccineCert)) missing.push('Medical or Vaccine Certificate');

                            if (missing.length > 0) {
                              Swal.fire('Missing required fields', `Please fill/check: ${missing.join(', ')} before moving to Deployment.`, 'warning');
                              return;
                            }

                            Swal.fire({
                              title: 'Move to Deployment?',
                              text: 'This will change the transmittal status to Deployment.',
                              icon: 'warning',
                              showCancelButton: true,
                              confirmButtonText: 'Yes, move it',
                              cancelButtonText: 'Cancel'
                            }).then((result) => {
                              if (result.isConfirmed) {
                                try {
                                  onFTW && onFTW(t._id, { status: 'deployment' });
                                  Swal.fire('Moved', 'Transmittal moved to Deployment.', 'success');
                                } catch (err) {
                                  Swal.fire('Error', err?.message || 'Failed to update', 'error');
                                }
                              }
                            });
                          }}
                          className="p-1.5 rounded-md hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 transition-colors"
                          aria-label={`Move transmittal ${t._id} to Deployment`}
                          title="Move to Deployment"
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
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        totalItems={totalItems}
        pageSize={pageSize}
        label="Processing Entries"
      />

      <ApplicantViewModal
        show={showViewModal}
        applicant={viewApplicant}
        transmittals={selectedTransmittal ? [selectedTransmittal] : null}
        onClose={() => { setShowViewModal(false); setViewApplicant(null); setSelectedTransmittal(null); }}
      />
    </div>
  );
}
