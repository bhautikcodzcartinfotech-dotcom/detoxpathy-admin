"use client";
import React, { useState, useEffect, useRef } from "react";
import { FiPlus, FiTrash2, FiSave, FiUpload, FiX, FiEdit2, FiRotateCcw, FiEye } from "react-icons/fi";
import { getAllParties, getAllProducts, getAllBranches, createPurchase, getAllPurchases, getSetting, resolveImageUrl, getMasterStock, getBranchStocks, updatePurchase, deletePurchase, undoPurchase } from "@/Api/AllApi";
import { toast } from "react-hot-toast";
import Dropdown from "@/utils/dropdown";
import { useAuth } from "@/contexts/AuthContext";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import MasterStockTable from "@/app/component/stock/masterStockTable";
import BranchStockTable from "@/app/component/stock/branchStockTable";
import { getExpiryBatches, formatExpiryDate } from "@/utils/stockDisplay";
import ExpiryToggleButton from "@/app/component/stock/ExpiryToggleButton";
import ExpiryBatchesPanel from "@/app/component/stock/ExpiryBatchesPanel";

const PurchaseEntry = () => {
  const { role, branches: userBranches } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [recentPurchases, setRecentPurchases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState("₹");
  const [filterMonth, setFilterMonth] = useState("");
  const [billFile, setBillFile] = useState(null);
  const [billFileName, setBillFileName] = useState("");
  const [masterStocks, setMasterStocks] = useState([]);
  const [branchStocks, setBranchStocks] = useState([]);
  const [stockBranches, setStockBranches] = useState([]);
  const [selectedStockBranchId, setSelectedStockBranchId] = useState("");
  const [stockLoading, setStockLoading] = useState(false);
  const [expandedItemIndex, setExpandedItemIndex] = useState(null);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [viewingPurchase, setViewingPurchase] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [undoConfirmId, setUndoConfirmId] = useState(null);
  const formRef = useRef(null);

  const [form, setForm] = useState({
    supplierId: "",
    gstin: "",
    invoiceNo: "",
    branchId: typeof window !== 'undefined' ? localStorage.getItem('selectedPurchaseBranchId') || "" : "",
    purchaseDate: new Date().toISOString().split('T')[0],
    items: [{ productId: "", available: "", breakage: "", expiry: "", rate: 0, gstPercentage: 0, totalAmount: 0 }],
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

  const fetchStockData = async () => {
    try {
      setStockLoading(true);
      const [masterData, branchStockData, branchData] = await Promise.all([
        role === "Admin" ? getMasterStock() : Promise.resolve([]),
        getBranchStocks(),
        getAllBranches(),
      ]);

      setMasterStocks(Array.isArray(masterData) ? masterData : []);

      const allBranchList = Array.isArray(branchData) ? branchData : [];
      const filteredBranchList = role === "Admin"
        ? allBranchList
        : allBranchList.filter(b => userBranches?.includes(b._id));
      setStockBranches(filteredBranchList);

      const allBranchStock = Array.isArray(branchStockData) ? branchStockData : [];
      const filteredBranchStock = role === "Admin"
        ? allBranchStock
        : allBranchStock.filter(s => userBranches?.includes(s.branchId?._id));
      setBranchStocks(filteredBranchStock);

      setSelectedStockBranchId(prev => {
        if (prev) return prev;
        const mainBranch = allBranchList.find(b => b.isMainBranch);
        const fallback = filteredBranchList[0];
        return (mainBranch || fallback)?._id || "";
      });
    } catch (error) {
      console.error("Failed to fetch stock data", error);
    } finally {
      setStockLoading(false);
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

      const mainBranches = (b || []).filter(branch => branch.isMainBranch);
      setBranches(mainBranches);

      if (mainBranches.length > 0) {
        const mainBranchId = mainBranches[0]._id;
        setForm(f => ({ ...f, branchId: mainBranchId }));
        if (typeof window !== 'undefined') {
          localStorage.setItem('selectedPurchaseBranchId', mainBranchId);
        }
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
      fetchStockData();
    };
    fetchData();
  }, []);

  const getProductMasterStock = (productId) => {
    if (!productId) return null;
    return masterStocks.find(s => (s.productId?._id || s.productId) === productId) || null;
  };

  const handleSupplierChange = (e) => {
    const supplierId = e.target.value;
    const supplier = suppliers.find(s => s._id === supplierId);
    setForm(f => ({ ...f, supplierId, gstin: supplier?.gstin || "" }));
  };

  const addItem = () => {
    setForm(f => ({
      ...f,
      items: [...f.items, { productId: "", available: "", breakage: "", expiry: "", rate: 0, gstPercentage: 0, totalAmount: 0 }]
    }));
  };

  const removeItem = (index) => {
    const newItems = form.items.filter((_, i) => i !== index);
    calculateTotals(newItems);
  };

  const calculateItemAmounts = (quantity, rate, gstPercentage) => {
    const qty = Number(quantity) || 0;
    const r = Number(rate) || 0;
    const gst = Number(gstPercentage) || 0;
    const lineTotal = qty * r;
    const gstAmount = lineTotal * (gst / 100);
    const taxableAmount = lineTotal - gstAmount;
    return { lineTotal, taxableAmount, gstAmount };
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...form.items];

    if (field === 'available' || field === 'breakage') {
      newItems[index][field] = value.replace(/\D/g, "");
    } else {
      newItems[index][field] = value;
    }

    if (field === 'productId') {
      const product = products.find(p => p._id === value);
      newItems[index].rate = product?.basePrice || 0;
      newItems[index].gstPercentage = product?.gstPercentage || 0;
    }

    const { lineTotal, gstAmount } = calculateItemAmounts(
      newItems[index].available,
      newItems[index].rate,
      newItems[index].gstPercentage
    );
    newItems[index].gstAmount = gstAmount;
    newItems[index].totalAmount = lineTotal;

    calculateTotals(newItems);
  };

  const calculateTotals = (items) => {
    let subTotal = 0;
    let totalGst = 0;
    items.forEach(item => {
      const { lineTotal, taxableAmount, gstAmount } = calculateItemAmounts(
        item.available,
        item.rate,
        item.gstPercentage
      );
      item.gstAmount = gstAmount;
      item.totalAmount = lineTotal;
      subTotal += taxableAmount;
      totalGst += gstAmount;
    });
    subTotal = Math.round(subTotal * 100) / 100;
    totalGst = Math.round(totalGst * 100) / 100;
    const grandTotal = Math.round((subTotal + totalGst) * 100) / 100;
    setForm(f => ({ ...f, items, subTotal, totalGst, grandTotal }));
  };

  const handleBillChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a PDF or image file (JPG, PNG)");
      e.target.value = "";
      return;
    }

    setBillFile(file);
    setBillFileName(file.name);
  };

  const clearBill = () => {
    setBillFile(null);
    setBillFileName("");
  };

  const handleView = (purchase) => {
    setViewingPurchase(purchase);
  };

  const handleEditClick = (purchase) => {
    if (purchase.status === 'Cancelled') {
      toast.error("Cannot edit a cancelled purchase entry");
      return;
    }
    setEditingPurchase(purchase);
    setForm({
      supplierId: purchase.supplierId?._id || purchase.supplierId || "",
      gstin: purchase.gstin || "",
      invoiceNo: purchase.invoiceNo || "",
      branchId: purchase.branchId?._id || purchase.branchId || "",
      purchaseDate: purchase.purchaseDate ? purchase.purchaseDate.split('T')[0] : new Date().toISOString().split('T')[0],
      items: purchase.items.map(item => ({
        productId: item.productId?._id || item.productId || "",
        available: String(item.available ?? item.quantity ?? 0),
        breakage: String(item.breakage ?? 0),
        expiry: item.expiry ? item.expiry.split('T')[0] : "",
        rate: item.rate ?? 0,
        gstPercentage: item.gstPercentage ?? 0,
        totalAmount: item.totalAmount ?? 0
      })),
      subTotal: purchase.subTotal ?? 0,
      totalGst: purchase.totalGst ?? 0,
      grandTotal: purchase.grandTotal ?? 0
    });
    if (purchase.billUrl) {
      const filename = purchase.billUrl.split('/').pop();
      setBillFileName(filename);
      setBillFile(null);
    } else {
      setBillFileName("");
      setBillFile(null);
    }
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const cancelEdit = () => {
    setEditingPurchase(null);
    setBillFile(null);
    setBillFileName("");
    setForm({
      supplierId: "",
      gstin: "",
      invoiceNo: "",
      branchId: branches[0]?._id || "",
      purchaseDate: new Date().toISOString().split('T')[0],
      items: [{ productId: "", available: "", breakage: "", expiry: "", rate: 0, gstPercentage: 0, totalAmount: 0 }],
      subTotal: 0,
      totalGst: 0,
      grandTotal: 0
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;
    try {
      setLoading(true);
      await deletePurchase(deleteConfirmId);
      toast.success("Purchase entry deleted and stock reverted");
      fetchPurchases();
      fetchStockData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete purchase");
    } finally {
      setLoading(false);
      setDeleteConfirmId(null);
    }
  };

  const handleUndoConfirm = async () => {
    if (!undoConfirmId) return;
    try {
      setLoading(true);
      await undoPurchase(undoConfirmId);
      toast.success("Purchase entry cancelled and stock reverted");
      fetchPurchases();
      fetchStockData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to cancel purchase");
    } finally {
      setLoading(false);
      setUndoConfirmId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validItems = form.items.filter(item => item.productId !== "");
    if (validItems.length === 0) {
      return toast.error("Please add at least one valid product");
    }
    const invalidQtyItem = validItems.find(item => !Number(item.available));
    if (invalidQtyItem) {
      return toast.error("Please enter available quantity for all products");
    }

    try {
      setLoading(true);
      const formData = new FormData();
      if (billFile) {
        formData.append("bill", billFile);
      } else if (!billFileName && editingPurchase && editingPurchase.billUrl) {
        formData.append("removeBill", "true");
      }
      formData.append("supplierId", form.supplierId);
      formData.append("gstin", form.gstin || "");
      formData.append("invoiceNo", form.invoiceNo);
      formData.append("purchaseDate", form.purchaseDate);
      formData.append("items", JSON.stringify(validItems));

      if (editingPurchase) {
        await updatePurchase(editingPurchase._id, formData);
        toast.success("Purchase entry updated and stock updated");
        setEditingPurchase(null);
      } else {
        await createPurchase(formData);
        toast.success("Purchase entry saved and stock updated");
      }
      fetchPurchases();
      fetchStockData();
      clearBill();
      setForm(f => ({
        supplierId: "",
        gstin: "",
        invoiceNo: "",
        branchId: f.branchId || branches[0]?._id || "",
        purchaseDate: new Date().toISOString().split('T')[0],
        items: [{ productId: "", available: "", breakage: "", expiry: "", rate: 0, gstPercentage: 0, totalAmount: 0 }],
        subTotal: 0,
        totalGst: 0,
        grandTotal: 0
      }));
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
          const qty = prod.available ?? prod.quantity ?? "1";
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

  const filteredBranchStocks = Array.isArray(branchStocks)
    ? branchStocks.filter(s => s.branchId?._id === selectedStockBranchId)
    : [];

  return (
    <div className="space-y-8">
      <div className={role === "Admin" ? "grid grid-cols-1 lg:grid-cols-2 gap-8" : "grid grid-cols-1 gap-8"}>
        {role === "Admin" && (
          <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-800">Company Master Stock</h3>
              {stockBranches.find(b => b.isMainBranch) && (
                <p className="text-xs text-amber-600 font-semibold mt-0.5">
                  {stockBranches.find(b => b.isMainBranch)?.name} (Main Branch)
                </p>
              )}
            </div>
            <MasterStockTable
              stocks={masterStocks}
              loading={stockLoading}
              onEdit={() => {}}
            />
          </div>
        )}

        <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-800">Branch Stock Levels</h3>
              {selectedStockBranchId && stockBranches.find(b => b._id === selectedStockBranchId) && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {stockBranches.find(b => b._id === selectedStockBranchId)?.name}
                  {stockBranches.find(b => b._id === selectedStockBranchId)?.isMainBranch && (
                    <span className="ml-1 text-amber-600 font-semibold">(Main Branch)</span>
                  )}
                  <span className="text-gray-400"> · {filteredBranchStocks.length} item(s)</span>
                </p>
              )}
            </div>
            <div className="w-56">
              <Dropdown
                options={stockBranches.map(b => ({
                  label: b.isMainBranch ? `${b.name} (Main)` : b.name,
                  value: b._id,
                }))}
                value={selectedStockBranchId}
                onChange={setSelectedStockBranchId}
                placeholder="Select Branch"
                showSearch={stockBranches.length > 5}
              />
            </div>
          </div>
          <BranchStockTable
            stocks={filteredBranchStocks}
            loading={stockLoading}
          />
        </div>
      </div>

      <div ref={formRef} className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">
            {editingPurchase ? `Edit Purchase Entry (${editingPurchase.invoiceNo})` : "New Purchase Entry"}
          </h2>
          {editingPurchase && (
            <button
              type="button"
              onClick={cancelEdit}
              className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition"
            >
              Cancel Edit
            </button>
          )}
        </div>
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
                onChange={handleBranchChange}
                className="w-full border border-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-yellow-400 outline-none bg-gray-50"
                required
                disabled={branches.length <= 1}
              >
                {branches.length === 0 ? (
                  <option value="">Main branch not found</option>
                ) : (
                  branches.map(b => (
                    <option key={b._id} value={b._id}>
                      {b.name} (Main Branch)
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border rounded-xl">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-yellow-400 to-amber-300">
                <tr className="text-[11px] uppercase tracking-widest text-gray-700">
                  <th className="px-3 py-3 font-black text-left min-w-[160px]">Product</th>
                  <th className="px-3 py-3 font-black text-center min-w-[100px]">Available Qty</th>
                  <th className="px-3 py-3 font-black text-center min-w-[100px]">Breakage Qty</th>
                  <th className="px-3 py-3 font-black text-center min-w-[130px]">Expiry Date</th>
                  <th className="px-3 py-3 font-black text-right min-w-[90px]">Rate</th>
                  <th className="px-3 py-3 font-black text-center min-w-[70px]">GST %</th>
                  <th className="px-3 py-3 font-black text-right min-w-[90px]">Total</th>
                  <th className="px-3 py-3 font-black w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {form.items.map((item, index) => {
                  const stock = getProductMasterStock(item.productId);
                  const currentBatches = getExpiryBatches(stock);
                  const entryBatch = item.expiry && (Number(item.available) || Number(item.breakage))
                    ? [{
                        expiry: item.expiry,
                        available: Number(item.available) || 0,
                        breakage: Number(item.breakage) || 0
                      }]
                    : [];
                  const showDetails = item.productId && (currentBatches.length > 0 || entryBatch.length > 0);
                  const expiryLotCount = currentBatches.length || (entryBatch.length > 0 ? 1 : 0);
                  const isExpanded = expandedItemIndex === index;

                  return (
                  <React.Fragment key={index}>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <select
                          value={item.productId}
                          onChange={e => handleItemChange(index, 'productId', e.target.value)}
                          className="flex-1 min-w-0 border border-transparent focus:border-yellow-400 rounded-lg p-2 text-sm bg-transparent outline-none transition"
                        >
                          <option value="">Select Product</option>
                          {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                        </select>
                        {showDetails && (
                          <ExpiryToggleButton
                            expanded={isExpanded}
                            count={expiryLotCount}
                            onClick={() => setExpandedItemIndex(prev => (prev === index ? null : index))}
                            className="shrink-0"
                          />
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={item.available}
                        onChange={e => handleItemChange(index, 'available', e.target.value)}
                        placeholder="0"
                        className="w-full border border-transparent focus:border-yellow-400 rounded-lg p-2 text-sm bg-transparent text-center outline-none transition"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={item.breakage}
                        onChange={e => handleItemChange(index, 'breakage', e.target.value)}
                        placeholder="0"
                        className="w-full border border-transparent focus:border-yellow-400 rounded-lg p-2 text-sm bg-transparent text-center outline-none transition"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="date"
                        value={item.expiry}
                        onChange={e => handleItemChange(index, 'expiry', e.target.value)}
                        className="w-full border border-transparent focus:border-yellow-400 rounded-lg p-2 text-sm bg-transparent text-center outline-none transition"
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end border border-transparent focus-within:border-yellow-400 rounded-lg p-1.5 transition">
                        <span className="text-xs text-gray-400 mr-1 shrink-0">{currency}</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.rate}
                          onChange={e => handleItemChange(index, 'rate', e.target.value)}
                          onWheel={(e) => e.target.blur()}
                          placeholder="0.00"
                          className="w-full text-sm bg-transparent text-right outline-none"
                        />
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center border border-transparent focus-within:border-yellow-400 rounded-lg p-1.5 transition">
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max="100"
                          value={item.gstPercentage}
                          onChange={e => handleItemChange(index, 'gstPercentage', e.target.value)}
                          onWheel={(e) => e.target.blur()}
                          placeholder="0"
                          className="w-12 text-sm bg-transparent text-center outline-none"
                        />
                        <span className="text-xs text-gray-400 ml-0.5">%</span>
                      </div>
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
                  {isExpanded && showDetails && (
                    <tr className="bg-gradient-to-r from-amber-50/80 to-yellow-50/40">
                      <td colSpan={8} className="px-5 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {currentBatches.length > 0 && (
                            <ExpiryBatchesPanel title="Current Stock Expiry" batches={currentBatches} />
                          )}
                          {entryBatch.length > 0 && (
                            <ExpiryBatchesPanel title="Adding This Entry" batches={entryBatch} variant="new" />
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                  );
                })}
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

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 pt-2">
            <div className="flex-1 max-w-lg border border-dashed border-gray-300 rounded-xl p-4 bg-gray-50">
              <label className="block mb-2 font-semibold text-sm text-gray-700">
                Upload Bill
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition shrink-0">
                  <FiUpload />
                  Choose File
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
                    onChange={handleBillChange}
                    className="hidden"
                  />
                </label>
                {billFileName ? (
                  <div className="flex items-center gap-2 text-sm text-gray-600 min-w-0 flex-1">
                    <span className="truncate">{billFileName}</span>
                    <button
                      type="button"
                      onClick={clearBill}
                      className="p-1 text-red-500 hover:bg-red-50 rounded-md shrink-0"
                      title="Remove bill"
                    >
                      <FiX />
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">PDF or image (Optional)</span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 text-sm w-full md:w-72 md:ml-auto">
              <div className="flex justify-between border-b border-gray-200 pb-1">
                <span className="text-gray-500">Sub Total</span>
                <span className="font-semibold">{currency}{form.subTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-1">
                <span className="text-gray-500">Total GST</span>
                <span className="font-semibold">{currency}{form.totalGst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg pt-1">
                <span className="font-bold">Grand Total</span>
                <span className="font-bold text-yellow-600">{currency}{form.grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-white px-10 py-3 rounded-xl font-black text-sm flex items-center gap-2 transition-all shadow-lg shadow-yellow-200/50 active:scale-95 disabled:opacity-50"
            >
              <FiSave size={20} /> {loading ? "Saving..." : editingPurchase ? "Update Purchase Entry" : "Save Purchase Entry"}
            </button>
          </div>
        </form>
      </div>

      <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-xl font-bold text-gray-800">Purchase Entries</h2>
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
                <th className="px-4 py-3 font-black text-center">Bill</th>
                <th className="px-4 py-3 font-black text-center w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredPurchases.map((p, i) => (
                <tr key={p._id} className={`hover:bg-gray-50 transition ${p.status === 'Cancelled' ? 'bg-gray-50/70 text-gray-400' : ''}`}>
                  <td className="p-3 whitespace-nowrap">{p.purchaseDate ? new Date(p.purchaseDate).toLocaleDateString() : 'N/A'}</td>
                  <td className="p-3 font-medium text-blue-600">
                    <span className={p.status === 'Cancelled' ? 'line-through text-gray-400' : ''}>{p.invoiceNo}</span>
                    {p.status === 'Cancelled' && (
                      <span className="ml-2 px-1.5 py-0.5 text-[9px] font-bold bg-red-100 text-red-600 rounded">
                        CANCELLED
                      </span>
                    )}
                  </td>
                  <td className="p-3">{p.supplierId?.name || 'N/A'}</td>
                  <td className="p-3 text-xs">{p.gstin || 'N/A'}</td>
                  <td className="p-3 text-xs text-gray-500">
                    <div className="max-w-[200px] truncate">
                      {p.items?.map(item => {
                        const pName = item.productId?.name || products.find(prod => prod._id === (item.productId?._id || item.productId))?.name || "Unknown Product";
                        const avail = item.available ?? item.quantity ?? 0;
                        const brk = item.breakage ? `, Brk: ${item.breakage}` : "";
                        const exp = item.expiry ? `, Exp: ${formatExpiryDate(item.expiry)}` : "";
                        return `${pName} (${avail}${brk}${exp})`;
                      }).join(', ')}
                    </div>
                  </td>
                  <td className="p-3 text-right font-bold whitespace-nowrap">{p.currency || "₹"}{p.grandTotal?.toLocaleString()}</td>
                  <td className="p-3 text-center">
                    {p.billUrl ? (
                      <a
                        href={resolveImageUrl(p.billUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-xs font-semibold"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="p-3 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleView(p)}
                        className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                        title="View Details"
                      >
                        <FiEye size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditClick(p)}
                        disabled={p.status === 'Cancelled'}
                        className={`p-1.5 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded-lg transition ${
                          p.status === 'Cancelled' ? 'opacity-30 cursor-not-allowed' : ''
                        }`}
                        title="Edit Entry"
                      >
                        <FiEdit2 size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setUndoConfirmId(p._id)}
                        disabled={p.status === 'Cancelled'}
                        className={`p-1.5 text-orange-500 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition ${
                          p.status === 'Cancelled' ? 'opacity-30 cursor-not-allowed' : ''
                        }`}
                        title="Undo (Cancel)"
                      >
                        <FiRotateCcw size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(p._id)}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                        title="Delete Permanently"
                      >
                        <FiTrash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPurchases.length === 0 && (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-gray-400 italic">No purchase entries found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Details Modal */}
      {viewingPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-4xl w-full max-h-[90vh] overflow-y-auto transform scale-100 transition-all duration-200">
            <div className="sticky top-0 bg-white px-8 py-5 border-b border-gray-100 flex items-center justify-between z-10">
              <div>
                <h3 className="text-xl font-bold text-gray-800">
                  Purchase Invoice Details
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Invoice No: <span className="font-semibold text-blue-600">{viewingPurchase.invoiceNo}</span>
                </p>
              </div>
              <button
                onClick={() => setViewingPurchase(null)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <span className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Supplier</span>
                  <span className="font-bold text-gray-800 block truncate">{viewingPurchase.supplierId?.name || "N/A"}</span>
                  <span className="block text-xs text-gray-500 mt-1">GSTIN: {viewingPurchase.gstin || "N/A"}</span>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <span className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Purchase Date</span>
                  <span className="font-bold text-gray-800 block">
                    {viewingPurchase.purchaseDate ? (
                      <>
                        {new Date(viewingPurchase.purchaseDate).toLocaleDateString("en-IN", { dateStyle: 'medium' })}
                        <span className="block text-[11px] font-normal text-gray-500 mt-1">
                          Time: {new Date(viewingPurchase.createdAt || viewingPurchase.purchaseDate).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                        </span>
                      </>
                    ) : "N/A"}
                  </span>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <span className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Branch & Status</span>
                  <span className="font-bold text-gray-800 block truncate">{viewingPurchase.branchId?.name || "Main Branch"}</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 mt-1 rounded-full text-xs font-bold ${
                    viewingPurchase.status === 'Cancelled'
                      ? 'bg-red-50 text-red-600 border border-red-100'
                      : 'bg-green-50 text-green-700 border border-green-100'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${viewingPurchase.status === 'Cancelled' ? 'bg-red-500' : 'bg-green-600'}`} />
                    {viewingPurchase.status || 'Active'}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-gray-800 mb-3">Purchased Items</h4>
                <div className="overflow-x-auto border border-gray-100 rounded-2xl">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3 text-center">Available Qty</th>
                        <th className="px-4 py-3 text-center">Breakage Qty</th>
                        <th className="px-4 py-3 text-center">Expiry Date</th>
                        <th className="px-4 py-3 text-right">Rate</th>
                        <th className="px-4 py-3 text-center">GST</th>
                        <th className="px-4 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {viewingPurchase.items?.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 transition">
                          <td className="px-4 py-3 font-medium text-gray-800">
                            {item.productId?.name || products.find(p => p._id === (item.productId?._id || item.productId))?.name || "Unknown Product"}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-gray-700">{item.available ?? item.quantity ?? 0}</td>
                          <td className="px-4 py-3 text-center text-red-500">{item.breakage ?? 0}</td>
                          <td className="px-4 py-3 text-center text-gray-500">{item.expiry ? formatExpiryDate(item.expiry) : "—"}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{viewingPurchase.currency || "₹"}{(item.rate || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3 text-center text-gray-600">{item.gstPercentage || 0}%</td>
                          <td className="px-4 py-3 text-right font-bold text-gray-800">{viewingPurchase.currency || "₹"}{(item.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-5 bg-gray-50 rounded-2xl gap-4">
                <div>
                  {viewingPurchase.billUrl ? (
                    <a
                      href={resolveImageUrl(viewingPurchase.billUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-yellow-400 hover:bg-yellow-500 text-yellow-950 px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition inline-flex items-center gap-2 active:scale-95"
                    >
                      <FiEye /> View Uploaded Bill
                    </a>
                  ) : (
                    <span className="text-gray-400 text-sm italic">No bill uploaded.</span>
                  )}
                </div>
                <div className="w-full md:w-80 space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between border-b pb-1">
                    <span>Sub Total</span>
                    <span className="font-semibold text-gray-800">{viewingPurchase.currency || "₹"}{(viewingPurchase.subTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span>Total GST</span>
                    <span className="font-semibold text-gray-800">{viewingPurchase.currency || "₹"}{(viewingPurchase.totalGst || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between pt-1 text-lg">
                    <span className="font-bold text-gray-800">Grand Total</span>
                    <span className="font-bold text-yellow-600">{viewingPurchase.currency || "₹"}{(viewingPurchase.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-8 py-5 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                type="button"
                onClick={() => setViewingPurchase(null)}
                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Purchase Entry"
        message="Are you sure you want to permanently delete this purchase entry? This will subtract the item quantities from stock and reverse all associated ledger balances. This action cannot be undone."
        type="danger"
        confirmText="Delete"
      />

      <ConfirmationDialog
        isOpen={!!undoConfirmId}
        onClose={() => setUndoConfirmId(null)}
        onConfirm={handleUndoConfirm}
        title="Cancel Purchase Entry"
        message="Are you sure you want to cancel (undo) this purchase entry? This will revert the stock additions and reverse ledger balances. The record will remain in history as Cancelled."
        type="warning"
        confirmText="Cancel Entry"
      />
    </div>
  );
};

export default PurchaseEntry;
