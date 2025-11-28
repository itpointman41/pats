'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import NavBarAdmin from "../../components/nav_bar_admin";
import PaginationControls from "../../components/PaginationControls";
import TableFilterBar from "../../components/TableFilterBar";
import ApplicantViewModal from '../../components/ApplicantViewModal';
import DeployedEditModal from '../../components/DeployedEditModal';
import { Edit, Trash2, Download, X } from 'lucide-react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { usePermissions } from "../../hooks/usePermissions";

const DEPLOYMENT_REFRESH_INTERVAL = 10000; // 20 seconds
const PAGE_SIZE_OPTIONS = [15, 30, 50, 100];
const RESOURCE_KEY = 'deployment';

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
	const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
	const [applicantTransmittals, setApplicantTransmittals] = useState([]);
	const [showDownloadModal, setShowDownloadModal] = useState(false);
	const [downloadYear, setDownloadYear] = useState('');
	const [downloadMonth, setDownloadMonth] = useState('');
	const { permissions: permissionMap, loading: permsLoading, canRead, canWrite } = usePermissions();
	const canViewDeployment = canRead(RESOURCE_KEY);
	const canManageDeployment = canWrite(RESOURCE_KEY);

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

	const handleEditDeployment = (deployment) => {
		if (!canManageDeployment) return;
		setEditingDeployment({ ...deployment });
		setShowEditModal(true);
	};

	const handleDeleteDeployment = async (deploymentId) => {
		if (!canManageDeployment || !deploymentId) return;

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
			const res = await fetch(`/api/admin/deployments?_id=${deploymentId}`, { method: 'DELETE', credentials: 'include' });
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
	};


	// Filter deployments by searchTerm
	const term = (searchTerm || '').toLowerCase().trim();
	const filteredDeployments = term ? (deployments || []).filter(d => {
		const fields = [
			d.applicantName,
			d.visaCompany,
			d.applicantCompany,
			d.visaPosition,
			d.applicantPosition,
			d.passportNos,
			d.visaNo,
			d.ro
		];
		return fields.some(f => f && String(f).toLowerCase().includes(term));
	}) : (deployments || []);
	const filteredCount = filteredDeployments.length;

	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm, filteredCount, pageSize]);

	const sortedDeployments = [...filteredDeployments].sort((a, b) => {
		const dateA = a.deployedAt ? new Date(a.deployedAt).getTime() : 0;
		const dateB = b.deployedAt ? new Date(b.deployedAt).getTime() : 0;
		return dateB - dateA;
	});

	const startIndex = (currentPage - 1) * pageSize;
	const paginatedDeployments = sortedDeployments.slice(startIndex, startIndex + pageSize);

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

	// Get all unique years and months from all deployments (not just paginated)
	const getAllYears = () => {
		const yearSet = new Set();
		sortedDeployments.forEach(d => {
			const y = getYear(d);
			if (y !== 'Unknown') yearSet.add(y);
		});
		return Array.from(yearSet).sort((a, b) => Number(b) - Number(a));
	};

	const getAllMonths = () => {
		return ['January', 'February', 'March', 'April', 'May', 'June', 
			'July', 'August', 'September', 'October', 'November', 'December'];
	};

	const exportToExcel = () => {
		if (!canManageDeployment) return;
		// Filter deployments based on selected year and month
		let dataToExport = [...sortedDeployments];
		
		if (downloadYear && downloadYear !== 'all') {
			dataToExport = dataToExport.filter(d => getYear(d) === downloadYear);
		}
		
		if (downloadMonth && downloadMonth !== 'all') {
			dataToExport = dataToExport.filter(d => getMonth(d) === downloadMonth);
		}

		if (dataToExport.length === 0) {
			Swal.fire('No Data', 'No deployments found for the selected filters.', 'info');
			return;
		}

		// Prepare data for Excel
		const excelData = dataToExport.map(d => ({
			'Applicant Name': d.applicantName || '—',
			'Visa Company': d.visaCompany || '—',
			'Actual Company': d.applicantCompany || '—',
			'Visa Position': d.visaPosition || '—',
			'Actual Position': d.applicantPosition || '—',
			'Passport No.': d.passportNos || '—',
			'Visa/Sponsor No.': d.visaNo || '—',
			'Deployment Date': d.deployedAt ? new Date(d.deployedAt).toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			}) : '—',
			'R.O.': d.ro || '—'
		}));

		// Create workbook and worksheet
		const wb = XLSX.utils.book_new();
		const ws = XLSX.utils.json_to_sheet(excelData);

		// Calculate optimal column widths based on content (autofit)
		const colWidths = [];
		const range = XLSX.utils.decode_range(ws['!ref']);
		
		// Define minimum widths for each column
		const minWidths = [20, 25, 25, 20, 20, 15, 18, 18, 10];
		
		// Calculate max width for each column
		for (let C = range.s.c; C <= range.e.c; ++C) {
			let maxWidth = minWidths[C] || 12; // Use minimum width as starting point
			for (let R = range.s.r; R <= range.e.r; ++R) {
				const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
				const cell = ws[cellAddress];
				if (cell && cell.v) {
					const cellValue = String(cell.v);
					// Estimate width: character count + padding (account for wider characters)
					const estimatedWidth = Math.min(cellValue.length * 1.2 + 4, 60); // Cap at 60
					if (estimatedWidth > maxWidth) {
						maxWidth = estimatedWidth;
					}
				}
			}
			colWidths.push({ wch: Math.ceil(maxWidth) });
		}
		ws['!cols'] = colWidths;

		// Add worksheet to workbook
		XLSX.utils.book_append_sheet(wb, ws, 'Deployments');

		// Generate filename
		let filename = 'Deployments';
		if (downloadYear && downloadYear !== 'all') {
			filename += `_${downloadYear}`;
		}
		if (downloadMonth && downloadMonth !== 'all') {
			filename += `_${downloadMonth}`;
		}
		filename += `_${new Date().toISOString().split('T')[0]}.xlsx`;

		// Write and download
		XLSX.writeFile(wb, filename);
		
		setShowDownloadModal(false);
		Swal.fire('Success', `Exported ${dataToExport.length} deployment(s) to Excel`, 'success');
	};

	if (authLoading || permsLoading) {
		return (
			<div className="min-h-screen bg-[var(--surface-muted)] flex items-center justify-center">
				<div className="text-[var(--color-text-muted)]">Loading...</div>
			</div>
		);
	}

	if (!canViewDeployment) {
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
				<div className="max-w-7xl mx-auto space-y-8">
					<TableFilterBar
						subtitle="Operations"
						title="Deployment Overview"
						description="Monitor deployed applicants with rich filtering and pagination."
						searchPlaceholder="Search by name, company, position, passport..."
						searchValue={searchTerm}
						onSearchChange={setSearchTerm}
						leadingContent={pageSizeSelector}
						actions={canManageDeployment ? (
							<button
								type="button"
								onClick={() => setShowDownloadModal(true)}
								className="relative group inline-flex items-center justify-center w-11 h-11 rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-all"
							>
								<span className="absolute right-full mr-2 px-3 py-1 rounded-full bg-gray-900 text-white text-xs font-medium opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all whitespace-nowrap">
									Download
								</span>
								<Download className="w-5 h-5 transition-transform group-hover:rotate-90" />
							</button>
						) : null}
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
											<div className="px-4 py-2.5 border-b border-gray-200 flex items-center justify-between bg-white">
												<h2 className="text-base font-semibold text-gray-800">{y}</h2>
											</div>
											{Object.keys(yearMonthGroups[y] || {}).sort((a, b) => {
												const monthOrder = [
													'January','February','March','April','May','June','July','August','September','October','November','December','Unknown'
												];
												return monthOrder.indexOf(b) - monthOrder.indexOf(a);
											}).map((m) => (
												<div key={m} className="border-t border-gray-200">
													<div className="px-4 py-2 bg-gray-100">
														<h3 className="text-sm font-semibold text-gray-700">{m}</h3>
													</div>
													<div className="overflow-x-auto">
														<table className="w-full text-sm">
															<thead>
																<tr className="border-b border-gray-300 bg-gray-50">
																	<th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-[12%]">Applicant</th>
																	<th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-[14%]">Visa Company</th>
																	<th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-[14%]">Actual Company</th>
																	<th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-[12%]">Visa Position</th>
																	<th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-[12%]">Actual Position</th>
																	<th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-[10%]">Passport</th>
																	<th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-[10%]">Visa/Sponsor</th>
																	<th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-[8%]">Date</th>
																	<th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-[6%]">R.O.</th>
																	{canManageDeployment && (
																		<th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-[8%]">Actions</th>
																	)}
																</tr>
															</thead>
															<tbody className="divide-y divide-gray-200">
																{(yearMonthGroups[y][m] || []).map((d, idx) => (
																	<tr key={d._id} className={`hover:bg-green-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
																		<td className="px-3 py-2.5 align-top">
																			<button 
																				onClick={() => openApplicantModal(d)} 
																				className="text-left w-full font-semibold text-green-600 hover:text-green-800 cursor-pointer hover:underline transition-colors text-sm leading-tight"
																			>
																				{d.applicantName || '—'}
																			</button>
																		</td>
																		<td className="px-3 py-2.5 align-top">
																			<span className="text-gray-900 text-xs leading-tight">{d.visaCompany || '—'}</span>
																		</td>
																		<td className="px-3 py-2.5 align-top">
																			<span className="text-gray-900 text-xs leading-tight">{d.applicantCompany || '—'}</span>
																		</td>
																		<td className="px-3 py-2.5 align-top">
																			<span className="text-gray-700 text-xs leading-tight">{d.visaPosition || '—'}</span>
																		</td>
																		<td className="px-3 py-2.5 align-top">
																			<span className="text-gray-700 text-xs leading-tight">{d.applicantPosition || '—'}</span>
																		</td>
																		<td className="px-3 py-2.5 align-top">
																			<span className="text-gray-900 font-mono text-xs leading-tight">{d.passportNos || '—'}</span>
																		</td>
																		<td className="px-3 py-2.5 align-top">
																			<span className="text-gray-900 font-mono text-xs leading-tight">{d.visaNo || '—'}</span>
																		</td>
																		<td className="px-3 py-2.5 align-top">
																			<span className="text-gray-700 text-xs leading-tight whitespace-nowrap">
																				{d.deployedAt ? new Date(d.deployedAt).toLocaleDateString('en-US', { 
																					month: 'short', 
																					day: 'numeric', 
																					year: 'numeric' 
																				}) : '—'}
																			</span>
																		</td>
																		<td className="px-3 py-2.5 align-top">
																			<span className="text-gray-700 text-xs leading-tight">{d.ro || '—'}</span>
																		</td>
																		{canManageDeployment && (
																			<td className="px-3 py-2.5 align-top">
																				<div className="flex items-center justify-end gap-1.5">
																					<button
																						onClick={() => handleEditDeployment(d)}
																						className="p-1.5 rounded-md hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-colors"
																						aria-label={`Edit deployment ${d._id}`}
																						title="Edit"
																					>
																						<Edit size={16} />
																					</button>
																					<button
																						onClick={() => handleDeleteDeployment(d._id)}
																						className="p-1.5 rounded-md hover:bg-red-100 text-red-600 hover:text-red-700 transition-colors"
																						aria-label={`Delete deployment ${d._id}`}
																						title="Delete"
																					>
																						<Trash2 size={16} />
																					</button>
																				</div>
																			</td>
																		)}
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
										pageSize={pageSize}
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
				
				{/* Download Modal */}
				{canManageDeployment && showDownloadModal && (
					<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
						<div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
							<div className="flex items-center justify-between p-6 border-b border-gray-200">
								<h3 className="text-lg font-semibold text-gray-900">Download Deployments</h3>
								<button
									onClick={() => setShowDownloadModal(false)}
									className="p-1 hover:bg-gray-100 rounded-full transition-colors"
								>
									<X size={20} className="text-gray-500" />
								</button>
							</div>
							<div className="p-6 space-y-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Year
									</label>
									<select
										value={downloadYear}
										onChange={(e) => setDownloadYear(e.target.value)}
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									>
										<option value="all">All Years</option>
										{getAllYears().map(year => (
											<option key={year} value={year}>{year}</option>
										))}
									</select>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Month
									</label>
									<select
										value={downloadMonth}
										onChange={(e) => setDownloadMonth(e.target.value)}
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									>
										<option value="all">All Months</option>
										{getAllMonths().map(month => (
											<option key={month} value={month}>{month}</option>
										))}
									</select>
								</div>
								<div className="flex gap-3 pt-4">
									<button
										onClick={() => {
											setShowDownloadModal(false);
											setDownloadYear('');
											setDownloadMonth('');
										}}
										className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
									>
										Cancel
									</button>
									<button
										onClick={exportToExcel}
										className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
									>
										Download Excel
									</button>
								</div>
							</div>
						</div>
					</div>
				)}
				</div>
			</div>
		</div>
	);
}
