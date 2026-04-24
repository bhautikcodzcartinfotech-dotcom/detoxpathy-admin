"use client";
import React, { useState, useEffect } from "react";
import { getAllUsers, getAllProducts, createOrder } from "@/Api/AllApi";
import TimeButton from "@/utils/timebutton";
import toast from "react-hot-toast";

const OrderForm = ({ onCancel, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]); // [{productId, quantity}]
  const [shippingAddress, setShippingAddress] = useState({
    name: "",
    mobile: "",
    address: "",
    city: "",
    state: "",
    pincode: ""
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersData, productsData] = await Promise.all([
          getAllUsers(),
          getAllProducts({ start: 1, limit: 1000 })
        ]);
        setUsers(usersData || []);
        setProducts(productsData?.products || []);
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
    setSelectedProducts([...selectedProducts, { productId, quantity: 1, name: product.name, price: product.branchPrice || product.discountedPrice }]);
  };

  const handleQuantityChange = (productId, delta) => {
    setSelectedProducts(selectedProducts.map(p => 
      p.productId === productId ? { ...p, quantity: Math.max(1, p.quantity + delta) } : p
    ));
  };

  const handleRemoveProduct = (productId) => {
    setSelectedProducts(selectedProducts.filter(p => p.productId !== productId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return toast.error("Please select a user");
    if (selectedProducts.length === 0) return toast.error("Please add at least one product");

    try {
      setLoading(true);
      const payload = {
        userId: selectedUser,
        products: selectedProducts.map(({ productId, quantity }) => ({ productId, quantity })),
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

  const totalAmount = selectedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto px-1">
      {/* User Selection */}
      <div>
        <label className="block mb-1 font-semibold text-gray-700">Select User</label>
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white"
        >
          <option value="">-- Select User --</option>
          {users.map(u => (
            <option key={u._id} value={u._id}>{u.name} {u.surname} ({u.mobileNumber})</option>
          ))}
        </select>
      </div>

      {/* Product Selection */}
      <div className="space-y-3">
        <label className="block mb-1 font-semibold text-gray-700">Add Products</label>
        <div className="flex gap-2">
          <select
            className="flex-1 border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white"
            onChange={(e) => {
              handleAddProduct(e.target.value);
              e.target.value = "";
            }}
          >
            <option value="">-- Choose Product --</option>
            {products.map(p => (
              <option key={p._id} value={p._id}>{p.name} - ₹{p.branchPrice || p.discountedPrice}</option>
            ))}
          </select>
        </div>

        {/* Selected Products List */}
        <div className="space-y-2">
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
        <textarea
          placeholder="Detailed Address"
          className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          value={shippingAddress.address}
          onChange={(e) => setShippingAddress({ ...shippingAddress, address: e.target.value })}
          rows={2}
        />
        <div className="grid grid-cols-3 gap-4">
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
          <input
            type="text"
            placeholder="Pincode"
            className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            value={shippingAddress.pincode}
            onChange={(e) => setShippingAddress({ ...shippingAddress, pincode: e.target.value })}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-white">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-xl transition font-semibold"
        >
          Cancel
        </button>
        <TimeButton loading={loading}>Create Order</TimeButton>
      </div>
    </form>
  );
};

export default OrderForm;
