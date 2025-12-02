'use client';

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import NavBarAdmin from "./nav_bar_admin";
import TableFilterBar from "./TableFilterBar";
import TransmittalModal from "./TransmittalModal";
import {
  deleteTransmittal as deleteTransmittalAPI,
  submitTransmittal as submitTransmittalAPI,
  getInitialFormData,
  getTransmittalFormData
} from "../app/transmittal/handlers";
import { updateTransmittalStatus } from "../app/transmittal/handlers";
import TransmittalTabs from "./TransmittalTabs";
import Swal from "sweetalert2";
import { Plus } from "lucide-react";
import { usePermissions } from "../hooks/usePermissions";

const TRANSMITTAL_REFRESH_INTERVAL = 15000; // 15 seconds
const PAGE_SIZE_OPTIONS = [15, 30, 50, 100];
const RESOURCE_KEY = "transmittals";
const TAB_KEYS = ["pending", "encode", "process", "deployment"];

const createInitialTabState = () =>
  TAB_KEYS.reduce((acc, status) => {
    acc[status] = { items: [], total: 0, page: 1, loading: false, error: null };
    return acc;
  }, {});

export default function TransmittalManagementPage() {
  const [tabData, setTabData] = useState(() => createInitialTabState());
  const [activeTab, setActiveTab] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingTransmittal, setEditingTransmittal] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const router = useRouter();
  const {
    permissions: permissionMap,
    loading: permsLoading,
    canRead,
    canWrite
  } = usePermissions();
  const canViewTransmittals = canRead(RESOURCE_KEY);
  const canManageTransmittals = canWrite(RESOURCE_KEY);
  const activeTabRef = useRef(activeTab);
  const tabDataRef = useRef(tabData);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    tabDataRef.current = tabData;
  }, [tabData]);

  const handleTabChange = (status) => {
    setActiveTab(status);
  };

  const handlePageChange = (status, pageNumber) => {
    setTabData((prev) => ({
      ...prev,
      [status]: {
        ...prev[status],
        page: pageNumber
      }
    }));
    if (status === activeTab) {
      setLoading(true);
    }
    fetchTabData(status, pageNumber);
  };

  const fetchTabData = useCallback(
    async (status, pageNumber = 1, silent = false) => {
      setTabData((prev) => ({
        ...prev,
        [status]: {
          ...prev[status],
          loading: true,
          error: null
        }
      }));

      try {
        const effectiveLimit =
          status === "pending" || status === "deployment" ? pageSize : 500;
        const params = new URLSearchParams({
          status,
          page: pageNumber.toString(),
          limit: effectiveLimit.toString()
        });

        if (searchTerm) {
          params.append("search", searchTerm);
        }

        const res = await fetch(`/api/admin/transmittals?${params.toString()}`, {
          credentials: "include"
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load transmittals");
        }

        setTabData((prev) => ({
          ...prev,
          [status]: {
            ...prev[status],
            items: data.transmittals || [],
            total: data.pagination?.total ?? data.transmittals?.length ?? 0,
            page: data.pagination?.page ?? pageNumber,
            loading: false,
            error: null
          }
        }));
      } catch (err) {
        setTabData((prev) => ({
          ...prev,
          [status]: {
            ...prev[status],
            loading: false,
            error: err.message || "Failed to load transmittals"
          }
        }));
        setError(err.message || "Failed to load transmittals");
      } finally {
        if (!silent && status === activeTabRef.current) {
          setLoading(false);
        }
      }
    },
    [pageSize, searchTerm]
  );

  const refreshStatus = useCallback(
    (status) => {
      const currentPage = tabDataRef.current[status]?.page || 1;
      fetchTabData(status, currentPage);
    },
    [fetchTabData]
  );

  const refreshActiveTab = useCallback(() => {
    refreshStatus(activeTabRef.current);
  }, [refreshStatus]);

  useEffect(() => {
    fetch("/api/auth/check", {
      credentials: "include"
    })
      .then((res) => res.json())
      .then((data) => {
        setAuthLoading(false);
        if (!data.authenticated) {
          router.push("/");
        } else {
          setCurrentUser(data);
          setLoading(true);
          fetchTabData("pending", 1);
        }
      })
      .catch(() => {
        setAuthLoading(false);
        router.push("/");
      });
  }, [router, fetchTabData]);

  useEffect(() => {
    if (!currentUser || !canViewTransmittals) return;
    const interval = setInterval(() => {
      const status = activeTabRef.current;
      const currentPage = tabDataRef.current[status]?.page || 1;
      fetchTabData(status, currentPage, true);
    }, TRANSMITTAL_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [currentUser, canViewTransmittals, fetchTabData]);

  useEffect(() => {
    if (!currentUser || !canViewTransmittals) return;
    setTabData(createInitialTabState());
    setLoading(true);
    fetchTabData(activeTabRef.current, 1);
  }, [searchTerm, pageSize, currentUser, canViewTransmittals, fetchTabData]);

  useEffect(() => {
    if (!currentUser || !canViewTransmittals) return;
    const current = tabData[activeTab];
    if (!current.items.length && !current.loading) {
      setLoading(true);
      fetchTabData(activeTab, current.page || 1);
    } else {
      setLoading(false);
    }
  }, [activeTab, tabData, currentUser, canViewTransmittals, fetchTabData]);

  // Form state
  const [formData, setFormData] = useState(getInitialFormData());
  const [editingMode, setEditingMode] = useState("pending");

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
      () => refreshActiveTab(),
      (err) => Swal.fire("Error", err || "Failed to delete transmittal", "error")
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
        const targetStatus = editingMode || activeTabRef.current;
        refreshStatus(targetStatus);
        refreshActiveTab();
      },
      (err) => setError(err)
    );
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setError("");
  };

  const handleFTWUpdate = (id, updates) => {
    if (!canManageTransmittals) return;
    const body = updates || { status: "encode", findings: "FTW" };
    updateTransmittalStatus(
      id,
      body,
      () => {
        refreshActiveTab();
        if (body.status) {
          refreshStatus(body.status);
        }
      },
      (err) => Swal.fire("Error", err || "Failed to update", "error")
    );
  };

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
        <NavBarAdmin
          username={currentUser?.username || ""}
          role={currentUser?.role || "staff"}
          permissions={permissionMap}
        />
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
      <NavBarAdmin
        username={currentUser?.username || ""}
        role={currentUser?.role || "staff"}
        permissions={permissionMap}
      />
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
            actions={
              canManageTransmittals ? (
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
              ) : null
            }
          />

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          {loading && (
            <div className="text-sm text-[var(--color-text-muted)]">
              Loading transmittals…
            </div>
          )}
          <TransmittalTabs
            data={tabData}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onPageChange={handlePageChange}
            onRefreshStatus={refreshStatus}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onFTW={handleFTWUpdate}
            pageSize={pageSize}
            canManage={canManageTransmittals}
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


