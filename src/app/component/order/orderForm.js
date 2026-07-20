"use client";
import React, { useState, useEffect } from "react";
import { getAllUsers, getAllProducts, getAllPlans, createOrder, createCustomerOrder, createCustomer, getSetting, verifyCompanyOrderPaymentApi, deleteOrderApi, getSuggestedProgram, getAllBranches, getShippingCharges } from "@/Api/AllApi";
import TimeButton from "@/utils/timebutton";
import Dropdown from "@/utils/dropdown";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";

const OrderForm = ({ onCancel, onSuccess, mode = "user", customers = [], onCustomerCreated = null }) => {
  const { role, branches: subadminBranchIds } = useAuth();
  const [subadminBranchCities, setSubadminBranchCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [customerForm, setCustomerForm] = useState({ name: "", mobilePrefix: "+91", mobileNumber: "" });
  const [customerFormErrors, setCustomerFormErrors] = useState({});
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [shippingAddress, setShippingAddress] = useState({
    name: "",
    mobile: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
  });
  const [selectedProducts, setSelectedProducts] = useState([]); // [{productId, quantity}]
  const [selectedPlans, setSelectedPlans] = useState([]); // [{planId, name, price}]
  const [planProductSelections, setPlanProductSelections] = useState({});
  const [currency, setCurrency] = useState("₹");
  const [shippingRate, setShippingRate] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("Offline");
  const [onlineAmount, setOnlineAmount] = useState("");
  const [offlineAmount, setOfflineAmount] = useState("");
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [hasSuggestedPlan, setHasSuggestedPlan] = useState(false);
  const [orderType, setOrderType] = useState("2");
  const [shippingChargesInfo, setShippingChargesInfo] = useState(null);
  const [loadingShipping, setLoadingShipping] = useState(false);

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
    if (mode === "customer") {
      return customers || [];
    }
    if (role === "Admin" || !subadminBranchIds || subadminBranchIds.length === 0) {
      return users;
    }
    return users.filter((u) => {
      const userCity = (u.city || "").trim().toLowerCase();
      return subadminBranchCities.includes(userCity);
    });
  }, [users, role, subadminBranchIds, subadminBranchCities, mode, customers]);

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

    const groups = getPlanProductGroups(plan);
    const selections = {};
    groups.forEach(group => {
      selections[group.mainProduct._id] = group.mainProduct._id;
    });

    setSelectedPlans([{
      planId,
      name: plan.name,
      basePrice: Number(plan.price),
      bulkDiscount: Number(plan.bulkDiscount) || 0,
      weight: Number(plan.weight) || 0
    }]);
    setPlanProductSelections({ [planId]: selections });
  };

  const handleRemovePlan = (planId) => {
    setSelectedPlans(selectedPlans.filter(p => p.planId !== planId));
    setHasSuggestedPlan(false);
  };

  const fetchShippingCharges = async () => {
    if (mode !== "customer" || orderType !== "1") {
      setShippingChargesInfo(null);
      return;
    }

    const addressFilled = shippingAddress.name && shippingAddress.mobile && shippingAddress.addressLine1 && shippingAddress.city && shippingAddress.state && shippingAddress.postalCode && shippingAddress.country;
    if (!addressFilled) {
      setShippingChargesInfo(null);
      return;
    }

    if (selectedPlans.length === 0 && selectedProducts.length === 0) {
      setShippingChargesInfo(null);
      return;
    }

    try {
      setLoadingShipping(true);
      const payload = {
        products: selectedProducts.map(({ productId, quantity }) => ({ productId, quantity })),
        plans: selectedPlans.map(p => p.planId),
        shippingAddress: {
          name: (shippingAddress.name || "").trim(),
          mobile: (shippingAddress.mobile || "").trim(),
          addressLine1: (shippingAddress.addressLine1 || "").trim(),
          addressLine2: (shippingAddress.addressLine2 || "").trim(),
          city: (shippingAddress.city || "").trim(),
          state: (shippingAddress.state || "").trim(),
          postalCode: (shippingAddress.postalCode || "").trim(),
          country: (shippingAddress.country || "").trim(),
        }
      };

      const data = await getShippingCharges(payload);
      setShippingChargesInfo(data || null);
    } catch (err) {
      console.error("Failed to fetch shipping charges", err);
      setShippingChargesInfo(null);
    } finally {
      setLoadingShipping(false);
    }
  };

  useEffect(() => {
    fetchShippingCharges();
  }, [orderType, selectedProducts, selectedPlans, shippingAddress]);

  const getPlanProductGroups = (plan) => {
    const productList = Array.isArray(plan.products) ? plan.products : [];
    return productList
      .map((item) => {
        const mainProduct = item?.productId;
        const altProduct = item?.alternativeProductId;
        if (mainProduct && mainProduct._id) {
          return {
            mainProduct,
            alternativeProduct: altProduct && altProduct._id ? altProduct : null,
          };
        }
        return null;
      })
      .filter(Boolean);
  };

  const applySuggestedProgram = (suggestion) => {
    if (!suggestion) return;

    if (suggestion.plans) {
      const planId = suggestion.plans?.planId?._id || suggestion.plans?.planId || "";
      const plan = plans.find(p => p._id === planId) || (typeof suggestion.plans === "object" ? suggestion.plans : null);
      if (plan?._id) {
        setSelectedPlans([{
          planId: plan._id,
          name: plan.name,
          basePrice: Number(plan.price),
          bulkDiscount: Number(plan.bulkDiscount) || 0,
          weight: Number(plan.weight) || 0
        }]);

        if (suggestion.plans?.products && Array.isArray(suggestion.plans.products)) {
          const selections = {};
          suggestion.plans.products.forEach((item) => {
            const mainId = item?.productId?._id;
            if (mainId) {
              if (item?.isMainSelected === false && item?.altProductId?._id) {
                selections[mainId] = item.altProductId._id;
              } else {
                selections[mainId] = mainId;
              }
            }
          });
          setPlanProductSelections(prev => ({ ...prev, [planId]: selections }));
        }

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
    setPlanProductSelections({});
    setHasSuggestedPlan(false);
    setOrderType("2");

    if (mode === "customer") {
      const cust = (customers || []).find((c) => (c._id || c.id) === userId);
      if (cust) {
        setShippingAddress((prev) => ({
          ...prev,
          name: cust.name || "",
          mobile: `${cust.mobilePrefix || ""}${cust.mobileNumber || ""}`,
        }));
      } else {
        setShippingAddress((prev) => ({ ...prev, name: "", mobile: "" }));
      }
    }

    if (!userId || mode === "customer") return;

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
    if (!selectedUser) return toast.error(`Please select a ${mode === "customer" ? "customer" : "user"}`);
    if (mode === "customer") {
      if (selectedPlans.length === 0 && selectedProducts.length === 0) {
        return toast.error("Please select at least one product or one plan");
      }
    } else {
      if (selectedPlans.length === 0) {
        return toast.error("Please select a plan");
      }
    }

    if (mode === "customer") {
      const shipErr = validateShipping();
      if (shipErr) return toast.error(shipErr);
      if (!orderType) return toast.error("Please select order type");
    }

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

      let planSelections = {};
      if (selectedPlans.length > 0) {
        const plan = plans.find(p => p._id === selectedPlans[0].planId);
        const selections = planProductSelections[selectedPlans[0].planId] || {};
        if (plan && Array.isArray(plan.products)) {
          planSelections[plan._id] = plan.products.map(item => {
            const mainProduct = item?.productId;
            const altProduct = item?.alternativeProductId;
            const mainId = mainProduct?._id || null;
            const altId = altProduct?._id || null;
            const selectedId = selections[mainId] || mainId;
            return {
              productId: mainId,
              altProductId: altId,
              isMainSelected: selectedId === mainId
            };
          });
        }
      }

      const payload = {
        ...(mode === "customer" ? { customerId: selectedUser } : { userId: selectedUser }),
        products: selectedProducts.map(({ productId, quantity }) => ({ productId, quantity })),
        plans: selectedPlans.map(p => p.planId),
        ...(mode === "customer" ? { planSelections } : {}),
        ...(mode === "customer" ? { type: Number(orderType) } : { type: 2 }),
        ...(mode === "customer" ? {
          shippingAddress: {
            name: (shippingAddress.name || "").trim(),
            mobile: (shippingAddress.mobile || "").trim(),
            addressLine1: (shippingAddress.addressLine1 || "").trim(),
            addressLine2: (shippingAddress.addressLine2 || "").trim(),
            city: (shippingAddress.city || "").trim(),
            state: (shippingAddress.state || "").trim(),
            postalCode: (shippingAddress.postalCode || "").trim(),
            country: (shippingAddress.country || "").trim(),
          }
        } : {}),

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

      const res = mode === "customer" ? await createCustomerOrder(payload) : await createOrder(payload);

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

  const validateShipping = () => {
    const s = shippingAddress || {};
    if (!s.name || String(s.name).trim() === "") return "Name is required for shipping";
    if (!s.mobile || String(s.mobile).trim() === "") return "Mobile is required for shipping";
    if (!s.addressLine1 || String(s.addressLine1).trim() === "") return "Address Line 1 is required";
    if (!s.city || String(s.city).trim() === "") return "City is required";
    if (!s.state || String(s.state).trim() === "") return "State is required";
    if (!s.postalCode || String(s.postalCode).trim() === "") return "Postal code is required";
    if (!s.country || String(s.country).trim() === "") return "Country is required";
    return null;
  };

  const getItemPrice = (item) => {
    return Number(item.basePrice) || 0;
  };

  const totalWeight = selectedProducts.reduce((sum, p) => sum + ((Number(p.weight) || 0) * p.quantity), 0) +
    selectedPlans.reduce((sum, p) => sum + (Number(p.weight) || 0), 0);

  const itemsSubtotal = selectedProducts.reduce((sum, p) => sum + (getItemPrice(p) * p.quantity), 0) +
    selectedPlans.reduce((sum, p) => sum + getItemPrice(p), 0);

  const shippingCost = mode === "customer" && orderType === "1" && shippingChargesInfo?.shippingCharges
    ? Number(shippingChargesInfo.shippingCharges)
    : 0;

  const totalAmount = itemsSubtotal + shippingCost;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 px-1">
      {/* User Selection */}
      <Dropdown
        label={mode === "customer" ? "Select Customer" : "Select User"}
        placeholder={mode === "customer" ? "-- Select Customer --" : "-- Select User --"}
        showSearch={true}
        options={filteredUsers.map((u) => ({
          value: u._id,
          label: `${u.name} ${u.surname || ""} (${u.mobilePrefix || "+91"}${u.mobileNumber || ""})`,
        }))}
        value={selectedUser}
        onChange={(val) => handleUserChange(val)}
      />

      {mode === "customer" && role === "Admin" && (
        <div className="space-y-3 mt-2">
          <button
            type="button"
            onClick={() => setShowCreateCustomer((prev) => !prev)}
            className="text-sm font-semibold text-[#134D41] hover:text-[#0f5132]"
          >
            {showCreateCustomer ? "Hide create customer" : "Create new customer"}
          </button>
          {showCreateCustomer && (
            <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700">Name</label>
                <input
                  type="text"
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#134D41]"
                  placeholder="Customer name"
                />
                {customerFormErrors.name && <p className="text-red-600 text-sm mt-1">{customerFormErrors.name}</p>}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Prefix</label>
                  <input
                    type="text"
                    value={customerForm.mobilePrefix}
                    onChange={(e) => setCustomerForm((prev) => ({ ...prev, mobilePrefix: e.target.value }))}
                    className="w-full border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#134D41]"
                  />
                  {customerFormErrors.mobilePrefix && <p className="text-red-600 text-sm mt-1">{customerFormErrors.mobilePrefix}</p>}
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700">Mobile Number</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={customerForm.mobileNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      setCustomerForm((prev) => ({ ...prev, mobileNumber: value }));
                    }}
                    className="w-full border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#134D41]"
                    placeholder="10-digit mobile number"
                  />
                  {customerFormErrors.mobileNumber && <p className="text-red-600 text-sm mt-1">{customerFormErrors.mobileNumber}</p>}
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={creatingCustomer}
                  onClick={async () => {
                    const errs = {};
                    if (!customerForm.name.trim()) errs.name = "Name is required.";
                    if (!customerForm.mobilePrefix.trim()) {
                      errs.mobilePrefix = "Prefix is required.";
                    } else if (!/^\+\d{1,4}$/.test(customerForm.mobilePrefix.trim())) {
                      errs.mobilePrefix = "Enter valid prefix like +91 or +1.";
                    }
                    if (!/^\d{10}$/.test(customerForm.mobileNumber)) errs.mobileNumber = "Enter valid 10-digit mobile number.";
                    setCustomerFormErrors(errs);
                    if (Object.keys(errs).length > 0) return;
                    try {
                      setCreatingCustomer(true);
                      const newCustomer = await createCustomer({
                        name: customerForm.name.trim(),
                        mobilePrefix: customerForm.mobilePrefix.trim(),
                        mobileNumber: customerForm.mobileNumber.trim(),
                      });
                      setShowCreateCustomer(false);
                      setCustomerForm({ name: "", mobilePrefix: "+91", mobileNumber: "" });
                      setCustomerFormErrors({});
                      if (onCustomerCreated) {
                        onCustomerCreated(newCustomer);
                      }
                      setSelectedUser(newCustomer._id || newCustomer.id || "");
                      setShippingAddress((prev) => ({
                        ...prev,
                        name: newCustomer.name || "",
                        mobile: `${newCustomer.mobilePrefix || ""}${newCustomer.mobileNumber || ""}`,
                      }));
                      toast.success("Customer created successfully.");
                    } catch (err) {
                      toast.error(err?.response?.data?.message || err?.response?.data?.error || "Failed to create customer");
                    } finally {
                      setCreatingCustomer(false);
                    }
                  }}
                  className="px-5 py-2 rounded-xl bg-[#134D41] text-white font-semibold hover:bg-[#0f5132] transition"
                >
                  {creatingCustomer ? "Saving..." : "Save Customer"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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
          label={`Select Plan${mode !== "customer" ? " *" : ""}`}
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

      {mode === "customer" && (
        <Dropdown
          label="Order Type *"
          placeholder="-- Select Order Type --"
          showSearch={false}
          options={[
            { label: "Online", value: "1" },
            { label: "Offline", value: "2" },
          ]}
          value={orderType}
          onChange={(val) => setOrderType(val)}
        />
      )}

      {selectedPlans.length > 0 && (() => {
        const plan = plans.find(p => p._id === selectedPlans[0].planId);
        if (!plan) return null;
        const groups = getPlanProductGroups(plan);
        if (groups.length === 0) return null;

        const selections = planProductSelections[plan._id] || {};

        return (
          <div className="mt-4 p-4 rounded-2xl border border-yellow-200 bg-yellow-50 space-y-3">
            <h3 className="font-semibold text-gray-800 text-sm">Select Product Variant</h3>
            {groups.map((group, idx) => {
              const mainId = group.mainProduct._id;
              const selectedId = selections[mainId] || mainId;
              const hasAlt = !!group.alternativeProduct;
              return (
                <div key={mainId} className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide w-16 shrink-0">
                    Product {idx + 1}
                  </span>
                  <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${selectedId === mainId ? "border-yellow-400 bg-yellow-50 shadow-sm" : "border-gray-200 bg-white hover:border-yellow-200"}`}>
                    <input
                      type="radio"
                      name={`plan-product-${plan._id}-${mainId}`}
                      checked={selectedId === mainId}
                      onChange={() => setPlanProductSelections(prev => ({
                        ...prev,
                        [plan._id]: {
                          ...(prev[plan._id] || {}),
                          [mainId]: mainId
                        }
                      }))}
                      className="accent-yellow-500 w-3.5 h-3.5"
                    />
                    <span className={`text-[10px] font-medium ${selectedId === mainId ? "text-yellow-800" : "text-gray-600"}`}>
                      {group.mainProduct.name}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      ₹{group.mainProduct.discountedPrice || group.mainProduct.basePrice}
                    </span>
                    <span className="text-[9px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                      Main
                    </span>
                  </label>
                  {hasAlt && (
                    <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${selectedId === group.alternativeProduct._id ? "border-yellow-400 bg-yellow-50 shadow-sm" : "border-gray-200 bg-white hover:border-yellow-200"}`}>
                      <input
                        type="radio"
                        name={`plan-product-${plan._id}-${mainId}`}
                        checked={selectedId === group.alternativeProduct._id}
                        onChange={() => setPlanProductSelections(prev => ({
                          ...prev,
                          [plan._id]: {
                            ...(prev[plan._id] || {}),
                            [mainId]: group.alternativeProduct._id
                          }
                        }))}
                        className="accent-yellow-500 w-3.5 h-3.5"
                      />
                      <span className={`text-[10px] font-medium ${selectedId === group.alternativeProduct._id ? "text-yellow-800" : "text-gray-600"}`}>
                        {group.alternativeProduct.name}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        ₹{group.alternativeProduct.discountedPrice || group.alternativeProduct.basePrice}
                      </span>
                      <span className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                        Alternative
                      </span>
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {mode === "customer" && (
        <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50 space-y-3">
          <h3 className="font-semibold text-gray-800">Shipping Address</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block mb-1 text-sm font-semibold text-gray-700">Name *</label>
              <input
                type="text"
                value={shippingAddress.name}
                onChange={(e) => setShippingAddress((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#134D41]"
              />
            </div>
            <div className="sm:col-span-1">
              <label className="block mb-1 text-sm font-semibold text-gray-700">Mobile *</label>
              <input
                type="text"
                value={shippingAddress.mobile}
                onChange={(e) => setShippingAddress((prev) => ({ ...prev, mobile: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#134D41]"
                placeholder="+91XXXXXXXXXX"
              />
            </div>
            <div className="sm:col-span-1">
              <label className="block mb-1 text-sm font-semibold text-gray-700">Country *</label>
              <input
                type="text"
                value={shippingAddress.country}
                onChange={(e) => setShippingAddress((prev) => ({ ...prev, country: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#134D41]"
              />
            </div>
          </div>
          <div>
            <label className="block mb-1 text-sm font-semibold text-gray-700">Address Line 1 *</label>
            <input
              type="text"
              value={shippingAddress.addressLine1}
              onChange={(e) => setShippingAddress((prev) => ({ ...prev, addressLine1: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#134D41]"
              placeholder="Street, locality"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-semibold text-gray-700">Address Line 2 (optional)</label>
            <input
              type="text"
              value={shippingAddress.addressLine2}
              onChange={(e) => setShippingAddress((prev) => ({ ...prev, addressLine2: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#134D41]"
              placeholder="Apartment, suite, etc."
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block mb-1 text-sm font-semibold text-gray-700">City *</label>
              <input
                type="text"
                value={shippingAddress.city}
                onChange={(e) => setShippingAddress((prev) => ({ ...prev, city: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#134D41]"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-semibold text-gray-700">State *</label>
              <input
                type="text"
                value={shippingAddress.state}
                onChange={(e) => setShippingAddress((prev) => ({ ...prev, state: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#134D41]"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-semibold text-gray-700">Postal Code *</label>
              <input
                type="text"
                value={shippingAddress.postalCode}
                onChange={(e) => setShippingAddress((prev) => ({ ...prev, postalCode: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#134D41]"
              />
            </div>
          </div>
        </div>
      )}

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
        {selectedPlans.map((p, idx) => {
          const plan = plans.find(pl => pl._id === p.planId);
          const groups = plan ? getPlanProductGroups(plan) : [];
          const selections = planProductSelections[p.planId] || {};

          return (
            <div key={`plan-${idx}`} className="flex items-center justify-between p-3 border-2 border-yellow-200 rounded-xl bg-yellow-50 shadow-sm">
              <div className="flex flex-col">
                <span className="font-bold text-yellow-800">PLAN: {p.name}</span>
                <span className="text-xs text-yellow-600 font-semibold">
                  {currency}{Math.round(getItemPrice(p)).toLocaleString()}
                </span>
                {groups.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {groups.map(group => {
                      const mainId = group.mainProduct._id;
                      const selectedId = selections[mainId] || mainId;
                      const isAlt = selectedId !== mainId;
                      const selectedProduct = isAlt ? group.alternativeProduct : group.mainProduct;
                      return (
                        <span key={mainId} className="text-[9px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                          {selectedProduct.name} {isAlt ? "(Alt)" : "(Main)"}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleRemovePlan(p.planId)}
                className="text-red-500 hover:text-red-700 font-bold p-1 bg-red-50 rounded-full w-8 h-8 flex items-center justify-center transition"
              >
                &times;
              </button>
            </div>
          );
        })}
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
          {mode === "customer" && orderType === "1" && (
            <div className="flex justify-between items-center text-sm font-semibold text-gray-600">
              <span>Shipping Charges:</span>
              <span className="text-gray-800">
                {loadingShipping ? "Calculating..." : shippingChargesInfo ? `${currency}${Math.round(shippingChargesInfo.shippingCharges || 0).toLocaleString()}` : "-"}
              </span>
            </div>
          )}
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
