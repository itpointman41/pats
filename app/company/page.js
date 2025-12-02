'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import NavBarAdmin from "../../components/nav_bar_admin";
import TableFilterBar from "../../components/TableFilterBar";
import PaginationControls from "../../components/PaginationControls";
import { Edit, Trash2, Plus } from 'lucide-react';
import Swal from 'sweetalert2';
import CompanyModal from "../../components/CompanyModal";
import {
  loadCompanies as loadCompaniesAPI,
  deleteCompany as deleteCompanyAPI,
  submitCompany as submitCompanyAPI,
  filterCompanies,
  getInitialFormData,
  getCompanyFormData
} from "./handlers";
import { usePermissions } from "../../hooks/usePermissions";

const PAGE_SIZE_OPTIONS = [15, 30, 50, 100];
const RESOURCE_KEY = 'companies';

export default function CompaniesManagementPage() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const router = useRouter();

  // Form state
  const [formData, setFormData] = useState(getInitialFormData());
  const { permissions: permissionMap, loading: permsLoading, canRead, canWrite } = usePermissions();
  const canViewCompanies = canRead(RESOURCE_KEY);
  const canManageCompanies = canWrite(RESOURCE_KEY);

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
            loadCompanies();
          }
        })
      .catch(() => {
        setAuthLoading(false);
        router.push("/");
      });
  }, [router]);

  const loadCompanies = () => {
    loadCompaniesAPI(setCompanies, setError, setLoading);
  };

  const handleCreate = () => {
    if (!canManageCompanies) return;
    setEditingCompany(null);
    setFormData(getInitialFormData());
    setShowModal(true);
  };

  const handleEdit = (company) => {
    if (!canManageCompanies) return;
    setEditingCompany(company);
    setFormData(getCompanyFormData(company));
    setShowModal(true);
  };

  const handleDelete = (companyId) => {
    if (!canManageCompanies) return;
    deleteCompanyAPI(
      companyId,
      () => loadCompanies(),
      (error) => Swal.fire('Error', error || 'Failed to delete company', 'error')
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!canManageCompanies) {
      Swal.fire('Permission denied', 'You do not have access to modify companies.', 'warning');
      return;
    }

    submitCompanyAPI(
      editingCompany,
      formData,
      () => {
        setShowModal(false);
        setError("");
        loadCompanies();
      },
      (error) => setError(error)
    );
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setError("");
  };

  const filteredCompanies = filterCompanies(companies, searchTerm);
  const filteredCount = filteredCompanies.length;
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filteredCount, pageSize]);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedCompanies = filteredCompanies.slice(startIndex, startIndex + pageSize);

  const handlePageSizeChange = (event) => {
    setPageSize(Number(event.target.value));
  };

  if (authLoading || permsLoading) {
    return (
      <div className="min-h-screen bg-[var(--surface-muted)] flex items-center justify-center">
        <div className="text-[var(--color-text-muted)]">Loading...</div>
      </div>
    );
  }

  if (!canViewCompanies) {
    return (
      <div className="min-h-screen bg-[var(--surface-muted)]">
        <NavBarAdmin username={currentUser?.username || ""} role={currentUser?.role || "staff"} permissions={permissionMap} />
        <div className="p-6 sm:p-10">
          <div className="max-w-3xl mx-auto">
            <div className="card p-6 text-center text-sm text-red-600">
              You do not have permission to view this page.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tableColumnCount = canManageCompanies ? 5 : 4;

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

  return (
    <div className="min-h-screen bg-[var(--surface-muted)]">
      <NavBarAdmin username={currentUser?.username || ""} role={currentUser?.role || "staff"} permissions={permissionMap} />
      <div className="p-6 sm:p-10">
        <div className="max-w-7xl mx-auto space-y-8">
          <TableFilterBar
            subtitle="Organizations"
            title="Company Management"
            description="Manage company records and registration details."
            searchPlaceholder="Search companies..."
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            leadingContent={pageSizeSelector}
            className="mb-4"
            actions={canManageCompanies ? (
              <button
                type="button"
                onClick={handleCreate}
                className="relative group inline-flex items-center justify-center w-11 h-11 rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-all"
              >
                <span className="absolute right-full mr-2 px-3 py-1 rounded-full bg-gray-900 text-white text-xs font-medium opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all whitespace-nowrap">
                  Add company
                </span>
                <Plus size={18} className="transition-transform group-hover:rotate-90" />
              </button>
            ) : null}
          />

          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-sm text-[var(--color-text-muted)]">Loading companies…</div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-300 bg-gray-50">
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Company Name</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">CRN</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date Approve</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date Expiry</th>
                      {canManageCompanies && (
                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedCompanies.length === 0 ? (
                      <tr>
                        <td colSpan={tableColumnCount} className="px-3 py-2.5 text-center text-gray-500 text-xs">No companies found</td>
                      </tr>
                    ) : (
                      paginatedCompanies.map((company, idx) => (
                        <tr key={company._id} className={`hover:bg-green-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                          <td className="px-3 py-2.5 align-top">
                            <div className="text-xs font-semibold text-gray-900 leading-tight">
                              {company.companyName || "—"}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 align-top">
                            <div className="text-xs text-gray-700 leading-tight font-mono">
                              {company.crn || "—"}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 align-top">
                            <span className="text-gray-700 text-xs leading-tight">
                              {company.dateApprove 
                                ? new Date(company.dateApprove).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric', 
                                    year: 'numeric' 
                                  })
                                : "—"}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 align-top">
                            <span className="text-gray-700 text-xs leading-tight">
                              {company.dateExpiry 
                                ? new Date(company.dateExpiry).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric', 
                                    year: 'numeric' 
                                  })
                                : "—"}
                            </span>
                          </td>
                          {canManageCompanies && (
                            <td className="px-3 py-2.5 align-top">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleEdit(company)}
                                  className="p-1.5 rounded-md hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-colors"
                                  title="Edit"
                                  aria-label={`Edit ${company.companyName || company._id}`}
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={() => handleDelete(company._id)}
                                  className="p-1.5 rounded-md hover:bg-red-100 text-red-600 hover:text-red-700 transition-colors"
                                  title="Delete"
                                  aria-label={`Delete ${company.companyName || company._id}`}
                                >
                                  <Trash2 size={16} />
                                </button>
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
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                totalItems={filteredCount}
                pageSize={pageSize}
                label="companies"
              />
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {canManageCompanies && (
        <CompanyModal
          show={showModal}
          editingCompany={editingCompany}
          formData={formData}
          error={error}
          onClose={handleCloseModal}
          onSubmit={handleSubmit}
          onFormChange={setFormData}
        />
      )}
    </div>
  );
}

