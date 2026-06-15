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
    } else {
      setFormData(prev => ({
        ...prev,
        branchId: mainB?._id || "",
        available: 0,
        breakage: 0,
        expiry: "",
        isIncrement: true,
      }));
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...formData };
    // branchId is always the main branch _id — never null
    if (payload.type === "product") delete payload.planId;
    else delete payload.productId;
    delete payload.type;
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

      <div className="border-t pt-4 mt-4">
        <p className="text-xs font-semibold text-gray-400 uppercase mb-4">Stock Levels</p>
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
