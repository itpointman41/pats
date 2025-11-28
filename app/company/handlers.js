// Utility functions for company management

export const filterCompanies = (companies, searchTerm) => {
  return companies.filter(company =>
    (company.companyName && company.companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (company.crn && company.crn.toLowerCase().includes(searchTerm.toLowerCase()))
  );
};

export const getInitialFormData = () => ({
  companyName: "",
  crn: "",
  dateApprove: "",
  dateExpiry: ""
});

export const getCompanyFormData = (company) => ({
  companyName: company.companyName || "",
  crn: company.crn || "",
  dateApprove: company.dateApprove ? new Date(company.dateApprove).toISOString().split('T')[0] : "",
  dateExpiry: company.dateExpiry ? new Date(company.dateExpiry).toISOString().split('T')[0] : ""
});

// API functions
export const loadCompanies = async (setCompanies, setError, setLoading) => {
  try {
    const response = await fetch("/api/admin/companies", {
      credentials: 'include'
    });
    const data = await response.json();
    if (response.ok) {
      setCompanies(data.companies);
    } else {
      setError(data.error || "Failed to load companies");
    }
  } catch (err) {
    setError("Failed to load companies");
  } finally {
    setLoading(false);
  }
};

export const deleteCompany = async (companyId, onSuccess, onError) => {
  if (!confirm("Are you sure you want to delete this company?")) {
    return;
  }

  try {
    const response = await fetch(`/api/admin/companies?_id=${companyId}`, {
      method: "DELETE",
      credentials: 'include'
    });

    const data = await response.json();
    if (response.ok) {
      onSuccess();
    } else {
      onError(data.error || "Failed to delete company");
    }
  } catch (err) {
    onError("Failed to delete company");
  }
};

export const submitCompany = async (editingCompany, formData, onSuccess, onError) => {
  const url = "/api/admin/companies";
  const method = editingCompany ? "PUT" : "POST";
  const body = editingCompany
    ? { _id: editingCompany._id, ...formData }
    : formData;

  try {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: 'include'
    });

    const data = await response.json();
    if (response.ok) {
      onSuccess();
    } else {
      onError(data.error || "Operation failed");
    }
  } catch (err) {
    onError("Operation failed");
  }
};

