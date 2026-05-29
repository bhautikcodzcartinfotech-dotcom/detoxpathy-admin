"use client";
import React, { useState, useEffect } from "react";
import { FiDownload, FiBarChart2, FiArrowUp, FiArrowDown } from "react-icons/fi";
import axios from "axios";
import { API_BASE, getAuthHeaders } from "@/Api/AllApi";
import { toast } from "react-hot-toast";
import RoleGuard from "@/components/RoleGuard";
import { exportToExcel } from "@/utils/excelExport";

import { Header, Button } from "@/utils/header";

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
        params: { type: 'JSON', startDate: dates.start, endDate: dates.end }
      });
      
      const { b2b = [], b2c = [], hsnSummary = [] } = res.data.data || {};
      
      const periodStr = `Period: ${dates.start || "All Time"} to ${dates.end || "All Time"}`;
      
      // 1. B2B Sheet
      const b2bRows = [
        { height: 25, cells: [{ value: "B2B Transactions Report", styleId: "Title", mergeAcross: 5 }] },
        { height: 18, cells: [{ value: periodStr, styleId: "SubTitle", mergeAcross: 5 }] },
        { height: 10, cells: [] }, // Space
        {
          height: 25,
          cells: [
            { value: "Date", styleId: "HeaderB2B" },
            { value: "Customer Name", styleId: "HeaderB2B" },
            { value: "GSTIN", styleId: "HeaderB2B" },
            { value: "Taxable Value (INR)", styleId: "HeaderB2B" },
            { value: "GST Amount (INR)", styleId: "HeaderB2B" },
            { value: "Total Amount (INR)", styleId: "HeaderB2B" }
          ]
        }
      ];
      
      let b2bTaxableSum = 0, b2bGstSum = 0, b2bTotalSum = 0;
      b2b.forEach(o => {
        const taxable = o.subTotal || 0;
        const gst = o.totalGst || 0;
        const total = o.totalAmount || 0;
        b2bTaxableSum += taxable;
        b2bGstSum += gst;
        b2bTotalSum += total;
        
        b2bRows.push({
          height: 20,
          cells: [
            { value: new Date(o.createdAt).toLocaleDateString(), styleId: "CellCenter" },
            { value: o.shippingAddress?.name || ((o.userId?.name || '') + ' ' + (o.userId?.surname || '')), styleId: "CellNormal" },
            { value: o.customerGstin || "-", styleId: "CellCenter" },
            { value: taxable, type: "Number", styleId: "CellRight" },
            { value: gst, type: "Number", styleId: "CellRight" },
            { value: total, type: "Number", styleId: "CellRight" }
          ]
        });
      });
      
      b2bRows.push({
        height: 22,
        cells: [
          { value: "Total", styleId: "CellTotal" },
          { value: "", styleId: "CellTotal" },
          { value: "", styleId: "CellTotal" },
          { value: b2bTaxableSum, type: "Number", styleId: "CellTotalRight" },
          { value: b2bGstSum, type: "Number", styleId: "CellTotalRight" },
          { value: b2bTotalSum, type: "Number", styleId: "CellTotalRight" }
        ]
      });

      // 2. B2C Sheet
      const b2cRows = [
        { height: 25, cells: [{ value: "B2C Transactions Report", styleId: "Title", mergeAcross: 4 }] },
        { height: 18, cells: [{ value: periodStr, styleId: "SubTitle", mergeAcross: 4 }] },
        { height: 10, cells: [] }, // Space
        {
          height: 25,
          cells: [
            { value: "Date", styleId: "HeaderB2C" },
            { value: "Customer Name", styleId: "HeaderB2C" },
            { value: "Taxable Value (INR)", styleId: "HeaderB2C" },
            { value: "GST Amount (INR)", styleId: "HeaderB2C" },
            { value: "Total Amount (INR)", styleId: "HeaderB2C" }
          ]
        }
      ];
      
      let b2cTaxableSum = 0, b2cGstSum = 0, b2cTotalSum = 0;
      b2c.forEach(o => {
        const taxable = o.subTotal || 0;
        const gst = o.totalGst || 0;
        const total = o.totalAmount || 0;
        b2cTaxableSum += taxable;
        b2cGstSum += gst;
        b2cTotalSum += total;
        
        b2cRows.push({
          height: 20,
          cells: [
            { value: new Date(o.createdAt).toLocaleDateString(), styleId: "CellCenter" },
            { value: o.shippingAddress?.name || ((o.userId?.name || '') + ' ' + (o.userId?.surname || '')), styleId: "CellNormal" },
            { value: taxable, type: "Number", styleId: "CellRight" },
            { value: gst, type: "Number", styleId: "CellRight" },
            { value: total, type: "Number", styleId: "CellRight" }
          ]
        });
      });
      
      b2cRows.push({
        height: 22,
        cells: [
          { value: "Total", styleId: "CellTotal" },
          { value: "", styleId: "CellTotal" },
          { value: b2cTaxableSum, type: "Number", styleId: "CellTotalRight" },
          { value: b2cGstSum, type: "Number", styleId: "CellTotalRight" },
          { value: b2cTotalSum, type: "Number", styleId: "CellTotalRight" }
        ]
      });

      // 3. HSN Sheet
      const hsnRows = [
        { height: 25, cells: [{ value: "HSN Summary Report", styleId: "Title", mergeAcross: 5 }] },
        { height: 18, cells: [{ value: periodStr, styleId: "SubTitle", mergeAcross: 5 }] },
        { height: 10, cells: [] }, // Space
        {
          height: 25,
          cells: [
            { value: "HSN Code", styleId: "HeaderHSN" },
            { value: "Description", styleId: "HeaderHSN" },
            { value: "Quantity", styleId: "HeaderHSN" },
            { value: "Taxable Value (INR)", styleId: "HeaderHSN" },
            { value: "GST Amount (INR)", styleId: "HeaderHSN" },
            { value: "Total Amount (INR)", styleId: "HeaderHSN" }
          ]
        }
      ];
      
      let hsnQtySum = 0, hsnTaxableSum = 0, hsnGstSum = 0, hsnTotalSum = 0;
      hsnSummary.forEach(h => {
        const qty = h.qty || 0;
        const taxable = h.taxable || 0;
        const gst = h.gst || 0;
        const total = h.total || 0;
        hsnQtySum += qty;
        hsnTaxableSum += taxable;
        hsnGstSum += gst;
        hsnTotalSum += total;
        
        hsnRows.push({
          height: 20,
          cells: [
            { value: h.hsn || "-", styleId: "CellCenter" },
            { value: h.description || "-", styleId: "CellNormal" },
            { value: qty, type: "Number", styleId: "CellRight" },
            { value: taxable, type: "Number", styleId: "CellRight" },
            { value: gst, type: "Number", styleId: "CellRight" },
            { value: total, type: "Number", styleId: "CellRight" }
          ]
        });
      });
      
      hsnRows.push({
        height: 22,
        cells: [
          { value: "Total", styleId: "CellTotal" },
          { value: "", styleId: "CellTotal" },
          { value: hsnQtySum, type: "Number", styleId: "CellTotalRight" },
          { value: hsnTaxableSum, type: "Number", styleId: "CellTotalRight" },
          { value: hsnGstSum, type: "Number", styleId: "CellTotalRight" },
          { value: hsnTotalSum, type: "Number", styleId: "CellTotalRight" }
        ]
      });

      exportToExcel({
        filename: `GSTR1_Full_Report_${new Date().toISOString().split('T')[0]}.xls`,
        sheets: [
          {
            name: "B2B Transactions",
            columns: [{ width: 100 }, { width: 220 }, { width: 130 }, { width: 130 }, { width: 130 }, { width: 130 }],
            rows: b2bRows
          },
          {
            name: "B2C Transactions",
            columns: [{ width: 100 }, { width: 220 }, { width: 130 }, { width: 130 }, { width: 130 }],
            rows: b2cRows
          },
          {
            name: "HSN Summary",
            columns: [{ width: 100 }, { width: 220 }, { width: 80 }, { width: 130 }, { width: 130 }, { width: 130 }],
            rows: hsnRows
          }
        ]
      });
      
      toast.success("Downloading GSTR-1 Report (B2B, B2C, HSN)");
    } catch (error) {
      console.error(error);
      toast.error("Export failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoleGuard permission="show gst reports page">
      <div className="w-full h-full px-6 py-6 space-y-8 bg-gray-50/50">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <Header size="4xl">GST Reports</Header>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em]">Compliance, reconciliation, and GSTR summaries</p>
          </div>
        </div>
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
          <Button 
            onClick={fetchSummary}
            variant="secondary"
          >
            View Summary
          </Button>
          <Button 
            onClick={downloadGstr1}
            variant="primary"
            icon={FiDownload}
          >
            GSTR-1 Export (B2B, B2C, HSN)
          </Button>
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
              <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-xl shadow-gray-200/50">
                 <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between bg-amber-50/30">
                   <h3 className="font-black text-amber-800 text-[10px] uppercase tracking-widest flex items-center gap-2">
                     <FiArrowUp className="text-amber-500" /> Recent Outward Supplies
                   </h3>
                 </div>
                 <div className="overflow-x-auto">
                   <table className="w-full text-left">
                     <thead className="bg-gray-50/50">
                       <tr className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                         <th className="px-6 py-4">INV #</th>
                         <th className="px-6 py-4">Customer</th>
                         <th className="px-6 py-4 text-right">GST Amount</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-50">
                       {summary.recentSales?.map((s, i) => (
                         <tr key={i} className="hover:bg-amber-50/10 transition-colors">
                           <td className="px-6 py-4 text-gray-400 font-mono text-xs">#{s.id.slice(-6).toUpperCase()}</td>
                           <td className="px-6 py-4 font-bold text-gray-700 text-sm">{s.customer}</td>
                           <td className="px-6 py-4 text-right font-black text-blue-600 text-sm">₹{s.gst.toLocaleString()}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
              </div>

              <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-xl shadow-gray-200/50">
                 <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between bg-amber-50/30">
                   <h3 className="font-black text-amber-800 text-[10px] uppercase tracking-widest flex items-center gap-2">
                     <FiArrowDown className="text-red-500" /> Recent Inward Supplies
                   </h3>
                 </div>
                 <div className="overflow-x-auto">
                   <table className="w-full text-left">
                     <thead className="bg-gray-50/50">
                       <tr className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                         <th className="px-6 py-4">INV #</th>
                         <th className="px-6 py-4">Supplier</th>
                         <th className="px-6 py-4 text-right">GST Amount</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-50">
                       {summary.recentPurchases?.map((p, i) => (
                         <tr key={i} className="hover:bg-amber-50/10 transition-colors">
                           <td className="px-6 py-4 text-gray-400 font-mono text-xs">#{p.id.slice(-6).toUpperCase()}</td>
                           <td className="px-6 py-4 font-bold text-gray-700 text-sm">{p.supplier}</td>
                           <td className="px-6 py-4 text-right font-black text-purple-600 text-sm">₹{p.gst.toLocaleString()}</td>
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
    </RoleGuard>
  );
};

export default GstReportsPage;
