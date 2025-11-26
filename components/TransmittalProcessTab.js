"use client";

import React, { useState, useEffect } from "react";
import { Edit, Trash2, CircleCheckBig } from 'lucide-react';
import Swal from 'sweetalert2';
import ApplicantViewModal from './ApplicantViewModal';
import PaginationControls from './PaginationControls'; // make sure this exists

export default function TransmittalProcessTab({
  transmittals,
  onEdit,
  onDelete,
  onFTW,
  PAGE_SIZE = 20,
  currentPage = 1,
  setCurrentPage = () => {}
}) {
  const [expandedKey, setExpandedKey] = useState(null);
  const [viewApplicant, setViewApplicant] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTransmittal, setSelectedTransmittal] = useState(null);

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
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedTransmittals = sortedTransmittals.slice(startIndex, startIndex + PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [totalItems]);

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-hidden">
        <table className="w-full table-auto divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Med/Vax Cert</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date EMed Uploaded</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Biometric</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stamp Visa</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date of Insurance</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Waiver</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedTransmittals.length === 0 ? (
              <tr>
                <td colSpan="9" className="px-6 py-8 text-center text-gray-500">No transmittals in Process</td>
              </tr>
            ) : (
              paginatedTransmittals.map((t) => (
                <tr key={t._id} className="hover:bg-gray-100 even:bg-gray-50">
                  <td className="px-6 py-4 whitespace-normal break-words text-sm font-medium text-gray-900">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRowClick(t); }}
                      className="text-left w-full text-sm font-medium text-indigo-600 hover:underline"
                      aria-label={`View applicant ${t.applicantName || t.applicantId || ''}`}
                      title="View applicant"
                    >
                      {t.applicantName || '—'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-normal text-sm text-gray-900">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1">
                        {truthy(t.medicalCert) ? <span className="text-green-600" title="Medical Cert"><CircleCheckBig size={16} /></span> : <span className="text-gray-300" title="Medical Cert">—</span>}
                        <span className="text-xs text-gray-600">Med</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {truthy(t.vaccineCert) ? <span className="text-green-600" title="Vaccine Cert"><CircleCheckBig size={16} /></span> : <span className="text-gray-300" title="Vaccine Cert">—</span>}
                        <span className="text-xs text-gray-600">Vax</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-normal text-sm text-gray-500">{t.dateOfEmedUploaded ? new Date(t.dateOfEmedUploaded).toLocaleString() : '—'}</td>
                  <td className="px-6 py-4 whitespace-normal text-sm text-gray-900">{truthy(t.biometric) ? <span className="text-green-600"><CircleCheckBig size={16} /></span> : <span className="text-gray-300">—</span>}</td>
                  <td className="px-6 py-4 whitespace-normal text-sm text-gray-900">{truthy(t.stampVisa) ? <span className="text-green-600"><CircleCheckBig size={16} /></span> : <span className="text-gray-300">—</span>}</td>
                  <td className="px-6 py-4 whitespace-normal text-sm text-gray-900">{t.dateOfInsurance ? new Date(t.dateOfInsurance).toLocaleDateString() : '—'}</td>
                  <td className="px-6 py-4 whitespace-normal text-sm text-gray-900">{truthy(t.waiver) ? <span className="text-green-600"><CircleCheckBig size={16} /></span> : <span className="text-gray-300">—</span>}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                    {(expandedKey === `${t._id}:remarks`) ? (
                      <div className="break-words" onClick={(e) => { e.stopPropagation(); toggleExpand(t._id, 'remarks'); }} style={{ cursor: 'pointer' }}>{t.remarks || '—'}</div>
                    ) : (
                      <div className="whitespace-nowrap overflow-hidden truncate" onClick={(e) => { e.stopPropagation(); toggleExpand(t._id, 'remarks'); }} style={{ cursor: 'pointer' }} title={t.remarks || ''}>{t.remarks || '—'}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium min-w-[10rem]">
                    <button onClick={(e) => { e.stopPropagation(); onEdit(t, 'process'); }} className="text-[#0d8c40] hover:text-[#0b7335] mr-4" aria-label={`Edit transmittal ${t._id}`} title="Edit"><Edit size={16} /></button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(t._id); }} className="text-red-600 hover:text-red-900" aria-label={`Delete transmittal ${t._id}`} title="Delete"><Trash2 size={16} /></button>
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
                      className="text-indigo-600 hover:text-indigo-900 ml-3"
                      aria-label={`Move transmittal ${t._id} to Deployment`}
                      title="Move to Deployment"
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
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        totalItems={totalItems}
        pageSize={PAGE_SIZE}
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
