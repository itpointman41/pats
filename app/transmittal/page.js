'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import NavBarAdmin from "../../components/nav_bar_admin";
import TableFilterBar from "../../components/TableFilterBar";
import TransmittalModal from "../../components/TransmittalModal";
import {
  loadTransmittals as loadTransmittalsAPI,
  deleteTransmittal as deleteTransmittalAPI,
  submitTransmittal as submitTransmittalAPI,
  filterTransmittals,
  getInitialFormData,
  getTransmittalFormData
} from "./handlers";
import Swal from 'sweetalert2';
import { updateTransmittalStatus } from "./handlers";
import TransmittalTabs from "../../components/TransmittalTabs";
import { Plus } from 'lucide-react';
import { usePermissions } from "../../hooks/usePermissions";

const TRANSMITTAL_REFRESH_INTERVAL = 15000; // 15 seconds
const PAGE_SIZE_OPTIONS = [15, 30, 50, 100];
const RESOURCE_KEY = 'transmittals';

export default function TransmittalManagementPage() {
  const [transmittals, setTransmittals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingTransmittal, setEditingTransmittal] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const router = useRouter();
  const { permissions: permissionMap, loading: permsLoading, canRead, canWrite } = usePermissions();
  const canViewTransmittals = canRead(RESOURCE_KEY);
  const canManageTransmittals = canWrite(RESOURCE_KEY);

  // Form state
  const [formData, setFormData] = useState(getInitialFormData());
  const [editingMode, setEditingMode] = useState("pending");

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
          loadTransmittals();
        }
      })
      .catch(() => {
        setAuthLoading(false);
        router.push("/");
      });
  }, [router]);

  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      loadTransmittals();
    }, TRANSMITTAL_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [currentUser]);

  const loadTransmittals = () => {
    loadTransmittalsAPI(setTransmittals, setError, setLoading);
  };

  const handleCreate = () => {
    if (!canManageTransmittals) return;
    setEditingTransmittal(null);
    setFormData(getInitialFormData());
    setEditingMode("pending");
    setShowModal(true);
  };

  // Handle edit called from tabs: onEdit(transmittal, mode)
  const handleEdit = (transmittal, mode) => {
    if (!canManageTransmittals) return;
    setEditingTransmittal(transmittal);
    setFormData(getTransmittalFormData(transmittal));
    setEditingMode(mode || "pending");
    setShowModal(true);
  };

  const handleDelete = (transmittalId) => {
    if (!canManageTransmittals) return;
    deleteTransmittalAPI(
      transmittalId,
      () => loadTransmittals(),
      (error) => Swal.fire('Error', error || 'Failed to delete transmittal', 'error')
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!canManageTransmittals) return;

    submitTransmittalAPI(
      editingTransmittal,
      formData,
      () => {
        setShowModal(false);
        setError("");
        loadTransmittals();
      },
      (error) => setError(error)
    );
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setError("");
  };

  const handleFTWUpdate = (id, updates) => {
    if (!canManageTransmittals) return;
    const body = updates || { status: 'encode', findings: 'FTW' };
    updateTransmittalStatus(id, body, () => loadTransmittals(), (err) => Swal.fire('Error', err || 'Failed to update', 'error'));
  };

  const filteredTransmittals = filterTransmittals(transmittals, searchTerm);

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
      <div className="min-h-screen bg-[var(--surface-muted)] flex items-center justify-center">
        <div className="text-[var(--color-text-muted)]">Loading...</div>
      </div>
    );
  }

  if (!canViewTransmittals) {
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

  return (
    <div className="min-h-screen bg-[var(--surface-muted)]">
      <NavBarAdmin username={currentUser?.username || ""} role={currentUser?.role || "staff"} permissions={permissionMap} />
      <div className="p-6 sm:p-10">
        <div className="max-w-7xl mx-auto space-y-6">
          <TableFilterBar
            subtitle="Pipeline"
            title="Transmittal Management"
            description="Review every phase from pending to deployment."
            searchPlaceholder="Search transmittals..."
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            leadingContent={pageSizeSelector}
            className="mb-4"
            actions={canManageTransmittals ? (
              <button
                type="button"
                onClick={handleCreate}
                className="relative group inline-flex items-center justify-center w-11 h-11 rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-all"
              >
                <span className="absolute right-full mr-2 px-3 py-1 rounded-full bg-gray-900 text-white text-xs font-medium opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all whitespace-nowrap">
                  Add transmittal
                </span>
                <Plus size={18} className="transition-transform group-hover:rotate-90" />
              </button>
            ) : null}
          />

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          {loading ? (
            <div className="text-sm text-[var(--color-text-muted)]">Loading transmittals…</div>
          ) : (
            <TransmittalTabs
              transmittals={filteredTransmittals}
              onEdit={handleEdit}
              onDelete={handleDelete}
              pageSize={pageSize}
              onFTW={handleFTWUpdate}
              canManage={canManageTransmittals}
              onRefresh={loadTransmittals}
            />
          )}
        </div>
      </div>

      {/* Modal */}
      <TransmittalModal
        show={showModal}
        editingTransmittal={editingTransmittal}
        formData={formData}
        error={error}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        onFormChange={setFormData}
        editingMode={editingMode}
      />
    </div>
  );
}

