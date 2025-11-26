'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import NavBarAdmin from "../../components/nav_bar_admin";
import TableFilterBar from "../../components/TableFilterBar";
import PaginationControls from "../../components/PaginationControls";
import { Edit, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';
import ApplicantModal from "../../components/ApplicantModal";
import ApplicantViewModal from "../../components/ApplicantViewModal";
import {
  loadApplicants as loadApplicantsAPI,
  deleteApplicant as deleteApplicantAPI,
  submitApplicant as submitApplicantAPI,
  filterApplicants,
  getInitialFormData,
  getApplicantFormData
} from "./handlers";

const APPLICANT_REFRESH_INTERVAL = 15000; // 15 seconds

export default function ApplicantsManagementPage() {
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingApplicant, setEditingApplicant] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const router = useRouter();

  // Form state
  const [formData, setFormData] = useState(getInitialFormData());

  useEffect(() => {
    // Get current user info
    fetch("/api/auth/check", {
      credentials: 'include'
    })
      .then((res) => res.json())
        .then((data) => {
          setAuthLoading(false);
          if (!data.authenticated) {
            router.push("/");
          } else {
            setCurrentUser(data);
            loadApplicants();
          }
        })
      .catch(() => {
        setAuthLoading(false);
        router.push("/");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      loadApplicantsAPI(setApplicants, setError, setLoading);
    }, APPLICANT_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [currentUser]);

  const loadApplicants = () => {
    loadApplicantsAPI(setApplicants, setError, setLoading);
  };

  const handleCreate = () => {
    setEditingApplicant(null);
    setFormData(getInitialFormData());
    setShowModal(true);
  };

  const handleEdit = (applicant) => {
    setEditingApplicant(applicant);
    setFormData(getApplicantFormData(applicant));
    setShowModal(true);
  };

  const [viewApplicant, setViewApplicant] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  const handleRowClick = (applicant) => {
    setViewApplicant(applicant);
    setShowViewModal(true);
  };

  const handleDelete = async (applicantId) => {
    const result = await Swal.fire({
      title: 'Delete applicant?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    deleteApplicantAPI(
      applicantId,
      () => loadApplicants(),
      (error) => Swal.fire('Error', error || 'Failed to delete applicant', 'error')
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    submitApplicantAPI(
      editingApplicant,
      formData,
      () => {
        setShowModal(false);
        setError("");
        loadApplicants();
      },
      (error) => setError(error)
    );
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setError("");
  };

  // Filtering + pagination
  const filteredApplicants = filterApplicants(applicants, searchTerm);

  // Sort by date created (newest first)
  const sortedApplicants = [...filteredApplicants].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
    const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
    return dateB - dateA; // Newest first
  });

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredCount = sortedApplicants.length;
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedApplicants = sortedApplicants.slice(startIndex, startIndex + PAGE_SIZE);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface-muted)]">
      <NavBarAdmin username={currentUser?.username || ""} role={currentUser?.role || "staff"} />
      <div className="p-6 sm:p-10">
        <div className="max-w-7xl mx-auto">
          <TableFilterBar
            subtitle="Operations"
            title="Applicant Management"
            searchPlaceholder="Search applicants..."
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            className="mb-6"
            actions={(
              <button
                onClick={handleCreate}
                className="btn-primary space-x-2 w-full sm:w-auto"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Applicant</span>
              </button>
            )}
          />

          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-50/80 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Applicants Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-[var(--surface-accent)] sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">R.O.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredApplicants.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">No applicants found</td>
                    </tr>
                  ) : (
                    paginatedApplicants.map((user) => (
                      <tr
                        key={user._id}
                        className="hover:bg-[var(--surface-muted)] even:bg-white cursor-pointer transition-colors"
                        onClick={() => handleRowClick(user)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.position || "—"}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.company || "—"}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.phoneNumber || "—"}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.ro || "—"}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEdit(user); }}
                            className="p-1 rounded hover:bg-gray-100 text-[var(--color-secondary)] mr-3"
                            title="Edit"
                            aria-label={`Edit ${user.name || user._id}`}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(user._id); }}
                            className="p-1 rounded hover:bg-gray-100 text-red-600"
                            title="Delete"
                            aria-label={`Delete ${user.name || user._id}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <PaginationControls
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            totalItems={filteredCount}
            pageSize={PAGE_SIZE}
            label="applicants"
          />
        </div>
      </div>

      {/* Modal */}
      <ApplicantModal
        show={showModal}
        editingApplicant={editingApplicant}
        formData={formData}
        error={error}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        onFormChange={setFormData}
      />
      <ApplicantViewModal
        show={showViewModal}
        applicant={viewApplicant}
        onClose={() => setShowViewModal(false)}
      />
    </div>
  );
}


