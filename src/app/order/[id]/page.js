"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getOrderDetails, updateOrderStatus, downloadOrderInvoiceApi, API_BASE, getOrderTracking, getDRSImage } from "@/Api/AllApi";
import { useAuth } from "@/contexts/AuthContext";
import Loader from "@/utils/loader";
import toast from "react-hot-toast";
import { ChevronLeft, Package, User, MapPin, Truck, CreditCard, ExternalLink, Calendar, Eye, Download, X, CheckCircle2, AlertCircle, FileText, Phone, Building, Printer } from "lucide-react";

const OrderDetailsPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const { role, permissions } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Shree Tirupati Courier integration state variables
  const [trackingData, setTrackingData] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [isCourierModalOpen, setIsCourierModalOpen] = useState(false);
  const [courierName, setCourierName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [courierType, setCourierType] = useState("Shree Tirupati Courier");
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [proofImageBase64, setProofImageBase64] = useState("");
  const [proofLoading, setProofLoading] = useState(false);
  const [proofError, setProofError] = useState("");

  const fetchTracking = async (orderId) => {
    try {
      setTrackingLoading(true);
      const data = await getOrderTracking(orderId);
      setTrackingData(data);
    } catch (err) {
      console.error("Failed to load tracking data", err);
    } finally {
      setTrackingLoading(false);
    }
  };

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const data = await getOrderDetails(id);
      setOrder(data);

      const courierTypeStr = String(data.courier || '').trim().toLowerCase();
      if (data.trackingId && (courierTypeStr === 'shree tirupati courier' || courierTypeStr === 'shree tirupati' || courierTypeStr === 'tirupati')) {
        fetchTracking(data._id);
      } else {
        setTrackingData(null);
      }
    } catch (err) {
      toast.error("Failed to load order details");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDetails();
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    try {
      setUpdating(true);
      await updateOrderStatus(id, Number(newStatus));
      toast.success("Order status updated");
      fetchDetails();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    if (order && isCourierModalOpen) {
      setCourierName(order.courier || "");
      setTrackingNumber(order.trackingId || "");
      if (order.courier === "Shree Tirupati Courier") {
        setCourierType("Shree Tirupati Courier");
      } else if (order.courier) {
        setCourierType("Other");
      } else {
        setCourierType("Shree Tirupati Courier");
      }
    }
  }, [order, isCourierModalOpen]);

  const handleSaveCourierDetails = async (e) => {
    e.preventDefault();
    try {
      setUpdating(true);
      const finalCourier = courierType === "Shree Tirupati Courier" ? "Shree Tirupati Courier" : courierName;
      await updateOrderStatus(id, order.orderStatus, { courier: finalCourier, trackingId: trackingNumber });
      toast.success("Courier details updated successfully!");
      setIsCourierModalOpen(false);
      fetchDetails();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || "Failed to update courier details");
    } finally {
      setUpdating(false);
    }
  };

  const handleViewProof = async (imageId) => {
    try {
      setIsProofModalOpen(true);
      setProofLoading(true);
      setProofError("");
      setProofImageBase64("");

      const data = await getDRSImage(imageId);
      if (data && data.OpStatus === 'SUCCEED') {
        setProofImageBase64(data.ImgData);
      } else {
        setProofError(data?.ErrMSG || "Failed to load delivery proof image.");
      }
    } catch (err) {
      setProofError("An error occurred while loading the image.");
      console.error(err);
    } finally {
      setProofLoading(false);
    }
  };

  const handlePrintInvoice = () => {
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

    const statusLabel = STATUS_LABELS[order.orderStatus] || "Pending";
    const orderDate = new Date(order.createdAt).toLocaleDateString("en-GB");
    const orderId = `ORD-${order._id.slice(-6).toUpperCase()}`;

    const branchName = order.branch?.name || "Detoxpathy Corporate Office";
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

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${orderId}</title>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #1e293b;
            font-size: 13px;
            line-height: 1.5;
            margin: 0;
            padding: 40px;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
          }
          h1 {
            color: #0d9488;
            font-size: 28px;
            margin: 0 0 5px 0;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .subtitle {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            color: #1e293b;
            margin-bottom: 25px;
            letter-spacing: 1px;
          }
          h2 {
            font-size: 18px;
            font-weight: 800;
            margin: 0 0 12px 0;
            color: #1e293b;
            letter-spacing: 0.5px;
            text-transform: uppercase;
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
          }
          .footer {
            text-align: center;
            font-size: 11px;
            color: #64748b;
            margin-top: 40px;
          }
          @media print {
            body {
              padding: 20px;
            }
            button {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>DETOXPATHY</h1>
          <div class="subtitle">HEALTH & WELLNESS SOLUTIONS</div>
          
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

  const handlePrintShippingLabel = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocker prevented opening print window");
      return;
    }

    const customerName = (order.shippingAddress?.name || `${order.user?.name || ""} ${order.user?.surname || ""}`).trim().toUpperCase();
    const mobile = order.shippingAddress?.mobile || order.user?.mobileNumber || "N/A";
    const addressLine1 = order.shippingAddress?.addressLine1 || "";
    const addressLine2 = order.shippingAddress?.addressLine2 || "";
    const city = order.shippingAddress?.city || "";
    const state = order.shippingAddress?.state || "";
    const postalCode = order.shippingAddress?.postalCode || "";
    const country = order.shippingAddress?.country || "India";

    const branchName = order.branch?.name || "Detoxpathy Corporate Office";
    const branchAddress = order.branch?.address || "Surat, Gujarat, India";

    const orderIdShort = `ORD-${order._id.slice(-6).toUpperCase()}`;
    const orderDate = new Date(order.createdAt).toLocaleDateString("en-GB");



    let itemsHtml = "";
    let itemsCount = 0;
    if (order.plans && order.plans.length > 0) {
      order.plans.forEach(p => {
        itemsHtml += `
          <tr>
            <td style="text-align: center; font-weight: 800;">${p.quantity || 1}</td>
            <td>${p.name || 'Membership Plan'}</td>
          </tr>
        `;
        itemsCount++;
      });
    } else if (order.plan) {
      itemsHtml += `
        <tr>
          <td style="text-align: center; font-weight: 800;">1</td>
          <td>${order.plan.name || 'Membership Plan'}</td>
        </tr>
      `;
      itemsCount++;
    }
    if (order.products && order.products.length > 0) {
      order.products.forEach(p => {
        itemsHtml += `
          <tr>
            <td style="text-align: center; font-weight: 800;">${p.quantity}</td>
            <td>${p.name || 'Product'}</td>
          </tr>
        `;
        itemsCount++;
      });
    }
    
    const labelClass = itemsCount > 4 ? "label-container compact-large" : (itemsCount > 2 ? "label-container compact" : "label-container");

    const itemsSectionHtml = itemsHtml
      ? `
        <div class="items-section">
          <div class="section-title">ITEMS / PLANS:</div>
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">QTY</th>
                <th>ITEM DESCRIPTION</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </div>
      `
      : "";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Shipping Label - ${orderIdShort}</title>
        <meta charset="utf-8">
        <style>
          @page {
            size: 4in 6in;
            margin: 0;
          }
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            margin: 0;
            padding: 15px;
            color: #000;
            background-color: #fff;
            width: 3.6in;
            height: 5.6in;
            box-sizing: border-box;
          }
          .label-container {
            border: 2px solid #000;
            height: 100%;
            display: flex;
            flex-direction: column;
            padding: 8px;
            box-sizing: border-box;
          }
          .compact {
            padding: 6px;
          }
          .compact .header {
            margin-bottom: 4px;
            padding-bottom: 4px;
          }
          .compact .barcode-placeholder {
            width: 140px;
            height: 45px;
            margin: 0 auto 4px auto;
          }
          .compact .barcode-section {
            margin-bottom: 4px;
            padding: 4px 0;
          }
          .compact .to-section {
            margin-bottom: 6px;
          }
          .compact .items-section {
            margin-top: 4px;
            margin-bottom: 4px;
          }
          .compact .from-section {
            padding-top: 4px;
          }
          
          .compact-large {
            padding: 4px;
          }
          .compact-large .header {
            margin-bottom: 2px;
            padding-bottom: 2px;
          }
          .compact-large .courier-title {
            font-size: 14px;
          }
          .compact-large .barcode-placeholder {
            width: 120px;
            height: 35px;
            margin: 0 auto 2px auto;
          }
          .compact-large .barcode-section {
            margin-bottom: 2px;
            padding: 2px 0;
          }
          .compact-large .awb-text {
            font-size: 12px;
            margin-top: 2px;
          }
          .compact-large .blank-line {
            width: 100px;
            height: 12px;
          }
          .compact-large .to-section {
            margin-bottom: 4px;
            font-size: 11px;
          }
          .compact-large .to-name {
            font-size: 12px;
          }
          .compact-large .items-section {
            margin-top: 2px;
            margin-bottom: 2px;
          }

          .compact-large .from-section {
            padding-top: 2px;
            font-size: 11px;
          }
          .compact-large .section-title {
            font-size: 10px;
          }
          .header {
            text-align: center;
            border-bottom: 2px dashed #000;
            padding-bottom: 6px;
            margin-bottom: 8px;
          }
          .courier-title {
            font-size: 16px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin: 0;
          }
          .barcode-section {
            text-align: center;
            padding: 8px 0;
            border-bottom: 2px dashed #000;
            margin-bottom: 8px;
          }
          .barcode-img {
            max-width: 90%;
            height: auto;
            max-height: 55px;
            object-fit: contain;
          }
          .awb-text {
            font-family: monospace;
            font-size: 14px;
            font-weight: bold;
            margin-top: 4px;
            margin-bottom: 0;
          }
          .barcode-placeholder {
            width: 160px;
            height: 55px;
            border: 1.5px dashed #000;
            margin: 0 auto 8px auto;
            border-radius: 4px;
          }
          .blank-line {
            display: inline-block;
            width: 130px;
            margin-left: 4px;
            vertical-align: bottom;
            height: 15px;
          }
          .address-section {
            flex-grow: 1;
            font-size: 12px;
            line-height: 1.4;
            display: flex;
            flex-direction: column;
          }
          .section-title {
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            color: #000;
            margin-bottom: 4px;
            border-bottom: 1px solid #000;
            padding-bottom: 2px;
            letter-spacing: 0.5px;
          }
          .to-section {
            margin-bottom: 10px;
          }
          .to-name {
            font-size: 13px;
            font-weight: 800;
            margin-bottom: 1px;
          }
          .from-section {
            border-top: 2px dashed #000;
            padding-top: 8px;
            margin-top: auto;
          }
          .items-section {
            margin-top: 8px;
            margin-bottom: 8px;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 4px;
          }
          .items-table th, .items-table td {
            border: 1px solid #000;
            padding: 4px 6px;
            font-size: 11px;
            text-align: left;
          }
          .items-table th {
            background-color: #fff;
            font-weight: 800;
            text-transform: uppercase;
          }
          .items-table td {
            font-weight: bold;
          }
          .compact .items-table th, .compact .items-table td {
            padding: 3px 5px;
            font-size: 10px;
          }
          .compact-large .items-table th, .compact-large .items-table td {
            padding: 2px 4px;
            font-size: 9px;
          }
          .footer {
            border-top: 2px solid #000;
            padding-top: 4px;
            margin-top: 6px;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="${labelClass}">
          <div class="header">
            <h1 class="courier-title">${order.courier || "Shree Tirupati Courier"}</h1>
          </div>
          
          <div class="barcode-section">
            <div class="barcode-placeholder"></div>
            <p class="awb-text">AWB: <span class="blank-line">&nbsp;</span></p>
          </div>
          
          <div class="address-section">
            <div class="to-section">
              <div class="section-title">SHIP TO (DELIVER TO):</div>
              <div class="to-name">${customerName}</div>
              <div style="font-weight: bold; margin-bottom: 2px;">Mob: ${mobile}</div>
              <div>${addressLine1}</div>
              ${addressLine2 ? `<div>${addressLine2}</div>` : ""}
              <div style="font-weight: bold; font-size: 13px; margin-top: 2px;">
                ${city.toUpperCase()}, ${state.toUpperCase()} - ${postalCode}
              </div>
              <div>${country.toUpperCase()}</div>
            </div>
            
            ${itemsSectionHtml}
            
            <div class="from-section">
              <div class="section-title">SHIP FROM (SENDER):</div>
              <div style="font-weight: bold;">${branchName}</div>
              <div>${branchAddress}</div>
            </div>
          </div>
          
          <div class="footer">
            <span>ID: ${orderIdShort}</span>
            <span>DATE: ${orderDate}</span>
          </div>
        </div>
        
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

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader /></div>;
  if (!order) return <div className="p-10 text-center">Order not found</div>;

  const STATUS_LABELS = {
    1: "Pending",
    2: "Packed",
    3: "Processing",
    4: "In Transit",
    5: "Delivered",
    6: "Cancelled",
  };

  const STATUS_COLORS = {
    1: "bg-gray-100 text-gray-700",
    2: "bg-blue-100 text-blue-700",
    3: "bg-yellow-100 text-yellow-700",
    4: "bg-orange-100 text-orange-700",
    5: "bg-green-100 text-green-700",
    6: "bg-red-100 text-red-700",
  };

  return (
    <div className="p-6 bg-[#F8FAFC] min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="p-2 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            Order #{order._id.slice(-6).toUpperCase()}
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[order.orderStatus]}`}>
              {STATUS_LABELS[order.orderStatus]}
            </span>
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-gray-500">Placed on {new Date(order.createdAt).toLocaleString()}</p>
            <span className="text-gray-300">|</span>
            <p className="text-sm font-bold text-teal-600">Branch: {order.branch?.name || "N/A"}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Order Items & Shipping */}
        <div className="lg:col-span-2 space-y-8">

          {/* Items Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <Package className="w-5 h-5 text-teal-600" />
                Order Items
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {order.plans?.map((planItem, idx) => (
                <div key={`plan-${idx}`} className="flex items-center gap-4 p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                  <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 font-bold text-xs">PLAN</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800">{planItem.name}</h3>
                    <p className="text-xs text-gray-500 line-clamp-1">{planItem.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-teal-600">{order.currency || "₹"}{planItem.price}</p>
                    <p className="text-[10px] text-gray-400">Qty: 1</p>
                  </div>
                </div>
              ))}
              {/* Fallback for legacy single plan orders */}
              {order.plan && !order.plans?.length && (
                <div className="flex items-center gap-4 p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                  <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 font-bold text-xs">PLAN</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800">{order.plan.name}</h3>
                    <p className="text-xs text-gray-500 line-clamp-1">{order.plan.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-teal-600">{order.currency || "₹"}{order.plan.price}</p>
                    <p className="text-[10px] text-gray-400">Qty: 1</p>
                  </div>
                </div>
              )}
              {order.products?.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="w-16 h-16 bg-white rounded-lg border border-gray-200 overflow-hidden">
                    {item.image ? (
                      <img src={`${API_BASE}${item.image}`} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={20} /></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800">{item.name}</h3>
                    <p className="text-xs text-gray-500 line-clamp-1">{item.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-teal-600">{order.currency || "₹"}{item.price}</p>
                    <p className="text-[10px] text-gray-400">Qty: {item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-gray-50 p-6 flex justify-between items-center">
              <span className="font-bold text-gray-600">Total Amount</span>
              <span className="text-2xl font-black text-teal-700">{order.currency || "₹"}{order.totalAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Shipping Address Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-teal-600" />
                Shipping Details
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Recipient</p>
                  <p className="font-bold text-gray-800">{order.shippingAddress?.name}</p>
                  <p className="text-sm text-gray-600 mt-1">{order.shippingAddress?.mobile}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Address</p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {order.shippingAddress?.addressLine1}, {order.shippingAddress?.addressLine2 && `${order.shippingAddress?.addressLine2}, `}
                    <br />
                    {order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.postalCode}
                    <br />
                    {order.shippingAddress?.country}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Live Courier Tracking Section */}
          {order.trackingId && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                <h2 className="font-bold text-gray-800 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-teal-600" />
                  Live Tracking Information ({order.courier})
                </h2>
                <span className="text-xs font-mono bg-teal-50 text-teal-700 px-3 py-1 rounded-full font-bold">
                  AWB: {order.trackingId}
                </span>
              </div>

              <div className="p-6">
                {trackingLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 space-y-3">
                    <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-medium text-gray-400">Fetching live updates...</p>
                  </div>
                ) : trackingData ? (
                  trackingData.OpStatus === "SUCCEED" ? (
                    <div className="space-y-6">
                      {/* Summary Banner */}
                      <div className="bg-teal-50/50 border border-teal-100/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Current Status</p>
                          <p className="text-sm font-black text-teal-800 uppercase mt-0.5">{trackingData.CurStatus || "In Transit"}</p>
                        </div>
                        <div className="flex gap-4 text-xs">
                          <div className="flex items-center gap-1">
                            <span className="text-gray-400 font-medium">Origin:</span> <span className="font-bold text-gray-700">{trackingData.AWBFrom}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-400 font-medium">Destination:</span> <span className="font-bold text-gray-700">{trackingData.AWBTo}</span>
                          </div>
                        </div>
                      </div>

                      {/* Last Location */}
                      {trackingData.LastLocation && trackingData.LastLocation.length > 0 && (
                        <div className="bg-gray-50/70 border border-gray-100 rounded-xl p-4 space-y-2">
                          <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase">
                            <Building className="w-4 h-4 text-teal-600" />
                            Current Holding Location Details
                          </div>
                          {trackingData.LastLocation.map((loc, lIdx) => (
                            <div key={lIdx} className="text-xs space-y-1">
                              <p className="font-black text-gray-800">{loc.BranchNM}</p>
                              <p className="text-gray-500 leading-relaxed">{loc.Address}</p>
                              {loc.ContactNo && (
                                <p className="text-teal-600 font-bold flex items-center gap-1.5 mt-1">
                                  <Phone className="w-3.5 h-3.5" />
                                  Contact: {loc.ContactNo}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Timeline List */}
                      <div className="relative border-l border-gray-100 ml-4 pl-6 space-y-6">
                        {trackingData.TrackData && [...trackingData.TrackData].reverse().map((step, idx) => {
                          const isLatest = idx === 0;
                          const isDelivered = step.OpType === "DRS" || String(step.Description).toLowerCase().includes("delivered");

                          return (
                            <div key={idx} className="relative group">
                              {/* Timeline Point */}
                              <span className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${isLatest
                                ? (isDelivered ? "bg-green-600 border-green-600 ring-4 ring-green-100" : "bg-teal-600 border-teal-600 ring-4 ring-teal-100")
                                : "bg-white border-gray-300 group-hover:border-teal-500"
                                }`} />

                              <div className="space-y-1">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                  <span className={`text-[11px] font-black uppercase px-2 py-0.5 rounded-md ${isLatest
                                    ? (isDelivered ? "bg-green-100 text-green-700" : "bg-teal-100 text-teal-700")
                                    : "bg-gray-100 text-gray-600"
                                    }`}>
                                    {step.OpType || "Scan"}
                                  </span>
                                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {step.OpDate} {step.OpTime}
                                  </div>
                                </div>
                                <p className={`text-xs font-bold leading-relaxed ${isLatest ? 'text-gray-800 font-extrabold text-sm' : 'text-gray-600'}`}>
                                  {step.Description}
                                </p>
                                {step.Receiver && (
                                  <p className="text-[11px] text-gray-400 font-medium">
                                    Receiver Name: <span className="font-bold text-gray-600">{step.Receiver}</span>
                                  </p>
                                )}

                                {step.ImageID && (
                                  <button
                                    onClick={() => handleViewProof(step.ImageID)}
                                    className="mt-2 text-[11px] font-black text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    View Delivery Proof Scan
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
                      <AlertCircle className="w-8 h-8 text-amber-500" />
                      <p className="text-xs font-bold text-gray-600">Failed to load live tracking from Shree Tirupati Courier API.</p>
                      <p className="text-[10px] text-gray-400">Response Status: {trackingData.OpStatus || "FAILED"}</p>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center space-y-2 text-gray-400">
                    <AlertCircle className="w-8 h-8" />
                    <p className="text-xs font-bold">No active tracking records returned.</p>
                    <button
                      onClick={() => fetchTracking(order._id)}
                      className="text-xs text-teal-600 font-bold underline"
                    >
                      Retry Connection
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: User Info & Actions */}
        <div className="space-y-8">

          {/* User Profile Summary */}
          {order.user && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full overflow-hidden mb-4 border-4 border-teal-50 ring-4 ring-white">
                <img
                  src={order.user.image?.startsWith('http') ? order.user.image : (order.user.image ? `${API_BASE}/${order.user.image}` : `https://ui-avatars.com/api/?name=${order.user.name}+${order.user.surname}`)}
                  alt={order.user.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="font-bold text-lg text-gray-900">{order.user.name} {order.user.surname}</h3>
              <p className="text-sm text-gray-500 mb-6">{order.user.mobilePrefix} {order.user.mobileNumber}</p>

              <button
                onClick={() => router.push(`/component/users/${order.user.id}/profile`)}
                className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition"
              >
                View Full Profile
                <ExternalLink size={14} />
              </button>
            </div>
          )}

          {/* Status Update & Tracking */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">Update Order Status</label>
              <select
                value={order.orderStatus}
                disabled={updating}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 transition disabled:opacity-50"
              >
                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>

            <hr className="border-gray-50" />

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Payment Method</p>
                  <p className="text-sm font-bold text-gray-700">
                    {order.paymentMethod === "Split" ? "Hybrid" : (order.paymentMethod || "Razorpay")}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Truck className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Courier Service</p>
                    <p className="text-sm font-bold text-gray-700">{order.courier || 'Not Assigned'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCourierModalOpen(true)}
                  className="text-xs font-bold text-teal-600 hover:text-teal-700 px-2.5 py-1 bg-teal-50 hover:bg-teal-100 rounded-lg transition"
                >
                  Edit
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-5 h-5" /> {/* Spacer */}
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Tracking Number</p>
                  <p className="text-sm font-mono text-gray-600">{order.trackingId || '-'}</p>
                </div>
              </div>
            </div>

            {(role === "Admin" || permissions?.includes("generate order invoice")) && (
              <button
                onClick={handlePrintInvoice}
                className="w-full py-2.5 border border-teal-600 text-teal-600 rounded-xl text-sm font-bold hover:bg-teal-50 transition"
              >
                Print Invoice
              </button>
            )}
            <button
              onClick={handlePrintShippingLabel}
              className="w-full py-2.5 mt-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition"
            >
              Print Shipping Label
            </button>
          </div>
        </div>
      </div>

      {/* Assign Courier Service Modal */}
      {isCourierModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <Truck className="w-5 h-5 text-teal-600" />
                Fulfillment & Courier Details
              </h3>
              <button
                onClick={() => setIsCourierModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCourierDetails} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Courier Service</label>
                <select
                  value={courierType}
                  onChange={(e) => setCourierType(e.target.value)}
                  className="w-full h-11 px-3 border border-gray-200 rounded-xl bg-gray-50 font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                >
                  <option value="Shree Tirupati Courier">Shree Tirupati Courier</option>
                  <option value="Other">Other (Custom Courier)</option>
                </select>
              </div>

              {courierType === "Other" && (
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Custom Courier Name</label>
                  <input
                    type="text"
                    required
                    value={courierName}
                    onChange={(e) => setCourierName(e.target.value)}
                    placeholder="Enter courier company name"
                    className="w-full h-11 px-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition text-sm font-medium"
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">AWB / Tracking Number</label>
                <input
                  type="text"
                  required
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number"
                  className="w-full h-11 px-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition text-sm font-mono"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-50">
                <button
                  type="button"
                  onClick={() => setIsCourierModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold transition disabled:opacity-50"
                >
                  {updating ? "Updating..." : "Save Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Delivery Proof Scan (DRS Image Lightbox) Modal */}
      {isProofModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-600" />
                Delivery Proof Scan / Signature
              </h3>
              <button
                onClick={() => setIsProofModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center justify-center">
              {proofLoading ? (
                <div className="flex flex-col items-center py-20 space-y-3">
                  <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm font-medium text-gray-400">Loading image from server...</p>
                </div>
              ) : proofError ? (
                <div className="flex flex-col items-center py-10 space-y-2 text-center">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                  <p className="text-sm font-bold text-gray-600">{proofError}</p>
                </div>
              ) : proofImageBase64 ? (
                <div className="space-y-6 w-full">
                  <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 p-2 flex items-center justify-center max-h-[350px]">
                    <img
                      src={`data:image/jpeg;base64,${proofImageBase64}`}
                      alt="Delivery Proof"
                      className="object-contain max-h-[330px] rounded-lg shadow-sm"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        const win = window.open();
                        win.document.write(`<img src="data:image/jpeg;base64,${proofImageBase64}" style="max-width:100%; height:auto;" />`);
                        win.document.close();
                        setTimeout(() => win.print(), 500);
                      }}
                      className="flex-1 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition"
                    >
                      <Printer className="w-4 h-4" />
                      Print
                    </button>
                    <a
                      href={`data:image/jpeg;base64,${proofImageBase64}`}
                      download="Delivery_Proof.jpg"
                      className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No image loaded.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetailsPage;
