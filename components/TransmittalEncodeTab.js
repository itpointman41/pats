"use client";

import React, { useState, useEffect } from "react";
import { Edit, Trash2, CircleCheckBig, AlertCircle } from 'lucide-react';
import ApplicantViewModal from './ApplicantViewModal';
import ProcessModal from './ProcessModal';
import PaginationControls from "./PaginationControls";

export default function TransmittalEncodeTab({ transmittals, onEdit, onDelete, onFTW, pageSize = 20, canManage = false }) {
  // Single expanded key to ensure only one cell expanded at a time across rows
  const [expandedKey, setExpandedKey] = useState(null);
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

  const [viewApplicant, setViewApplicant] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTransmittal, setSelectedTransmittal] = useState(null);
  const [showProcessModal, setShowProcessModal] = useState(false);
  
  const sortedTransmittals = [...transmittals].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
    const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
    return dateB - dateA; // Newest first
  });
  
  const filteredCount = sortedTransmittals.length;
  const startIndex = (currentPage - 1) * pageSize;
  const pageItems = sortedTransmittals.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredCount, pageSize]);

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
      if (!res.ok) {
        console.error('Failed to load applicant');
        setViewApplicant(null);
        setSelectedTransmittal(t);
        setShowViewModal(true);
        return;
      }
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

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-300 bg-gray-50">
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Waiver</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Findings</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Clinic Remarks</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Remarks</th>
              {canManage && (
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {transmittals.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-3 py-2.5 text-center text-gray-500 text-xs">No transmittals in FTW / Encode</td>
              </tr>
            ) : (
              pageItems.map((t, idx) => {
                const expirationDate = t.medicalExpiration ? new Date(t.medicalExpiration) : null;
                const isExpired = expirationDate && !isNaN(expirationDate.getTime()) && expirationDate < new Date();
                const hasRemed = truthy(t.remed);
                const isNotExpired = expirationDate && !isNaN(expirationDate.getTime()) && expirationDate >= new Date();
                const showYellow = hasRemed && isNotExpired;
                const clinicRemarksText = (t.clinicRemarks || '').toLowerCase();
                const remarksText = (t.remarks || '').toLowerCase();
                const shouldHighlightRow = clinicRemarksText.includes('full mmr vaccine') || remarksText.includes('for encode');
                
                return (
                  <tr key={t._id} className={`hover:bg-green-50/50 transition-colors`} style={{ backgroundColor: shouldHighlightRow ? '#FCE4D6' : undefined }}>
                    <td className="px-3 py-2.5 align-top">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleRowClick(t); }}
                          className={`text-left flex-1 font-semibold hover:text-green-800 cursor-pointer hover:underline transition-colors text-sm leading-tight ${isExpired ? 'text-red-600' : showYellow ? 'text-yellow-600' : 'text-green-600'}`}
                          aria-label={`View applicant ${t.applicantName || t.applicantId || ''}`}
                          title="View applicant"
                        >
                          {t.applicantName || "—"}
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
                      {truthy(t.waiver) ? (
                        <span title="Waiver" className="inline-flex items-center justify-center bg-green-100 rounded-full p-1">
                          <CircleCheckBig size={14} className="text-green-700" />
                        </span>
                      ) : (
                        <span className="text-gray-500 text-xs leading-tight">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <span className="text-gray-900 text-xs leading-tight">{t.findings || "—"}</span>
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      {(expandedKey === `${t._id}:clinicRemarks`) ? (
                        <div className="break-words text-xs leading-tight text-gray-900" onClick={() => toggleExpand(t._id, 'clinicRemarks')} style={{ cursor: 'pointer' }}>{t.clinicRemarks || "—"}</div>
                      ) : (
                        <div className="whitespace-nowrap overflow-hidden truncate text-xs leading-tight text-gray-900" onClick={() => toggleExpand(t._id, 'clinicRemarks')} style={{ cursor: 'pointer', maxWidth: '120px' }} title={t.clinicRemarks || ''}>{t.clinicRemarks || "—"}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      {(expandedKey === `${t._id}:remarks`) ? (
                        <div className="break-words text-xs leading-tight text-gray-900" onClick={() => toggleExpand(t._id, 'remarks')} style={{ cursor: 'pointer' }}>{t.remarks || "—"}</div>
                      ) : (
                        <div className="whitespace-nowrap overflow-hidden truncate text-xs leading-tight text-gray-900" onClick={() => toggleExpand(t._id, 'remarks')} style={{ cursor: 'pointer', maxWidth: '120px' }} title={t.remarks || ''}>{t.remarks || "—"}</div>
                      )}
                    </td>
                    {canManage && (
                      <td className="px-3 py-2.5 align-top">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); onEdit(t, 'encode'); }}
                            className="p-1.5 rounded-md hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-colors"
                            aria-label={`Edit transmittal ${t._id}`}
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onDelete(t._id); }}
                            className="p-1.5 rounded-md hover:bg-red-100 text-red-600 hover:text-red-700 transition-colors"
                            aria-label={`Delete transmittal ${t._id}`}
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTransmittal(t);
                              setShowProcessModal(true);
                            }}
                            className="p-1.5 rounded-md hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 transition-colors"
                            aria-label={`Move transmittal ${t._id} to Process`}
                            title="Send to Process"
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
        totalItems={filteredCount}
        pageSize={pageSize}
        label="FTW entries"
      />
      <ApplicantViewModal
        show={showViewModal}
        applicant={viewApplicant}
        transmittals={selectedTransmittal ? [selectedTransmittal] : null}
        onClose={() => { setShowViewModal(false); setSelectedTransmittal(null); setViewApplicant(null); }}
      />
      {canManage && (
        <ProcessModal
          show={showProcessModal}
          transmittal={selectedTransmittal}
          onClose={() => { setShowProcessModal(false); setSelectedTransmittal(null); }}
          onConfirm={(id, body) => onFTW && onFTW(id, body)}
        />
      )}
    </div>
  );
}
