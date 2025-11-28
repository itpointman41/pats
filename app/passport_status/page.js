'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import NavBarAdmin from '../../components/nav_bar_admin';
import PaginationControls from '../../components/PaginationControls';
import TableFilterBar from '../../components/TableFilterBar';
import PassportStatusModal from '../../components/PassportStatusModal';
import PassportStatusViewModal from '../../components/PassportStatusViewModal';
import { Edit, Trash2, Plus, SlidersHorizontal } from 'lucide-react';
import Swal from 'sweetalert2';
import { usePermissions } from "../../hooks/usePermissions";

const PASSPORT_REFRESH_INTERVAL = 20000; // 20 seconds
const PAGE_SIZE_OPTIONS = [15, 30, 50, 100];
const RESOURCE_KEY = 'passports';

export default function PassportStatusPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [rows, setRows] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState('depositDate');
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const sortDropdownRef = useRef(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [modalMode, setModalMode] = useState('edit');
    const [editingRecord, setEditingRecord] = useState(null);
    const [showViewModal, setShowViewModal] = useState(false);
    const [viewPassport, setViewPassport] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
    const [applicants, setApplicants] = useState([]);
    const [applicantsLoading, setApplicantsLoading] = useState(false);
    const { permissions: permissionMap, loading: permsLoading, canRead, canWrite } = usePermissions();
    const canViewPassports = canRead(RESOURCE_KEY);
    const canManagePassports = canWrite(RESOURCE_KEY);
    useEffect(() => {
        if (!showSortDropdown) return;
        const handleClick = (event) => {
            if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target)) {
                setShowSortDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [showSortDropdown]);

    const fetchPassports = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await fetch('/api/admin/passports', { credentials: 'include' });
            if (!res.ok) {
                const text = await res.text().catch(() => null);
                console.error('Passports fetch error', res.status, text);
                setError(text || `Failed to load (${res.status})`);
                setRows([]);
            } else {
                const data = await res.json().catch(async (err) => {
                    const text = await res.text().catch(() => null);
                    console.error('Passports JSON parse error', err, text);
                    throw err;
                });
                setRows(data.passports || []);
            }
        } catch (err) {
            console.error('Fetch error', err);
            setError('Failed to load');
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchApplicants = useCallback(async () => {
        setApplicantsLoading(true);
        try {
            const res = await fetch('/api/admin/applicants', { credentials: 'include' });
            if (!res.ok) return;
            const data = await res.json().catch(() => ({ applicants: [] }));
            setApplicants(data.applicants || []);
        } catch (err) {
            console.error('Applicants fetch error', err);
        } finally {
            setApplicantsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetch('/api/auth/check', { credentials: 'include' })
                .then((res) => res.json())
                .then((data) => {
                    setAuthLoading(false);
                    if (!data.authenticated) {
                        router.push('/');
                    } else {
                        setCurrentUser(data);
                        fetchPassports();
                    }
                })
            .catch(() => {
                setAuthLoading(false);
                router.push('/');
            });
    }, [router, fetchPassports, fetchApplicants]);

    useEffect(() => {
        if (!currentUser) return;
        const interval = setInterval(() => fetchPassports(true), PASSPORT_REFRESH_INTERVAL);
        return () => clearInterval(interval);
    }, [currentUser, fetchPassports]);

    useEffect(() => {
        if (!currentUser || !canManagePassports) return;
        fetchApplicants();
    }, [currentUser, canManagePassports, fetchApplicants]);

    const fmtDate = (v) => {
        if (!v) return '—';
        try {
            const d = new Date(v);
            if (isNaN(d.getTime())) return '—';
            return d.toLocaleDateString();
        } catch (e) {
            return '—';
        }
    };

    const filteredRows = useMemo(() => {
        const term = (searchTerm || '').toLowerCase().trim();
        const filtered = !term ? rows : (rows || []).filter(t => {
            const fields = [
                t.applicantName,
                t.passportNos,
                t.naNo,
                t.remarks,
                t.passportExpiry,
                t.withdrawalReason
            ];
            return fields.some(f => f && String(f).toLowerCase().includes(term));
        });
        
        const dateFor = (row) => {
            const value = sortField === 'withdrawalDate' ? row.withdrawalDate : row.depositDate;
            return value ? new Date(value) : new Date(0);
        };

        return [...filtered].sort((a, b) => dateFor(b) - dateFor(a));
    }, [rows, searchTerm, sortField]);

    const filteredCount = filteredRows.length;
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filteredCount, pageSize]);

    const startIndex = (currentPage - 1) * pageSize;
    const paginatedRows = filteredRows.slice(startIndex, startIndex + pageSize);

    const openEdit = (record) => {
        if (!canManagePassports) return;
        setModalMode('edit');
        setEditingRecord({ ...record });
        setShowEditModal(true);
    };

    const openView = (passportDoc) => {
        setViewPassport(passportDoc);
        setShowViewModal(true);
    };

    const handleDelete = async (passportId) => {
        if (!canManagePassports) return;
        if (!passportId) {
            await Swal.fire('No passport record ...', '', 'info');
            return;
        }

        const result = await Swal.fire({
            title: 'Confirm delete',
            text: 'This will permanently delete the passport record.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel'
        });
        if (!result.isConfirmed) return;

        try {
            const res = await fetch(`/api/admin/passports?_id=${encodeURIComponent(passportId)}`, { method: 'DELETE', credentials: 'include' });
            if (!res.ok) {
                const text = await res.text().catch(() => null);
                console.error('Passport delete error', res.status, text);
                await Swal.fire('Error', text || `Failed to delete (${res.status})`, 'error');
                return;
            }
            await fetchPassports();
            await Swal.fire('Passport deleted', '', 'success');
        } catch (err) {
            console.error('Delete error', err);
            await Swal.fire('Error', 'Failed to delete passport', 'error');
        }
    };

    if (authLoading || permsLoading) {
        return (
            <div className="min-h-screen bg-[var(--surface-muted)] flex items-center justify-center">
                <div className="text-[var(--color-text-muted)]">Loading...</div>
            </div>
        );
    }

    if (!canViewPassports) {
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

    return (
        <div className="min-h-screen bg-[var(--surface-muted)]">
            <NavBarAdmin username={currentUser?.username || ""} role={currentUser?.role || "staff"} permissions={permissionMap} />
            <div className="p-6 sm:p-10">
                <div className="max-w-7xl mx-auto space-y-8">
                    <TableFilterBar
                        subtitle="Operations"
                        title="Passport Status"
                        description="Track deposit and withdrawal activity recorded in passports."
                        searchPlaceholder="Search name, passport no, NA no..."
                        searchValue={searchTerm}
                        onSearchChange={setSearchTerm}
                        leadingContent={pageSizeSelector}
                        actions={(
                            <div className="flex items-center gap-2" ref={sortDropdownRef}>
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setShowSortDropdown((prev) => !prev)}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        <SlidersHorizontal size={16} />
                                        <span>{sortField === 'withdrawalDate' ? 'Withdrawal Date' : 'Deposit Date'}</span>
                                    </button>
                                    {showSortDropdown && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-2xl shadow-lg p-2 space-y-1 z-20">
                                            <p className="text-[11px] uppercase tracking-wide text-gray-500 px-2">Sort by</p>
                                            {[
                                                { label: 'Deposit Date', value: 'depositDate' },
                                                { label: 'Withdrawal Date', value: 'withdrawalDate' }
                                            ].map((option) => (
                                                <button
                                                    type="button"
                                                    key={option.value}
                                                    className={`w-full text-left px-3 py-2 rounded-xl text-sm ${
                                                        sortField === option.value
                                                            ? 'bg-green-50 text-green-700 font-semibold'
                                                            : 'text-gray-700 hover:bg-gray-50'
                                                    }`}
                                                    onClick={() => {
                                                        setSortField(option.value);
                                                        setShowSortDropdown(false);
                                                    }}
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {canManagePassports && (
                                    <button
                                        onClick={() => { setModalMode('create'); setEditingRecord(null); setShowEditModal(true); }}
                                        className="relative group inline-flex items-center justify-center w-11 h-11 rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50"
                                        title="New record"
                                        disabled={applicantsLoading}
                                    >
                                        <span className="absolute right-full mr-2 px-3 py-1 rounded-full bg-gray-900 text-white text-xs font-medium opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                                            Add passport
                                        </span>
                                        <Plus size={18} className="transition-transform group-hover:rotate-90" />
                                    </button>
                                )}
                            </div>
                        )}
                    />

                    {loading && <div className="text-sm text-[var(--color-text-muted)]">Loading passport statuses...</div>}
                    {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-2 rounded-2xl">{error}</div>}

                    {!loading && !error && (
                        <div className="space-y-4">
                            <div className="card overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-gray-300 bg-gray-50">
                                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">NA No.</th>
                                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">PPT No.</th>
                                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Expiry Date</th>
                                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Deposit Date</th>
                                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Withdrawal Date</th>
                                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Reason for Withdrawal</th>
                                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Remarks</th>
                                                {canManagePassports && (
                                                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {paginatedRows.length === 0 ? (
                                                <tr>
                                                    <td colSpan="9" className="px-3 py-2.5 text-center text-gray-500 text-xs">No passport records</td>
                                                </tr>
                                            ) : (
                                                paginatedRows.map((t, idx) => {
                                                    const isDeployed = t.remarks && String(t.remarks).toLowerCase().includes('deployed');
                                                    return (
                                                    <tr key={t._id} className={`hover:bg-green-50/50 transition-colors ${isDeployed ? 'bg-green-100' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                                        <td className="px-3 py-2.5 align-top">
                                                            <button 
                                                                onClick={() => openView(t)} 
                                                                className="text-left w-full font-semibold text-green-600 hover:text-green-800 cursor-pointer hover:underline transition-colors text-sm leading-tight"
                                                            >
                                                                {t.applicantName || '—'}
                                                            </button>
                                                        </td>
                                                        <td className="px-3 py-2.5 align-top">
                                                            <span className="text-gray-700 text-xs leading-tight">{t.naNo || '—'}</span>
                                                        </td>
                                                        <td className="px-3 py-2.5 align-top">
                                                            <span className="text-gray-700 text-xs leading-tight font-mono text-[11px]">{t.passportNos || '—'}</span>
                                                        </td>
                                                        <td className="px-3 py-2.5 align-top">
                                                            <span className="text-gray-700 text-xs leading-tight">{fmtDate(t.passportExpiry)}</span>
                                                        </td>
                                                        <td className="px-3 py-2.5 align-top">
                                                            <span className="text-gray-700 text-xs leading-tight">{fmtDate(t.depositDate)}</span>
                                                        </td>
                                                        <td className="px-3 py-2.5 align-top">
                                                            <span className="text-gray-700 text-xs leading-tight">{fmtDate(t.withdrawalDate)}</span>
                                                        </td>
                                                        <td className="px-3 py-2.5 align-top">
                                                            <span className="text-gray-700 text-xs leading-tight break-words">{t.withdrawalReason || '—'}</span>
                                                        </td>
                                                        <td className="px-3 py-2.5 align-top">
                                                            <span className="text-gray-700 text-xs leading-tight break-words">{t.remarks || '—'}</span>
                                                        </td>
                                                        {canManagePassports && (
                                                            <td className="px-3 py-2.5 align-top">
                                                                <div className="flex items-center justify-end gap-1.5">
                                                                    <button 
                                                                        onClick={() => openEdit(t)} 
                                                                        className="p-1.5 rounded-md hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-colors" 
                                                                        title="Edit"
                                                                    >
                                                                        <Edit size={16} />
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => handleDelete(t.passport?._id)} 
                                                                        className="p-1.5 rounded-md hover:bg-red-100 text-red-600 hover:text-red-700 transition-colors" 
                                                                        title="Delete"
                                                                    >
                                                                        <Trash2 size={16} />
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
                                    label="passport records"
                                />
                            </div>
                        </div>
                    )}

                    {canManagePassports && (
                        <PassportStatusModal
                            show={showEditModal}
                            record={editingRecord}
                            mode={modalMode}
                            applicants={applicants}
                            onClose={() => setShowEditModal(false)}
                            onSave={() => { setShowEditModal(false); fetchPassports(); }}
                        />
                    )}
                    <PassportStatusViewModal show={showViewModal} passport={viewPassport} onClose={() => setShowViewModal(false)} />
                </div>
            </div>
        </div>
    );
}