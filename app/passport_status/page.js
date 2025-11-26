'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import NavBarAdmin from '../../components/nav_bar_admin';
import PaginationControls from '../../components/PaginationControls';
import TableFilterBar from '../../components/TableFilterBar';
import PassportStatusModal from '../../components/PassportStatusModal';
import PassportStatusViewModal from '../../components/PassportStatusViewModal';
import { Edit, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';

const PASSPORT_REFRESH_INTERVAL = 20000; // 20 seconds
const PAGE_SIZE = 15;

export default function PassportStatusPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [rows, setRows] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingTransmittal, setEditingTransmittal] = useState(null);
    const [showViewModal, setShowViewModal] = useState(false);
    const [viewPassport, setViewPassport] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            // Fetch all transmittals and filter for deployed applicants
            const res = await fetch('/api/admin/transmittals', { credentials: 'include' });
            if (!res.ok) {
                const text = await res.text().catch(() => null);
                console.error('Transmittals fetch error', res.status, text);
                setError(text || `Failed to load (${res.status})`);
                setRows([]);
            } else {
                    // parse JSON only for OK responses
                    const data = await res.json().catch(async (err) => {
                        const text = await res.text().catch(() => null);
                        console.error('Transmittals JSON parse error', err, text);
                        throw err;
                    });

                    // Only show deployed applicants
                    const deployed = (data.transmittals || []).filter(t => (t.status || '').toLowerCase() === 'deployed');

                    // Fetch passports and map by applicantId so we can show passport fields directly
                    try {
                        const pRes = await fetch('/api/admin/passports', { credentials: 'include' });
                        let passports = [];
                        if (pRes.ok) {
                            const pData = await pRes.json().catch(async (err) => {
                                const text = await pRes.text().catch(() => null);
                                console.error('Passports JSON parse error', err, text);
                                return { passports: [] };
                            });
                            passports = pData.passports || [];
                        } else {
                            console.warn('Failed to load passports for merge');
                        }

                        const passportsByApplicant = {};
                        passports.forEach(p => {
                            if (p.applicantId) passportsByApplicant[p.applicantId] = p;
                        });

                        // attach passport doc to each transmittal where available
                        const merged = deployed.map(t => ({ ...t, passport: passportsByApplicant[t.applicantId] || null }));
                        setRows(merged);
                    } catch (err) {
                        console.error('Error fetching passports to merge', err);
                        setRows(deployed);
                    }
            }
        } catch (err) {
            console.error('Fetch error', err);
            setError('Failed to load');
            setRows([]);
        } finally {
            setLoading(false);
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
                        fetchData();
                    }
                })
            .catch(() => {
                setAuthLoading(false);
                router.push('/');
            });
    }, [router, fetchData]);

    useEffect(() => {
        if (!currentUser) return;
        const interval = setInterval(() => fetchData(true), PASSPORT_REFRESH_INTERVAL);
        return () => clearInterval(interval);
    }, [currentUser, fetchData]);

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

    // Use passport collection fields directly when available; avoid many fallbacks
    const depositDateOf = (t) => (t.passport && t.passport.depositDate) || null;
    const withdrawalDateOf = (t) => (t.passport && t.passport.withdrawalDate) || null;
    const withdrawalReasonOf = (t) => (t.passport && t.passport.withdrawalReason) || null;
    const positionRemarksOf = (t) => (t.passport && t.passport.remarks) || null;

    const filteredRows = useMemo(() => {
        const term = (searchTerm || '').toLowerCase().trim();
        const filtered = !term ? rows : (rows || []).filter(t => {
            const fields = [
                t.applicantName,
                t.passport && t.passport.passportNos,
                t.passport && t.passport.naNo,
                t._id,
                t.transmittalId,
                t.passport && t.passport.remarks
            ];
            return fields.some(f => f && String(f).toLowerCase().includes(term));
        });
        
        // Sort by createdAt, newest first
        return [...filtered].sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return dateB - dateA;
        });
    }, [rows, searchTerm]);

    const filteredCount = filteredRows.length;
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filteredCount]);

    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const paginatedRows = filteredRows.slice(startIndex, startIndex + PAGE_SIZE);

    const openEdit = (t) => {
        // pass passport doc down in the transmittal object so modal can read DB fields directly
        setEditingTransmittal({ ...t });
        setShowEditModal(true);
    };

    const openView = (passportDoc, transmittal) => {
        // If no passport doc, build a minimal object from transmittal
        const p = passportDoc || {
            applicantName: transmittal?.applicantName || (transmittal?.applicant && transmittal.applicant.name) || '',
            transmittalId: transmittal?._id || null
        };
        setViewPassport(p);
        setShowViewModal(true);
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Confirm delete',
            text: 'This will permanently delete the transmittal.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel'
        });
        if (!result.isConfirmed) return;
        try {
            const res = await fetch(`/api/admin/passports?_id=${id}`, { method: 'DELETE', credentials: 'include' });
            if (!res.ok) {
                const text = await res.text().catch(() => null);
                console.error('Passport delete error', res.status, text);
                await Swal.fire('Error', text || `Failed to delete (${res.status})`, 'error');
                return;
            }
            await fetchData();
            await Swal.fire('Deleted', 'Transmittal deleted', 'success');
        } catch (err) {
            console.error('Delete error', err);
            await Swal.fire('Error', 'Failed to delete', 'error');
        }
    };

    if (authLoading) {
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
                <div className="max-w-7xl mx-auto space-y-8">
                    <TableFilterBar
                        subtitle="Operations"
                        title="Passport Status"
                        description="Track deposit and withdrawal activity for deployed applicants."
                        searchPlaceholder="Search name, passport no, NA no, transmittal id..."
                        searchValue={searchTerm}
                        onSearchChange={setSearchTerm}
                    />

                    {loading && <div className="text-sm text-[var(--color-text-muted)]">Loading passport statuses...</div>}
                    {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-2 rounded-2xl">{error}</div>}

                    {!loading && !error && (
                        <div className="space-y-4">
                            <div className="card overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 table-fixed text-sm">
                                        <thead className="bg-white">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Name</th>
                                                <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Deposit Date</th>
                                                <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Withdrawal Date</th>
                                                <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Reason for Withdrawal</th>
                                                <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Remarks</th>
                                                <th className="px-4 py-3 text-right font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-100">
                                            {paginatedRows.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6" className="px-4 py-6 text-center text-[var(--color-text-muted)]">No deployed applicants</td>
                                                </tr>
                                            ) : (
                                                paginatedRows.map((t) => (
                                                    <tr key={t._id} className="hover:bg-[var(--surface-muted)]/60 transition-colors">
                                                        <td className="px-4 py-3 whitespace-normal text-[var(--color-text)] font-medium">
                                                            <button onClick={() => openView(t.passport, t)} className="text-left text-[var(--color-secondary)] hover:underline">
                                                                {t.applicantName || (t.applicant && t.applicant.name) || '—'}
                                                            </button>
                                                        </td>
                                                        <td className="px-4 py-3 text-[var(--color-text)]">{fmtDate(depositDateOf(t))}</td>
                                                        <td className="px-4 py-3 text-[var(--color-text)]">{fmtDate(withdrawalDateOf(t))}</td>
                                                        <td className="px-4 py-3 text-[var(--color-text)] break-words max-w-md">{withdrawalReasonOf(t) || '—'}</td>
                                                        <td className="px-4 py-3 text-[var(--color-text)] break-words max-w-md">{positionRemarksOf(t) || '—'}</td>
                                                        <td className="px-4 py-3 text-right">
                                                            <div className="flex items-center justify-end space-x-2">
                                                                <button onClick={() => openEdit(t)} className="p-1.5 rounded-full hover:bg-[var(--surface-muted)] text-[var(--color-secondary)]" title="Edit">
                                                                    <Edit size={16} />
                                                                </button>
                                                                <button onClick={() => handleDelete(t._id)} className="p-1.5 rounded-full hover:bg-[var(--surface-muted)] text-red-500" title="Delete">
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
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
                                    label="passport records"
                                />
                            </div>
                        </div>
                    )}

                    <PassportStatusModal show={showEditModal} transmittal={editingTransmittal} onClose={() => setShowEditModal(false)} onSave={() => { setShowEditModal(false); fetchData(); }} />
                    <PassportStatusViewModal show={showViewModal} passport={viewPassport} onClose={() => setShowViewModal(false)} />
                </div>
            </div>
        </div>
    );
}