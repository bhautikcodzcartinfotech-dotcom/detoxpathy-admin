"use client";
import React, { useState, useEffect } from "react";
import { FiDownload, FiBarChart2, FiArrowUp, FiArrowDown } from "react-icons/fi";
import axios from "axios";
import { API_BASE, getAuthHeaders } from "@/Api/AllApi";
import { toast } from "react-hot-toast";

const GstReportsPage = () => {
  const [summary, setSummary] = useState(null);
  const [dates, setDates] = useState({ start: "", end: "" });
  const [loading, setLoading] = useState(false);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/admin/gst/gstr3b-summary`, { 
        headers: getAuthHeaders(),
        params: { startDate: dates.start, endDate: dates.end }
      });
      setSummary(res.data.data);
    } catch (error) {
      toast.error("Failed to fetch summary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const downloadGstr1 = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/admin/gst/gstr1-export`, {
        headers: getAuthHeaders(),
        params: { type: 'CSV', startDate: dates.start, endDate: dates.end },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `GSTR1_Full_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success("Downloading GSTR-1 Report (B2B, B2C, HSN)");
    } catch (error) {
      toast.error("Export failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Search and Action Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-end bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex-1">
          <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Period</label>
          <div className="flex gap-2">
            <input 
              type="date" 
              value={dates.start}
              onChange={e => setDates({...dates, start: e.target.value})}
              className="border border-gray-200 rounded-xl p-2 text-sm flex-1"
            />
            <input 
              type="date" 
              value={dates.end}
              onChange={e => setDates({...dates, end: e.target.value})}
              className="border border-gray-200 rounded-xl p-2 text-sm flex-1"
            />
          </div>
        </div>
        <button 
          onClick={fetchSummary}
          className="bg-gray-100 text-gray-700 px-6 py-2 rounded-xl font-bold text-sm hover:bg-gray-200 transition"
        >
          View Summary
        </button>
        <button 
          onClick={downloadGstr1}
          className="bg-[#134D41] text-white px-6 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:opacity-90 transition"
        >
          <FiDownload /> GSTR-1 Export (B2B, B2C, HSN)
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-400 italic">Processing data...</div>
      ) : summary && (
        <div className="space-y-6">
          {/* GSTR-3B Summary View */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <FiBarChart2 className="text-yellow-500" /> GSTR-3B Summary View
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Total Sales (Outward)</span>
                <div className="text-3xl font-black text-blue-600">₹{summary.outwardSupplies.gst.toLocaleString()}</div>
                <div className="text-xs text-gray-500">Taxable Value: ₹{summary.outwardSupplies.taxable.toLocaleString()}</div>
              </div>
              <div className="space-y-2">
                <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">Total ITC (Inward)</span>
                <div className="text-3xl font-black text-purple-600">₹{summary.inwardSupplies.gst.toLocaleString()}</div>
                <div className="text-xs text-gray-500">Taxable Value: ₹{summary.inwardSupplies.taxable.toLocaleString()}</div>
              </div>
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-2">
                <span className="text-xs font-bold text-yellow-700 uppercase tracking-wider">Net GST Payable</span>
                <div className={`text-3xl font-black ${summary.netGstPayable >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ₹{Math.abs(summary.netGstPayable).toLocaleString()}
                </div>
                <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">After ITC Adjustment</div>
              </div>
            </div>
          </div>

          {/* Simple Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
               <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                 <FiArrowUp className="text-green-500" /> Recent Outward Supplies
               </h3>
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-xs">
                   <thead>
                     <tr className="text-gray-400 border-b">
                       <th className="pb-2 font-bold">INV #</th>
                       <th className="pb-2 font-bold">CUSTOMER</th>
                       <th className="pb-2 text-right font-bold">GST</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                     {summary.recentSales?.map((s, i) => (
                       <tr key={i}>
                         <td className="py-3 text-gray-400">#{s.id.slice(-6).toUpperCase()}</td>
                         <td className="py-3 font-medium">{s.customer}</td>
                         <td className="py-3 text-right font-bold text-blue-600">₹{s.gst.toLocaleString()}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
               <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                 <FiArrowDown className="text-red-500" /> Recent Inward Supplies
               </h3>
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-xs">
                   <thead>
                     <tr className="text-gray-400 border-b">
                       <th className="pb-2 font-bold">INV #</th>
                       <th className="pb-2 font-bold">SUPPLIER</th>
                       <th className="pb-2 text-right font-bold">GST</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                     {summary.recentPurchases?.map((p, i) => (
                       <tr key={i}>
                         <td className="py-3 text-gray-400">#{p.id.slice(-6).toUpperCase()}</td>
                         <td className="py-3 font-medium">{p.supplier}</td>
                         <td className="py-3 text-right font-bold text-purple-600">₹{p.gst.toLocaleString()}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GstReportsPage;
