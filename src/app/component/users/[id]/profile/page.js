"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import RoleGuard from "@/components/RoleGuard";
import { Header, Button } from "@/utils/header";
import Loader from "@/utils/loader";
import {
  API_BASE,
  API_HOST,
  getUserOverview,
  holdUserPlan,
  resumeUserPlan,
  getUserVideoAnswers,
  downloadConsultationPdfApi,
  getAllOrders,
  getRecordingsByUserId,
  updateUserById,
} from "@/Api/AllApi";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";

const UserProfilePage = () => {
  const { role } = useAuth();
  const isDoctor = role === "subadmin";
  const params = useParams();
  const router = useRouter();
  const userId = params?.id;

  const formatYesNo = (value) => {
    if (value === "Yes" || value === "No") return value;
    return value ? "Yes" : "No";
  };

  const formatIndianDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const calculateAge = (dob) => {
    if (!dob) return null;
    try {
      let birthDate;
      if (typeof dob === "string" && dob.includes("/")) {
        const [day, month, year] = dob.split("/").map(Number);
        birthDate = new Date(year, month - 1, day);
      } else {
        birthDate = new Date(dob);
      }

      if (isNaN(birthDate.getTime())) return null;
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    } catch (err) {
      return null;
    }
  };

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [userOrders, setUserOrders] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null); // for popup
  const [closing, setClosing] = useState(false);
  const [planActionLoading, setPlanActionLoading] = useState(false);
  const [afterDetoxLoading, setAfterDetoxLoading] = useState(false);
  const [videoAnswers, setVideoAnswers] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [playingVideoUrl, setPlayingVideoUrl] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "warning",
    onConfirm: null,
  });
  const [recordings, setRecordings] = useState([]);
  const [recordingsLoading, setRecordingsLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await getUserOverview(userId);
        setOverview(data || null);

        // Fetch user video answers
        try {
          const vData = await getUserVideoAnswers(userId);
          setVideoAnswers(vData || []);
        } catch (err) {
          console.error("Failed to load video answers", err);
          setVideoAnswers([]);
        }

        // Fetch user orders
        try {
          const oData = await getAllOrders({ userId, limit: 1000 });
          setUserOrders(oData?.orders || []);
        } catch (err) {
          console.error("Failed to load user orders", err);
          setUserOrders([]);
        }

        // Fetch user recordings
        try {
          setRecordingsLoading(true);
          const rData = await getRecordingsByUserId(userId);
          setRecordings(rData || []);
        } catch (err) {
          console.error("Failed to load user recordings", err);
          // Silently fail - recordings feature might not be available
          setRecordings([]);
        } finally {
          setRecordingsLoading(false);
        }
      } catch {
        setOverview(null);
      } finally {
        setLoading(false);
      }
    };
    if (userId) load();
  }, [userId, role]);

  // handle popup close with fade-out
  const closePopup = () => {
    setClosing(true);
    setTimeout(() => {
      setSelectedDay(null);
      setClosing(false);
    }, 200);
  };

  const handleDayClick = (dayObj) => {
    const report =
      overview?.dailyReports?.find((r) => r.day === dayObj.day) || {};
    const checklist =
      overview?.dailyChecklist?.find((c) => c.day === dayObj.day) || null;
    setSelectedDay({ ...dayObj, answers: report.answers || [], checklist });
  };

  const handlePrintUserInvoice = () => {
    if (!userOrders || userOrders.length === 0) {
      toast.error("No orders found for this user");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocker prevented opening print window");
      return;
    }

    const STATUS_LABELS = {
      1: "Pending",
      2: "Packed",
      3: "Processing",
      4: "In Transit",
      5: "Delivered",
      6: "Cancelled",
    };

    let invoicesHtml = "";

    userOrders.forEach((order) => {
      const statusLabel = STATUS_LABELS[order.orderStatus] || "Pending";
      const orderDate = new Date(order.createdAt).toLocaleDateString("en-GB");
      const orderId = `ORD-${order._id.slice(-6).toUpperCase()}`;

      const branchName = order.branch?.name || "Detoxpathy";
      const billFrom = `${branchName}, Surat, Gujarat - 400001`;

      const customerName = (order.shippingAddress?.name || `${order.user?.name || ""} ${order.user?.surname || ""}`).trim().toUpperCase();
      const mobile = order.shippingAddress?.mobile || order.user?.mobileNumber || "N/A";
      const addressParts = [
        order.shippingAddress?.addressLine1,
        order.shippingAddress?.addressLine2,
        order.shippingAddress?.city,
        order.shippingAddress?.state ? `${order.shippingAddress.state} ${order.shippingAddress.postalCode || ""}` : order.shippingAddress?.postalCode,
        order.shippingAddress?.country || "India"
      ].filter(p => p && p.trim().length > 0);
      const billTo = `${customerName} | Mob: ${mobile} | ${addressParts.join(", ")}`;

      let itemsHtml = "";

      if (order.plans && order.plans.length > 0) {
        order.plans.forEach(planItem => {
          const hsn = planItem.hsnCode || "-";
          const rate = `₹${Number(planItem.price || 0).toLocaleString("en-IN")}`;
          const qty = planItem.quantity || "1";
          const gst = `${planItem.gstPercentage || 0}%`;
          const total = `₹${Number(planItem.totalWithTax || planItem.price || 0).toLocaleString("en-IN")}`;
          itemsHtml += `
            <tr>
              <td>${planItem.name || "Membership Plan"}</td>
              <td class="text-center">${hsn}</td>
              <td class="text-right">${rate}</td>
              <td class="text-center">${qty}</td>
              <td class="text-center">${gst}</td>
              <td class="text-right font-bold">${total}</td>
            </tr>
          `;
        });
      } else if (order.plan) {
        const hsn = order.plan.hsnCode || "-";
        const rate = `₹${Number(order.plan.price || 0).toLocaleString("en-IN")}`;
        const qty = "1";
        const gst = `${order.plan.gstPercentage || 0}%`;
        const total = `₹${Number(order.plan.totalWithTax || order.plan.price || 0).toLocaleString("en-IN")}`;
        itemsHtml += `
          <tr>
            <td>${order.plan.name || "Membership Plan"}</td>
            <td class="text-center">${hsn}</td>
            <td class="text-right">${rate}</td>
            <td class="text-center">${qty}</td>
            <td class="text-center">${gst}</td>
            <td class="text-right font-bold">${total}</td>
          </tr>
        `;
      }

      if (order.products && order.products.length > 0) {
        order.products.forEach(prod => {
          const hsn = prod.hsnCode || "-";
          const rate = `₹${Number(prod.price || 0).toLocaleString("en-IN")}`;
          const qty = prod.quantity || "1";
          const gst = `${prod.gstPercentage || 0}%`;
          const total = `₹${Number(prod.totalWithTax || (prod.price * prod.quantity) || 0).toLocaleString("en-IN")}`;
          itemsHtml += `
            <tr>
              <td>${prod.name || "Product"}</td>
              <td class="text-center">${hsn}</td>
              <td class="text-right">${rate}</td>
              <td class="text-center">${qty}</td>
              <td class="text-center">${gst}</td>
              <td class="text-right font-bold">${total}</td>
            </tr>
          `;
        });
      }

      const cgstVal = `₹${Number(order.cgst || 0).toLocaleString("en-IN")}`;
      const sgstVal = `₹${Number(order.sgst || 0).toLocaleString("en-IN")}`;
      const igstVal = order.igst > 0 ? `₹${Number(order.igst).toLocaleString("en-IN")}` : null;
      const totalVal = `₹${Number(order.totalAmount || 0).toLocaleString("en-IN")}`;
      const subTotalVal = `₹${Number(order.subTotal || order.totalAmount || 0).toLocaleString("en-IN")}`;

      let taxSummary = `<strong>CGST:</strong> ${cgstVal} | <strong>SGST:</strong> ${sgstVal}`;
      if (igstVal) {
        taxSummary = `<strong>IGST:</strong> ${igstVal}`;
      }

      const summaryLine = `<strong>Sub Total:</strong> ${subTotalVal} | ${taxSummary} | <strong>Grand Total:</strong> ${totalVal}`;

      invoicesHtml += `
        <div class="invoice-page">
          <h1>DETOXPATHY</h1>
          <div class="subtitle">HEALTH & WELLNESS</div>
          
          <h2>INVOICE</h2>
          
          <div class="metadata">
            <strong>Order ID:</strong> ${orderId} | <strong>Date:</strong> ${orderDate} | <strong>Status:</strong> ${statusLabel}
          </div>
          
          <hr />
          
          <div class="info-section">
            <p><strong>BILL FROM:</strong> ${billFrom}</p>
            <p style="margin-top: 8px;"><strong>BILL TO:</strong> ${billTo}</p>
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
            Thank you | www.detoxpathy.com | Computer generated invoice. No signature required.
          </div>
        </div>
      `;
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoices - User USR-${userId.slice(-6).toUpperCase()}</title>
        <meta charset="utf-8">
        <style>
          * {
            box-sizing: border-box;
          }
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #1e293b;
            font-size: 13px;
            line-height: 1.5;
            margin: 0;
            padding: 20px;
            background-color: #f8fafc;
          }
          .container {
            max-width: 1200px;
            margin: 0 auto;
            width: 100%;
          }
          .invoice-page {
            background-color: #ffffff;
            padding: 50px;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
            margin-bottom: 40px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
          }
          h1 {
            color: #0d9488;
            font-size: 36px;
            margin: 0 0 8px 0;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .subtitle {
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            color: #1e293b;
            margin-bottom: 30px;
            letter-spacing: 1.5px;
          }
          h2 {
            font-size: 22px;
            font-weight: 800;
            margin: 0 0 15px 0;
            color: #1e293b;
            letter-spacing: 1px;
            text-transform: uppercase;
          }
          .metadata {
            font-size: 14px;
            margin-bottom: 15px;
            color: #1e293b;
            line-height: 1.8;
          }
          .metadata strong {
            font-weight: 700;
          }
          hr {
            border: 0;
            border-top: 2px solid #cbd5e1;
            margin: 20px 0;
          }
          .info-section {
            margin: 20px 0;
            font-size: 14px;
            line-height: 1.8;
          }
          .info-section p {
            margin: 8px 0;
          }
          .info-section strong {
            font-weight: 700;
            display: inline-block;
            min-width: 120px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 25px 0;
          }
          th {
            background-color: #f8fafc;
            color: #1e293b;
            font-weight: 700;
            text-align: left;
            padding: 12px 15px;
            font-size: 12px;
            border-top: 2px solid #cbd5e1;
            border-bottom: 2px solid #cbd5e1;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          td {
            padding: 14px 15px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 14px;
          }
          tbody tr:last-child td {
            border-bottom: 2px solid #cbd5e1;
          }
          .text-center {
            text-align: center;
          }
          .text-right {
            text-align: right;
          }
          .summary-line {
            font-size: 14px;
            margin: 20px 0;
            color: #1e293b;
            padding: 8px 0;
            line-height: 1.8;
          }
          .summary-line strong {
            font-weight: 700;
          }
          .footer {
            text-align: center;
            font-size: 12px;
            color: #64748b;
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
          }
          @media screen and (max-width: 1024px) {
            .container {
              max-width: 800px;
            }
            .invoice-page {
              padding: 40px;
            }
            h1 {
              font-size: 28px;
            }
            h2 {
              font-size: 18px;
            }
          }
          @media print {
            body {
              background-color: #ffffff;
              padding: 0;
            }
            .container {
              max-width: 100%;
            }
            .invoice-page {
              box-shadow: none;
              border: none;
              padding: 40px;
              margin: 0;
              page-break-after: always;
              max-width: 210mm;
            }
            .invoice-page:last-child {
              page-break-after: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          ${invoicesHtml}
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

  // Plan management functions
  const handleHoldPlan = () => {
    setConfirmDialog({
      isOpen: true,
      title: "Hold Plan",
      message: `Are you sure you want to HOLD the plan for ${overview.user?.name}? This will pause their current plan progress.`,
      type: "warning",
      onConfirm: async () => {
        try {
          setPlanActionLoading(true);
          await holdUserPlan(userId);

          // Update local state immediately
          setOverview((prev) => ({
            ...prev,
            user: {
              ...prev.user,
              planHoldDate: new Date().toISOString().split("T")[0],
              planResumeDate: null,
            },
          }));

          toast.success(`Plan held successfully for ${overview.user?.name}!`);
        } catch (err) {
          toast.error(err?.response?.data?.message || "Failed to hold plan");
        } finally {
          setPlanActionLoading(false);
          setConfirmDialog({
            isOpen: false,
            title: "",
            message: "",
            type: "warning",
            onConfirm: null,
          });
        }
      },
    });
  };

  const handleMarkAfterDetox = () => {
    const isAfterDetox = Boolean(overview.user?.afterDetox);
    const nextValue = !isAfterDetox;

    setConfirmDialog({
      isOpen: true,
      title: "After Detox",
      message: nextValue
        ? `Mark ${overview.user?.name} as After Detox? This will set afterDetox to true for this user.`
        : `Remove After Detox status for ${overview.user?.name}? This will set afterDetox to false.`,
      type: nextValue ? "success" : "warning",
      onConfirm: async () => {
        try {
          setAfterDetoxLoading(true);
          await updateUserById(userId, { afterDetox: nextValue });

          setOverview((prev) => ({
            ...prev,
            user: {
              ...prev.user,
              afterDetox: nextValue,
            },
          }));

          toast.success(
            nextValue
              ? `${overview.user?.name} marked as After Detox`
              : `After Detox removed for ${overview.user?.name}`
          );
        } catch (err) {
          toast.error(err?.response?.data?.message || "Failed to update After Detox status");
        } finally {
          setAfterDetoxLoading(false);
          setConfirmDialog({
            isOpen: false,
            title: "",
            message: "",
            type: "warning",
            onConfirm: null,
          });
        }
      },
    });
  };

  const handleResumePlan = () => {
    setConfirmDialog({
      isOpen: true,
      title: "Resume Plan",
      message: `Are you sure you want to RESUME the plan for ${overview.user?.name}? This will continue their plan from where it was held.`,
      type: "success",
      onConfirm: async () => {
        try {
          setPlanActionLoading(true);
          await resumeUserPlan(userId);

          // Update local state immediately
          setOverview((prev) => ({
            ...prev,
            user: {
              ...prev.user,
              planResumeDate: new Date().toISOString().split("T")[0],
              planCurrentDate: new Date().toISOString().split("T")[0],
            },
          }));

          toast.success(
            `Plan resumed successfully for ${overview.user?.name}!`
          );
        } catch (err) {
          toast.error(err?.response?.data?.message || "Failed to resume plan");
        } finally {
          setPlanActionLoading(false);
          setConfirmDialog({
            isOpen: false,
            title: "",
            message: "",
            type: "warning",
            onConfirm: null,
          });
        }
      },
    });
  };

  // Get plan status
  const getPlanStatus = () => {
    if (!overview?.user?.activated || !overview?.user?.plan) {
      return {
        status: "No Plan",
        color: "bg-gray-100 text-gray-800",
        icon: (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ),
      };
    }
    if (overview.user.planHoldDate && !overview.user.planResumeDate) {
      return {
        status: "Hold",
        color: "bg-amber-100 text-amber-800",
        icon: (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
      };
    }
    return {
      status: "Active",
      color: "bg-amber-300 text-yellow-800",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    };
  };

  const isDeleted = Boolean(overview?.user?.isDeleted);

  return (
    <RoleGuard allow={["Admin", "subadmin"]}>
      <div className="py-6 px-6 md:px-12">
        <div className="flex items-center justify-between mb-6 px-8">
          <Header size="3xl">User Profile</Header>
          <div className="flex gap-4 items-center flex-wrap justify-end">
            {!loading && overview && (
              <Button
                onClick={handleMarkAfterDetox}
                disabled={afterDetoxLoading}
                variant={overview.user?.afterDetox ? "secondary" : "primary"}
              >
                {afterDetoxLoading
                  ? "Updating..."
                  : overview.user?.afterDetox
                    ? "After Detox (Yes)"
                    : "After Detox"}
              </Button>
            )}
            <Button onClick={handlePrintUserInvoice} variant="secondary">
              Generate Invoice PDF
            </Button>
            <Button onClick={() => router.back()}>Back</Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center min-h-[60vh]">
            <Loader />
          </div>
        ) : !overview ? (
          <div className="text-gray-600">No user found.</div>
        ) : (
          <div className="space-y-8">
            <div className="mx-8 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-[#e6f4f1] text-[#134d41] flex items-center justify-center font-bold text-xl shrink-0">
                    {overview.user?.image ? (
                      <img
                        src={`${API_BASE}/${overview.user.image}`}
                        alt={overview.user?.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      overview.user?.name?.[0] || "U"
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">
                      {overview.user?.name} {overview.user?.surname}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1 font-medium tracking-wide">
                      USR-{overview.user?._id?.slice(-6).toUpperCase() || "XXXXXX"} • {overview.user?.mobilePrefix} {overview.user?.mobileNumber} • {overview.user?.email || "No email"}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className={`px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2 ${getPlanStatus().status === 'Active' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                    {getPlanStatus().status} {overview.user?.plan ? `— Day ${overview.user?.planCurrentDay ?? 0}` : ''}
                  </span>
                </div>
              </div>

              {/* Grid Data */}
              <div className="grid grid-cols-1 md:grid-cols-3">
                <div className="border-b md:border-r border-gray-200 p-6">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Branch</div>
                  <div className="text-sm font-medium text-gray-800">{overview.user?.branch?.name || "-"}</div>
                </div>
                <div className="border-b md:border-r border-gray-200 p-6">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Plan Configuration</div>
                  <div className="text-sm font-medium text-gray-800">{overview.user?.plan?.name ? `${overview.user.plan.name} (₹${overview.user.plan.price || 0})` : "-"}</div>
                </div>
                <div className="border-b border-gray-200 p-6">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Gender, Age & DOB</div>
                  <div className="text-sm font-medium text-gray-800">
                    {overview.user?.gender || "-"} • {calculateAge(overview.user?.dob) ? `${calculateAge(overview.user?.dob)} Years` : "-"} • {overview.user?.dob || "-"}
                  </div>
                </div>

                <div className="border-b md:border-r border-gray-200 p-6">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Location</div>
                  <div className="text-sm font-medium text-gray-800">{overview.user?.city || "-"}, {overview.user?.state || "-"}, {overview.user?.country || "-"}</div>
                </div>
                <div className="border-b md:border-r border-gray-200 p-6">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Physical Stats</div>
                  <div className="text-sm font-medium text-gray-800">{overview.user?.height || "-"} cm • {overview.user?.weight || "-"} kg</div>
                </div>
                <div className="border-b border-gray-200 p-6">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Referral Details</div>
                  <div className="text-sm font-medium text-gray-800">
                    Referred By : <span className="font-bold text-amber-700">{overview.user?.referrerName || "-"}</span>
                  </div>
                </div>
                <div className="border-b md:border-r border-gray-200 p-6">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Language & App Referer</div>
                  <div className="text-sm font-medium text-gray-800">{overview.user?.language || "-"} • {overview.user?.appReferer || "-"}</div>
                </div>

                <div className="border-b md:border-r md:border-b-0 border-gray-200 p-6">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Engagements</div>
                  <div className="text-sm font-medium text-gray-800">
                    Trial: {formatYesNo(overview.user?.bookTrial)} {overview.user?.videoPurshaceDate && `(${formatIndianDate(overview.user.videoPurshaceDate)})`} | Meet Dr: {formatYesNo(overview.user?.meetDoctor)} | Order: {formatYesNo(overview.user?.order)} | After Detox: {formatYesNo(overview.user?.afterDetox)}
                  </div>
                </div>
                <div className="border-b md:border-r md:border-b-0 border-gray-200 p-6">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Medical Condition</div>
                  <div className="text-sm font-medium text-gray-800">
                    {Array.isArray(overview.user?.medicalDescription)
                      ? (overview.user.medicalDescription.length > 0 ? overview.user.medicalDescription.join(", ") : "-")
                      : (typeof overview.user?.medicalDescription === "string" && overview.user.medicalDescription.trim() !== ""
                        ? overview.user.medicalDescription
                        : "-")}
                  </div>
                </div>
                <div className="border-t border-gray-200 p-6">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Body Measurements</div>
                  <div className="text-sm font-medium text-gray-800 grid grid-cols-2 gap-x-6 gap-y-2 w-full">
                    <div className="flex flex-col gap-1">
                      <span>Waist: {overview.user?.waist || "-"}</span>
                      <span>Hip: {overview.user?.hip || "-"}</span>
                      <span>Chest: {overview.user?.chest || "-"}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span>Thigh: {overview.user?.thigh || "-"}</span>
                      <span>Biceps: {overview.user?.biceps || "-"}</span>
                    </div>
                  </div>
                </div>
                <div className="border-t md:border-l border-gray-200 p-6">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">First Login Date</div>
                  <div className="text-sm font-medium text-gray-800">{formatIndianDate(overview.user?.createdAt)}</div>
                </div>
              </div>
            </div>

            {/* ------------------ Consultations ------------------ */}
            <div className="p-6 mx-8 bg-white rounded-2xl shadow-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">Consultations</h3>
              </div>
              {overview.consultations && overview.consultations.length > 0 ? (
                <div className="space-y-4">
                  {overview.consultations.map((c) => (
                    <div
                      key={c._id}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-teal-100 bg-teal-50/30 hover:bg-teal-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">
                            {c.isFirstConsultation ? "First Consultation" : `Follow-up Consultation (Day ${c.planDay || "N/A"})`}
                          </div>
                          <div className="text-sm text-gray-500 flex flex-wrap gap-x-3">
                            <span>📅 {c.appointmentId?.date || new Date(c.createdAt).toLocaleDateString()}</span>
                            <span>⏰ {c.appointmentId?.startTime || "N/A"} - {c.appointmentId?.endTime || "N/A"}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => downloadConsultationPdfApi(c._id)}
                        className="w-full sm:w-auto px-4 py-2 bg-white border border-teal-200 text-teal-600 rounded-lg text-sm font-bold hover:bg-teal-600 hover:text-white transition-all flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download PDF
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 italic">No consultations recorded yet.</div>
              )}
            </div>

            {/* ------------------ Plan Management Section ------------------ */}
            {overview?.user?.plan && (
              <div className="p-8 mx-8 bg-white rounded-2xl shadow-lg border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <h3 className="text-2xl font-bold text-gray-800">
                      Plan Management
                    </h3>
                    <span
                      className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${getPlanStatus().color
                        }`}
                    >
                      <span className="mr-2">{getPlanStatus().icon}</span>
                      {getPlanStatus().status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Plan Details Card */}
                  <div className="bg-gradient-to-br from-yellow-50 to-amber-100 rounded-xl p-6 border border-yellow-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">
                          Current Plan
                        </h4>
                        <p className="text-sm text-gray-600">
                          {overview.user.plan.name} (₹{overview.user.plan.price || 0})
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Current Day:</span>
                        <span className="font-semibold text-gray-800">
                          {overview.user.planCurrentDay || 0}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Status:</span>
                        <span
                          className={`font-semibold ${getPlanStatus()
                            .color.replace("bg-", "text-")
                            .replace("-100", "-800")}`}
                        >
                          {getPlanStatus().status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Plan History Card */}
                  <div className="bg-gradient-to-br from-yellow-50 to-amber-100 rounded-xl p-6 border border-amber-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">
                          Plan History
                        </h4>
                        <p className="text-sm text-gray-600">
                          Hold & Resume Dates
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {overview.user.planHoldDate && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Hold Date:</span>
                          <span className="font-semibold text-amber-600">
                            {new Date(
                              overview.user.planHoldDate
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {overview.user.planResumeDate && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Resume Date:</span>
                          <span className="font-semibold text-yellow-600">
                            {new Date(
                              overview.user.planResumeDate
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {!overview.user.planHoldDate &&
                        !overview.user.planResumeDate && (
                          <div className="text-sm text-gray-500 italic">
                            No hold/resume history
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Action Buttons Card */}
                  <div className="bg-gradient-to-br from-yellow-50 to-amber-100 rounded-xl p-6 border border-yellow-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">
                          Quick Actions
                        </h4>
                        <p className="text-sm text-gray-600">
                          Manage plan status
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {overview.user.planHoldDate &&
                        !overview.user.planResumeDate ? (
                        <button
                          onClick={handleResumePlan}
                          disabled={planActionLoading}
                          className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:transform-none flex items-center justify-center gap-2"
                        >
                          {planActionLoading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          )}
                          Resume Plan
                        </button>
                      ) : (
                        <button
                          onClick={handleHoldPlan}
                          disabled={planActionLoading || isDeleted}
                          className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:transform-none flex items-center justify-center gap-2"
                        >
                          {planActionLoading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          )}
                          Hold Plan
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------ Plan History ------------------ */}
            <div className="p-6 mx-8 bg-white rounded-2xl shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">
                  Plan History
                </h3>
                <span className="text-sm text-gray-500">Recent first</span>
              </div>
              {Array.isArray(overview.planHistory) &&
                overview.planHistory.length ? (
                <div className="space-y-4">
                  {overview.planHistory.map((h) => (
                    <div
                      key={h._id}
                      className="flex items-center justify-between rounded-xl bg-amber-100 shadow-md p-4  hover:shadow-lg transition"
                    >
                      <div>
                        <div className="font-semibold text-gray-800 text-base">
                          {h.plan?.name ? `${h.plan.name} (₹${h.plan.price || 0})` : "Plan"}
                        </div>
                        <div className="text-sm text-gray-600">
                          {h.plan?.days ? `${h.plan.days} days` : ""}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(h.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500">No plan changes yet.</div>
              )}
            </div>

            {/* ------------------ Program Progress ------------------ */}
            <div className="mx-8 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-800">
                  Program Progress
                </h3>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  {overview.user?.plan?.name || "Standard Plan"} • {overview.user?.plan?.days || 0} Days
                </span>
              </div>

              {overview?.user?.plan?.days ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-[#134D41]">
                      <tr className="text-[10px] font-black text-white uppercase tracking-widest whitespace-nowrap">
                        <th className="px-4 py-4 text-left">Day</th>
                        <th className="px-4 py-4 text-left">Weight</th>
                        <th className="px-4 py-4 text-left">Water</th>
                        <th className="px-4 py-4 text-left">Sleep</th>
                        <th className="px-4 py-4 text-left">Exercise</th>
                        <th className="px-4 py-4 text-left">Juice</th>
                        <th className="px-4 py-4 text-left">Pranayama</th>
                        <th className="px-4 py-4 text-left">Video</th>
                        <th className="px-6 py-4 text-left">Food Mistake</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {Array.from({ length: overview.user.plan.days })
                        .slice(0, overview.user.planCurrentDay || 0)
                        .map((_, index) => {
                          const dayNum = index + 1;
                          const isCompleted = dayNum <= (overview.user.planCurrentDay || 0);
                          const isCurrent = dayNum === (overview.user.planCurrentDay || 0);

                          const videoDayData = overview.progress?.find((p) => p.day === dayNum);
                          const checklistData = overview.dailyChecklist?.find((c) => c.day === dayNum);

                          return (
                            <tr key={dayNum} className={`hover:bg-teal-50/30 transition-colors ${isCurrent ? 'bg-teal-50/50 font-bold' : ''}`}>
                              <td className="px-4 py-4 whitespace-nowrap text-xs font-bold text-gray-700">
                                Day {dayNum}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-600">
                                {checklistData?.todayWeight ? `${checklistData.todayWeight} kg` : '-'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-600">
                                {checklistData?.waterIntake ? `${checklistData.waterIntake} L` : '-'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-600">
                                {checklistData?.sleepHours ? `${checklistData.sleepHours} hr` : '-'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-600">
                                {checklistData?.exerciseMinutes ? `${checklistData.exerciseMinutes} min` : '-'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-600">
                                {checklistData?.greenJuice ? `${checklistData.greenJuice}x` : '-'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-600">
                                {checklistData?.pranayamaMinutes ? `${checklistData.pranayamaMinutes} min` : '-'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-[10px] font-bold">
                                {videoDayData?.dayProgressPercent > 0 ? (
                                  <span className="text-red-600 uppercase tracking-tight">Watched</span>
                                ) : <span className="text-gray-300">-</span>}
                              </td>
                              <td className="px-6 py-4 text-xs text-red-500 max-w-[200px] truncate" title={checklistData?.dietMistake}>
                                {checklistData?.dietMistake || '-'}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-10 text-center text-gray-500 italic">No program plan active.</div>
              )}
            </div>

            {/* ------------------ Transformation Journey ------------------ */}
            <div className="mx-8 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-800">
                  Transformation Journey
                </h3>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  Visual Progress Tracking
                </span>
              </div>

              <div className="p-2 w-full">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
                  {/* Front View Group */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Before Front */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">Before Front</h4>
                      <div className="group relative">
                        <div
                          className="aspect-square bg-gray-100 rounded-2xl overflow-hidden border border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-red-300 transition-all group"
                          onClick={() => overview.user?.before?.front && setSelectedImage(`${API_BASE}/${overview.user.before.front}`)}
                        >
                          {overview.user?.before?.front ? (
                            <img
                              src={`${API_BASE}/${overview.user.before.front}`}
                              alt="Before Front"
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-gray-400">
                              <svg className="w-8 h-8 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="text-[8px] font-bold uppercase tracking-widest opacity-50">Empty</span>
                            </div>
                          )}
                          {overview.user?.before?.front && (
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-white text-[10px] font-bold uppercase tracking-widest bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm border border-white/20">View</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* After Front */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">After Front</h4>
                      <div className="group relative">
                        <div
                          className="aspect-square bg-gray-100 rounded-2xl overflow-hidden border border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-teal-300 transition-all group"
                          onClick={() => overview.user?.after?.front && setSelectedImage(`${API_BASE}/${overview.user.after.front}`)}
                        >
                          {overview.user?.after?.front ? (
                            <img
                              src={`${API_BASE}/${overview.user.after.front}`}
                              alt="After Front"
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-gray-400">
                              <svg className="w-8 h-8 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="text-[8px] font-bold uppercase tracking-widest opacity-50">Empty</span>
                            </div>
                          )}
                          {overview.user?.after?.front && (
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-white text-[10px] font-bold uppercase tracking-widest bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm border border-white/20">View</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Side View Group */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Before Side */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">Before Side</h4>
                      <div className="group relative">
                        <div
                          className="aspect-square bg-gray-100 rounded-2xl overflow-hidden border border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-red-300 transition-all group"
                          onClick={() => overview.user?.before?.side && setSelectedImage(`${API_BASE}/${overview.user.before.side}`)}
                        >
                          {overview.user?.before?.side ? (
                            <img
                              src={`${API_BASE}/${overview.user.before.side}`}
                              alt="Before Side"
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-gray-400">
                              <svg className="w-8 h-8 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="text-[8px] font-bold uppercase tracking-widest opacity-50">Empty</span>
                            </div>
                          )}
                          {overview.user?.before?.side && (
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-white text-[10px] font-bold uppercase tracking-widest bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm border border-white/20">View</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* After Side */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">After Side</h4>
                      <div className="group relative">
                        <div
                          className="aspect-square bg-gray-100 rounded-2xl overflow-hidden border border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-teal-300 transition-all group"
                          onClick={() => overview.user?.after?.side && setSelectedImage(`${API_BASE}/${overview.user.after.side}`)}
                        >
                          {overview.user?.after?.side ? (
                            <img
                              src={`${API_BASE}/${overview.user.after.side}`}
                              alt="After Side"
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-gray-400">
                              <svg className="w-8 h-8 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="text-[8px] font-bold uppercase tracking-widest opacity-50">Empty</span>
                            </div>
                          )}
                          {overview.user?.after?.side && (
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-white text-[10px] font-bold uppercase tracking-widest bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm border border-white/20">View</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ------------------ Video Answers ------------------ */}
            <div className="p-6 mx-8 bg-white rounded-2xl shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">
                  Video Answers
                </h3>
              </div>
              {videoAnswers && videoAnswers.length > 0 ? (
                <div className="space-y-6">
                  {videoAnswers.map((va) => (
                    <div
                      key={va._id}
                      className="rounded-xl border border-amber-200 overflow-hidden shadow-sm"
                    >
                      <div className="bg-amber-100 px-4 py-3 border-b border-amber-200 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-gray-800">
                            Video: {va.videoId?.title?.english || "Unknown Title"}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${va.isPassed ? 'bg-teal-600 text-white' : 'bg-red-600 text-white'}`}>
                            {va.isPassed ? 'Passed' : 'Failed'} ({va.correctCount || 0}/{va.answers?.length || 0})
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(va.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="p-4 bg-yellow-50 flex flex-col gap-3">
                        {va.answers && va.answers.length > 0 ? (
                          (() => {
                            const wrongAnswers = va.answers.filter((ans) => !ans.isCorrect);
                            return wrongAnswers.length > 0 ? (
                              wrongAnswers.map((ans, i) => (
                                <div key={i} className="flex flex-col border-b border-yellow-200 pb-2 last:border-0 last:pb-0">
                                  <span className="text-sm font-medium text-gray-700 tracking-wide">Question : {ans.questionId?.questionText?.english || ans.questionId || "Unknown Question"}</span>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-md text-gray-900 font-semibold">Answer : {ans.answer}</span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-red-100 text-red-700">
                                      Incorrect
                                    </span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-sm text-gray-500">No wrong answers. All answers were correct.</div>
                            );
                          })()
                        ) : (
                          <div className="text-sm text-gray-500">No answers recorded.</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500">No video answers available.</div>
              )}
            </div>

            {/* ------------------ Recordings ------------------ */}
            <div className="p-6 mx-8 bg-white rounded-2xl shadow-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">Appointment Recordings</h3>
              </div>
              {recordingsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader />
                </div>
              ) : recordings && recordings.length > 0 ? (
                <div className="space-y-4">
                  {recordings.map((recording) => (
                    <div
                      key={recording._id}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-purple-100 bg-purple-50/30 hover:bg-purple-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">
                            Appointment Recording
                          </div>
                          <div className="text-sm text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
                            <span>📅 {recording.appointmentId?.date || new Date(recording.createdAt).toLocaleDateString()}</span>
                            <span>⏰ {recording.appointmentId?.startTime || "N/A"} - {recording.appointmentId?.endTime || "N/A"}</span>
                            <span>🏥 {recording.appointmentId?.branchId?.name || "N/A"}</span>
                            <span>👨‍⚕️ {recording.appointmentId?.doctor?.username || "N/A"}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${recording.status === 'recording' ? 'bg-red-100 text-red-700' :
                              recording.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                              {recording.status.charAt(0).toUpperCase() + recording.status.slice(1)}
                            </span>
                            {recording.duration > 0 && (
                              <span>⏱️ {Math.floor(recording.duration / 60)} min {recording.duration % 60} sec</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {recording.videoUrl ? (
                        <div className="flex items-center gap-2">
                          {(role === "Admin" || role === "subadmin") && (
                            <button
                              onClick={() => setPlayingVideoUrl(`${API_HOST}${recording.videoUrl}`)}
                              className="px-4 py-2 bg-white border border-purple-200 text-purple-600 rounded-lg text-sm font-bold hover:bg-purple-600 hover:text-white transition-all flex items-center justify-center gap-2 whitespace-nowrap flex-shrink-0"
                            >
                              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="whitespace-nowrap">Play Recording</span>
                            </button>
                          )}

                          {role === "Admin" && (
                            <a
                              href={`${API_HOST}${recording.videoUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              Download
                            </a>
                          )}

                          {role !== "Admin" && role !== "subadmin" && (
                            <span className="text-sm text-gray-600 italic">
                              Recording available (playback restricted)
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Video not available</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 italic">No recordings available.</div>
              )}
            </div>

            {/* ------------------ User Feedback ------------------ */}
            {!isDoctor && (
              <div className="p-6 mx-8 bg-white rounded-2xl shadow-lg border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-800">User Feedback</h3>
                </div>
                {overview?.feedback ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: "App Experience", value: overview.feedback.appExperience },
                      { label: "Doctor Consultant", value: overview.feedback.doctorCostultant },
                      { label: "Product Quality", value: overview.feedback.product },
                      { label: "Support", value: overview.feedback.support },
                    ].map((item, idx) => (
                      <div key={idx} className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex flex-col items-center">
                        <div className="text-xs font-bold text-[#134D41] uppercase tracking-wider mb-2">{item.label}</div>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <svg
                              key={star}
                              className={`w-5 h-5 ${star <= (item.value || 0) ? "text-yellow-500 fill-yellow-500" : "text-gray-300 fill-gray-300"}`}
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <div className="mt-2 text-lg font-bold text-gray-800">{item.value || 0}/5</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 italic">No feedback provided yet.</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ------------------ Popup Modal ------------------ */}
        {selectedDay && (
          <div
            className={`fixed inset-0 flex items-center justify-center z-50 bg-black/50 ${closing ? "animate-fade-out" : "animate-fade-in"
              }`}
          >
            <div className="bg-white w-[90%] md:w-[70%] lg:w-[50%] rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
              {/* Close Button */}
              <button
                className="absolute top-3 right-3 text-gray-600 hover:text-gray-900"
                onClick={closePopup}
              >
                ✕
              </button>

              <h2 className="text-xl font-bold mb-4 text-yellow-500">
                Day {selectedDay.day} - Detailed Report
              </h2>

              {/* Daily Checklist Data */}
              {selectedDay.checklist && (
                <div className="mb-6 p-5 rounded-2xl bg-blue-50 border border-blue-100 shadow-sm">
                  <h3 className="text-lg font-bold text-blue-700 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Daily Checklist
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    {[
                      { label: "Water Intake", value: `${selectedDay.checklist.waterIntake} Liter`, icon: "💧" },
                      { label: "Exercise", value: `${selectedDay.checklist.exerciseMinutes} mins`, icon: "🏃" },
                      { label: "Green Juice", value: `${selectedDay.checklist.greenJuice} Times`, icon: "🥤" },
                      { label: "Pranayama", value: `${selectedDay.checklist.pranayamaMinutes} mins`, icon: "🧘" },
                      { label: "Sleep", value: `${selectedDay.checklist.sleepHours} hours`, icon: "🌙" },
                      { label: "Weight", value: `${selectedDay.checklist.todayWeight} kg`, icon: "⚖️" },
                    ].map((item, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-xl border border-blue-50 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                          <span>{item.icon}</span>
                          {item.label}
                        </div>
                        <div className="text-sm font-bold text-gray-800">
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Diet Mistake - Full Width Row */}
                  <div className="bg-white p-4 rounded-xl border border-red-50 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-bold text-red-500 uppercase tracking-wider mb-2">
                      <span>⚠️</span> Food Mistake
                    </div>
                    <div className="text-sm text-red-600 font-medium leading-relaxed">
                      {selectedDay.checklist.dietMistake || "No mistakes reported for this day."}
                    </div>
                  </div>
                </div>
              )}

              {/* Daily Question Reports */}
              <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Questions Report
              </h3>
              {selectedDay.answers && selectedDay.answers.length ? (
                <div className="space-y-4">
                  {selectedDay.answers.map((a, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl bg-yellow-50 shadow-sm border border-yellow-100 hover:bg-yellow-100 transition"
                    >
                      <div className="text-gray-700 font-medium text-sm">
                        Q: {a.question}
                      </div>
                      <div className="mt-1 text-gray-900 font-bold">
                        A: {a.givenAnswer || "-"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-sm italic">No answers for this day.</div>
              )}
            </div>
          </div>
        )}

        {/* Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={confirmDialog.isOpen}
          onClose={() =>
            setConfirmDialog({
              isOpen: false,
              title: "",
              message: "",
              type: "warning",
              onConfirm: null,
            })
          }
          onConfirm={confirmDialog.onConfirm}
          title={confirmDialog.title}
          message={confirmDialog.message}
          type={confirmDialog.type}
          confirmText="Confirm"
          cancelText="Cancel"
        />

        {/* Image Viewer Modal */}
        {selectedImage && (
          <div
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 md:p-10 animate-fade-in"
            onClick={() => setSelectedImage(null)}
          >
            <button
              className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors p-2"
              onClick={() => setSelectedImage(null)}
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={selectedImage}
              alt="Full Size"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-zoom-in"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* Video Viewer Modal */}
        {playingVideoUrl && (
          <div
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-10 animate-fade-in"
            onClick={() => setPlayingVideoUrl(null)}
          >
            <button
              className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors p-2"
              onClick={() => setPlayingVideoUrl(null)}
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="w-full max-w-4xl bg-black rounded-lg overflow-hidden shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
              <video
                src={playingVideoUrl}
                controls
                autoPlay
                controlsList={role === "subadmin" ? "nodownload" : undefined}
                onContextMenu={role === "subadmin" ? (e) => e.preventDefault() : undefined}
                className="w-full h-auto max-h-[80vh] rounded-lg"
              />
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
};

export default UserProfilePage;
