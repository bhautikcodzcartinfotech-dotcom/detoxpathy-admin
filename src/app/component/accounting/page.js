"use client";
import React, { useState, useEffect } from "react";
import { FiFileText, FiTrendingUp, FiPieChart, FiBarChart2, FiDownload } from "react-icons/fi";
import axios from "axios";
import { API_BASE, getAuthHeaders } from "@/Api/AllApi";
import Dropdown from "@/utils/dropdown";
import { toast } from "react-hot-toast";

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

    let csvContent = "";
    let filename = `${activeTab}_report_${new Date().toISOString().split('T')[0]}.csv`;

    if (activeTab === 'ledger') {
      csvContent += "Date,Description,Account,Debit,Credit\n";
      data.forEach(transaction => {
        const relevantEntries = selectedAccountId
          ? transaction.entries?.filter(e => (e.accountId?._id || e.accountId) === selectedAccountId)
          : transaction.entries || [];
        
        relevantEntries.forEach((entry, j) => {
          const date = j === 0 ? new Date(transaction.transactionDate).toLocaleDateString() : "";
          const desc = j === 0 ? `"${transaction.description.replace(/"/g, '""')}"` : "";
          const account = `"${entry.accountId?.name || 'N/A'}"`;
          const debit = entry.debit > 0 ? entry.debit : "";
          const credit = entry.credit > 0 ? entry.credit : "";
          csvContent += `${date},${desc},${account},${debit},${credit}\n`;
        });
      });
    } else if (activeTab === 'trial') {
      csvContent += "Account Name,Type,Balance\n";
      data.forEach(acc => {
        const balance = (acc.balance || 0) >= 0 ? acc.balance : `-${Math.abs(acc.balance)}`;
        csvContent += `"${acc.name}","${acc.type}",${balance}\n`;
      });
    } else if (activeTab === 'pnl') {
      csvContent += "Category,Name,Balance\n";
      data.revenues?.forEach(r => csvContent += `Revenue,"${r.name}",${r.balance}\n`);
      csvContent += `Revenue,"Total Revenue",${data.totalRevenue}\n`;
      data.expenses?.forEach(e => csvContent += `Expense,"${e.name}",${e.balance}\n`);
      csvContent += `Expense,"Total Expenses",${data.totalExpense}\n`;
      csvContent += `Result,"Net Profit",${data.netProfit}\n`;
    } else if (activeTab === 'balance') {
      csvContent += "Category,Name,Balance\n";
      data.assets?.forEach(a => csvContent += `Asset,"${a.name}",${a.balance}\n`);
      csvContent += `Asset,"Total Assets",${data.totalAssets}\n`;
      data.liabilities?.forEach(l => csvContent += `Liability,"${l.name}",${l.balance}\n`);
      data.equity?.forEach(e => csvContent += `Equity,"${e.name}",${e.balance}\n`);
      const totalLiabEquity = (data.totalLiabilities || 0) + (data.totalEquity || 0);
      csvContent += `Total,"Total Liab. & Equity",${totalLiabEquity}\n`;
    }

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel UTF-8
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Downloaded successfully!");
  };

  return (
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
  );
};

export default AccountingPage;
