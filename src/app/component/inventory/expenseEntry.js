"use client";
import React, { useState, useEffect } from "react";
import { FiPlus, FiTrash2, FiSave, FiFilter, FiCalendar, FiBriefcase, FiUpload, FiX, FiPaperclip, FiDownload, FiEye, FiEdit2 } from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";
import axios from "axios";
import { API_BASE, getAuthHeaders, getAllBranches, createExpense, updateExpense, getAllExpenses, deleteExpense, createAccount, getSetting, deleteAccount, resolveImageUrl } from "@/Api/AllApi";
import { toast } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import Dropdown from "@/utils/dropdown";
import ConfirmationDialog from "@/components/ConfirmationDialog";

const ExpenseEntry = () => {
  const { role, branches: allowedBranchIds } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currency, setCurrency] = useState("₹");

  // Custom Delete Confirm State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  
  // Account Delete Confirm State
  const [accountDeleteConfirmOpen, setAccountDeleteConfirmOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState(null);
  const [accountDeleteType, setAccountDeleteType] = useState("Account");

  // View and Edit States
  const [viewingExpense, setViewingExpense] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);

  // Form State
  const [form, setForm] = useState({
    expenseAccountId: "",
    paidFromAccountId: "",
    amount: "",
    description: "",
    referenceNo: "",
    branchId: "",
    expenseDate: new Date().toISOString().split('T')[0]
  });

  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptFileName, setReceiptFileName] = useState("");

  const handleReceiptChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setReceiptFile(file);
      setReceiptFileName(file.name);
    }
  };

  const clearReceipt = () => {
    setReceiptFile(null);
    setReceiptFileName("");
  };

  const handleDownloadReceipt = async (receiptUrl, originalFilename = "receipt") => {
    try {
      const fullUrl = resolveImageUrl(receiptUrl);
      const extension = receiptUrl.split('.').pop() || 'jpg';
      const cleanFilename = originalFilename.replace(/[^a-zA-Z0-9_-]/g, "_") + "." + extension;

      toast.loading("Downloading receipt...", { id: "receipt-download" });

      const response = await axios.get(fullUrl, { responseType: 'blob' });
      
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = cleanFilename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);

      toast.success("Receipt downloaded successfully!", { id: "receipt-download" });
    } catch (err) {
      console.error("Failed to download receipt:", err);
      toast.error("Failed to download receipt file", { id: "receipt-download" });
    }
  };

  // Modal State for custom Account Category Creation
  const [modalOpen, setModalOpen] = useState(false);
  const [newAcc, setNewAcc] = useState({ name: "", type: "Expense" });

  // Filters State
  const [filters, setFilters] = useState({
    branchId: "",
    expenseAccountId: "",
    startDate: "",
    endDate: ""
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const params = {};
      if (filters.branchId) params.branchId = filters.branchId;
      if (filters.expenseAccountId) params.expenseAccountId = filters.expenseAccountId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      try {
        const expData = await getAllExpenses(params);
        setExpenses(expData || []);
      } catch (err) {
        console.error("Failed to load expenses list:", err);
        toast.error("Failed to load expenses list");
      }

      try {
        const branchData = await getAllBranches();
        const loadedBranches = branchData || [];
        setBranches(loadedBranches);

        if (role === "subadmin") {
          const firstAllowed = loadedBranches.find(b => allowedBranchIds.includes(String(b._id)));
          if (firstAllowed) {
            setForm(f => ({ ...f, branchId: f.branchId || firstAllowed._id }));
            setFilters(f => ({ ...f, branchId: f.branchId || firstAllowed._id }));
          }
        }
      } catch (err) {
        console.error("Failed to load branches list:", err);
      }

      try {
        const settingsRes = await getSetting();
        let settingsData;
        if (settingsRes && settingsRes.data) {
          settingsData = settingsRes.data;
        } else if (settingsRes && settingsRes.setting) {
          settingsData = settingsRes.setting;
        } else if (settingsRes && settingsRes._id) {
          settingsData = settingsRes;
        }
        if (settingsData && settingsData.currency) {
          setCurrency(settingsData.currency);
        }
      } catch (err) {
        console.error("Failed to load application currency settings:", err);
      }

      try {
        const accRes = await axios.get(`${API_BASE}/admin/accounting/trial-balance`, { headers: getAuthHeaders() });
        setAccounts(accRes.data.data || []);
      } catch (err) {
        console.error("Failed to load trial balance accounts:", err);
        toast.error("Failed to load chart categories");
      }

    } catch (error) {
      console.error("General failure in dashboard loader:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters.branchId, filters.expenseAccountId, filters.startDate, filters.endDate]);

  const expenseAccounts = accounts.filter(acc => acc.type === "Expense");
  const assetAccounts = accounts.filter(
    (acc) =>
      acc.type === "Asset" &&
      !/^Customer:/i.test(acc.name || "") &&
      !/^CUSTOMER_/i.test(acc.code || "") &&
      !/^USER_/i.test(acc.code || "")
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.expenseAccountId || !form.paidFromAccountId || !form.amount || !form.description) {
      return toast.error("Please fill in all required fields.");
    }

    const paidFromAcc = accounts.find(a => String(a._id) === String(form.paidFromAccountId));
    const isCashPayment = paidFromAcc && /cash/i.test(paidFromAcc.name || "");
    const amountNum = Number(form.amount) || 0;

    if (isCashPayment) {
      if (amountNum > 5000) {
        return toast.error("Expenses paid in Cash cannot exceed ₹5,000.");
      }

      const targetDateStr = form.expenseDate;
      const dailyExpenses = expenses.filter(exp => {
        if (editingExpense && String(exp._id) === String(editingExpense._id)) {
          return false;
        }
        const expDateStr = exp.expenseDate ? exp.expenseDate.split('T')[0] : "";
        const expPaidFrom = accounts.find(a => String(a._id) === String(exp.paidFromAccountId?._id || exp.paidFromAccountId));
        const isExpCash = expPaidFrom && /cash/i.test(expPaidFrom.name || "");
        return expDateStr === targetDateStr && isExpCash && String(exp.branchId?._id || exp.branchId) === String(form.branchId);
      });

      const dailyCashTotal = dailyExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
      if (dailyCashTotal + amountNum > 5000) {
        return toast.error(`Daily cash expense limit of ₹5,000 exceeded. Total other cash expenses today: ₹${dailyCashTotal}.`);
      }
    }

    try {
      setSaving(true);
      const formData = new FormData();
      if (receiptFile) {
        formData.append("receipt", receiptFile);
      } else if (!receiptFileName && editingExpense && editingExpense.receiptUrl) {
        formData.append("removeReceipt", "true");
      }
      formData.append("expenseAccountId", form.expenseAccountId);
      formData.append("paidFromAccountId", form.paidFromAccountId);
      formData.append("amount", form.amount);
      formData.append("description", form.description);
      formData.append("referenceNo", form.referenceNo || "");
      formData.append("branchId", form.branchId || "");
      formData.append("expenseDate", form.expenseDate);

      if (editingExpense) {
        await updateExpense(editingExpense._id, formData);
        toast.success("Expense successfully updated and ledger adjusted!");
        setEditingExpense(null);
      } else {
        await createExpense(formData);
        toast.success("Expense successfully saved and ledger posted!");
      }
      
      clearReceipt();
      
      // Reset form
      let defaultBranchId = "";
      if (role === "subadmin") {
        const firstAllowed = branches.find(b => allowedBranchIds.includes(String(b._id)));
        if (firstAllowed) {
          defaultBranchId = firstAllowed._id;
        }
      }

      setForm({
        expenseAccountId: "",
        paidFromAccountId: "",
        amount: "",
        description: "",
        referenceNo: "",
        branchId: defaultBranchId,
        expenseDate: new Date().toISOString().split('T')[0]
      });
      
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save expense entry");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteExpense(id);
      toast.success("Expense entry deleted and ledger reversed successfully!");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete expense entry");
    }
  };

  const handleView = (expense) => {
    setViewingExpense(expense);
  };

  const handleEditClick = (expense) => {
    setEditingExpense(expense);
    setForm({
      expenseAccountId: expense.expenseAccountId?._id || expense.expenseAccountId || "",
      paidFromAccountId: expense.paidFromAccountId?._id || expense.paidFromAccountId || "",
      amount: String(expense.amount || ""),
      description: expense.description || "",
      referenceNo: expense.referenceNo || "",
      branchId: expense.branchId?._id || expense.branchId || "",
      expenseDate: expense.expenseDate ? expense.expenseDate.split('T')[0] : new Date().toISOString().split('T')[0]
    });
    if (expense.receiptUrl) {
      const filename = expense.receiptUrl.split('/').pop();
      setReceiptFileName(filename);
      setReceiptFile(null);
    } else {
      setReceiptFileName("");
      setReceiptFile(null);
    }
  };

  const cancelEdit = () => {
    setEditingExpense(null);
    setReceiptFile(null);
    setReceiptFileName("");
    let defaultBranchId = "";
    if (role === "subadmin") {
      const firstAllowed = branches.find(b => allowedBranchIds.includes(String(b._id)));
      if (firstAllowed) {
        defaultBranchId = firstAllowed._id;
      }
    }
    setForm({
      expenseAccountId: "",
      paidFromAccountId: "",
      amount: "",
      description: "",
      referenceNo: "",
      branchId: defaultBranchId,
      expenseDate: new Date().toISOString().split('T')[0]
    });
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!newAcc.name || !newAcc.type) {
      return toast.error("Please provide both account name and type");
    }

    try {
      // For both subadmins and super admins, pass the selected branchId if present
      const payload = { ...newAcc };
      if (form.branchId) {
        payload.branchId = form.branchId;
      }
      await createAccount(payload);
      toast.success(`Account "${newAcc.name}" created successfully!`);
      setModalOpen(false);
      setNewAcc({ name: "", type: "Expense" });
      
      const accRes = await axios.get(`${API_BASE}/admin/accounting/trial-balance`, { headers: getAuthHeaders() });
      const updatedAccounts = accRes.data.data || [];
      setAccounts(updatedAccounts);

      const newlyCreated = updatedAccounts.find(a => a.name.toLowerCase() === newAcc.name.toLowerCase() && a.type === newAcc.type);
      if (newlyCreated) {
        if (newAcc.type === "Expense") {
          setForm(f => ({ ...f, expenseAccountId: newlyCreated._id }));
        } else {
          setForm(f => ({ ...f, paidFromAccountId: newlyCreated._id }));
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create custom account");
    }
  };

  const handleDeleteAccount = (id, type = "Account") => {
    const target = accounts.find(a => String(a._id) === String(id));
    if (target && /cash/i.test(target.name || "")) {
      return toast.error(`You cannot delete the "${target.name}" account.`);
    }
    setAccountToDelete(id);
    setAccountDeleteType(type);
    setAccountDeleteConfirmOpen(true);
  };

  const confirmDeleteAccount = async () => {
    if (!accountToDelete) return;
    try {
      await deleteAccount(accountToDelete);
      toast.success("Account deleted successfully!");
      
      const accRes = await axios.get(`${API_BASE}/admin/accounting/trial-balance`, { headers: getAuthHeaders() });
      setAccounts(accRes.data.data || []);
      
      if (form.expenseAccountId === accountToDelete) setForm(f => ({ ...f, expenseAccountId: "" }));
      if (form.paidFromAccountId === accountToDelete) setForm(f => ({ ...f, paidFromAccountId: "" }));
      
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete account");
    } finally {
      setAccountDeleteConfirmOpen(false);
      setAccountToDelete(null);
    }
  };

  const totalAmount = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const totalCount = expenses.length;

  return (
    <div className="space-y-8 p-1">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-gradient-to-br from-[#134D41] to-[#1a6657] rounded-2xl shadow-lg text-white flex items-center justify-between">
          <div>
            <span className="text-sm font-semibold opacity-80 block">Total Expenses Recorded</span>
            <span className="text-3xl font-black">{currency}{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="p-4 bg-white/10 rounded-xl">
            <FaRupeeSign size={24} />
          </div>
        </div>

        <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-sm font-semibold text-gray-500 block">Total Transactions</span>
            <span className="text-3xl font-black text-gray-800">{totalCount}</span>
          </div>
          <div className="p-4 bg-yellow-50 rounded-xl text-yellow-600">
            <FiBriefcase size={24} />
          </div>
        </div>

        <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-sm font-semibold text-gray-500 block">Active Categories</span>
            <span className="text-3xl font-black text-gray-800">{expenseAccounts.length}</span>
          </div>
          <div className="p-4 bg-green-50 rounded-xl text-[#134D41]">
            <FiCalendar size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 lg:col-span-1 h-fit">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">
              {editingExpense ? "Edit Expense" : "Add New Expense"}
            </h2>
            <div className="flex gap-2">
              {editingExpense && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="text-xs font-bold text-gray-500 hover:text-gray-800 bg-gray-100 px-3 py-1.5 rounded-lg transition"
                >
                  Cancel Edit
                </button>
              )}
              <button
                onClick={() => setModalOpen(true)}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg transition"
              >
                + Create Category
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1 font-semibold text-sm text-gray-600">Expense Category *</label>
              <Dropdown
                options={expenseAccounts.map(a => ({ label: a.name, value: a._id }))}
                value={form.expenseAccountId}
                onChange={val => setForm(f => ({ ...f, expenseAccountId: val }))}
                onDelete={(id) => handleDeleteAccount(id, "Category")}
                placeholder="Select Expense Category"
              />
            </div>

            <div>
              <label className="block mb-1 font-semibold text-sm text-gray-600">Paid From Account *</label>
              <Dropdown
                options={assetAccounts.map(a => ({ label: a.name, value: a._id }))}
                value={form.paidFromAccountId}
                onChange={val => setForm(f => ({ ...f, paidFromAccountId: val }))}
                onDelete={(id) => handleDeleteAccount(id, "Account")}
                placeholder="Select Account (Cash/Bank)"
              />
            </div>

            <div>
              <label className="block mb-1 font-semibold text-sm text-gray-600">Amount ({currency}) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                onWheel={(e) => e.target.blur()}
                className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium text-gray-800"
                placeholder="0.00"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 font-semibold text-sm text-gray-600">Expense Date *</label>
                <input
                  type="date"
                  value={form.expenseDate}
                  onChange={e => setForm(f => ({ ...f, expenseDate: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-yellow-400 outline-none text-sm text-gray-800 bg-white"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 font-semibold text-sm text-gray-600">Branch</label>
                <select
                  value={form.branchId}
                  onChange={e => setForm(f => ({ ...f, branchId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-yellow-400 outline-none bg-white text-sm text-gray-800"
                  required={role === "subadmin"}
                >
                  {role !== "subadmin" && <option value="">Select Branch (Optional)</option>}
                  {branches
                    .filter(b => role !== "subadmin" || allowedBranchIds.includes(String(b._id)))
                    .map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block mb-1 font-semibold text-sm text-gray-600">Reference / Bill No</label>
              <input
                type="text"
                value={form.referenceNo}
                onChange={e => setForm(f => ({ ...f, referenceNo: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-yellow-400 outline-none text-sm text-gray-800"
                placeholder="REF-8921"
              />
            </div>

            <div>
              <label className="block mb-1 font-semibold text-sm text-gray-600">Upload Receipt (Optional)</label>
              <div className="flex items-center gap-3 border border-dashed border-gray-300 rounded-xl p-3 bg-gray-50">
                <label className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition shrink-0">
                  <FiUpload size={14} />
                  Choose File
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
                    onChange={handleReceiptChange}
                    className="hidden"
                  />
                </label>
                {receiptFileName ? (
                  <div className="flex items-center gap-2 text-xs text-gray-600 min-w-0 flex-1">
                    <span className="truncate">{receiptFileName}</span>
                    <button
                      type="button"
                      onClick={clearReceipt}
                      className="p-1 text-red-500 hover:bg-red-50 rounded-md shrink-0"
                      title="Remove receipt"
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                ) : (
                  <span className="text-[11px] text-gray-400">PDF or image (Optional)</span>
                )}
              </div>
            </div>

            <div>
              <label className="block mb-1 font-semibold text-sm text-gray-600">Description *</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-yellow-400 outline-none text-sm text-gray-800"
                rows="3"
                placeholder="Rent for May, Tea & Snacks, Office cleaning..."
                required
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-[#134D41] hover:bg-[#0f3d34] text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50 mt-4 shadow-md shadow-[#134D41]/20"
            >
              <FiSave size={18} /> {saving ? "Saving Expense..." : editingExpense ? "Update Expense Entry" : "Save Expense Entry"}
            </button>
          </form>
        </div>

        <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 lg:col-span-2 space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <h2 className="text-xl font-bold text-gray-800">Recent Expense Entries</h2>
            <div className="flex items-center gap-2 text-gray-400">
              <FiFilter />
              <span className="text-xs font-semibold">Active Filter Mode</span>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <label className="block mb-1 text-[11px] font-bold text-gray-500 uppercase">Branch</label>
              <select
                value={filters.branchId}
                onChange={e => setFilters(f => ({ ...f, branchId: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg p-2 bg-white text-xs text-gray-700 outline-none"
              >
                {role !== "subadmin" && <option value="">All Branches</option>}
                {branches
                  .filter(b => role !== "subadmin" || allowedBranchIds.includes(String(b._id)))
                  .map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block mb-1 text-[11px] font-bold text-gray-500 uppercase">Category</label>
              <select
                value={filters.expenseAccountId}
                onChange={e => setFilters(f => ({ ...f, expenseAccountId: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg p-2 bg-white text-xs text-gray-700 outline-none"
              >
                <option value="">All Categories</option>
                {expenseAccounts.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block mb-1 text-[11px] font-bold text-gray-500 uppercase">From Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg p-2 bg-white text-xs text-gray-700 outline-none"
              />
            </div>

            <div>
              <label className="block mb-1 text-[11px] font-bold text-gray-500 uppercase">To Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg p-2 bg-white text-xs text-gray-700 outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto border rounded-2xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#134D41]/5 text-[#134D41]">
                <tr className="text-[11px] uppercase tracking-wider text-gray-500 font-bold border-b">
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Paid From</th>
                  <th className="px-4 py-3.5">Ref No</th>
                  <th className="px-4 py-3.5 text-center">Receipt</th>
                  <th className="px-4 py-3.5">Description</th>
                  <th className="px-4 py-3.5 text-right">Amount</th>
                  <th className="px-4 py-3.5 text-center w-12">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-gray-400 italic">Loading expenses...</td>
                  </tr>
                ) : expenses.map(exp => (
                  <tr key={exp._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                      {exp.expenseDate ? new Date(exp.expenseDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800 text-xs">
                      {exp.expenseAccountId?.name || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {exp.paidFromAccountId?.name || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">
                      {exp.referenceNo || "-"}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {exp.receiptUrl ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <a
                            href={resolveImageUrl(exp.receiptUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                            title="View Receipt"
                          >
                            <FiPaperclip size={14} />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDownloadReceipt(exp.receiptUrl, `Receipt_${exp.referenceNo || exp._id}`)}
                            className="inline-flex p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition"
                            title="Download Receipt"
                          >
                            <FiDownload size={14} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[150px] truncate">
                      {exp.description}
                      {exp.branchId ? <span className="block text-[10px] text-[#134D41] font-bold">Branch: {exp.branchId.name}</span> : ""}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-xs text-red-600 whitespace-nowrap">
                      {currency}{(exp.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleView(exp)}
                          className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                          title="View Details"
                        >
                          <FiEye size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditClick(exp)}
                          className="p-1.5 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded-lg transition"
                          title="Edit Entry"
                        >
                          <FiEdit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setExpenseToDelete(exp._id);
                            setDeleteConfirmOpen(true);
                          }}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete expense entry"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && expenses.length === 0 && (
                  <tr>
                    <td colSpan="8" className="p-12 text-center text-gray-400 italic text-sm">
                      No expense entries found. Enter a transaction on the left to start.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 transform scale-100 transition-all duration-300 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-black text-gray-800 mb-2">Create Custom Account Category</h3>
            <p className="text-xs text-gray-500 mb-1">Add a new financial account or category dynamically to populate your dropdown forms.</p>
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="block mb-1 font-semibold text-xs text-gray-600">Account Name *</label>
                <input
                  type="text"
                  value={newAcc.name}
                  onChange={e => setNewAcc(n => ({ ...n, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-yellow-400 outline-none text-sm text-gray-800"
                  placeholder="e.g. Refreshments, Rent Expenses"
                  required
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold text-xs text-gray-600">Account Type *</label>
                {role === "Admin" ? (
                  <select
                    value={newAcc.type}
                    onChange={e => setNewAcc(n => ({ ...n, type: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-yellow-400 outline-none bg-white text-sm text-gray-800"
                    required
                  >
                    <option value="Expense">Expense Category (Rent, Utility, Snacks)</option>
                    <option value="Asset">Asset/Payment Account (Bank Account, Cash Box)</option>
                  </select>
                ) : (
                  <div className="w-full border border-gray-100 bg-gray-50 rounded-xl p-2.5 text-xs text-gray-500 font-medium">
                    Expense Category (Rent, Utility, Snacks)
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#134D41] hover:bg-[#0f3d34] text-white rounded-xl text-xs font-bold transition"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationDialog
        isOpen={accountDeleteConfirmOpen}
        onClose={() => {
          setAccountDeleteConfirmOpen(false);
          setAccountToDelete(null);
        }}
        onConfirm={confirmDeleteAccount}
        title={`Delete ${accountDeleteType}?`}
        message={`Are you sure you want to delete this ${accountDeleteType.toLowerCase()}? This action cannot be undone.`}
        confirmText="Confirm Delete"
        cancelText="Cancel"
        type="danger"
      />

      <ConfirmationDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setExpenseToDelete(null);
        }}
        onConfirm={async () => {
          if (expenseToDelete) {
            await handleDelete(expenseToDelete);
          }
          setDeleteConfirmOpen(false);
          setExpenseToDelete(null);
        }}
        title="Delete Expense Entry?"
        message="Are you sure you want to delete this expense record? This action will permanently reverse all associated general ledger transactions."
        confirmText="Confirm Delete"
        cancelText="Cancel"
        type="danger"
      />

      {/* View Details Modal */}
      {viewingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-2xl w-full max-h-[90vh] overflow-y-auto transform scale-100 transition-all duration-200">
            <div className="sticky top-0 bg-white px-8 py-5 border-b border-gray-100 flex items-center justify-between z-10">
              <div>
                <h3 className="text-xl font-bold text-gray-800">
                  Expense Details
                </h3>
                {viewingExpense.referenceNo && (
                  <p className="text-xs text-gray-400 mt-1">
                    Ref No: <span className="font-semibold text-blue-600">{viewingExpense.referenceNo}</span>
                  </p>
                )}
              </div>
              <button
                onClick={() => setViewingExpense(null)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <span className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Expense Category</span>
                  <span className="font-bold text-gray-800 block truncate">{viewingExpense.expenseAccountId?.name || "N/A"}</span>
                  <span className="block text-xs text-gray-500 mt-1">Code: {viewingExpense.expenseAccountId?.code || "N/A"}</span>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <span className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Paid From Account</span>
                  <span className="font-bold text-gray-800 block truncate">{viewingExpense.paidFromAccountId?.name || "N/A"}</span>
                  <span className="block text-xs text-gray-500 mt-1">Code: {viewingExpense.paidFromAccountId?.code || "N/A"}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <span className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Expense Date</span>
                  <span className="font-bold text-gray-800 block">
                    {viewingExpense.expenseDate ? (
                      <>
                        {new Date(viewingExpense.expenseDate).toLocaleDateString("en-IN", { dateStyle: 'medium' })}
                        <span className="block text-[11px] font-normal text-gray-500 mt-1">
                          Time: {new Date(viewingExpense.createdAt || viewingExpense.expenseDate).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                        </span>
                      </>
                    ) : "N/A"}
                  </span>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <span className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Branch</span>
                  <span className="font-bold text-gray-800 block truncate">{viewingExpense.branchId?.name || "All Branches / Main"}</span>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl">
                <span className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Amount</span>
                <span className="font-black text-2xl text-red-600 block">
                  {currency}{(viewingExpense.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl">
                <span className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Description</span>
                <p className="text-sm text-gray-700 whitespace-pre-wrap mt-1">{viewingExpense.description || "N/A"}</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Receipt File</span>
                  {viewingExpense.receiptUrl ? (
                    <span className="text-sm font-semibold text-gray-700 truncate block max-w-xs">
                      {viewingExpense.receiptUrl.split('/').pop()}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-sm italic">No receipt uploaded.</span>
                  )}
                </div>
                {viewingExpense.receiptUrl && (
                  <div className="flex gap-2">
                    <a
                      href={resolveImageUrl(viewingExpense.receiptUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5"
                    >
                      <FiEye size={14} /> View
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDownloadReceipt(viewingExpense.receiptUrl, `Receipt_${viewingExpense.referenceNo || viewingExpense._id}`)}
                      className="bg-green-50 hover:bg-green-100 text-green-700 px-4 py-2 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5"
                    >
                      <FiDownload size={14} /> Download
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="px-8 py-5 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                type="button"
                onClick={() => setViewingExpense(null)}
                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseEntry;
