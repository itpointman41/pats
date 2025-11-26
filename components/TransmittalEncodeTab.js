"use client";

import React, { useState, useEffect } from "react";
import { Edit, Trash2, CircleCheckBig } from 'lucide-react';
import ApplicantViewModal from './ApplicantViewModal';
import ProcessModal from './ProcessModal';
import PaginationControls from "./PaginationControls";

const PAGE_SIZE = 20;

export default function TransmittalEncodeTab({ transmittals, onEdit, onDelete, onFTW }) {
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
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = sortedTransmittals.slice(startIndex, startIndex + PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredCount]);

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
        <table className="w-full table-auto divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Waiver</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Findings</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clinic Remarks</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transmittals.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-gray-500">No transmittals in FTW / Encode</td>
              </tr>
            ) : (
              pageItems.map((t) => (
                  <tr key={t._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-normal break-words">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRowClick(t); }}
                        className="text-left w-full text-sm font-medium text-indigo-600 hover:underline"
                        aria-label={`View applicant ${t.applicantName || t.applicantId || ''}`}
                        title="View applicant"
                      >
                        {t.applicantName || "—"}
                      </button>
                  </td>
                  <td className="px-6 py-4 whitespace-normal text-sm text-gray-900">
                    {truthy(t.waiver) ? (
                      <span title="Waiver" className="inline-flex items-center justify-center bg-green-100 rounded-full p-1">
                        <CircleCheckBig size={16} className="text-green-700" />
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{t.findings || "—"}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                    {(expandedKey === `${t._id}:clinicRemarks`) ? (
                      <div className="break-words" onClick={() => toggleExpand(t._id, 'clinicRemarks')} style={{ cursor: 'pointer' }}>{t.clinicRemarks || "—"}</div>
                    ) : (
                      <div className="whitespace-nowrap overflow-hidden truncate" onClick={() => toggleExpand(t._id, 'clinicRemarks')} style={{ cursor: 'pointer' }} title={t.clinicRemarks || ''}>{t.clinicRemarks || "—"}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                    {(expandedKey === `${t._id}:remarks`) ? (
                      <div className="break-words" onClick={() => toggleExpand(t._id, 'remarks')} style={{ cursor: 'pointer' }}>{t.remarks || "—"}</div>
                    ) : (
                      <div className="whitespace-nowrap overflow-hidden truncate" onClick={() => toggleExpand(t._id, 'remarks')} style={{ cursor: 'pointer' }} title={t.remarks || ''}>{t.remarks || "—"}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium min-w-[10rem]">
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(t, 'encode'); }}
                      className="text-[#0d8c40] hover:text-[#0b7335] mr-4"
                      aria-label={`Edit transmittal ${t._id}`}
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>

                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(t._id); }}
                      className="text-red-600 hover:text-red-900"
                      aria-label={`Delete transmittal ${t._id}`}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                    
                    {/* Move from encode -> process */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTransmittal(t);
                        setShowProcessModal(true);
                      }}
                      className="text-indigo-600 hover:text-indigo-900 ml-3"
                      aria-label={`Move transmittal ${t._id} to Process`}
                      title="Send to Process"
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
        totalItems={filteredCount}
        pageSize={PAGE_SIZE}
        label="FTW entries"
      />
      <ApplicantViewModal
        show={showViewModal}
        applicant={viewApplicant}
        transmittals={selectedTransmittal ? [selectedTransmittal] : null}
        onClose={() => { setShowViewModal(false); setSelectedTransmittal(null); setViewApplicant(null); }}
      />
      <ProcessModal
        show={showProcessModal}
        transmittal={selectedTransmittal}
        onClose={() => { setShowProcessModal(false); setSelectedTransmittal(null); }}
        onConfirm={(id, body) => onFTW && onFTW(id, body)}
      />
    </div>
  );
}
