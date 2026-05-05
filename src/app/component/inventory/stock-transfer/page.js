"use client";
import React, { useState, useEffect } from "react";
import { FiPlus, FiDownload, FiSave } from "react-icons/fi";
import { getAllBranches, getAllProducts, createPurchase } from "@/Api/AllApi"; // I need to add createStockTransfer to AllApi
import { toast } from "react-hot-toast";
import Dropdown from "@/utils/dropdown";
import axios from "axios"; // For direct calls if API not yet in AllApi
import { API_BASE, getAuthHeaders } from "@/Api/AllApi";

const StockTransferPage = () => {
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [transfers, setTransfers] = useState([]);

  const [form, setForm] = useState({
    fromBranchId: "",
    toBranchId: "",
    items: [{ productId: "", quantity: 1, rate: 0, gstPercentage: 0 }]
  });

  useEffect(() => {
    const fetchData = async () => {
      const [b, p, t] = await Promise.all([
        getAllBranches(),
        getAllProducts({ limit: 1000 }),
        axios.get(`${API_BASE}/admin/stock-transfer/get-all`, { headers: getAuthHeaders() })
      ]);
      setBranches(b);
      setProducts(p.products || []);
      setTransfers(t.data.data || []);
    };
    fetchData();
  }, []);

  const handleItemChange = (index, field, value) => {
    const newItems = [...form.items];
    newItems[index][field] = value;
    if (field === 'productId') {
      const product = products.find(p => p._id === value);
      newItems[index].rate = product?.basePrice || 0;
      newItems[index].gstPercentage = product?.gstPercentage || 0;
    }
    setForm({ ...form, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fromBranchId || !form.toBranchId || form.fromBranchId === form.toBranchId) {
      return toast.error("Please select different source and destination branches");
    }
    try {
      setLoading(true);
      await axios.post(`${API_BASE}/admin/stock-transfer/create`, form, { headers: getAuthHeaders() });
      toast.success("Stock transfer successful");
      // Refresh
      const t = await axios.get(`${API_BASE}/admin/stock-transfer/get-all`, { headers: getAuthHeaders() });
      setTransfers(t.data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Transfer failed");
    } finally {
      setLoading(false);
    }
  };

  const downloadChallan = async (id) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/admin/stock-transfer/download-challan/${id}`, {
        headers: getAuthHeaders(),
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Challan_${id.slice(-6).toUpperCase()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error("Failed to download challan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-6 py-6 space-y-8">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold mb-6 text-gray-800">New Stock Transfer</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 font-bold text-sm text-gray-700 ml-1">From Branch (Source)</label>
              <Dropdown
                options={branches.map(b => ({ label: b.name, value: b._id }))}
                value={form.fromBranchId}
                onChange={val => setForm({...form, fromBranchId: val})}
                placeholder="Select Source Branch"
              />
            </div>
            <div>
              <label className="block mb-1.5 font-bold text-sm text-gray-700 ml-1">To Branch (Destination)</label>
              <Dropdown
                options={branches.map(b => ({ label: b.name, value: b._id }))}
                value={form.toBranchId}
                onChange={val => setForm({...form, toBranchId: val})}
                placeholder="Select Destination Branch"
              />
            </div>
          </div>

          <div className="border rounded-xl overflow-hidden">
             <table className="w-full">
                <thead className="bg-gradient-to-r from-yellow-400 to-amber-300">
                  <tr className="text-[11px] uppercase tracking-widest text-gray-700">
                    <th className="px-4 py-3 font-black">Product</th>
                    <th className="px-4 py-3 font-black w-32">Quantity</th>
                    <th className="px-4 py-3 font-black w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {form.items.map((item, index) => (
                    <tr key={index}>
                      <td className="p-2">
                        <select
                          value={item.productId}
                          onChange={e => handleItemChange(index, 'productId', e.target.value)}
                          className="w-full border-none focus:ring-0 text-sm"
                        >
                          <option value="">Select Product</option>
                          {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                          className="w-full border-none focus:ring-0 text-sm"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button type="button" onClick={() => setForm({...form, items: form.items.filter((_, i) => i !== index)})} className="text-red-500 hover:text-red-700">×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
             <button
                type="button"
                onClick={() => setForm({...form, items: [...form.items, { productId: "", quantity: 1, rate: 0, gstPercentage: 0 }]})}
                className="w-full p-3 text-sm text-blue-600 hover:bg-blue-50 font-semibold"
              >
                + Add More Items
              </button>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-white px-10 py-3 rounded-xl font-black text-sm flex items-center gap-2 transition-all shadow-lg shadow-yellow-200/50 active:scale-95 disabled:opacity-50"
            >
              <FiSave size={20} /> {loading ? "Processing..." : "Transfer Stock"}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold mb-6 text-gray-800">Recent Transfers</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gradient-to-r from-yellow-400 to-amber-300">
              <tr className="text-[11px] uppercase tracking-widest text-gray-700">
                <th className="px-4 py-3 font-black">Date</th>
                <th className="px-4 py-3 font-black">From</th>
                <th className="px-4 py-3 font-black">To</th>
                <th className="px-4 py-3 font-black">Type</th>
                <th className="px-4 py-3 font-black">Total</th>
                <th className="px-4 py-3 font-black text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {transfers.map(t => (
                <tr key={t._id} className="text-sm">
                  <td className="p-4">{new Date(t.transferDate).toLocaleDateString()}</td>
                  <td className="p-4 font-medium">{t.fromBranchId?.name}</td>
                  <td className="p-4 font-medium">{t.toBranchId?.name}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${t.transferType === 'Delivery Challan' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      {t.transferType}
                    </span>
                  </td>
                  <td className="p-4">Rs. {t.grandTotal.toLocaleString()}</td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => downloadChallan(t._id)}
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1 mx-auto"
                    >
                      <FiDownload /> Challan
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StockTransferPage;
