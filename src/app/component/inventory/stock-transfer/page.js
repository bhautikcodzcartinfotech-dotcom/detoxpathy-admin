"use client";
import React, { useState, useEffect } from "react";
import { FiPlus, FiDownload, FiSave, FiPrinter } from "react-icons/fi";
import { getAllBranches, getAllProducts, getAllPlans, createPurchase } from "@/Api/AllApi"; // I need to add createStockTransfer to AllApi
import { toast } from "react-hot-toast";
import Dropdown from "@/utils/dropdown";
import axios from "axios"; // For direct calls if API not yet in AllApi
import { API_BASE, getAuthHeaders } from "@/Api/AllApi";

const StockTransferPage = () => {
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [transfers, setTransfers] = useState([]);

  const [form, setForm] = useState({
    fromBranchId: "",
    toBranchId: "",
    items: [{ type: "product", productId: "", planId: "", quantity: 1, rate: 0, gstPercentage: 0 }]
  });

  useEffect(() => {
    const fetchData = async () => {
      const [b, p, pl, t] = await Promise.all([
        getAllBranches(),
        getAllProducts({ limit: 1000 }),
        getAllPlans(),
        axios.get(`${API_BASE}/admin/stock-transfer/get-all`, { headers: getAuthHeaders() })
      ]);
      setBranches(b);
      setProducts(p.products || []);
      setPlans(pl || []);
      setTransfers(t.data.data || []);
      
      const mainBranch = b.find(branch => branch.isMainBranch);
      if (mainBranch) {
        setForm(prev => ({ ...prev, fromBranchId: mainBranch._id }));
      }
    };
    fetchData();
  }, []);

  const handleItemChange = (index, field, value) => {
    const newItems = [...form.items];
    newItems[index][field] = value;
    if (field === 'type') {
      newItems[index].productId = "";
      newItems[index].planId = "";
      newItems[index].rate = 0;
      newItems[index].gstPercentage = 0;
    } else if (field === 'productId') {
      const product = products.find(p => p._id === value);
      newItems[index].rate = product?.basePrice || 0;
      newItems[index].gstPercentage = product?.gstPercentage || 0;
    } else if (field === 'planId') {
      const plan = plans.find(pl => pl._id === value);
      newItems[index].rate = plan?.price || 0;
      newItems[index].gstPercentage = 0;
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

  const handlePrintChallan = (t) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocker prevented opening print window");
      return;
    }

    const transferDate = new Date(t.transferDate || t.createdAt).toLocaleDateString("en-GB");
    const transferId = `TRF-${t._id.slice(-6).toUpperCase()}`;
    const transferType = t.transferType || "Delivery Challan";

    // Find full branch details from branches state
    const fromBranchIdStr = t.fromBranchId?._id || t.fromBranchId;
    const toBranchIdStr = t.toBranchId?._id || t.toBranchId;
    
    const fromBranchFull = branches.find(b => b._id === fromBranchIdStr) || {};
    const toBranchFull = branches.find(b => b._id === toBranchIdStr) || {};

    const fromBranchName = fromBranchFull.name || t.fromBranchId?.name || "N/A";
    const fromAddress = fromBranchFull.address || "";
    const fromGstin = fromBranchFull.gstin || "N/A";
    const fromMobile = fromBranchFull.mobile || "N/A";
    
    const fromContact = [
      fromGstin && fromGstin !== "N/A" ? `GSTIN: ${fromGstin}` : null,
      fromMobile && fromMobile !== "N/A" ? `Mob: ${fromMobile}` : null,
      fromAddress || null
    ].filter(Boolean).join(" | ");
    const billFrom = `${fromBranchName.toUpperCase()} | ${fromContact}`;

    const toBranchName = toBranchFull.name || t.toBranchId?.name || "N/A";
    const toAddress = toBranchFull.address || "";
    const toGstin = toBranchFull.gstin || "N/A";
    const toMobile = toBranchFull.mobile || "N/A";
    
    const toContact = [
      toGstin && toGstin !== "N/A" ? `GSTIN: ${toGstin}` : null,
      toMobile && toMobile !== "N/A" ? `Mob: ${toMobile}` : null,
      toAddress || null
    ].filter(Boolean).join(" | ");
    const billTo = `${toBranchName.toUpperCase()} | ${toContact}`;

    let itemsHtml = "";
    if (t.items && t.items.length > 0) {
      t.items.forEach(item => {
        const prodId = item.productId?._id || item.productId;
        const planId = item.planId?._id || item.planId;
        let itemName = "Unknown";
        let hsn = "-";
        
        if (prodId) {
          const productObj = products.find(p => p._id === prodId) || {};
          itemName = productObj.name || item.productId?.name || "Product";
          hsn = productObj.hsnCode || "-";
        } else if (planId) {
          const planObj = plans.find(p => p._id === planId) || {};
          itemName = planObj.name || item.planId?.name || "Plan";
          hsn = planObj.planCode || "-";
        }

        const rate = `₹${Number(item.rate || 0).toLocaleString("en-IN")}`;
        const qty = item.quantity || "0";
        const gst = `${item.gstPercentage || 0}%`;
        const total = `₹${Number(item.totalAmount || (item.rate * item.quantity) || 0).toLocaleString("en-IN")}`;
        
        itemsHtml += `
          <tr>
            <td>${itemName}</td>
            <td class="text-center">${hsn}</td>
            <td class="text-right">${rate}</td>
            <td class="text-center">${qty}</td>
            <td class="text-center">${gst}</td>
            <td class="text-right font-bold">${total}</td>
          </tr>
        `;
      });
    }

    const subTotalVal = `₹${Number(t.subTotal || 0).toLocaleString("en-IN")}`;
    const taxVal = `₹${Number(t.totalTax || 0).toLocaleString("en-IN")}`;
    const grandTotalVal = `₹${Number(t.grandTotal || 0).toLocaleString("en-IN")}`;

    const summaryLine = `<strong>Sub Total:</strong> ${subTotalVal} | <strong>Tax Total:</strong> ${taxVal} | <strong>Grand Total:</strong> ${grandTotalVal}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${transferType} - ${transferId}</title>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #1e293b;
            font-size: 13px;
            line-height: 1.5;
            margin: 0;
            padding: 40px;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
          }
          h1 {
            color: #0d9488;
            font-size: 28px;
            margin: 0 0 5px 0;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .subtitle {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            color: #1e293b;
            margin-bottom: 25px;
            letter-spacing: 1px;
          }
          h2 {
            font-size: 18px;
            font-weight: 800;
            margin: 0 0 12px 0;
            color: #1e293b;
            letter-spacing: 0.5px;
            text-transform: uppercase;
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
          }
          .footer {
            text-align: center;
            font-size: 11px;
            color: #64748b;
            margin-top: 40px;
          }
          @media print {
            body {
              padding: 20px;
            }
            button {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>DETOXPATHY</h1>
          <div class="subtitle">HEALTH & WELLNESS</div>
          
          <h2>${transferType.toUpperCase()}</h2>
          
          <div class="metadata">
            <strong>Transfer ID:</strong> ${transferId} | <strong>Date:</strong> ${transferDate}
          </div>
          
          <hr />
          
          <div class="info-section">
            <p><strong>FROM (SOURCE):</strong> ${billFrom}</p>
            <p style="margin-top: 8px;"><strong>TO (DESTINATION):</strong> ${billTo}</p>
          </div>
          
          <hr />
          
          <table>
            <thead>
              <tr>
                <th>DESCRIPTION</th>
                <th class="text-center" style="width: 80px;">HSN</th>
                <th class="text-right" style="width: 100px;">RATE</th>
                <th class="text-center" style="width: 60px;">QTY</th>
                <th class="text-center" style="width: 80px;">GST</th>
                <th class="text-right" style="width: 120px;">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <hr />
          
          <div class="summary-line">
            ${summaryLine}
          </div>
          
          <hr />
          
          <div class="footer">
            Thank you | www.detoxpathy.com | Computer generated stock transfer document.
          </div>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() {
              window.close();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
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
                options={branches.filter(b => b.isMainBranch).map(b => ({ label: b.name, value: b._id }))}
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
                     <th className="px-4 py-3 font-black w-32">Type</th>
                     <th className="px-4 py-3 font-black">Item</th>
                     <th className="px-4 py-3 font-black w-32">Quantity</th>
                     <th className="px-4 py-3 font-black w-16"></th>
                   </tr>
                </thead>
                <tbody className="divide-y">
                   {form.items.map((item, index) => (
                     <tr key={index}>
                       <td className="p-2">
                         <select
                           value={item.type || "product"}
                           onChange={e => handleItemChange(index, 'type', e.target.value)}
                           className="w-full border-none focus:ring-0 text-sm"
                         >
                           <option value="product">Product</option>
                           <option value="plan">Plan</option>
                         </select>
                       </td>
                       <td className="p-2">
                         {item.type === "plan" ? (
                           <select
                             value={item.planId || ""}
                             onChange={e => handleItemChange(index, 'planId', e.target.value)}
                             className="w-full border-none focus:ring-0 text-sm"
                           >
                             <option value="">Select Plan</option>
                             {plans.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                           </select>
                         ) : (
                           <select
                             value={item.productId || ""}
                             onChange={e => handleItemChange(index, 'productId', e.target.value)}
                             className="w-full border-none focus:ring-0 text-sm"
                           >
                             <option value="">Select Product</option>
                             {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                           </select>
                         )}
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
                onClick={() => setForm({...form, items: [...form.items, { type: "product", productId: "", planId: "", quantity: 1, rate: 0, gstPercentage: 0 }]})}
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
                      onClick={() => handlePrintChallan(t)}
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1 mx-auto"
                    >
                      <FiPrinter /> Challan
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
