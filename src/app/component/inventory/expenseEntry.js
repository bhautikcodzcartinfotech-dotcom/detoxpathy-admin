"use client";
import React, { useState, useEffect } from "react";
import { FiPlus, FiTrash2, FiSave, FiFilter, FiCalendar, FiBriefcase, FiDollarSign } from "react-icons/fi";
import axios from "axios";
import { API_BASE, getAuthHeaders, getAllBranches, createExpense, getAllExpenses, deleteExpense, createAccount, getSetting } from "@/Api/AllApi";
import { toast } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";

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
      
      // Fetch Expenses with filters applied
      const params = {};
      if (filters.branchId) params.branchId = filters.branchId;
      if (filters.expenseAccountId) params.expenseAccountId = filters.expenseAccountId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      // 1. Fetch Expenses (Core Resource)
      try {
        const expData = await getAllExpenses(params);
        setExpenses(expData || []);
      } catch (err) {
        console.error("Failed to load expenses list:", err);
        toast.error("Failed to load expenses list");
      }

      // 2. Fetch Branches (Side Resource)
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

      // 3. Fetch Settings Currency (Side Resource)
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

      // 4. Fetch Accounts directly from trial-balance (Core Resource)
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

  // Accounts filtering
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

    try {
      setSaving(true);
      await createExpense(form);
      toast.success("Expense successfully saved and ledger posted!");
      
      // Reset form
      const firstAllowed = branches.find(b => allowedBranchIds.includes(String(b._id)));
      setForm({
        expenseAccountId: "",
        paidFromAccountId: "",
        amount: "",
        description: "",
        referenceNo: "",
        branchId: (role === "subadmin" && firstAllowed) ? firstAllowed._id : "",
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

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!newAcc.name || !newAcc.type) {
      return toast.error("Please provide both account name and type");
    }

    try {
      await createAccount(newAcc);
      toast.success(`Account "${newAcc.name}" created successfully!`);
      setModalOpen(false);
      setNewAcc({ name: "", type: "Expense" });
      
      // Refetch accounts
      const accRes = await axios.get(`${API_BASE}/admin/accounting/trial-balance`, { headers: getAuthHeaders() });
      const updatedAccounts = accRes.data.data || [];
      setAccounts(updatedAccounts);

      // Automatically select the newly created account
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

  // Calculate stats for top dashboard cards
  const totalAmount = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const totalCount = expenses.length;

  return (
    <div className="space-y-8 p-1">
      {/* Dashboard Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-gradient-to-br from-[#134D41] to-[#1a6657] rounded-2xl shadow-lg text-white flex items-center justify-between">
          <div>
            <span className="text-sm font-semibold opacity-80 block">Total Expenses Recorded</span>
            <span className="text-3xl font-black">{currency}{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="p-4 bg-white/10 rounded-xl">
            <FiDollarSign size={24} />
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
        {/* Form Column */}
        <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 lg:col-span-1 h-fit">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Add New Expense</h2>
            <button
              onClick={() => setModalOpen(true)}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg transition"
            >
              + Create Category
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1 font-semibold text-sm text-gray-600">Expense Category *</label>
              <select
                value={form.expenseAccountId}
                onChange={e => setForm(f => ({ ...f, expenseAccountId: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-yellow-400 outline-none bg-white text-sm"
                required
              >
                <option value="">Select Expense Category</option>
                {expenseAccounts.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block mb-1 font-semibold text-sm text-gray-600">Paid From Account *</label>
              <select
                value={form.paidFromAccountId}
                onChange={e => setForm(f => ({ ...f, paidFromAccountId: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-yellow-400 outline-none bg-white text-sm"
                required
              >
                <option value="">Select Account (Cash/Bank)</option>
                {assetAccounts.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block mb-1 font-semibold text-sm text-gray-600">Amount ({currency}) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
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
              <FiSave size={18} /> {saving ? "Saving Expense..." : "Save Expense Entry"}
            </button>
          </form>
        </div>

        {/* List Column */}
        <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 lg:col-span-2 space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <h2 className="text-xl font-bold text-gray-800">Recent Expense Entries</h2>
            <div className="flex items-center gap-2 text-gray-400">
              <FiFilter />
              <span className="text-xs font-semibold">Active Filter Mode</span>
            </div>
          </div>

          {/* Filters Panel */}
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

          {/* Table */}
          <div className="overflow-x-auto border rounded-2xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#134D41]/5 text-[#134D41]">
                <tr className="text-[11px] uppercase tracking-wider text-gray-500 font-bold border-b">
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Paid From</th>
                  <th className="px-4 py-3.5">Ref No</th>
                  <th className="px-4 py-3.5">Description</th>
                  <th className="px-4 py-3.5 text-right">Amount</th>
                  <th className="px-4 py-3.5 text-center w-12">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-gray-400 italic">Loading expenses...</td>
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
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[150px] truncate">
                      {exp.description}
                      {exp.branchId ? <span className="block text-[10px] text-[#134D41] font-bold">Branch: {exp.branchId.name}</span> : ""}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-xs text-red-600 whitespace-nowrap">
                      {currency}{(exp.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          setExpenseToDelete(exp._id);
                          setDeleteConfirmOpen(true);
                        }}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete expense entry"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && expenses.length === 0 && (
                  <tr>
                    <td colSpan="7" className="p-12 text-center text-gray-400 italic text-sm">
                      No expense entries found. Enter a transaction on the left to start.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Inline Account Creation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 transform scale-100 transition-all duration-300 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-black text-gray-800 mb-2">Create Custom Account Category</h3>
            <p className="text-xs text-gray-500 mb-4">Add a new financial account or category dynamically to populate your dropdown forms.</p>

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
                <select
                  value={newAcc.type}
                  onChange={e => setNewAcc(n => ({ ...n, type: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-yellow-400 outline-none bg-white text-sm text-gray-800"
                  required
                >
                  <option value="Expense">Expense Category (Rent, Utility, Snacks)</option>
                  <option value="Asset">Asset/Payment Account (Bank Account, Cash Box)</option>
                </select>
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

      {/* Custom Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 transform scale-100 transition-all duration-300 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-4">
              <FiTrash2 size={24} />
            </div>
            <h3 className="text-lg font-black text-gray-800 mb-2">Delete Expense Entry?</h3>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
              Are you sure you want to delete this expense record? This action will permanently reverse all associated general ledger transactions.
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setExpenseToDelete(null);
                }}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600 text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (expenseToDelete) {
                    await handleDelete(expenseToDelete);
                  }
                  setDeleteConfirmOpen(false);
                  setExpenseToDelete(null);
                }}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-red-600/10"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseEntry;
