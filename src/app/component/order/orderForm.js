"use client";
import React, { useState, useEffect } from "react";
import { getAllUsers, getAllProducts, getAllPlans, createOrder, getSetting, verifyCompanyOrderPaymentApi, deleteOrderApi, getSuggestedProgram, getAllBranches } from "@/Api/AllApi";
import TimeButton from "@/utils/timebutton";
import Dropdown from "@/utils/dropdown";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";

const OrderForm = ({ onCancel, onSuccess }) => {
  const { role, branches: subadminBranchIds } = useAuth();
  const [subadminBranchCities, setSubadminBranchCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]); // [{productId, quantity}]
  const [selectedPlans, setSelectedPlans] = useState([]); // [{planId, name, price}]
  const [currency, setCurrency] = useState("₹");
  const [shippingRate, setShippingRate] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("Offline");
  const [onlineAmount, setOnlineAmount] = useState("");
  const [offlineAmount, setOfflineAmount] = useState("");
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [hasSuggestedPlan, setHasSuggestedPlan] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersData, productsData, plansData, settingsRes, branchesData] = await Promise.all([
          getAllUsers(),
          getAllProducts({ start: 1, limit: 1000 }),
          getAllPlans(),
          getSetting(),
          getAllBranches()
        ]);
        setUsers(usersData || []);
        setProducts(productsData?.products || []);
        setPlans(plansData || []);

        // Map subadmin branch IDs to their cities
        if (subadminBranchIds && subadminBranchIds.length > 0 && branchesData) {
          const cities = branchesData
            .filter(b => subadminBranchIds.includes(b._id))
            .map(b => (b.city || "").trim().toLowerCase())
            .filter(Boolean);
          setSubadminBranchCities(cities);
        }

        let settingsData;
        if (settingsRes && settingsRes.data) {
          settingsData = settingsRes.data;
        } else if (settingsRes && settingsRes.setting) {
          settingsData = settingsRes.setting;
        } else if (settingsRes && settingsRes._id) {
          settingsData = settingsRes;
        }
        if (settingsData) {
          if (settingsData.currency) {
            setCurrency(settingsData.currency);
          }
          if (typeof settingsData.shippingCharges !== "undefined") {
            setShippingRate(Number(settingsData.shippingCharges) || 0);
          }
        }
      } catch (err) {
        toast.error("Failed to fetch data");
      }
    };
    fetchData();
  }, [subadminBranchIds]);

  const filteredUsers = React.useMemo(() => {
    if (role === "Admin" || !subadminBranchIds || subadminBranchIds.length === 0) {
      return users;
    }
    return users.filter(u => {
      const userCity = (u.city || "").trim().toLowerCase();
      return subadminBranchCities.includes(userCity);
    });
  }, [users, role, subadminBranchIds, subadminBranchCities]);

  const handleAddProduct = (productId) => {
    if (!productId) return;
    if (selectedProducts.find(p => p.productId === productId)) {
      toast.error("Product already added");
      return;
    }
    const product = products.find(p => p._id === productId);
    const sellingPrice = product.discountedPrice > 0 ? product.discountedPrice : product.basePrice;
    setSelectedProducts([...selectedProducts, {
      productId,
      quantity: 1,
      name: product.name,
      basePrice: sellingPrice,
      bulkDiscount: Number(product.bulkDiscount) || 0,
      gstPercentage: Number(product.gstPercentage) || 0,
      weight: Number(product.weight) || 0
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

  const handleSelectPlan = (planId) => {
    if (!planId) return;
    const plan = plans.find(p => p._id === planId);
    if (!plan) return;

    // Replace the entire array with just the new plan to enforce single-selection
    setSelectedPlans([{
      planId,
      name: plan.name,
      basePrice: Number(plan.price),
      bulkDiscount: Number(plan.bulkDiscount) || 0,
      weight: Number(plan.weight) || 0
    }]);
  };

  const handleRemovePlan = (planId) => {
    setSelectedPlans(selectedPlans.filter(p => p.planId !== planId));
    setHasSuggestedPlan(false);
  };

  const applySuggestedProgram = (suggestion) => {
    if (!suggestion) return;

    if (suggestion.plans) {
      const planId = suggestion.plans?._id || suggestion.plans;
      const plan = plans.find(p => p._id === planId) || (typeof suggestion.plans === "object" ? suggestion.plans : null);
      if (plan?._id) {
        setSelectedPlans([{
          planId: plan._id,
          name: plan.name,
          basePrice: Number(plan.price),
          bulkDiscount: Number(plan.bulkDiscount) || 0,
          weight: Number(plan.weight) || 0
        }]);
        setHasSuggestedPlan(true);
      }
    }

    if (suggestion.products && Array.isArray(suggestion.products) && suggestion.products.length > 0) {
      const suggestedProducts = suggestion.products
        .map(sp => {
          const productId = sp?._id || sp?.productId || sp;
          const product = products.find(p => p._id === productId) || (typeof sp === "object" ? sp : null);
          if (!product?._id) return null;
          const sellingPrice = product.discountedPrice > 0 ? product.discountedPrice : product.basePrice;
          return {
            productId: product._id,
            quantity: sp?.quantity || 1,
            name: product.name,
            basePrice: sellingPrice,
            bulkDiscount: Number(product.bulkDiscount) || 0,
            gstPercentage: Number(product.gstPercentage) || 0,
            weight: Number(product.weight) || 0
          };
        })
        .filter(Boolean);
      if (suggestedProducts.length > 0) {
        setSelectedProducts(suggestedProducts);
      }
    }
  };

  const handleUserChange = async (userId) => {
    setSelectedUser(userId);
    setSelectedPlans([]);
    setSelectedProducts([]);
    setHasSuggestedPlan(false);

    if (!userId) return;

    try {
      setLoadingSuggestion(true);
      const response = await getSuggestedProgram(userId);
      applySuggestedProgram(response?.suggestion);
    } catch {
      // No suggestion for this user — plan must be selected manually
    } finally {
      setLoadingSuggestion(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return toast.error("Please select a user");
    if (selectedPlans.length === 0) return toast.error("Please select a plan");


    const onlinePay = paymentMethod === "Split" ? Number(onlineAmount) || 0 : 0;
    const offlinePay = paymentMethod === "Split" ? Number(offlineAmount) || 0 : 0;

    if (paymentMethod === "Split") {
      const roundedTotal = Math.round(totalAmount);
      if (Math.abs(onlinePay + offlinePay - roundedTotal) > 0.02) {
        return toast.error(`Online + Offline must equal total (${currency}${roundedTotal.toLocaleString()})`);
      }
      if (onlinePay <= 0 && offlinePay <= 0) {
        return toast.error("Enter online and/or offline amounts for split payment");
      }
    }

    try {
      setLoading(true);
      const payload = {
        userId: selectedUser,
        products: selectedProducts.map(({ productId, quantity }) => ({ productId, quantity })),
        plans: selectedPlans.map(p => p.planId),
        type: 2, // Branch offline order

        paymentMethod:
          paymentMethod === "Online"
            ? "Razorpay"
            : paymentMethod === "Split"
              ? "Split"
              : "Offline",
      };

      if (paymentMethod === "Split") {
        payload.onlineAmount = onlinePay;
        payload.offlineAmount = offlinePay;
      }

      const res = await createOrder(payload);

      const needsRazorpay =
        paymentMethod === "Online" ||
        (paymentMethod === "Split" && onlinePay > 0);

      if (needsRazorpay) {
        const { order, razorpayOrder, razorpayKey } = res;

        const options = {
          key: razorpayKey,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          name: "DetoxPathy",
          description: "Order Payment",
          order_id: razorpayOrder.id,
          handler: async function (response) {
            try {
              setLoading(true);
              await verifyCompanyOrderPaymentApi({
                orderId: order._id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              toast.success("Payment successful & Order created");
              onSuccess();
            } catch (err) {
              toast.error("Payment verification failed");
              console.error(err);
            } finally {
              setLoading(false);
            }
          },
          prefill: {
            name: order.shippingAddress?.name || "",
            contact: order.shippingAddress?.mobile || "",
          },
          theme: {
            color: "#134D41",
          },
          modal: {
            ondismiss: async function () {
              setLoading(false);
              try {
                await deleteOrderApi(order._id);
              } catch (err) {
                console.error("Cleanup failed:", err);
              }
              toast.error("Payment cancelled");
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        toast.success("Order created successfully!");
        onSuccess();
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || "Failed to create order");
    } finally {
      if (paymentMethod === "Offline" || (paymentMethod === "Split" && !(Number(onlineAmount) > 0))) {
        setLoading(false);
      }
    }
  };

  const getItemPrice = (item) => {
    return Number(item.basePrice) || 0;
  };

  const totalWeight = selectedProducts.reduce((sum, p) => sum + ((Number(p.weight) || 0) * p.quantity), 0) +
    selectedPlans.reduce((sum, p) => sum + (Number(p.weight) || 0), 0);

  const itemsSubtotal = selectedProducts.reduce((sum, p) => sum + (getItemPrice(p) * p.quantity), 0) +
    selectedPlans.reduce((sum, p) => sum + getItemPrice(p), 0);

  const shippingCost = 0; // Admin created orders have no shipping charges

  const totalAmount = itemsSubtotal + shippingCost;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 px-1">
      {/* User Selection */}
      <Dropdown
        label="Select User"
        placeholder="-- Select User --"
        showSearch={true}
        options={filteredUsers.map(u => ({
          value: u._id,
          label: `${u.name} ${u.surname || ""} (${u.mobileNumber})`
        }))}
        value={selectedUser}
        onChange={(val) => handleUserChange(val)}
      />

      {loadingSuggestion && (
        <p className="text-xs font-semibold text-[#134D41]">Loading suggested plan for user...</p>
      )}

      {hasSuggestedPlan && selectedPlans.length > 0 && !loadingSuggestion && (
        <p className="text-xs font-semibold text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
          Suggested plan applied for this user. You can change it if needed.
        </p>
      )}

      {/* Selection Fields */}
      <div className="space-y-4">
        <Dropdown
          label="Add Products"
          placeholder="-- Choose Product --"
          showSearch={true}
          options={products.map(p => {
            const sellingPrice = p.discountedPrice > 0 ? p.discountedPrice : p.basePrice;
            const gst = Number(p.gstPercentage) || 0;
            return {
              value: p._id,
              label: `${p.name} - ${currency}${Math.round(sellingPrice).toLocaleString()} (Incl. ${gst}% GST)`
            };
          })}
          value=""
          onChange={(val) => handleAddProduct(val)}
        />

        <Dropdown
          label="Select Plan *"
          placeholder="-- Choose Plan --"
          showSearch={true}
          options={plans.map(p => {
            return {
              value: p._id,
              label: `${p.name} - ${currency}${Math.round(p.price).toLocaleString()}`
            };
          })}
          value={""}
          onChange={(val) => {
            handleSelectPlan(val);
            setHasSuggestedPlan(false);
          }}
        />
      </div>

      {/* Payment Method Selection */}
      <Dropdown
        label="Payment Method"
        placeholder="-- Select Payment Method --"
        options={[
          { value: "Offline", label: "Offline" },
          { value: "Online", label: "Online" },
          { value: "Split", label: "Hybrid" },
        ]}
        value={paymentMethod}
        onChange={(val) => {
          setPaymentMethod(val);
          if (val !== "Split") {
            setOnlineAmount("");
            setOfflineAmount("");
          }
        }}
      />

      {paymentMethod === "Split" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#134D41]/5 rounded-xl border border-[#134D41]/20">
          <div>
            <label className="block mb-1 text-sm font-semibold text-gray-700">
              Online Amount ({currency}) *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={onlineAmount}
              onChange={(e) => setOnlineAmount(e.target.value)}
              onWheel={(e) => e.target.blur()}
              placeholder="e.g. 75"
              className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-semibold text-gray-700">
              Offline Amount ({currency}) *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={offlineAmount}
              onChange={(e) => setOfflineAmount(e.target.value)}
              onWheel={(e) => e.target.blur()}
              placeholder="e.g. 25"
              className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          {totalAmount > 0 && (
            <p className="sm:col-span-2 text-xs text-gray-600">
              Order total: <span className="font-bold text-[#134D41]">{currency}{Math.round(totalAmount).toLocaleString()}</span>
              {onlineAmount !== "" && offlineAmount !== "" && (
                <span className="ml-2">
                  (Online + Offline = {currency}{(Number(onlineAmount) + Number(offlineAmount)).toLocaleString()})
                </span>
              )}
            </p>
          )}
        </div>
      )}

      {/* Selected Products & Plans List */}
      <div className="space-y-2">
        {selectedPlans.map((p, idx) => (
          <div key={`plan-${idx}`} className="flex items-center justify-between p-3 border-2 border-yellow-200 rounded-xl bg-yellow-50 shadow-sm">
            <div className="flex flex-col">
              <span className="font-bold text-yellow-800">PLAN: {p.name}</span>
              <span className="text-xs text-yellow-600 font-semibold">
                {currency}{Math.round(getItemPrice(p)).toLocaleString()}
              </span>
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
              <span className="text-xs text-gray-500">
                {currency}{Math.round(getItemPrice(p)).toLocaleString()} / unit {p.gstPercentage > 0 && `(Incl. ${p.gstPercentage}% GST)`}
              </span>
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
        <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-200 space-y-2.5 shadow-sm">
          <div className="flex justify-between items-center text-sm font-semibold text-gray-600">
            <span>Items Subtotal:</span>
            <span className="text-gray-800">{currency}{Math.round(itemsSubtotal).toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-sm font-semibold text-gray-600">
            <span>Total Weight:</span>
            <span className="text-gray-800">{(totalWeight / 1000).toFixed(2)} kg ({totalWeight}g)</span>
          </div>
          <hr className="border-yellow-200 my-1" />
          <div className="flex justify-between items-center text-lg font-bold">
            <span className="text-gray-700">Total Estimation:</span>
            <span className="text-yellow-700">{currency}{Math.round(totalAmount).toLocaleString()}</span>
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
          <span className="uppercase tracking-widest text-[10px] font-black">Create Order</span>
        </TimeButton>
      </div>
    </form>
  );
};

export default OrderForm;
