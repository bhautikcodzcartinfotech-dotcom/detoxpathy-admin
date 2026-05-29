"use client";
import React, { useState, useEffect } from "react";
import { FiFileText, FiTrendingUp, FiPieChart, FiBarChart2, FiDownload } from "react-icons/fi";
import axios from "axios";
import { API_BASE, getAuthHeaders } from "@/Api/AllApi";
import Dropdown from "@/utils/dropdown";
import { toast } from "react-hot-toast";
import RoleGuard from "@/components/RoleGuard";
import { exportToExcel } from "@/utils/excelExport";

const AccountingPage = () => {
  const [activeTab, setActiveTab] = useState("ledger");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");

  useEffect(() => {
    fetchReport(activeTab);
    if (activeTab === 'ledger') {
      fetchAccounts();
    }
  }, [activeTab, selectedAccountId]);

  const fetchAccounts = async () => {
    try {
      const res = await axios.get(`${API_BASE}/admin/accounting/trial-balance`, { headers: getAuthHeaders() });
      setAccounts(res.data.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchReport = async (tab) => {
    try {
      setLoading(true);
      setData(null); // Clear previous data
      const endpoint = tab === 'ledger' ? 'ledger' : tab === 'trial' ? 'trial-balance' : tab === 'pnl' ? 'pnl' : 'balance-sheet';
      let url = `${API_BASE}/admin/accounting/${endpoint}`;
      if (tab === 'ledger' && selectedAccountId) {
        url += `?accountId=${selectedAccountId}`;
      }
      const res = await axios.get(url, { headers: getAuthHeaders() });
      setData(res.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (!data || (Array.isArray(data) && data.length === 0)) {
      toast.error("No data to export");
      return;
    }

    const todayStr = new Date().toLocaleDateString();
    let sheets = [];
    let filename = `${activeTab}_report_${new Date().toISOString().split('T')[0]}.xls`;

    if (activeTab === 'ledger') {
      const rows = [
        { height: 25, cells: [{ value: "General Ledger Report", styleId: "Title", mergeAcross: 4 }] },
        { height: 18, cells: [{ value: `Generated on ${todayStr}`, styleId: "SubTitle", mergeAcross: 4 }] },
        { height: 10, cells: [] },
        {
          height: 25,
          cells: [
            { value: "Date", styleId: "HeaderLedger" },
            { value: "Description", styleId: "HeaderLedger" },
            { value: "Account Name", styleId: "HeaderLedger" },
            { value: "Debit (INR)", styleId: "HeaderLedger" },
            { value: "Credit (INR)", styleId: "HeaderLedger" }
          ]
        }
      ];

      let debitSum = 0;
      let creditSum = 0;

      data.forEach(transaction => {
        const relevantEntries = selectedAccountId
          ? transaction.entries?.filter(e => (e.accountId?._id || e.accountId) === selectedAccountId)
          : transaction.entries || [];
        
        relevantEntries.forEach((entry, j) => {
          const date = j === 0 ? new Date(transaction.transactionDate).toLocaleDateString() : "";
          const desc = j === 0 ? transaction.description : "";
          const account = entry.accountId?.name || 'N/A';
          const debit = entry.debit > 0 ? entry.debit : 0;
          const credit = entry.credit > 0 ? entry.credit : 0;
          
          debitSum += debit;
          creditSum += credit;

          rows.push({
            height: 20,
            cells: [
              { value: date, styleId: "CellCenter" },
              { value: desc, styleId: "CellNormal" },
              { value: account, styleId: "CellNormal" },
              { value: debit > 0 ? debit : "", type: debit > 0 ? "Number" : "String", styleId: "CellRight" },
              { value: credit > 0 ? credit : "", type: credit > 0 ? "Number" : "String", styleId: "CellRight" }
            ]
          });
        });

        // Insert a blank separator row after each transaction to avoid mixing them up
        if (relevantEntries.length > 0) {
          rows.push({
            height: 12,
            cells: [
              { value: "" },
              { value: "" },
              { value: "" },
              { value: "" },
              { value: "" }
            ]
          });
        }
      });

      rows.push({
        height: 22,
        cells: [
          { value: "Total", styleId: "CellTotal" },
          { value: "", styleId: "CellTotal" },
          { value: "", styleId: "CellTotal" },
          { value: debitSum, type: "Number", styleId: "CellTotalRight" },
          { value: creditSum, type: "Number", styleId: "CellTotalRight" }
        ]
      });

      sheets.push({
        name: "General Ledger",
        columns: [{ width: 90 }, { width: 250 }, { width: 180 }, { width: 110 }, { width: 110 }],
        rows
      });

    } else if (activeTab === 'trial') {
      const rows = [
        { height: 25, cells: [{ value: "Trial Balance Report", styleId: "Title", mergeAcross: 2 }] },
        { height: 18, cells: [{ value: `Generated on ${todayStr}`, styleId: "SubTitle", mergeAcross: 2 }] },
        { height: 10, cells: [] },
        {
          height: 25,
          cells: [
            { value: "Account Name", styleId: "HeaderTrial" },
            { value: "Account Type", styleId: "HeaderTrial" },
            { value: "Balance (INR)", styleId: "HeaderTrial" }
          ]
        }
      ];

      data.forEach(acc => {
        const balance = acc.balance || 0;
        rows.push({
          height: 20,
          cells: [
            { value: acc.name, styleId: "CellNormal" },
            { value: acc.type ? String(acc.type).toUpperCase() : "N/A", styleId: "CellCenter" },
            { value: balance, type: "Number", styleId: "CellRight" }
          ]
        });
      });

      sheets.push({
        name: "Trial Balance",
        columns: [{ width: 250 }, { width: 130 }, { width: 130 }],
        rows
      });

    } else if (activeTab === 'pnl') {
      const rows = [
        { height: 25, cells: [{ value: "Profit & Loss Statement", styleId: "Title", mergeAcross: 2 }] },
        { height: 18, cells: [{ value: `Generated on ${todayStr}`, styleId: "SubTitle", mergeAcross: 2 }] },
        { height: 10, cells: [] },
        {
          height: 25,
          cells: [
            { value: "Category", styleId: "HeaderPnL" },
            { value: "Name", styleId: "HeaderPnL" },
            { value: "Balance (INR)", styleId: "HeaderPnL" }
          ]
        },
        // Revenue Section
        { height: 22, cells: [{ value: "REVENUE", styleId: "CellRevenueHeader", mergeAcross: 2 }] }
      ];

      data.revenues?.forEach(r => {
        rows.push({
          height: 20,
          cells: [
            { value: "", styleId: "CellNormal" },
            { value: r.name, styleId: "CellNormal" },
            { value: r.balance || 0, type: "Number", styleId: "CellRight" }
          ]
        });
      });

      rows.push({
        height: 22,
        cells: [
          { value: "", styleId: "CellBoldLeft" },
          { value: "Total Revenue", styleId: "CellBoldLeft" },
          { value: data.totalRevenue || 0, type: "Number", styleId: "CellBoldRight" }
        ]
      });

      rows.push({ height: 10, cells: [] }); // Space

      // Expense Section
      rows.push({ height: 22, cells: [{ value: "EXPENSES", styleId: "CellExpenseHeader", mergeAcross: 2 }] });

      data.expenses?.forEach(e => {
        rows.push({
          height: 20,
          cells: [
            { value: "", styleId: "CellNormal" },
            { value: e.name, styleId: "CellNormal" },
            { value: e.balance || 0, type: "Number", styleId: "CellRight" }
          ]
        });
      });

      rows.push({
        height: 22,
        cells: [
          { value: "", styleId: "CellBoldLeft" },
          { value: "Total Expenses", styleId: "CellBoldLeft" },
          { value: data.totalExpense || 0, type: "Number", styleId: "CellBoldRight" }
        ]
      });

      rows.push({ height: 15, cells: [] }); // Space

      // Net Profit Row
      rows.push({
        height: 25,
        cells: [
          { value: "Net Profit", styleId: "CellNetProfit" },
          { value: "", styleId: "CellNetProfit" },
          { value: data.netProfit || 0, type: "Number", styleId: "CellNetProfitRight" }
        ]
      });

      sheets.push({
        name: "Profit & Loss",
        columns: [{ width: 130 }, { width: 250 }, { width: 130 }],
        rows
      });

    } else if (activeTab === 'balance') {
      const rows = [
        { height: 25, cells: [{ value: "Balance Sheet", styleId: "Title", mergeAcross: 2 }] },
        { height: 18, cells: [{ value: `Generated on ${todayStr}`, styleId: "SubTitle", mergeAcross: 2 }] },
        { height: 10, cells: [] },
        {
          height: 25,
          cells: [
            { value: "Category", styleId: "HeaderBalance" },
            { value: "Account Name", styleId: "HeaderBalance" },
            { value: "Balance (INR)", styleId: "HeaderBalance" }
          ]
        },
        // Assets Section
        { height: 22, cells: [{ value: "ASSETS", styleId: "CellAssetHeader", mergeAcross: 2 }] }
      ];

      data.assets?.forEach(a => {
        rows.push({
          height: 20,
          cells: [
            { value: "", styleId: "CellNormal" },
            { value: a.name, styleId: "CellNormal" },
            { value: a.balance || 0, type: "Number", styleId: "CellRight" }
          ]
        });
      });

      rows.push({
        height: 22,
        cells: [
          { value: "", styleId: "CellBoldLeft" },
          { value: "Total Assets", styleId: "CellBoldLeft" },
          { value: data.totalAssets || 0, type: "Number", styleId: "CellBoldRight" }
        ]
      });

      rows.push({ height: 10, cells: [] }); // Space

      // Liabilities & Equity Section
      rows.push({ height: 22, cells: [{ value: "LIABILITIES & EQUITY", styleId: "CellLiabilityHeader", mergeAcross: 2 }] });

      data.liabilities?.forEach(l => {
        rows.push({
          height: 20,
          cells: [
            { value: "", styleId: "CellNormal" },
            { value: l.name, styleId: "CellNormal" },
            { value: l.balance || 0, type: "Number", styleId: "CellRight" }
          ]
        });
      });

      data.equity?.forEach(e => {
        rows.push({
          height: 20,
          cells: [
            { value: "", styleId: "CellNormal" },
            { value: e.name, styleId: "CellNormal" },
            { value: e.balance || 0, type: "Number", styleId: "CellRight" }
          ]
        });
      });

      const totalLiabEquity = (data.totalLiabilities || 0) + (data.totalEquity || 0);
      rows.push({
        height: 22,
        cells: [
          { value: "", styleId: "CellBoldLeft" },
          { value: "Total Liabilities & Equity", styleId: "CellBoldLeft" },
          { value: totalLiabEquity, type: "Number", styleId: "CellBoldRight" }
        ]
      });

      sheets.push({
        name: "Balance Sheet",
        columns: [{ width: 160 }, { width: 220 }, { width: 130 }],
        rows
      });
    }

    exportToExcel({
      filename,
      sheets
    });

    toast.success("Downloaded successfully!");
  };

  return (
    <RoleGuard permission="show accounting page">
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap gap-4">
          {[
            { id: "ledger", label: "General Ledger", icon: FiFileText },
            { id: "trial", label: "Trial Balance", icon: FiBarChart2 },
            { id: "pnl", label: "Profit & Loss", icon: FiTrendingUp },
            { id: "balance", label: "Balance Sheet", icon: FiPieChart },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition ${activeTab === tab.id
                ? "bg-[#134D41] text-white shadow-lg"
                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-100"
                }`}
            >
              <tab.icon /> {tab.label}
            </button>
          ))}
        </div>

        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold text-gray-800 capitalize">
            {activeTab.replace('-', ' ')} Report
          </h2>
          <button
            onClick={downloadReport}
            disabled={loading || !data}
            className="flex items-center gap-2 px-4 py-2 bg-[#134D41] text-white rounded-lg font-bold hover:bg-[#0f3d34] transition disabled:opacity-50"
          >
            <FiDownload /> Export to Excel
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-gray-400">Loading report...</div>
          ) : !data ? (
            <div className="flex items-center justify-center h-64 text-gray-400">No data available</div>
          ) : (
            <div className="overflow-x-auto">
              {activeTab === 'ledger' && Array.isArray(data) && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-64">
                      <Dropdown
                        label="Filter by Account"
                        options={[
                          { label: "All Transactions", value: "" },
                          ...accounts.map(acc => ({
                            label: `${acc.name} (${acc.type})`,
                            value: acc._id
                          }))
                        ]}
                        value={selectedAccountId}
                        onChange={setSelectedAccountId}
                      />
                    </div>
                  </div>
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 uppercase text-xs text-gray-500 font-bold">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Description</th>
                        <th className="p-3 text-right">Debit</th>
                        <th className="p-3 text-right">Credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data?.map?.((transaction, i) => {
                        // If an account is selected, only show the debit/credit for THAT account
                        const relevantEntries = (selectedAccountId
                          ? transaction.entries?.filter(e => (e.accountId?._id || e.accountId) === selectedAccountId)
                          : transaction.entries) || [];

                        return relevantEntries.map((entry, j) => (
                          <tr key={`${i}-${j}`}>
                            <td className="p-3">{j === 0 ? new Date(transaction.transactionDate).toLocaleDateString() : ""}</td>
                            <td className="p-3">
                              {j === 0 ? transaction.description : ""}
                              {selectedAccountId ? "" : ` (${entry.accountId?.name || 'N/A'})`}
                            </td>
                            <td className="p-3 text-right text-red-600 font-medium">
                              {entry.debit > 0 ? entry.debit.toLocaleString() : ""}
                            </td>
                            <td className="p-3 text-right text-green-600 font-medium">
                              {entry.credit > 0 ? entry.credit.toLocaleString() : ""}
                            </td>
                          </tr>
                        ));
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'trial' && Array.isArray(data) && (
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 uppercase text-xs text-gray-500 font-bold">
                    <tr>
                      <th className="p-3">Account Name</th>
                      <th className="p-3">Type</th>
                      <th className="p-3 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data?.map?.((acc, i) => (
                      <tr key={i}>
                        <td className="p-3 font-medium">{acc.name}</td>
                        <td className="p-3 text-gray-500 uppercase text-[10px]">{acc.type}</td>
                        <td className={`p-3 text-right font-bold ${(acc.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          Rs. {Math.abs(acc.balance || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === 'pnl' && data.revenues && (
                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h3 className="font-bold text-green-700 uppercase text-xs border-b pb-2">Revenue</h3>
                      {data.revenues?.map((r, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span>{r.name}</span>
                          <span className="font-semibold">{r.balance.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-bold border-t pt-2 text-green-800">
                        <span>Total Revenue</span>
                        <span>{data.totalRevenue?.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="font-bold text-red-700 uppercase text-xs border-b pb-2">Expenses</h3>
                      {data.expenses?.map((e, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span>{e.name}</span>
                          <span className="font-semibold">{e.balance.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-bold border-t pt-2 text-red-800">
                        <span>Total Expenses</span>
                        <span>{data.totalExpense?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-yellow-50 p-6 rounded-xl flex justify-between items-center border border-yellow-100">
                    <span className="text-xl font-bold text-gray-700">Net Profit</span>
                    <span className="text-3xl font-black text-yellow-600">Rs. {data.netProfit?.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {activeTab === 'balance' && data.assets && (
                <div className="grid grid-cols-2 gap-12">
                  <div className="space-y-4">
                    <h3 className="font-bold text-blue-700 uppercase text-xs border-b pb-2">Assets</h3>
                    {data.assets?.map((a, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{a.name}</span>
                        <span className="font-semibold">{a.balance.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-bold border-t pt-2 text-blue-800 text-lg">
                      <span>Total Assets</span>
                      <span>{data.totalAssets?.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-bold text-purple-700 uppercase text-xs border-b pb-2">Liabilities & Equity</h3>
                    {[...(data.liabilities || []), ...(data.equity || [])].map((l, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{l.name}</span>
                        <span className="font-semibold">{l.balance.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-bold border-t pt-2 text-purple-800 text-lg">
                      <span>Total Liab. & Equity</span>
                      <span>{((data.totalLiabilities || 0) + (data.totalEquity || 0)).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </RoleGuard>
  );
};

export default AccountingPage;
