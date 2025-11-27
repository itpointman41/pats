'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import NavBarAdmin from "../../components/nav_bar_admin";
import PaginationControls from "../../components/PaginationControls";
import TableFilterBar from "../../components/TableFilterBar";
import ApplicantViewModal from '../../components/ApplicantViewModal';
import DeployedEditModal from '../../components/DeployedEditModal';
import { Edit, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';

const DEPLOYMENT_REFRESH_INTERVAL = 10000; // 20 seconds
const PAGE_SIZE = 15;

export default function DeploymentPage() {
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [deployments, setDeployments] = useState([]);
	const [searchTerm, setSearchTerm] = useState('');
	const [showApplicantModal, setShowApplicantModal] = useState(false);
	const [selectedApplicant, setSelectedApplicant] = useState(null);
	const [showEditModal, setShowEditModal] = useState(false);
	const [editingDeployment, setEditingDeployment] = useState(null);
	const [currentUser, setCurrentUser] = useState(null);
	const [authLoading, setAuthLoading] = useState(true);
	const [currentPage, setCurrentPage] = useState(1);
	const [applicantTransmittals, setApplicantTransmittals] = useState([]);

	const fetchDeployments = useCallback(async (silent = false) => {
		if (!silent) setLoading(true);
		try {
			const res = await fetch('/api/admin/deployments', { credentials: 'include' });
			const data = await res.json();
			if (!res.ok) {
				setError(data.error || 'Failed to load deployments');
				setDeployments([]);
			} else {
				setDeployments(data.deployments || []);
			}
		} catch (err) {
			setError('Failed to load deployments');
			setDeployments([]);
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
				}
			})
			.catch(() => {
				setAuthLoading(false);
				router.push('/');
			});
	}, [router]);

	useEffect(() => {
		if (!currentUser) return;
		fetchDeployments();
	}, [currentUser, fetchDeployments]);

	useEffect(() => {
		if (!currentUser) return;
		const interval = setInterval(() => fetchDeployments(true), DEPLOYMENT_REFRESH_INTERVAL);
		return () => clearInterval(interval);
	}, [currentUser, fetchDeployments]);

	const openApplicantModal = (d) => {
		setShowApplicantModal(true);
		
		// Fetch full applicant data and transmittals for this applicant
		if (d.applicantId) {
			Promise.all([
				fetch(`/api/admin/applicants?_id=${d.applicantId}`, { credentials: 'include' })
					.then(res => res.json()),
				fetch(`/api/admin/transmittals?applicantId=${d.applicantId}`, { credentials: 'include' })
					.then(res => res.json())
			])
			.then(([applicantData, transmittalData]) => {
				// API returns 'applicant' (singular) when fetching by _id
				const fullApplicant = applicantData.applicant || (applicantData.applicants && applicantData.applicants[0]);
				if (fullApplicant) {
					setSelectedApplicant(fullApplicant);
					setApplicantTransmittals(transmittalData.transmittals || []);
				} else {
					// Fallback: set temporary applicant
					setSelectedApplicant({ _id: d.applicantId, name: d.applicantName });
					setApplicantTransmittals(transmittalData.transmittals || []);
				}
				})
				.catch(err => {
					console.error('Error fetching applicant or transmittals:', err);
					// Fallback: set temporary applicant
					setSelectedApplicant({ _id: d.applicantId, name: d.applicantName });
					setApplicantTransmittals([]);
				});
		} else {
			setSelectedApplicant(null);
			setApplicantTransmittals([]);
		}
	};

	const truthy = (v) => {
		if (v === true || v === 1) return true;
		if (typeof v === 'string') {
			const s = v.toLowerCase().trim();
			return s === 'true' || s === 'yes' || s === '1' || s.length > 0;
		}
		return false;
	};


	// Filter deployments by searchTerm
	const term = (searchTerm || '').toLowerCase().trim();
	const filteredDeployments = term ? (deployments || []).filter(d => {
		const fields = [
			d.visaCompany,
			d.company,
			d.visaPosition,
			d.position,
			d.passportNos,
			d.visaNo
		];
		return fields.some(f => f && String(f).toLowerCase().includes(term));
	}) : (deployments || []);
	const filteredCount = filteredDeployments.length;

	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm, filteredCount]);

	const sortedDeployments = [...filteredDeployments].sort((a, b) => {
		const dateA = a.deployedAt ? new Date(a.deployedAt).getTime() : 0;
		const dateB = b.deployedAt ? new Date(b.deployedAt).getTime() : 0;
		return dateB - dateA;
	});

	const totalPages = Math.max(1, Math.ceil(sortedDeployments.length / PAGE_SIZE));
	const startIndex = (currentPage - 1) * PAGE_SIZE;
	const paginatedDeployments = sortedDeployments.slice(startIndex, startIndex + PAGE_SIZE);

	const getYear = (t) => {
		if (!t.deployedAt) return 'Unknown';
		try {
			const dt = new Date(t.deployedAt);
			if (isNaN(dt.getTime())) return 'Unknown';
			return String(dt.getFullYear());
		} catch (e) {
			return 'Unknown';
		}
	};

	const getMonth = (t) => {
		if (!t.deployedAt) return 'Unknown';
		try {
			const dt = new Date(t.deployedAt);
			if (isNaN(dt.getTime())) return 'Unknown';
			// Return month name, e.g., 'January'
			return dt.toLocaleString('default', { month: 'long' });
		} catch (e) {
			return 'Unknown';
		}
	};

    // Group by year, then by month (use paginated subset)
    const yearMonthGroups = {};
    for (const d of paginatedDeployments) {
		const y = getYear(d);
		const m = getMonth(d);
		if (!yearMonthGroups[y]) yearMonthGroups[y] = {};
		if (!yearMonthGroups[y][m]) yearMonthGroups[y][m] = [];
		yearMonthGroups[y][m].push(d);
	}

	const years = Object.keys(yearMonthGroups).sort((a, b) => {
		if (a === 'Unknown') return 1;
		if (b === 'Unknown') return -1;
		return Number(b) - Number(a);
	});

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
						title="Deployment Overview"
						description="Monitor deployed applicants with rich filtering and pagination."
						searchPlaceholder="Search by name, company, position, passport..."
						searchValue={searchTerm}
						onSearchChange={setSearchTerm}
					/>

					{loading && <div className="text-sm text-[var(--color-text-muted)]">Loading deployed records...</div>}
					{error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-2 rounded-2xl">{error}</div>}

					{!loading && !error && (
						<div className="space-y-6">
							{years.length === 0 ? (
								<div className="card p-6 text-sm text-[var(--color-text-muted)]">No deployed applicants found.</div>
							) : (
								<>
									{years.map((y) => (
										<div key={y} className="card overflow-hidden">
											<div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
												<h2 className="text-lg font-semibold text-[var(--color-text)]">{y}</h2>
											</div>
											{Object.keys(yearMonthGroups[y] || {}).sort((a, b) => {
												const monthOrder = [
													'January','February','March','April','May','June','July','August','September','October','November','December','Unknown'
												];
												return monthOrder.indexOf(b) - monthOrder.indexOf(a);
											}).map((m) => (
												<div key={m} className="border-t border-[var(--color-border)]">
													<div className="px-6 py-3 bg-[var(--surface-accent)]">
														<h3 className="text-base font-semibold text-[var(--color-text)]">{m}</h3>
													</div>
													<div className="overflow-x-auto">
														<table className="w-full divide-y divide-gray-200 table-fixed text-sm">
															<thead className="bg-white">
																<tr>
																	<th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Name</th>
																	<th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Visa Company</th>
																	<th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Actual Company</th>
																	<th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Visa Position</th>
																	<th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Actual Position</th>
																	<th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Passport Nos.</th>
																	<th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Visa / Sponsor No.</th>
																	<th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Deployment Date</th>
																	<th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)] uppercase tracking-wide">R.O.</th>
																	<th className="px-4 py-3 text-right font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Actions</th>
																</tr>
															</thead>
															<tbody className="bg-white divide-y divide-gray-100">
																{(yearMonthGroups[y][m] || []).map((d) => (
																	<tr key={d._id} className="hover:bg-[var(--surface-muted)]/60 transition-colors">
																		<td className="px-4 py-3 whitespace-normal text-[var(--color-text)] font-medium">
																			<button onClick={() => openApplicantModal(d)} className="text-left w-full text-[var(--color-secondary)] hover:underline cursor-pointer">
																				{d.applicantName || '—'}
																			</button>
																		</td>
																		<td className="px-4 py-3 text-[var(--color-text)] break-words">{d.visaCompany || '—'}</td>
																		<td className="px-4 py-3 text-[var(--color-text)] break-words">{d.applicantCompany || '—'}</td>
																		<td className="px-4 py-3 text-[var(--color-text)] break-words">{d.visaPosition || '—'}</td>
																		<td className="px-4 py-3 text-[var(--color-text)] break-words">{d.applicantPosition || '—'}</td>
																		<td className="px-4 py-3 text-[var(--color-text)] break-words">{d.passportNos || '—'}</td>
																		<td className="px-4 py-3 text-[var(--color-text)] break-words">{d.visaNo || '—'}</td>
																		<td className="px-4 py-3 text-[var(--color-text)]">{d.deployedAt ? new Date(d.deployedAt).toLocaleDateString() : '—'}</td>
																		<td className="px-4 py-3 text-[var(--color-text)] break-words">{d.ro || '—'}</td>
																		<td className="px-4 py-3 text-right">
																			<div className="flex items-center justify-end space-x-2">
																				<button
																					onClick={() => { setEditingDeployment({ ...d }); setShowEditModal(true); }}
																					className="p-1.5 rounded-full hover:bg-[var(--surface-muted)] text-[var(--color-secondary)]"
																					aria-label={`Edit deployment ${d._id}`}
																					title="Edit"
																				>
																					<Edit size={16} />
																				</button>
																				<button
																					onClick={async () => {
																						const result = await Swal.fire({
																							title: 'Confirm delete',
																							text: 'This will permanently delete the deployment.',
																							icon: 'warning',
																							showCancelButton: true,
																							confirmButtonText: 'Delete',
																							cancelButtonText: 'Cancel'
																						});
																						if (!result.isConfirmed) return;
																						try {
																							const res = await fetch(`/api/admin/deployments?_id=${d._id}`, { method: 'DELETE', credentials: 'include' });
																							const data = await res.json();
																							if (!res.ok) {
																								await Swal.fire('Error', data.error || 'Failed to delete deployment', 'error');
																								return;
																							}
																							await fetchDeployments();
																							await Swal.fire('Deleted', 'Deployment deleted', 'success');
																						} catch (err) {
																							console.error('Delete error', err);
																							await Swal.fire('Error', 'Failed to delete deployment', 'error');
																						}
																					}}
																					className="p-1.5 rounded-full hover:bg-[var(--surface-muted)] text-red-500"
																					aria-label={`Delete deployment ${d._id}`}
																					title="Delete"
																				>
																					<Trash2 size={16} />
																				</button>
																			</div>
																		</td>
																	</tr>
																))}
															</tbody>
														</table>
													</div>
												</div>
											))}
										</div>
									))}
									<PaginationControls
										currentPage={currentPage}
										onPageChange={setCurrentPage}
										totalItems={filteredCount}
										pageSize={PAGE_SIZE}
										label="deployments"
									/>
								</>
							)}
						</div>
					)}

				<ApplicantViewModal
					show={showApplicantModal}
					applicant={selectedApplicant}
					transmittals={applicantTransmittals}
					onClose={() => setShowApplicantModal(false)}
				/>
					<DeployedEditModal show={showEditModal} deployment={editingDeployment} onClose={() => setShowEditModal(false)} onSave={() => { setShowEditModal(false); fetchDeployments(); }} />
				</div>
			</div>
		</div>
	);
}
