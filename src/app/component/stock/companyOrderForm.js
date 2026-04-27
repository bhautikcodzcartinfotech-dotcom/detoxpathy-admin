"use client";
import React, { useState } from "react";
import Dropdown from "@/utils/dropdown";
import TimeButton from "@/utils/timebutton";
import toast from "react-hot-toast";

const CompanyOrderForm = ({ products, plans, onSubmit, onCancel, loading }) => {
  const [selectedProducts, setSelectedProducts] = useState([]); // [{productId, quantity, name, price}]
  const [selectedPlans, setSelectedPlans] = useState([]); // [{planId, quantity, name, price}]

  const handleAddProduct = (productId) => {
    if (!productId) return;
    if (selectedProducts.find(p => p.productId === productId)) {
      toast.error("Product already added");
      return;
    }
    const product = products.find(p => p._id === productId);
    if (!product) return;

    const sellingPrice = product.discountedPrice > 0 ? product.discountedPrice : product.basePrice;
    const discount = Number(product.bulkDiscount) || 0;
    const bulkPrice = sellingPrice - (sellingPrice * discount / 100);

    setSelectedProducts([...selectedProducts, { 
      productId, 
      quantity: 1, 
      name: product.name, 
      price: bulkPrice 
    }]);
  };

  const handleQuantityChange = (productId, delta) => {
    setSelectedProducts(selectedProducts.map(p => 
      p.productId === productId ? { ...p, quantity: Math.max(1, p.quantity + delta) } : p
    ));
  };

  const handleRemoveProduct = (productId) => {
    setSelectedProducts(selectedProducts.filter(p => p.productId !== productId));
  };

  const handleAddPlan = (planId) => {
    if (!planId) return;
    if (selectedPlans.find(p => p.planId === planId)) {
      toast.error("Plan already added");
      return;
    }
    const plan = plans.find(p => p._id === planId);
    if (!plan) return;

    const discount = Number(plan.bulkDiscount) || 0;
    const bulkPrice = plan.price - (plan.price * discount / 100);

    setSelectedPlans([...selectedPlans, { 
      planId, 
      quantity: 1, 
      name: plan.name, 
      price: bulkPrice 
    }]);
  };

  const handlePlanQuantityChange = (planId, delta) => {
    setSelectedPlans(selectedPlans.map(p => 
      p.planId === planId ? { ...p, quantity: Math.max(1, p.quantity + delta) } : p
    ));
  };

  const handleRemovePlan = (planId) => {
    setSelectedPlans(selectedPlans.filter(p => p.planId !== planId));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedProducts.length === 0 && selectedPlans.length === 0) {
      return toast.error("Please add at least one product or plan");
    }
    onSubmit({
      products: selectedProducts.map(p => ({ productId: p.productId, quantity: p.quantity })),
      plans: selectedPlans.map(p => ({ planId: p.planId, quantity: p.quantity }))
    });
  };

  const totalAmount = 
    selectedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0) + 
    selectedPlans.reduce((sum, p) => sum + (p.price * p.quantity), 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-4">

      <div className="space-y-4">
        <Dropdown
          label="Add Products"
          placeholder="-- Choose Product --"
          showSearch={true}
          options={products.map(p => {
            const sellingPrice = p.discountedPrice > 0 ? p.discountedPrice : p.basePrice;
            const discount = Number(p.bulkDiscount) || 0;
            const bulkPrice = sellingPrice - (sellingPrice * discount / 100);
            return {
              value: p._id,
              label: `${p.name} - ₹${bulkPrice.toLocaleString()} (Bulk Discount Applied)`
            };
          })}
          value=""
          onChange={(val) => handleAddProduct(val)}
        />

        <Dropdown
          label="Add Plans"
          placeholder="-- Choose Plan --"
          showSearch={true}
          options={plans.map(p => {
            const discount = Number(p.bulkDiscount) || 0;
            const bulkPrice = p.price - (p.price * discount / 100);
            return {
              value: p._id,
              label: `${p.name} - ₹${bulkPrice.toLocaleString()} (Bulk Discount Applied)`
            };
          })}
          value=""
          onChange={(val) => handleAddPlan(val)}
        />
      </div>

      {/* Selected List */}
      <div className="space-y-3">
        {selectedPlans.map((p, idx) => (
          <div key={`plan-${idx}`} className="flex items-center justify-between p-3 border-2 border-yellow-200 rounded-xl bg-yellow-50 shadow-sm animate-in fade-in slide-in-from-left-2">
            <div className="flex flex-col">
              <span className="font-bold text-yellow-800">PLAN: {p.name}</span>
              <span className="text-xs text-yellow-600 font-semibold">₹{p.price.toLocaleString()} / unit (Branch Price)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center border-2 border-yellow-200 rounded-lg bg-white overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => handlePlanQuantityChange(p.planId, -1)}
                  className="px-3 py-1 bg-yellow-50 hover:bg-yellow-100 transition font-bold text-yellow-700"
                >
                  -
                </button>
                <span className="px-4 font-bold min-w-[40px] text-center text-yellow-900">{p.quantity}</span>
                <button
                  type="button"
                  onClick={() => handlePlanQuantityChange(p.planId, 1)}
                  className="px-3 py-1 bg-yellow-50 hover:bg-yellow-100 transition font-bold text-yellow-700"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                onClick={() => handleRemovePlan(p.planId)}
                className="text-red-500 hover:text-red-700 font-bold p-1 bg-red-50 rounded-full w-8 h-8 flex items-center justify-center transition"
              >
                &times;
              </button>
            </div>
          </div>
        ))}

        {selectedProducts.map((p, idx) => (
          <div key={`prod-${idx}`} className="flex items-center justify-between p-3 border rounded-xl bg-gray-50 shadow-sm animate-in fade-in slide-in-from-left-2">
            <div className="flex flex-col">
              <span className="font-semibold text-gray-800">{p.name}</span>
              <span className="text-xs text-gray-500">₹{p.price.toLocaleString()} / unit (Branch Price)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center border rounded-lg bg-white overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => handleQuantityChange(p.productId, -1)}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 transition font-bold"
                >
                  -
                </button>
                <span className="px-4 font-bold min-w-[40px] text-center">{p.quantity}</span>
                <button
                  type="button"
                  onClick={() => handleQuantityChange(p.productId, 1)}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 transition font-bold"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveProduct(p.productId)}
                className="text-red-500 hover:text-red-700 font-bold p-1 bg-red-50 rounded-full w-8 h-8 flex items-center justify-center transition"
              >
                &times;
              </button>
            </div>
          </div>
        ))}
      </div>

      {(selectedProducts.length > 0 || selectedPlans.length > 0) && (
        <div className="p-4 bg-[#134D41]/5 rounded-xl border border-[#134D41]/20">
           <div className="flex justify-between items-center text-lg font-bold">
              <span className="text-gray-700 font-black tracking-tighter uppercase text-sm">Grand Total (Incl. Discounts):</span>
              <span className="text-[#134D41] text-2xl tracking-tighter">₹{totalAmount.toLocaleString()}</span>
           </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-6 border-t mt-8">
        <button
          type="button"
          onClick={onCancel}
          className="px-8 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition font-bold text-gray-600 uppercase tracking-widest text-[10px]"
        >
          Cancel
        </button>
        <TimeButton loading={loading}>
          <span className="uppercase tracking-widest text-[10px] font-black">Create Company Order</span>
        </TimeButton>
      </div>
    </form>
  );
};

export default CompanyOrderForm;
