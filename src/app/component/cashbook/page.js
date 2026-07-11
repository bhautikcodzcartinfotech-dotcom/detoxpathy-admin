"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getCashbookMain,
  getCashbookBranch,
  getCashbookSummary,
  getAllBranches,
  getAllExpenses,
  resolveImageUrl,
  getAvailableCash,
  createContra,
  getContras,
} from "@/Api/AllApi";
import { useAuth } from "@/contexts/AuthContext";
import RoleGuard from "@/components/RoleGuard";
import { toast } from "react-hot-toast";
import {
  MdAccountBalanceWallet,
  MdStore,
  MdFilterList,
  MdDownload,
  MdRefresh,
  MdTrendingUp,
  MdAttachMoney,
  MdReceipt,
  MdPhone,
} from "react-icons/md";
import {
  FiCreditCard,
  FiShoppingBag,
  FiVideo,
  FiGlobe,
  FiHome,
  FiTrendingDown,
} from "react-icons/fi";

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n || 0);

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const TYPE_META = {
  booktrial: {
    label: "Video Trial",
    color: "bg-violet-100 text-violet-700 border-violet-200",
    icon: FiVideo,
    row: "bg-violet-50/40",
  },
  online_order: {
    label: "Online Order",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: FiGlobe,
    row: "bg-blue-50/40",
  },
  branch_order_online: {
    label: "Branch Online",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: FiCreditCard,
    row: "bg-emerald-50/40",
  },
  branch_order_offline: {
    label: "Branch Offline",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    icon: FiHome,
    row: "bg-amber-50/40",
  },
};

// ─── Summary Card ──────────────────────────────────────────────────────────────
const SummaryCard = ({ label, value, icon: Icon, gradient, sub, onClick }) => (
  <div
    onClick={onClick}
    className={`bg-white p-5 rounded-none border-t-4 ${gradient} shadow-xl hover:scale-[1.02] transition-all relative overflow-hidden group ${
      onClick ? "cursor-pointer select-none" : ""
    }`}
  >
    <div className="relative z-10 flex flex-col justify-between h-full">
      <div>
        <p className="text-[9px] md:text-[10px] font-black text-gray-400 mb-2 uppercase truncate" title={label}>
          {label}
        </p>
        <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-2 truncate">
          {value}
        </h3>
      </div>
      {sub && <div className="text-[9px] md:text-[10px] text-gray-500 font-bold">{sub}</div>}
    </div>
    {Icon && (
      <Icon className="absolute top-6 right-6 w-12 h-12 text-gray-100 opacity-20 group-hover:opacity-30 transition-all group-hover:-rotate-12" />
    )}
  </div>
);

