"use client";
import React, { useState, useEffect } from "react";
import { FiPlus, FiTrash2, FiSave } from "react-icons/fi";
import { getAllParties, getAllProducts, getAllBranches, createPurchase, getAllPurchases } from "@/Api/AllApi";
import { toast } from "react-hot-toast";

const PurchaseEntry = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [recentPurchases, setRecentPurchases] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    supplierId: "",
    gstin: "",
    invoiceNo: "",
    branchId: "",
    purchaseDate: new Date().toISOString().split('T')[0],
    items: [{ productId: "", quantity: 1, rate: 0, gstPercentage: 0, totalAmount: 0 }],
    subTotal: 0,
    totalGst: 0,
    grandTotal: 0
  });

  const fetchPurchases = async () => {
    try {
      const data = await getAllPurchases();
      setRecentPurchases(data || []);
    } catch (error) {
      console.error("Failed to fetch purchases", error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const [s, p, b] = await Promise.all([
        getAllParties("Supplier"),
        getAllProducts({ limit: 1000 }),
        getAllBranches()
      ]);
      setSuppliers(s);
      setProducts(p.products || []);
      setBranches(b);
      fetchPurchases();
    };
    fetchData();
  }, []);

  const handleSupplierChange = (e) => {
    const supplierId = e.target.value;
    const supplier = suppliers.find(s => s._id === supplierId);
    setForm(f => ({ ...f, supplierId, gstin: supplier?.gstin || "" }));
  };

  const addItem = () => {
    setForm(f => ({
      ...f,
      items: [...f.items, { productId: "", quantity: 1, rate: 0, gstPercentage: 0, totalAmount: 0 }]
    }));
  };

  const removeItem = (index) => {
    const newItems = form.items.filter((_, i) => i !== index);
    calculateTotals(newItems);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...form.items];
    newItems[index][field] = value;

    if (field === 'productId') {
      const product = products.find(p => p._id === value);
      newItems[index].rate = product?.basePrice || 0;
      newItems[index].gstPercentage = product?.gstPercentage || 0;
    }

    const item = newItems[index];
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const gst = Number(item.gstPercentage) || 0;
    
    const taxable = qty * rate;
    const gstAmt = (taxable * gst) / 100;
    item.totalAmount = taxable + gstAmt;

    calculateTotals(newItems);
  };

  const calculateTotals = (items) => {
    let subTotal = 0;
    let totalGst = 0;
    items.forEach(item => {
      const taxable = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
      subTotal += taxable;
      totalGst += (taxable * (Number(item.gstPercentage) || 0)) / 100;
    });
    setForm(f => ({ ...f, items, subTotal, totalGst, grandTotal: subTotal + totalGst }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validItems = form.items.filter(item => item.productId !== "");
    if (validItems.length === 0) {
      return toast.error("Please add at least one valid product");
    }

    try {
      setLoading(true);
      await createPurchase({ ...form, items: validItems });
      toast.success("Purchase entry saved and stock updated");
      fetchPurchases();
      // Reset form
      setForm({
        supplierId: "",
        gstin: "",
        invoiceNo: "",
        branchId: "",
        purchaseDate: new Date().toISOString().split('T')[0],
        items: [{ productId: "", quantity: 1, rate: 0, gstPercentage: 0, totalAmount: 0 }],
        subTotal: 0,
        totalGst: 0,
        grandTotal: 0
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save purchase");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold mb-6 text-gray-800">New Purchase Entry</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block mb-1 font-semibold text-sm text-gray-600">Supplier *</label>
              <select
                value={form.supplierId}
                onChange={handleSupplierChange}
                className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-yellow-400 outline-none bg-white"
                required
              >
                <option value="">Select Supplier</option>
                {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-1 font-semibold text-sm text-gray-600">Invoice No *</label>
              <input
                type="text"
                value={form.invoiceNo}
                onChange={e => setForm(f => ({ ...f, invoiceNo: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-yellow-400 outline-none"
                placeholder="INV-001"
                required
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold text-sm text-gray-600">Branch *</label>
              <select
                value={form.branchId}
                onChange={e => setForm(f => ({ ...f, branchId: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-yellow-400 outline-none bg-white"
                required
              >
                <option value="">Select Branch</option>
                {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border rounded-xl">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-yellow-400 to-amber-300">
                <tr className="text-[11px] uppercase tracking-widest text-gray-700">
                  <th className="px-4 py-3 font-black text-left">Product</th>
                  <th className="px-4 py-3 font-black text-center w-24">Qty</th>
                  <th className="px-4 py-3 font-black text-right w-32">Rate</th>
                  <th className="px-4 py-3 font-black text-center w-24">GST %</th>
                  <th className="px-4 py-3 font-black text-right w-32">Total</th>
                  <th className="px-4 py-3 font-black w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {form.items.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3">
                      <select
                        value={item.productId}
                        onChange={e => handleItemChange(index, 'productId', e.target.value)}
                        className="w-full border border-transparent focus:border-yellow-400 rounded-lg p-2 text-sm bg-transparent outline-none transition"
                      >
                        <option value="">Select Product</option>
                        {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                      </select>
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                        className="w-full border border-transparent focus:border-yellow-400 rounded-lg p-2 text-sm bg-transparent text-center outline-none transition"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={item.rate}
                        onChange={e => handleItemChange(index, 'rate', e.target.value)}
                        className="w-full border border-transparent focus:border-yellow-400 rounded-lg p-2 text-sm bg-transparent text-right outline-none transition"
                      />
                    </td>
                    <td className="p-3 text-sm text-gray-600 text-center">
                      <span className="bg-gray-100 px-2 py-1 rounded-md font-medium">{item.gstPercentage}%</span>
                    </td>
                    <td className="p-3 text-sm font-bold text-right text-gray-800">
                      ₹{item.totalAmount.toFixed(2)}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="button"
              onClick={addItem}
              className="w-full p-3 text-sm text-blue-600 hover:bg-blue-50 font-semibold flex items-center justify-center gap-2"
            >
              <FiPlus /> Add Item
            </button>
          </div>

          <div className="flex flex-col items-end gap-2 text-sm">
            <div className="flex justify-between w-64 border-b pb-1">
              <span className="text-gray-500">Sub Total</span>
              <span className="font-semibold">{form.subTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between w-64 border-b pb-1">
              <span className="text-gray-500">Total GST</span>
              <span className="font-semibold">{form.totalGst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between w-64 text-lg">
              <span className="font-bold">Grand Total</span>
              <span className="font-bold text-yellow-600">{form.grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-white px-10 py-3 rounded-xl font-black text-sm flex items-center gap-2 transition-all shadow-lg shadow-yellow-200/50 active:scale-95 disabled:opacity-50"
            >
              <FiSave size={20} /> {loading ? "Saving..." : "Save Purchase Entry"}
            </button>
          </div>
        </form>
      </div>

      <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold mb-6 text-gray-800">Recent Purchase Entries</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gradient-to-r from-yellow-400 to-amber-300">
              <tr className="text-[11px] uppercase tracking-widest text-gray-700">
                <th className="px-4 py-3 font-black">Date</th>
                <th className="px-4 py-3 font-black">Invoice No</th>
                <th className="px-4 py-3 font-black">Supplier</th>
                <th className="px-4 py-3 font-black">GSTIN</th>
                <th className="px-4 py-3 font-black">Items</th>
                <th className="px-4 py-3 font-black text-right">Grand Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recentPurchases.map((p, i) => (
                <tr key={p._id} className="hover:bg-gray-50 transition">
                  <td className="p-3 whitespace-nowrap">{p.purchaseDate ? new Date(p.purchaseDate).toLocaleDateString() : 'N/A'}</td>
                  <td className="p-3 font-medium text-blue-600">{p.invoiceNo}</td>
                  <td className="p-3">{p.supplierId?.name || 'N/A'}</td>
                  <td className="p-3 text-xs">{p.gstin || 'N/A'}</td>
                  <td className="p-3 text-xs text-gray-500">
                    <div className="max-w-[200px] truncate">
                      {p.items?.map(item => `${item.productId?.name} (${item.quantity})`).join(', ')}
                    </div>
                  </td>
                  <td className="p-3 text-right font-bold whitespace-nowrap">₹{p.grandTotal?.toLocaleString()}</td>
                </tr>
              ))}
              {recentPurchases.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-gray-400 italic">No purchase entries found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PurchaseEntry;
