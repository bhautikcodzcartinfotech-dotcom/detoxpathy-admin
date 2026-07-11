"use client";
import React, { useState, useEffect } from "react";

const StockForm = ({ role, initialValues, products, plans, branches, onSubmit, onCancel, loading }) => {
  // branches prop already pre-filtered to isMainBranch:true only (from page.js)
  const mainBranch = Array.isArray(branches) ? branches.find(b => b.isMainBranch) || branches[0] : null;

  const [formData, setFormData] = useState({
    productId: "",
    planId: "",
    branchId: mainBranch?._id || "",
    available: 0,
    breakage: 0,
    expiry: "",
    isIncrement: true,
    type: "product",
  });

  const [expiryBatches, setExpiryBatches] = useState([]);
  const [availableWithoutExpiry, setAvailableWithoutExpiry] = useState(0);
  const [breakageWithoutExpiry, setBreakageWithoutExpiry] = useState(0);
  const [untrackedExpiry, setUntrackedExpiry] = useState("");

  useEffect(() => {
    const mainB = Array.isArray(branches) ? branches.find(b => b.isMainBranch) || branches[0] : null;

    if (initialValues) {
      setFormData({
        productId: initialValues.productId?._id || "",
        planId: initialValues.planId?._id || "",
        // When editing, keep the existing branchId (it should already be the main branch)
        branchId: initialValues.branchId?._id || mainB?._id || "",
        available: initialValues.available || 0,
        breakage: initialValues.breakage || 0,
        expiry: initialValues.expiry ? new Date(initialValues.expiry).toISOString().split('T')[0] : "",
        isIncrement: false,
        type: initialValues.planId ? "plan" : "product",
      });

      const batches = Array.isArray(initialValues.expiryBatches)
        ? initialValues.expiryBatches.map(b => ({
            ...b,
            expiry: b.expiry ? new Date(b.expiry).toISOString().split('T')[0] : ""
          }))
        : [];

      setExpiryBatches(batches);

      // Calculate discrepancy
      const sumAvail = batches.reduce((acc, b) => acc + (Number(b.available) || 0), 0);
      const sumBreak = batches.reduce((acc, b) => acc + (Number(b.breakage) || 0), 0);
      setAvailableWithoutExpiry(Math.max(0, (initialValues.available || 0) - sumAvail));
      setBreakageWithoutExpiry(Math.max(0, (initialValues.breakage || 0) - sumBreak));
      setUntrackedExpiry("");
    } else {
      setFormData(prev => ({
        ...prev,
        branchId: mainB?._id || "",
        available: 0,
        breakage: 0,
        expiry: "",
        isIncrement: true,
      }));
      setExpiryBatches([]);
      setAvailableWithoutExpiry(0);
      setBreakageWithoutExpiry(0);
      setUntrackedExpiry("");
    }
  }, [initialValues, branches]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "type" ? { productId: "", planId: "" } : {}),
    }));
  };

  const handleAddBatch = () => {
    setExpiryBatches((prev) => [
      ...prev,
      { expiry: "", available: 0, breakage: 0 }
    ]);
  };

  const handleRemoveBatch = (index) => {
    const batch = expiryBatches[index];
    setAvailableWithoutExpiry(prev => prev + (Number(batch.available) || 0));
    setBreakageWithoutExpiry(prev => prev + (Number(batch.breakage) || 0));
    setExpiryBatches((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBatchChange = (index, field, value) => {
    if (field === "expiry" && !value) {
      const batch = expiryBatches[index];
      setAvailableWithoutExpiry(prev => prev + (Number(batch.available) || 0));
      setBreakageWithoutExpiry(prev => prev + (Number(batch.breakage) || 0));
      setExpiryBatches((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    setExpiryBatches((prev) =>
      prev.map((batch, i) => (i === index ? { ...batch, [field]: value } : batch))
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...formData, branchId: formData.branchId };
    
    if (payload.type === "product") delete payload.planId;
    else delete payload.productId;
    delete payload.type;

    let finalBatches = [...expiryBatches];
    let finalAvailWithout = Number(availableWithoutExpiry) || 0;
    let finalBreakWithout = Number(breakageWithoutExpiry) || 0;

    // Convert untracked stock to a batch if an expiry date is assigned
    if (untrackedExpiry && finalAvailWithout > 0) {
      finalBatches.push({
        expiry: untrackedExpiry,
        available: finalAvailWithout,
        breakage: finalBreakWithout
      });
      finalAvailWithout = 0;
      finalBreakWithout = 0;
    }

    if (finalBatches.length > 0) {
      payload.expiryBatches = finalBatches.map(b => ({
        expiry: b.expiry,
        available: Number(b.available) || 0,
        breakage: Number(b.breakage) || 0
      }));
      
      payload.availableWithoutExpiry = finalAvailWithout;
      payload.breakageWithoutExpiry = finalBreakWithout;

      // Calculate totals from batches + untracked expiry quantities
      payload.available = payload.expiryBatches.reduce((acc, curr) => acc + curr.available, 0) + payload.availableWithoutExpiry;
      payload.breakage = payload.expiryBatches.reduce((acc, curr) => acc + curr.breakage, 0) + payload.breakageWithoutExpiry;
      
      const sorted = [...payload.expiryBatches]
        .filter(b => b.expiry)
        .sort((a, b) => new Date(a.expiry) - new Date(b.expiry));
      payload.expiry = sorted[0]?.expiry || null;
    } else {
      payload.available = Number(payload.available) || 0;
      payload.breakage = Number(payload.breakage) || 0;
      payload.expiry = formData.expiry || null;
    }

    onSubmit(payload);
  };

  // Display name for the stock location
  const locationLabel = mainBranch ? `${mainBranch.name} (Company Master Stock)` : "Company Master Stock";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Stock Location</label>
        {/* Stock can only be added to the Main Branch = Company Master Stock */}
        <input
          type="text"
          readOnly
          value={locationLabel}
          className="w-full border border-gray-200 rounded-lg p-2.5 bg-amber-50 text-amber-800 font-semibold outline-none cursor-not-allowed"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Item Type</label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            disabled={!!initialValues}
            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#134D41]/20 focus:border-[#134D41] outline-none transition-all disabled:bg-gray-50"
          >
            <option value="product">Product</option>
            <option value="plan">Plan</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Item</label>
          <select
            name={formData.type === "product" ? "productId" : "planId"}
            value={formData.type === "product" ? formData.productId : formData.planId}
            onChange={handleChange}
            disabled={!!initialValues}
            required
            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#134D41]/20 focus:border-[#134D41] outline-none transition-all disabled:bg-gray-50"
          >
            <option value="">Select...</option>
            {formData.type === "product"
              ? (Array.isArray(products) && products.map((p) => <option key={p._id} value={p._id}>{p.name}</option>))
              : (Array.isArray(plans) && plans.map((p) => <option key={p._id} value={p._id}>{p.name}</option>))
            }
          </select>
        </div>
      </div>

      <div className="border-t pt-4 mt-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-400 uppercase">Stock Levels</p>
          <button
            type="button"
            onClick={handleAddBatch}
            className="text-[10px] font-black text-amber-600 hover:text-amber-700 uppercase tracking-widest transition-all cursor-pointer"
          >
            + Add Expiry Batch
          </button>
        </div>

        {expiryBatches.length > 0 ? (
          <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
            {/* Expiry-tracked batches list */}
            {expiryBatches.map((batch, index) => (
              <div key={index} className="border border-gray-200 rounded-2xl p-4 bg-gray-50/50 space-y-3 relative shadow-sm">
                <button
                  type="button"
                  onClick={() => handleRemoveBatch(index)}
                  className="absolute top-3.5 right-4 text-[10px] font-black uppercase text-red-500 hover:text-red-700 transition-all cursor-pointer"
                >
                  Remove
                </button>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Lot / Batch #{index + 1}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">Expiry Date</label>
                    <input
                      type="date"
                      value={batch.expiry}
                      onChange={(e) => handleBatchChange(index, "expiry", e.target.value)}
                      className="w-full border border-gray-300 bg-white rounded-xl p-2 text-xs focus:ring-2 focus:ring-[#134D41]/20 focus:border-[#134D41] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">Available Qty</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      required
                      value={batch.available}
                      onChange={(e) => handleBatchChange(index, "available", e.target.value.replace(/\D/g, ""))}
                      className="w-full border border-gray-300 bg-white rounded-xl p-2 text-xs focus:ring-2 focus:ring-[#134D41]/20 focus:border-[#134D41] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">Breakage Qty</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      required
                      value={batch.breakage}
                      onChange={(e) => handleBatchChange(index, "breakage", e.target.value.replace(/\D/g, ""))}
                      className="w-full border border-gray-300 bg-white rounded-xl p-2 text-xs focus:ring-2 focus:ring-[#134D41]/20 focus:border-[#134D41] outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Without Expiry section */}
            {(availableWithoutExpiry > 0 || breakageWithoutExpiry > 0) && (
              <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50/50 space-y-3 relative shadow-sm">
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider">No Expiry Date (Untracked)</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">Set Expiry Date</label>
                    <input
                      type="date"
                      value={untrackedExpiry}
                      onChange={(e) => setUntrackedExpiry(e.target.value)}
                      className="w-full border border-gray-300 bg-white rounded-xl p-2 text-xs focus:ring-2 focus:ring-[#134D41]/20 focus:border-[#134D41] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">Available Qty</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={availableWithoutExpiry}
                      onChange={(e) => setAvailableWithoutExpiry(Number(e.target.value.replace(/\D/g, "")) || 0)}
                      className="w-full border border-gray-300 bg-white rounded-xl p-2 text-xs focus:ring-2 focus:ring-[#134D41]/20 focus:border-[#134D41] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">Breakage Qty</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={breakageWithoutExpiry}
                      onChange={(e) => setBreakageWithoutExpiry(Number(e.target.value.replace(/\D/g, "")) || 0)}
                      className="w-full border border-gray-300 bg-white rounded-xl p-2 text-xs focus:ring-2 focus:ring-[#134D41]/20 focus:border-[#134D41] outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Available Quantity</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                name="available"
                value={formData.available}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setFormData((prev) => ({ ...prev, available: value }));
                }}
                placeholder="Enter quantity"
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#134D41]/20 focus:border-[#134D41] outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Breakage Quantity</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                name="breakage"
                value={formData.breakage}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setFormData((prev) => ({ ...prev, breakage: value }));
                }}
                placeholder="Enter breakage quantity"
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#134D41]/20 focus:border-[#134D41] outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
              <input
                type="date"
                name="expiry"
                value={formData.expiry}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#134D41]/20 focus:border-[#134D41] outline-none transition-all"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-6">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2.5 bg-[#134D41] text-white rounded-xl hover:bg-[#0d362e] transition-all font-medium disabled:opacity-50 shadow-lg shadow-[#134D41]/20"
        >
          {loading ? "Saving..." : initialValues ? "Update Stock" : "Add Stock"}
        </button>
      </div>
    </form>
  );
};

export default StockForm;
