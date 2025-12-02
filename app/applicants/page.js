'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import NavBarAdmin from "../../components/nav_bar_admin";
import TableFilterBar from "../../components/TableFilterBar";
import PaginationControls from "../../components/PaginationControls";
import { Edit, Trash2, Plus } from 'lucide-react';
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
import { usePermissions } from "../../hooks/usePermissions";

const APPLICANT_REFRESH_INTERVAL = 15000; // 15 seconds
const PAGE_SIZE_OPTIONS = [15, 30, 50, 100];
const RESOURCE_KEY = 'applicants';

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
  const { permissions: permissionMap, loading: permsLoading, canRead, canWrite } = usePermissions();
  const canViewApplicants = canRead(RESOURCE_KEY);
  const canManageApplicants = canWrite(RESOURCE_KEY);

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
    if (!canManageApplicants) return;
    setEditingApplicant(null);
    setFormData(getInitialFormData());
    setShowModal(true);
  };

  const handleEdit = (applicant) => {
    if (!canManageApplicants) return;
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

    if (!canManageApplicants) return;
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
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  const filteredCount = sortedApplicants.length;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedApplicants = sortedApplicants.slice(startIndex, startIndex + pageSize);

  const handlePageSizeChange = (event) => {
    setPageSize(Number(event.target.value));
  };

  const pageSizeSelector = (
    <div className="flex items-center gap-2">
      <label className="text-xs uppercase tracking-wide text-gray-500">
        Rows
      </label>
      <select
        value={pageSize}
        onChange={handlePageSizeChange}
        className="px-3 py-1.5 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#0d8c40]"
      >
        {PAGE_SIZE_OPTIONS.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </div>
  );

  if (authLoading || permsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!canViewApplicants) {
    return (
      <div className="min-h-screen bg-[var(--surface-muted)]">
        <NavBarAdmin username={currentUser?.username || ""} role={currentUser?.role || "staff"} permissions={permissionMap} />
        <div className="p-6 sm:p-10">
          <div className="max-w-4xl mx-auto">
            <div className="card p-6 text-center text-sm text-red-600">
              You do not have permission to view this page.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface-muted)]">
      <NavBarAdmin username={currentUser?.username || ""} role={currentUser?.role || "staff"} permissions={permissionMap} />
      <div className="p-6 sm:p-10">
        <div className="max-w-7xl mx-auto">
          <TableFilterBar
            subtitle="Operations"
            title="Applicant Management"
            searchPlaceholder="Search applicants..."
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            leadingContent={pageSizeSelector}
            className="mb-6"
            actions={canManageApplicants ? (
              <button
                type="button"
                onClick={handleCreate}
                className="relative group inline-flex items-center justify-center w-11 h-11 rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-all"
              >
                <span className="absolute right-full mr-2 px-3 py-1 rounded-full bg-gray-900 text-white text-xs font-medium opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all whitespace-nowrap">
                  Add applicant
                </span>
                <Plus size={18} className="transition-transform group-hover:rotate-90" />
              </button>
            ) : null}
          />

          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-50/80 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-sm text-gray-600">Loading applicants…</div>
          ) : (
            <>
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-300 bg-gray-50">
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Position</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Company</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Phone Number</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">R.O.</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Created At</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredApplicants.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-3 py-2.5 text-center text-gray-500 text-xs">No applicants found</td>
                        </tr>
                      ) : (
                        paginatedApplicants.map((user, idx) => (
                          <tr
                            key={user._id}
                            className={`hover:bg-green-50/50 transition-colors cursor-pointer ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                            onClick={() => handleRowClick(user)}
                          >
                            <td className="px-3 py-2.5 align-top">
                              <span className="text-gray-900 text-xs leading-tight font-semibold">{user.name}</span>
                            </td>
                            <td className="px-3 py-2.5 align-top">
                              <span className="text-gray-900 text-xs leading-tight">{user.position || "—"}</span>
                            </td>
                            <td className="px-3 py-2.5 align-top">
                              <span className="text-gray-900 text-xs leading-tight">{user.company || "—"}</span>
                            </td>
                            <td className="px-3 py-2.5 align-top">
                              <span className="text-gray-900 text-xs leading-tight">{user.phoneNumber || "—"}</span>
                            </td>
                            <td className="px-3 py-2.5 align-top">
                              <span className="text-gray-900 text-xs leading-tight">{user.ro || "—"}</span>
                            </td>
                            <td className="px-3 py-2.5 align-top">
                              <span className="text-gray-700 text-xs leading-tight">
                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 align-top">
                              {canManageApplicants ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleEdit(user); }}
                                    className="p-1.5 rounded-md hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-colors"
                                    title="Edit"
                                    aria-label={`Edit ${user.name || user._id}`}
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(user._id); }}
                                    className="p-1.5 rounded-md hover:bg-red-100 text-red-600 hover:text-red-700 transition-colors"
                                    title="Delete"
                                    aria-label={`Delete ${user.name || user._id}`}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              ) : (
                                <div className="text-xs text-gray-400 text-right">Read only</div>
                              )}
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
                pageSize={pageSize}
                label="applicants"
              />
            </>
          )}
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


