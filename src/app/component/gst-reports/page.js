"use client";
import React, { useState, useEffect } from "react";
import { FiDownload, FiBarChart, FiCalendar } from "react-icons/fi";
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
      link.setAttribute('download', `GSTR1_Export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success("Downloading GSTR-1 Export");
    } catch (error) {
      toast.error("Export failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row items-end gap-4 mb-8">
           <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Start Date</label>
              <input 
                type="date" 
                value={dates.start}
                onChange={e => setDates({...dates, start: e.target.value})}
                className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-yellow-400"
              />
           </div>
           <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">End Date</label>
              <input 
                type="date" 
                value={dates.end}
                onChange={e => setDates({...dates, end: e.target.value})}
                className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-yellow-400"
              />
           </div>
           <button 
             onClick={fetchSummary}
             className="bg-[#134D41] text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2"
           >
             Filter
           </button>
           <button 
             onClick={downloadGstr1}
             className="bg-yellow-400 text-gray-900 px-8 py-3 rounded-xl font-bold flex items-center gap-2"
           >
             <FiDownload /> Export GSTR-1
           </button>
        </div>

        <h2 className="text-xl font-bold mb-6 text-gray-800">GSTR-3B Summary</h2>
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                <span className="text-blue-600 font-bold uppercase text-xs">Outward Supplies (Sales)</span>
                <div className="mt-2 text-2xl font-black text-blue-900">Rs. {summary.outwardSupplies.gst.toLocaleString()}</div>
                <div className="text-xs text-blue-500 mt-1">Taxable Value: {summary.outwardSupplies.taxable.toLocaleString()}</div>
             </div>
             <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100">
                <span className="text-purple-600 font-bold uppercase text-xs">Inward Supplies (ITC)</span>
                <div className="mt-2 text-2xl font-black text-purple-900">Rs. {summary.inwardSupplies.gst.toLocaleString()}</div>
                <div className="text-xs text-purple-500 mt-1">Taxable Value: {summary.inwardSupplies.taxable.toLocaleString()}</div>
             </div>
             <div className="bg-yellow-50 p-6 rounded-2xl border border-yellow-200">
                <span className="text-yellow-700 font-bold uppercase text-xs">Net GST Payable</span>
                <div className="mt-2 text-2xl font-black text-yellow-800">Rs. {summary.netGstPayable.toLocaleString()}</div>
                <div className="text-xs text-yellow-600 mt-1">Payable after ITC offset</div>
             </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><FiBarChart className="text-yellow-500" /> B2B Transactions</h3>
            <p className="text-sm text-gray-500 mb-4">Export GSTR-1 to see detailed customer-wise GST reporting for businesses with valid GSTINs.</p>
         </div>
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><FiCalendar className="text-yellow-500" /> Filing Deadlines</h3>
            <div className="space-y-3">
               <div className="flex justify-between text-sm">
                  <span className="text-gray-600">GSTR-1 (Monthly)</span>
                  <span className="font-bold">11th of Next Month</span>
               </div>
               <div className="flex justify-between text-sm">
                  <span className="text-gray-600">GSTR-3B (Monthly)</span>
                  <span className="font-bold">20th of Next Month</span>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default GstReportsPage;
