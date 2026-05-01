"use client";
import React, { useState, useEffect } from "react";

const StockForm = ({ initialValues, products, plans, branches, onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    productId: "",
    planId: "",
    branchId: "null", // Default to Master
    available: 0,
    isIncrement: true,
    type: "product", // Helper for selection
  });

  useEffect(() => {
    if (initialValues) {
      setFormData({
        productId: initialValues.productId?._id || "",
        planId: initialValues.planId?._id || "",
        branchId: initialValues.branchId?._id || "null",
        available: initialValues.available || 0,
        isIncrement: false,
        type: initialValues.planId ? "plan" : "product",
      });
    } else {
       setFormData(prev => ({
         ...prev,
         available: 0,
         isIncrement: true
       }));
    }
  }, [initialValues]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      // Clear other ID when type changes
      ...(name === "type" ? { productId: "", planId: "" } : {}),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...formData };
    if (payload.branchId === "null") payload.branchId = null;
    if (payload.type === "product") delete payload.planId;
    else delete payload.productId;
    delete payload.type;
    
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Stock Location</label>
        <select
          name="branchId"
          value={formData.branchId}
          onChange={handleChange}
          disabled={!!initialValues}
          className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#134D41]/20 focus:border-[#134D41] outline-none transition-all disabled:bg-gray-50"
        >
          <option value="null">Company Master Stock</option>
          {Array.isArray(branches) && branches.map((b) => (
            <option key={b._id} value={b._id}>{b.name}</option>
          ))}
        </select>
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
        <div className="">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Available Quantity</label>
            <input
              type="number"
              name="available"
              value={formData.available}
              onChange={handleChange}
              placeholder="Enter quantity"
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
