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

const TRANSMITTAL_REFRESH_INTERVAL = 15000; // 15 seconds

export default function TransmittalManagementPage() {
  const [transmittals, setTransmittals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingTransmittal, setEditingTransmittal] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const router = useRouter();

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
    setEditingTransmittal(null);
    setFormData(getInitialFormData());
    setEditingMode("pending");
    setShowModal(true);
  };

  // Handle edit called from tabs: onEdit(transmittal, mode)
  const handleEdit = (transmittal, mode) => {
    setEditingTransmittal(transmittal);
    setFormData(getTransmittalFormData(transmittal));
    setEditingMode(mode || "pending");
    setShowModal(true);
  };

  const handleDelete = (transmittalId) => {
    deleteTransmittalAPI(
      transmittalId,
      () => loadTransmittals(),
      (error) => Swal.fire('Error', error || 'Failed to delete transmittal', 'error')
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

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

  const filteredTransmittals = filterTransmittals(transmittals, searchTerm);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[var(--surface-muted)] flex items-center justify-center">
        <div className="text-[var(--color-text-muted)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface-muted)]">
      <NavBarAdmin username={currentUser?.username || ""} role={currentUser?.role || "staff"} />
      <div className="p-6 sm:p-10">
        <div className="max-w-7xl mx-auto space-y-6">
          <TableFilterBar
            subtitle="Pipeline"
            title="Transmittal Management"
            description="Review every phase from pending to deployment."
            searchPlaceholder="Search transmittals..."
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            className="mb-4"
            actions={(
              <button
                onClick={handleCreate}
                className="btn-primary space-x-2 w-full sm:w-auto"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Transmittal</span>
              </button>
            )}
          />

          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Transmittals Tabs (Pending / FTW - For Encode) */}
          <TransmittalTabs
            transmittals={filteredTransmittals}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onFTW={(id, updates) => {
              // If updates provided, use them; otherwise default to pending -> encode with findings FTW
              const body = updates || { status: 'encode', findings: 'FTW' };
              updateTransmittalStatus(id, body, () => loadTransmittals(), (err) => Swal.fire('Error', err || 'Failed to update', 'error'));
            }}
          />
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