// ─── Badge ────────────────────────────────────────────────────────────────────
const TypeBadge = ({ type }) => {
  const meta = TYPE_META[type] || {
    label: type,
    color: "bg-gray-100 text-gray-600 border-gray-200",
    icon: MdReceipt,
  };
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${meta.color}`}
    >
      <Icon size={10} />
      {meta.label}
    </span>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
export default function CashbookPage() {
  const { role, user } = useAuth();
  const isAdmin = role === "Admin";
  const isDoctor = role === "subadmin" || ["sub admin", "sub doctor"].includes(String(user?.adminType || "").trim().toLowerCase());

  // Tabs
  const [activeTab, setActiveTab] = useState(isAdmin ? "main" : "branch");

  // Shared filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(""); // All / Online / Offline

  // Data
  const [mainData, setMainData] = useState(null);
  const [branchData, setBranchData] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [contras, setContras] = useState([]);
  const [showContraModal, setShowContraModal] = useState(false);
  const [availableCash, setAvailableCash] = useState(0);
  const [summary, setSummary] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  // Contra Form
  const [contraForm, setContraForm] = useState({ amount: "", transferType: 1, description: "" });
  const [isContraSaving, setIsContraSaving] = useState(false);

  const handleContraSubmit = async (e) => {
    e.preventDefault();
    const amountNum = Number(contraForm.amount);
    if (!amountNum || amountNum <= 0) {
      return toast.error("Please enter a valid amount greater than zero.");
    }
    if (amountNum > availableCash) {
      return toast.error(`Amount exceeds branch's available cash (Available: ₹${availableCash}).`);
    }
    if (!contraForm.description.trim()) {
      return toast.error("Description is required.");
    }

    setIsContraSaving(true);
    try {
      const targetBranchId = isDoctor ? (user?.branch?.[0] || "") : selectedBranch;
      await createContra({
        branchId: targetBranchId,
        amount: amountNum,
        transferType: Number(contraForm.transferType),
        description: contraForm.description,
        date: new Date().toISOString().split('T')[0]
      });
      toast.success("Contra transfer recorded successfully!");
      setContraForm({ amount: "", transferType: 1, description: "" });
      setShowContraModal(false);
      loadContras();
      loadSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit contra request");
    } finally {
      setIsContraSaving(false);
    }
  };

  // Pagination
  const [page, setPage] = useState(1);
  const LIMIT = 50;

  // ── Load branches list (for Admin filter) ─────────────────────────────────
  useEffect(() => {
    if (isAdmin) {
      getAllBranches()
        .then((data) => {
          const filtered = (data || []).filter(b => b.name?.toLowerCase().trim() !== "head branch");
          setBranches(filtered);
        })
        .catch(() => {});
    }
  }, [isAdmin]);

  // Auto-select first branch when switching to branch cashbook tab
  useEffect(() => {
    if (activeTab === "branch" && !selectedBranch && branches.length > 0) {
      setSelectedBranch(branches[0]._id);
    }
  }, [activeTab, branches, selectedBranch]);

  // ── Load summary ──────────────────────────────────────────────────────────
  const loadSummary = useCallback(async () => {
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (selectedBranch) params.branchId = selectedBranch;
      const data = await getCashbookSummary(params);
      setSummary(data);
    } catch (e) {
      console.error(e);
    }
  }, [startDate, endDate, selectedBranch]);

  // ── Load main cashbook ────────────────────────────────────────────────────
  const loadMain = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (selectedBranch) params.branchId = selectedBranch;
      const data = await getCashbookMain(params);
      setMainData(data);
    } catch (e) {
      toast.error("Failed to load main cashbook");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, startDate, endDate, selectedBranch]);

  // ── Load branch cashbook ──────────────────────────────────────────────────
  const loadBranch = useCallback(async () => {
    // Admin must have a branch selected; subadmin is auto-scoped on backend
    if (isAdmin && !selectedBranch) return;
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (selectedBranch) params.branchId = selectedBranch;
      if (selectedCategory) params.category = selectedCategory;
      const data = await getCashbookBranch(params);
      setBranchData(data);
    } catch (e) {
      toast.error("Failed to load branch cashbook");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, page, startDate, endDate, selectedBranch, selectedCategory]);

  // ── Load expenses ─────────────────────────────────────────────────────────
  const loadExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (selectedBranch) params.branchId = selectedBranch;
      const data = await getAllExpenses(params);
      setExpenses(data || []);
    } catch (e) {
      toast.error("Failed to load expenses");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedBranch]);

  // ── Load contras ──────────────────────────────────────────────────────────
  const loadContras = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (selectedBranch) params.branchId = selectedBranch;
      const data = await getContras(params);
      setContras(data || []);
    } catch (e) {
      toast.error("Failed to load contras");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedBranch]);

  // ── Fetch available cash ───────────────────────────────────────────────────
  const fetchAvailableCash = async (bId) => {
    try {
      const data = await getAvailableCash(bId);
      setAvailableCash(data?.availableCash || 0);
    } catch (e) {
      console.error("Failed to fetch available cash:", e);
    }
  };

  // ── Trigger fetches on tab / filter change ────────────────────────────────
  useEffect(() => {
    loadSummary();
    if (activeTab === "main" && isAdmin) {
      loadMain();
    } else if (activeTab === "branch") {
      loadBranch();
    } else if (activeTab === "expenses") {
      loadExpenses();
    } else if (activeTab === "contra") {
      loadContras();
    }
  }, [activeTab, loadMain, loadBranch, loadExpenses, loadContras, loadSummary, isAdmin]);

  // ── Reset page on filter change ───────────────────────────────────────────
  const applyFilters = () => {
    setPage(1);
    loadSummary();
    if (activeTab === "main" && isAdmin) loadMain();
    else if (activeTab === "branch") loadBranch();
    else if (activeTab === "expenses") loadExpenses();
    else if (activeTab === "contra") loadContras();
  };

  // ── Export to CSV ─────────────────────────────────────────────────────────
  const exportCSV = () => {
    const entries =
      activeTab === "main"
        ? mainData?.entries || []
        : branchData?.entries || [];
    if (!entries.length) {
      toast.error("No data to export");
      return;
    }

    const headers = [
      "Date",
      "Type",
      "Description",
      "User Name",
      "User Mobile",
      "Branch",
      "Payment Method",
      "Amount (₹)",
    ];

    const rows = entries.map((e) => [
      fmtDate(e.date),
      TYPE_META[e.type]?.label || e.type,
      e.description,
      e.user?.name || "",
      e.user?.mobile || "",
      e.branch?.name || "Main / Online",
      e.paymentMethod,
      e.amount,
    ]);

    const csvContent = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cashbook_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Exported successfully!");
  };

  const currentData = activeTab === "main" ? mainData : branchData;
  const entries = activeTab === "expenses" ? expenses : activeTab === "contra" ? contras : (currentData?.entries || []);
  const totalPages = Math.ceil((currentData?.total || 0) / LIMIT);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <RoleGuard allow={["Admin", "subadmin"]} permission="show cashbook page">
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-gray-800">
            <MdAccountBalanceWallet className="text-[#134D41]" size={28} />
            Cashbook
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Complete payment ledger — online, offline &amp; branch transactions
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={applyFilters}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm hover:bg-gray-50 transition"
          >
            <MdRefresh size={16} /> Refresh
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 rounded-xl bg-[#134D41] px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-[#0f3d34] transition"
          >
            <MdDownload size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      {summary && (() => {
        const cOnline = summary.contraOnline?.total || 0;
        const cOffline = summary.contraOffline?.total || 0;
        const isBranchSelected = isDoctor || selectedBranch !== "";
        const totalAfterExpense = isBranchSelected
          ? (summary.branchOrders?.totalOffline || 0) - (summary.totalExpense?.total || 0)
          : (summary.grandTotal || 0) - (summary.totalExpense?.total || 0);
        const totalAfterContra = isBranchSelected
          ? totalAfterExpense - cOnline - cOffline
          : totalAfterExpense + cOnline + cOffline;

        return (
          <div className={isDoctor ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4" : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"}>
            {!isDoctor && (
              <>
                <SummaryCard
                  label="Book Trial"
                  value={fmt(summary.bookTrial?.total)}
                  icon={FiVideo}
                  gradient="border-teal-600"
                  sub={`${summary.bookTrial?.count} payments`}
                />
                <SummaryCard
                  label="Online Orders"
                  value={fmt(summary.onlineOrders?.total)}
                  icon={FiGlobe}
                  gradient="border-emerald-600"
                  sub={`${summary.onlineOrders?.count} orders`}
                />
                <SummaryCard
                  label="Branch Online"
                  value={fmt(summary.branchOrders?.totalOnline || 0)}
                  icon={MdStore}
                  gradient="border-green-500"
                  sub={`${summary.branchOrders?.countOnline || 0} orders`}
                />
              </>
            )}
            <SummaryCard
              label="Branch Offline"
              value={fmt(summary.branchOrders?.totalOffline || 0)}
              icon={MdStore}
              gradient="border-amber-500"
              sub={`${summary.branchOrders?.countOffline || 0} orders`}
            />
            <SummaryCard
              label="Total Expense"
              value={fmt(summary.totalExpense?.total || 0)}
              icon={FiTrendingDown}
              gradient="border-amber-500"
              sub={`${summary.totalExpense?.count || 0} entries`}
              onClick={() => { setActiveTab("expenses"); setPage(1); }}
            />
            <SummaryCard
              label="Contra Online"
              value={fmt(cOnline)}
              icon={FiGlobe}
              gradient="border-emerald-500"
              sub={`${summary.contraOnline?.count || 0} transfers`}
              onClick={() => { setActiveTab("contra"); setPage(1); }}
            />
            <SummaryCard
              label="Contra Offline"
              value={fmt(cOffline)}
              icon={FiHome}
              gradient="border-amber-500"
              sub={`${summary.contraOffline?.count || 0} transfers`}
              onClick={() => { setActiveTab("contra"); setPage(1); }}
            />
            {!isDoctor && (
              <SummaryCard
                label="Grand Total"
                value={fmt(summary.grandTotal)}
                icon={MdAttachMoney}
                gradient="border-[#134D41]"
                sub={`${summary.onlineOrders?.count + summary.bookTrial?.count + summary.branchOrders?.count} transactions`}
              />
            )}
            <SummaryCard
              label={isBranchSelected ? "Available cash" : "Total After Expense and Contra"}
              value={fmt(totalAfterContra)}
              icon={MdAccountBalanceWallet}
              gradient="border-teal-700"
              sub="Net balance"
            />
          </div>
        );
      })()}

      {/* ── Tabs ── */}
      <div className="flex gap-2 rounded-2xl border border-gray-100 bg-white p-1.5 shadow-sm w-fit">
        {isAdmin && (
          <button
            onClick={() => { setActiveTab("main"); setPage(1); setSelectedBranch(""); }}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
              activeTab === "main"
                ? "bg-[#134D41] text-white shadow-md"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <FiGlobe size={15} />
            Main Cashbook
          </button>
        )}
        <button
          onClick={() => {
            setActiveTab("branch");
            setPage(1);
            if (branches.length > 0) {
              setSelectedBranch(branches[0]._id);
            }
          }}
          className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
            activeTab === "branch"
              ? "bg-[#134D41] text-white shadow-md"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <FiHome size={15} />
          Branch Cashbook
        </button>
        <button
          onClick={() => {
            setActiveTab("expenses");
            setPage(1);
          }}
          className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
            activeTab === "expenses"
              ? "bg-[#134D41] text-white shadow-md"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <FiTrendingDown size={15} />
          Expenses
        </button>
        <button
          onClick={() => {
            setActiveTab("contra");
            setPage(1);
          }}
          className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
            activeTab === "contra"
              ? "bg-[#134D41] text-white shadow-md"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <MdAccountBalanceWallet size={15} />
          Contra Entries
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <MdFilterList size={18} className="text-gray-400 mt-1" />
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-gray-400">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#134D41] focus:outline-none focus:ring-1 focus:ring-[#134D41]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-gray-400">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#134D41] focus:outline-none focus:ring-1 focus:ring-[#134D41]"
          />
        </div>
        {isAdmin && (
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-gray-400">
              Branch
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#134D41] focus:outline-none focus:ring-1 focus:ring-[#134D41] min-w-[160px]"
            >
              {activeTab !== "branch" && <option value="">All Branches</option>}
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={applyFilters}
          className="rounded-xl bg-[#134D41] px-5 py-2 text-sm font-bold text-white hover:bg-[#0f3d34] transition shadow-md"
        >
          Apply
        </button>
        <button
          onClick={() => {
            setStartDate("");
            setEndDate("");
            setSelectedBranch(activeTab === "branch" && branches.length > 0 ? branches[0]._id : "");
            setSelectedCategory("");
            setPage(1);
          }}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition"
        >
          Clear
        </button>
      </div>

      {/* ── Main Cashbook type breakdown (Admin tab) ── */}
      {/* ── Table ── */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-800">
              {activeTab === "main" ? "All Online Payments" : activeTab === "expenses" ? "Expense Entries" : activeTab === "contra" ? "Contra Entries" : "Branch Transactions"}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {activeTab === "expenses" || activeTab === "contra" ? entries.length : currentData?.total || 0} total entries
              {branchData?.branch && activeTab === "branch" && ` · ${branchData.branch.name}`}
            </p>
          </div>
          {activeTab === "expenses" && (
            <Link
              href="/component/inventory/expense-entry"
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2 text-sm font-bold text-white shadow-md transition"
            >
              + Add Expense
            </Link>
          )}
          {activeTab === "contra" && (isDoctor || selectedBranch) && (
            <button
              onClick={async () => {
                const targetBranchId = isDoctor ? (user?.branch?.[0] || "") : selectedBranch;
                if (targetBranchId) {
                  await fetchAvailableCash(targetBranchId);
                  setShowContraModal(true);
                } else {
                  toast.error("Please select a branch first.");
                }
              }}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2 text-sm font-bold text-white shadow-md transition"
            >
              + Create Contra Request
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#134D41] border-t-transparent" />
              <p className="text-sm text-gray-400">Loading transactions...</p>
            </div>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-gray-400">
            <MdAccountBalanceWallet size={40} className="opacity-30" />
            <p className="text-sm font-medium">No transactions found</p>
            <p className="text-xs">Try adjusting the filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                {activeTab === "expenses" ? (
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Paid From</th>
                    <th className="px-4 py-3">Branch</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-center">Receipt</th>
                  </tr>
                ) : activeTab === "contra" ? (
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Branch</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Transfer Type</th>
                    <th className="px-4 py-3">Initiated By</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Date & Time</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Branch</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-gray-50">
                {activeTab === "expenses" ? (
                  entries.map((entry, idx) => {
                    const cleanDate = entry.expenseDate ? new Date(entry.expenseDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric"
                    }) : "—";
                    return (
                      <tr key={String(entry._id)} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-xs text-gray-400 font-medium">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs text-gray-600">{cleanDate}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">
                            {entry.expenseAccountId?.name || "Expense"}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <span className="text-xs font-medium text-gray-700 line-clamp-2">
                            {entry.description}
                          </span>
                          {entry.referenceNo && (
                            <span className="block text-[10px] text-gray-400 mt-0.5 truncate">
                              Ref: {entry.referenceNo}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-block rounded-lg border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                            {entry.paidFromAccountId?.name || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {entry.branchId ? (
                            <div>
                              <p className="text-xs font-semibold text-gray-700">
                                {entry.branchId.name}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-red-600 text-sm">
                          {fmt(entry.amount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {entry.receiptUrl ? (
                            <a
                              href={resolveImageUrl(entry.receiptUrl)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-bold"
                            >
                              View
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : activeTab === "contra" ? (
                  entries.map((entry, idx) => {
                    const cleanDate = entry.date || (entry.createdAt ? new Date(entry.createdAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric"
                    }) : "—");
                    return (
                      <tr key={String(entry._id)} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-xs text-gray-400 font-medium">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs text-gray-600">{cleanDate}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold text-gray-700">
                            {entry.branchId?.name || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <span className="text-xs font-medium text-gray-700 line-clamp-2">
                            {entry.description}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                            Number(entry.transferType) === 1
                              ? "bg-blue-100 text-blue-700 border-blue-200" 
                              : "bg-amber-100 text-amber-700 border-amber-200"
                          }`}>
                            {Number(entry.transferType) === 1 ? "Online / Bank" : "Offline / Cash"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-600">
                            {entry.createdBy?.name || entry.createdBy?.email || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-black text-gray-800 text-sm">
                          {fmt(entry.amount)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  entries.map((entry, idx) => {
                    const meta = TYPE_META[entry.type] || {};
                    return (
                      <tr
                        key={String(entry._id)}
                        className={`hover:brightness-95 transition-all ${meta.row || ""}`}
                      >
                        <td className="px-4 py-3 text-xs text-gray-400 font-medium">
                          {(page - 1) * LIMIT + idx + 1}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs text-gray-600">{fmtDate(entry.date)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <TypeBadge type={entry.type} />
                        </td>
                        <td className="px-4 py-3 max-w-[180px]">
                          <span className="text-xs font-medium text-gray-700 line-clamp-2">
                            {entry.description}
                          </span>
                          {entry.razorpayPaymentId && (
                            <span className="block text-[10px] text-gray-400 mt-0.5 truncate font-mono">
                              {entry.razorpayPaymentId}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {entry.user ? (
                            <div>
                              <p className="text-xs font-semibold text-gray-700">
                                {entry.user.name || "—"}
                              </p>
                              <p className="flex items-center gap-0.5 text-[10px] text-gray-400">
                                <MdPhone size={10} />
                                {entry.user.mobile || "—"}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {entry.branch ? (
                            <div>
                              <p className="text-xs font-semibold text-gray-700">
                                {entry.branch.name}
                              </p>
                              <p className="text-[10px] text-gray-400">{entry.branch.city}</p>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                              <FiGlobe size={9} /> Online
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-block rounded-lg border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                            {entry.paymentMethod || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-black text-gray-800 text-sm">
                            {fmt(entry.amount)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {activeTab !== "expenses" && activeTab !== "contra" && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
            <p className="text-xs text-gray-500">
              Page {page} of {totalPages} · {currentData?.total} entries
            </p>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                ← Prev
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Branch breakdown table (Admin only, Main tab) ── */}
      {isAdmin && activeTab === "main" && summary?.branchBreakdown?.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="font-bold text-gray-800">Branch-wise Breakdown</h2>
            <p className="text-xs text-gray-400 mt-0.5">Payment summary grouped by branch</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-[11px] font-bold uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Branch</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3 text-right">Offline Amount</th>
                  <th className="px-4 py-3 text-right">Online Amount</th>
                  <th className="px-4 py-3 text-right">Orders</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {summary.branchBreakdown.map((b, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-semibold text-gray-700">{b.branchName || "—"}</td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{b.city || "—"}</td>
                    <td className="px-4 py-3 text-right text-amber-700 font-semibold">
                      {fmt(b.totalOffline)}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-700 font-semibold">
                      {fmt(b.totalOnline)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">{b.orderCount}</td>
                    <td className="px-4 py-3 text-right font-black text-gray-800">
                      {fmt((b.totalOffline || 0) + (b.totalOnline || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Contra Request Modal ── */}
      {showContraModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <MdAccountBalanceWallet className="text-amber-500" size={22} />
                Create Contra Request
              </h3>
              <button
                onClick={() => setShowContraModal(false)}
                className="rounded-xl p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleContraSubmit} className="space-y-4">
              {/* Branch info */}
              <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
                <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider block">
                  Available Cash
                </span>
                <span className="text-2xl font-black text-amber-900 block mt-1">
                  {fmt(availableCash)}
                </span>
              </div>

              {/* Amount */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Transfer Amount (₹)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={availableCash}
                  value={contraForm.amount}
                  onChange={(e) => setContraForm({ ...contraForm, amount: e.target.value })}
                  placeholder="e.g. 5000"
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#134D41] focus:outline-none focus:ring-1 focus:ring-[#134D41]"
                />
              </div>

              {/* Transfer Type */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Transfer Type / Destination
                </label>
                <select
                  value={contraForm.transferType}
                  onChange={(e) => setContraForm({ ...contraForm, transferType: Number(e.target.value) })}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#134D41] focus:outline-none focus:ring-1 focus:ring-[#134D41]"
                >
                  <option value={1}>Online (Directly deposit to Bank account)</option>
                  <option value={2}>Offline (Hand over physical Cash to Main office)</option>
                </select>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Description / Remarks
                </label>
                <textarea
                  required
                  rows="3"
                  value={contraForm.description}
                  onChange={(e) => setContraForm({ ...contraForm, description: e.target.value })}
                  placeholder="Provide transaction details or handover reference..."
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#134D41] focus:outline-none focus:ring-1 focus:ring-[#134D41] resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowContraModal(false)}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isContraSaving || availableCash <= 0}
                  className="flex-1 rounded-xl bg-[#134D41] hover:bg-[#0f3d34] py-2.5 text-sm font-bold text-white shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isContraSaving ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </RoleGuard>
  );
}
