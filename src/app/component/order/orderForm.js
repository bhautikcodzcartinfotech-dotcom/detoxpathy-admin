"use client";
import React, { useState, useEffect } from "react";
import { getAllUsers, getAllProducts, getAllPlans, createOrder } from "@/Api/AllApi";
import TimeButton from "@/utils/timebutton";
import Dropdown from "@/utils/dropdown";
import toast from "react-hot-toast";

const OrderForm = ({ onCancel, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]); // [{productId, quantity}]
  const [selectedPlans, setSelectedPlans] = useState([]); // [{planId, name, price}]
  const [shippingAddress, setShippingAddress] = useState({
    name: "",
    mobile: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: ""
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersData, productsData, plansData] = await Promise.all([
          getAllUsers(),
          getAllProducts({ start: 1, limit: 1000 }),
          getAllPlans()
        ]);
        setUsers(usersData || []);
        setProducts(productsData?.products || []);
        setPlans(plansData || []);
      } catch (err) {
        toast.error("Failed to fetch data");
      }
    };
    fetchData();
  }, []);

  const handleAddProduct = (productId) => {
    if (!productId) return;
    if (selectedProducts.find(p => p.productId === productId)) {
      toast.error("Product already added");
      return;
    }
    const product = products.find(p => p._id === productId);
    const discount = Number(product.bulkDiscount) || 0;
    const sellingPrice = product.discountedPrice > 0 ? product.discountedPrice : product.basePrice;
    const finalPrice = sellingPrice - (sellingPrice * discount / 100);
    setSelectedProducts([...selectedProducts, { productId, quantity: 1, name: product.name, price: finalPrice }]);
  };

  const handleQuantityChange = (productId, delta) => {
    setSelectedProducts(selectedProducts.map(p => 
      p.productId === productId ? { ...p, quantity: Math.max(1, p.quantity + delta) } : p
    ));
  };

  const handleRemoveProduct = (productId) => {
    setSelectedProducts(selectedProducts.filter(p => p.productId !== productId));
  };

  const handleSelectPlan = (planId) => {
    if (!planId) return;
    if (selectedPlans.find(p => p.planId === planId)) {
      toast.error("Plan already added");
      return;
    }
    const plan = plans.find(p => p._id === planId);
    if (!plan) return;

    const discount = Number(plan.bulkDiscount) || 0;
    const finalPrice = plan.price - (plan.price * discount / 100);
    setSelectedPlans([...selectedPlans, { planId, name: plan.name, price: finalPrice }]);
  };

  const handleRemovePlan = (planId) => {
    setSelectedPlans(selectedPlans.filter(p => p.planId !== planId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return toast.error("Please select a user");
    if (selectedProducts.length === 0 && selectedPlans.length === 0) return toast.error("Please add at least one product or a plan");

    try {
      setLoading(true);
      const payload = {
        userId: selectedUser,
        products: selectedProducts.map(({ productId, quantity }) => ({ productId, quantity })),
        plans: selectedPlans.map(p => p.planId),
        type: 2, // Default Branch order
        shippingAddress: shippingAddress.name ? shippingAddress : undefined,
        paymentMethod: 'Branch' // Default for type 2 usually
      };
      await createOrder(payload);
      toast.success("Order created successfully!");
      onSuccess();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || "Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = selectedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0) + selectedPlans.reduce((sum, p) => sum + p.price, 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 px-1">
      {/* User Selection */}
      <Dropdown
        label="Select User"
        placeholder="-- Select User --"
        showSearch={true}
        options={users.map(u => ({
          value: u._id,
          label: `${u.name} ${u.surname || ""} (${u.mobileNumber})`
        }))}
        value={selectedUser}
        onChange={(val) => setSelectedUser(val)}
      />

      {/* Selection Fields */}
      <div className="space-y-4">
        <Dropdown
          label="Add Products"
          placeholder="-- Choose Product --"
          showSearch={true}
          options={products.map(p => {
            const discount = Number(p.bulkDiscount) || 0;
            const sellingPrice = p.discountedPrice > 0 ? p.discountedPrice : p.basePrice;
            const finalPrice = sellingPrice - (sellingPrice * discount / 100);
            return {
              value: p._id,
              label: `${p.name} - ₹${finalPrice.toLocaleString()} (${p.bulkDiscount}%)`
            };
          })}
          value=""
          onChange={(val) => handleAddProduct(val)}
        />

        <Dropdown
          label="Select Plan"
          placeholder="-- Choose Plan --"
          showSearch={true}
          options={plans.map(p => {
            const discount = Number(p.bulkDiscount) || 0;
            const finalPrice = p.price - (p.price * discount / 100);
            return {
              value: p._id,
              label: `${p.name} - ₹${finalPrice.toLocaleString()} (${p.bulkDiscount}%)`
            };
          })}
          value={""}
          onChange={(val) => handleSelectPlan(val)}
        />
      </div>

        {/* Selected Products & Plans List */}
        <div className="space-y-2">
          {selectedPlans.map((p, idx) => (
            <div key={`plan-${idx}`} className="flex items-center justify-between p-3 border-2 border-yellow-200 rounded-xl bg-yellow-50 shadow-sm">
              <div className="flex flex-col">
                <span className="font-bold text-yellow-800">PLAN: {p.name}</span>
                <span className="text-xs text-yellow-600 font-semibold">₹{p.price} (Applied Branch Discount)</span>
              </div>
              <button
                type="button"
                onClick={() => handleRemovePlan(p.planId)}
                className="text-red-500 hover:text-red-700 font-bold p-1 bg-red-50 rounded-full w-8 h-8 flex items-center justify-center transition"
              >
                &times;
              </button>
            </div>
          ))}
          {selectedProducts.map((p, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 border rounded-xl bg-gray-50 shadow-sm">
              <div className="flex flex-col">
                <span className="font-semibold text-gray-800">{p.name}</span>
                <span className="text-xs text-gray-500">₹{p.price} / unit</span>
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

      {selectedProducts.length > 0 && (
        <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
           <div className="flex justify-between items-center text-lg font-bold">
              <span className="text-gray-700">Total Estimation:</span>
              <span className="text-yellow-700">₹{totalAmount.toLocaleString()}</span>
           </div>
        </div>
      )}

      {/* Shipping Address (Optional) */}
      <div className="border-t pt-4 space-y-3">
        <h3 className="font-bold text-gray-700 text-lg">Shipping Details (Optional)</h3>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Full Name"
            className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            value={shippingAddress.name}
            onChange={(e) => setShippingAddress({ ...shippingAddress, name: e.target.value })}
          />
          <input
            type="text"
            placeholder="Mobile Number"
            className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            value={shippingAddress.mobile}
            onChange={(e) => setShippingAddress({ ...shippingAddress, mobile: e.target.value })}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Address Line 1"
            className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            value={shippingAddress.addressLine1}
            onChange={(e) => setShippingAddress({ ...shippingAddress, addressLine1: e.target.value })}
          />
          <input
            type="text"
            placeholder="Address Line 2"
            className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            value={shippingAddress.addressLine2}
            onChange={(e) => setShippingAddress({ ...shippingAddress, addressLine2: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="City"
            className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            value={shippingAddress.city}
            onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
          />
          <input
            type="text"
            placeholder="State"
            className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            value={shippingAddress.state}
            onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Postal Code"
            className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            value={shippingAddress.postalCode}
            onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
          />
          <input
            type="text"
            placeholder="Country"
            className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            value={shippingAddress.country}
            onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value })}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t mt-8">
        <button
          type="button"
          onClick={onCancel}
          className="px-8 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition font-bold text-gray-600 uppercase tracking-widest text-[10px]"
        >
          Cancel
        </button>
        <TimeButton loading={loading}>
          <span className="uppercase tracking-widest text-[10px] font-black">Create Order</span>
        </TimeButton>
      </div>
    </form>
  );
};

export default OrderForm;
