"use client";
import React, { useState, useEffect } from "react";
import { FiPlus, FiTrash2, FiSave } from "react-icons/fi";
import { getAllParties, getAllProducts, getAllBranches, createPurchase, getAllPurchases, getSetting } from "@/Api/AllApi";
import { toast } from "react-hot-toast";
import Dropdown from "@/utils/dropdown";
import { useAuth } from "@/contexts/AuthContext";
import ConfirmationDialog from "@/components/ConfirmationDialog";

const PurchaseEntry = () => {
  const { role, branches: userBranches } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [recentPurchases, setRecentPurchases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState("₹");
  const [filterMonth, setFilterMonth] = useState("");

  const [form, setForm] = useState({
    supplierId: "",
    gstin: "",
    invoiceNo: "",
    branchId: typeof window !== 'undefined' ? localStorage.getItem('selectedPurchaseBranchId') || "" : "",
    purchaseDate: new Date().toISOString().split('T')[0],
    items: [{ productId: "", quantity: 1, rate: 0, gstPercentage: 0, totalAmount: 0 }],
    subTotal: 0,
    totalGst: 0,
    grandTotal: 0
  });

  // ... (inside component)

  const handleBranchChange = (e) => {
    const branchId = e.target.value;
    setForm(f => ({ ...f, branchId }));
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedPurchaseBranchId', branchId);
    }
  };

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
      const [s, p, b, settingsRes] = await Promise.all([
        getAllParties("Supplier"),
        getAllProducts({ limit: 1000 }),
        getAllBranches(),
        getSetting()
      ]);
      setSuppliers(s);
      setProducts(p.products || []);
      
      if (role === 'subadmin' && userBranches && userBranches.length > 0) {
        const allowedBranches = b.filter(branch => userBranches.includes(branch._id));
        setBranches(allowedBranches);
        
        // Force the form to use their branch instead of localstorage or empty
        const initialBranchId = typeof window !== 'undefined' ? localStorage.getItem('selectedPurchaseBranchId') : null;
        if (!initialBranchId || !userBranches.includes(initialBranchId)) {
          if (allowedBranches.length > 0) {
            setForm(f => ({ ...f, branchId: allowedBranches[0]._id }));
            if (typeof window !== 'undefined') {
              localStorage.setItem('selectedPurchaseBranchId', allowedBranches[0]._id);
            }
          }
        }
      } else {
        setBranches(b);
      }

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

  const handleDownloadMonthlyInvoices = () => {
    if (!filterMonth) {
      toast.error("Please select a month first");
      return;
    }

    const filteredForMonth = recentPurchases.filter(p => {
      const branchMatch = !form.branchId || (p.branchId?._id || p.branchId) === form.branchId;
      let monthMatch = false;
      if (p.purchaseDate) {
        const pDate = new Date(p.purchaseDate);
        const [year, month] = filterMonth.split('-');
        monthMatch = pDate.getFullYear() === parseInt(year) && (pDate.getMonth() + 1) === parseInt(month);
      }
      return branchMatch && monthMatch;
    });

    if (filteredForMonth.length === 0) {
      toast.error("No purchases found for the selected month.");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocker prevented opening print window");
      return;
    }

    let itemsHtml = "";
    let grandTotalSum = 0;

    filteredForMonth.forEach((order) => {
      const orderDate = order.purchaseDate ? new Date(order.purchaseDate).toLocaleDateString("en-GB") : 'N/A';
      const orderId = order.invoiceNo || `PUR-${order._id.slice(-6).toUpperCase()}`;
      const supplierName = order.supplierId?.name || "N/A";
      
      grandTotalSum += Number(order.grandTotal || 0);

      if (order.items && order.items.length > 0) {
        order.items.forEach(prod => {
          const pName = prod.productId?.name || products.find(p => p._id === (prod.productId?._id || prod.productId))?.name || "Unknown Product";
          const rate = `${currency}${Number(prod.rate || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
          const qty = prod.quantity || "1";
          const gst = `${prod.gstPercentage || 0}%`;
          const total = `${currency}${Number(prod.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
          
          itemsHtml += `
            <tr>
              <td>${orderDate}</td>
              <td>${orderId}</td>
              <td>${supplierName}</td>
              <td>${pName}</td>
              <td class="text-right">${rate}</td>
              <td class="text-center">${qty}</td>
              <td class="text-center">${gst}</td>
              <td class="text-right font-bold">${total}</td>
            </tr>
          `;
        });
      }
    });

    const displayMonth = new Date(filterMonth + "-01").toLocaleDateString("en-US", { month: 'long', year: 'numeric' });
    const formattedGrandTotal = `${currency}${grandTotalSum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
    const selectedBranch = branches.find(b => b._id === form.branchId);
    const displayBranch = selectedBranch ? selectedBranch.name : "All Branches";

    const allInvoicesHtml = `
      <div class="invoice-page">
        <h1>MONTHLY PURCHASE REPORT</h1>
        
        <div class="metadata">
          <strong>Period:</strong> ${displayMonth} | <strong>Branch:</strong> ${displayBranch} | <strong>Total Purchases:</strong> ${filteredForMonth.length}
        </div>
        
        <hr />
        
        <table>
          <thead>
            <tr>
              <th>DATE</th>
              <th>INVOICE NO</th>
              <th>SUPPLIER</th>
              <th>PRODUCT</th>
              <th class="text-right" style="width: 80px;">RATE</th>
              <th class="text-center" style="width: 50px;">QTY</th>
              <th class="text-center" style="width: 60px;">GST</th>
              <th class="text-right" style="width: 100px;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        <hr />
        
        <div class="summary-line">
          <strong>MONTHLY GRAND TOTAL:</strong> <span style="font-size: 16px; color: #0d9488;">${formattedGrandTotal}</span>
        </div>
        
        <hr />
        
        <div class="footer">
          Computer generated monthly purchase record.
        </div>
      </div>
    `;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Purchase Invoices - ${filterMonth}</title>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #1e293b;
            font-size: 13px;
            line-height: 1.5;
            margin: 0;
            padding: 0;
            background: #f1f5f9;
          }
          .invoice-page {
            background: white;
            padding: 40px;
            max-width: 800px;
            margin: 20px auto;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            page-break-after: always;
          }
          .invoice-page:last-child {
            page-break-after: auto;
          }
          h1 {
            color: #0d9488;
            font-size: 24px;
            margin: 0 0 15px 0;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .metadata {
            font-size: 12px;
            margin-bottom: 12px;
            color: #1e293b;
          }
          .metadata strong {
            font-weight: 700;
          }
          hr {
            border: 0;
            border-top: 1px solid #cbd5e1;
            margin: 15px 0;
          }
          .info-section {
            margin: 15px 0;
            font-size: 12px;
            line-height: 1.6;
          }
          .info-section p {
            margin: 4px 0;
          }
          .info-section strong {
            font-weight: 700;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th {
            background-color: #f8fafc;
            color: #1e293b;
            font-weight: 700;
            text-align: left;
            padding: 8px 12px;
            font-size: 11px;
            border-top: 1px solid #cbd5e1;
            border-bottom: 1px solid #cbd5e1;
            text-transform: uppercase;
          }
          td {
            padding: 10px 12px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 12px;
          }
          .text-center {
            text-align: center;
          }
          .text-right {
            text-align: right;
          }
          .summary-line {
            font-size: 12px;
            margin: 15px 0;
            color: #1e293b;
            padding: 5px 0;
            text-align: right;
          }
          .footer {
            text-align: center;
            font-size: 11px;
            color: #64748b;
            margin-top: 40px;
          }
          @media print {
            body {
              padding: 0;
              background: white;
            }
            .invoice-page {
              margin: 0;
              box-shadow: none;
              padding: 20px;
            }
          }
        </style>
      </head>
      <body>
        ${allInvoicesHtml}
        
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 500);
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const filteredPurchases = recentPurchases.filter(p => {
    const branchMatch = !form.branchId || (p.branchId?._id || p.branchId) === form.branchId;
    const monthMatch = !filterMonth || (p.purchaseDate && p.purchaseDate.startsWith(filterMonth));
    return branchMatch && monthMatch;
  });

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
                onChange={e => {
                  const branchId = e.target.value;
                  setForm(f => ({ ...f, branchId }));
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('selectedPurchaseBranchId', branchId);
                  }
                }}
                className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-yellow-400 outline-none bg-white"
                required
              >
                <option value="">All Branch</option>
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
                      {currency}{item.totalAmount.toFixed(2)}
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-xl font-bold text-gray-800">Recent Purchase Entries</h2>
          <div className="flex items-center gap-3">
            <input 
              type="month" 
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="border border-gray-200 rounded-lg p-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-yellow-400 bg-gray-50"
              title="Select month to filter and download"
            />
            <button 
              onClick={handleDownloadMonthlyInvoices}
              disabled={!filterMonth}
              className="bg-[#134D41] hover:bg-[#0f3d34] text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              Download PDF
            </button>
          </div>
        </div>
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
              {filteredPurchases.map((p, i) => (
                <tr key={p._id} className="hover:bg-gray-50 transition">
                  <td className="p-3 whitespace-nowrap">{p.purchaseDate ? new Date(p.purchaseDate).toLocaleDateString() : 'N/A'}</td>
                  <td className="p-3 font-medium text-blue-600">{p.invoiceNo}</td>
                  <td className="p-3">{p.supplierId?.name || 'N/A'}</td>
                  <td className="p-3 text-xs">{p.gstin || 'N/A'}</td>
                  <td className="p-3 text-xs text-gray-500">
                    <div className="max-w-[200px] truncate">
                      {p.items?.map(item => {
                        const pName = item.productId?.name || products.find(prod => prod._id === (item.productId?._id || item.productId))?.name || "Unknown Product";
                        return `${pName} (${item.quantity})`;
                      }).join(', ')}
                    </div>
                  </td>
                  <td className="p-3 text-right font-bold whitespace-nowrap">{p.currency || "₹"}{p.grandTotal?.toLocaleString()}</td>
                </tr>
              ))}
              {filteredPurchases.length === 0 && (
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
