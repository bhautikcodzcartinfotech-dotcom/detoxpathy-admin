"use client";
import React, { useState, useEffect } from "react";
import RoleGuard from "@/components/RoleGuard";
import { Header } from "@/utils/header";
import { getSetting, updateSettingById, listVideos, generateUrl, API_HOST } from "@/Api/AllApi";
import toast from "react-hot-toast";
import Loader from "@/utils/loader";
import RichTextEditor from "@/components/RichTextEditor";
import Dropdown from "@/utils/dropdown";

const MultiLangTextarea = ({ label, value, onChange, placeholder, rows = 4 }) => {
  const [activeLang, setActiveLang] = useState('english');

  const langs = [
    { id: 'english', label: 'English' },
    { id: 'hindi', label: 'Hindi' },
    { id: 'gujarati', label: 'Gujarati' },
  ];

  const handleLangChange = (langId, val) => {
    onChange({
      ...(value || {}),
      [langId]: val
    });
  };

  const copyToAll = () => {
    const englishVal = value?.english || "";
    onChange({
      english: englishVal,
      hindi: englishVal,
      gujarati: englishVal
    });
    toast.success(`Copied English to all languages`);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">
          {label}
        </label>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={copyToAll}
            className="text-[9px] font-black uppercase tracking-widest text-amber-600 hover:text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200 transition-all flex items-center gap-1"
            title="Copy English text to all languages"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V7M8 7h8a2 2 0 012 2v9a2 2 0 01-2 2H10a2 2 0 01-2-2V7z" />
            </svg>
            Use English for All
          </button>
          <div className="flex bg-amber-50 p-1 rounded-lg border border-amber-100">
            {langs.map((lang) => (
              <button
                key={lang.id}
                type="button"
                onClick={() => setActiveLang(lang.id)}
                className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${activeLang === lang.id
                    ? "bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-md"
                    : "text-amber-700 hover:text-amber-900"
                  }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <textarea
        value={value?.[activeLang] || ""}
        onChange={(e) => handleLangChange(activeLang, e.target.value)}
        placeholder={`${placeholder} (${activeLang})...`}
        rows={rows}
        className="w-full px-4 py-3 rounded-xl border border-amber-200 focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-white/50 transition-all duration-200 outline-none resize-none font-medium text-gray-700"
      />
    </div>
  );
};

const SettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [settings, setSettings] = useState(null);

  const [formData, setFormData] = useState({});
  const [trialVideos, setTrialVideos] = useState([]);
  const [loadingTrialVideos, setLoadingTrialVideos] = useState(true);

  // Utility function to transform raw video path to API URL
  const getVideoUrl = (rawPath) => {
    if (!rawPath) return '';
    if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) {
      return rawPath;
    }
    let filePath = rawPath.replace(/\\/g, '/').replace(/^\/+/, '');
    if (filePath.toLowerCase().startsWith('uploads/')) {
      filePath = filePath.slice(8);
    }
    const encodedPath = encodeURIComponent(filePath);
    return `${API_HOST}/api/v1/uploads/${encodedPath}`;
  };

  // Fetch settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await getSetting();
      console.log("Settings API Response:", response);

      // Handle different response structures
      let settingsData;
      if (response && response.data) {
        settingsData = response.data;
      } else if (response && response.setting) {
        settingsData = response.setting;
      } else if (response && response._id) {
        settingsData = response;
      } else {
        console.error("Unexpected response structure:", response);
        toast.error("Invalid settings data received");
        return;
      }

      const finalData = {
        ...settingsData,
        screenshotProtectionActive: typeof settingsData.screenshotProtectionActive !== 'undefined' ? settingsData.screenshotProtectionActive : true,
        currency: settingsData.currency || "₹",
        shippingCharges: typeof settingsData.shippingCharges !== 'undefined' ? settingsData.shippingCharges : 0,
        shippingChargesGujaratMaharashtra: typeof settingsData.shippingChargesGujaratMaharashtra !== 'undefined' ? settingsData.shippingChargesGujaratMaharashtra : 0,
        minShippingChargesOther: typeof settingsData.minShippingChargesOther !== 'undefined' ? settingsData.minShippingChargesOther : 0,
        minShippingChargesGujaratMaharashtra: typeof settingsData.minShippingChargesGujaratMaharashtra !== 'undefined' ? settingsData.minShippingChargesGujaratMaharashtra : 0,
        version: typeof settingsData.version !== 'undefined' ? Number(settingsData.version) : 1,
        iosVersion: typeof settingsData.iosVersion !== 'undefined' ? Number(settingsData.iosVersion) : 1,
        advanceBookingDays: typeof settingsData.advanceBookingDays !== 'undefined' ? settingsData.advanceBookingDays : 30,
        bookingSlotDays: typeof settingsData.bookingSlotDays !== 'undefined' ? settingsData.bookingSlotDays : 0,
        appoinmentDescription: typeof settingsData.appoinmentDescription === 'object' && settingsData.appoinmentDescription !== null
          ? settingsData.appoinmentDescription
          : { english: settingsData.appoinmentDescription || "", hindi: "", gujarati: "" },
        testimonialDescription: typeof settingsData.testimonialDescription === 'object' && settingsData.testimonialDescription !== null
          ? settingsData.testimonialDescription
          : { english: settingsData.testimonialDescription || "", hindi: "", gujarati: "" },
        productScreenDescription: typeof settingsData.productScreenDescription === 'object' && settingsData.productScreenDescription !== null
          ? settingsData.productScreenDescription
          : { english: settingsData.productScreenDescription || "", hindi: "", gujarati: "" }
      };
      setSettings(finalData);
      setFormData(finalData);
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    const fetchTrialVideos = async () => {
      try {
        setLoadingTrialVideos(true);
        const videos = await listVideos({ type: 6, limit: 6, start: 1 });
        setTrialVideos(videos || []);
      } catch (error) {
        console.error("Failed to fetch trial videos:", error);
        setTrialVideos([]);
      } finally {
        setLoadingTrialVideos(false);
      }
    };
    fetchTrialVideos();
  }, []);

  // Update settings
  const handleUpdate = async () => {
    try {
      // Validation: Testimonial Description and Image can both be present, since testimonialShowType determines which to display.

      setSaving(true);

      // Filter out internal MongoDB fields before sending to API
      const { _id, createdAt, updatedAt, __v, ...updateData } = formData;

      console.log("Updating settings with data:", updateData);

      if (formData.bannerFile || formData.audioFile || formData.appointmentSoundFile) {
        const data = new FormData();
        Object.keys(updateData).forEach(key => {
          if (typeof updateData[key] === 'object' && updateData[key] !== null) {
            data.append(key, JSON.stringify(updateData[key]));
          } else {
            data.append(key, updateData[key]);
          }
        });
        if (formData.bannerFile) data.append('banner', formData.bannerFile);
        if (formData.audioFile) data.append('audio', formData.audioFile);
        if (formData.appointmentSoundFile) data.append('appointmentSound', formData.appointmentSoundFile);
        await updateSettingById(settings._id, data);
      } else {
        await updateSettingById(settings._id, updateData);
      }


      setSettings({ ...settings, ...formData });
      toast.success("Settings updated successfully!");
    } catch (error) {
      console.error("Failed to update settings:", error);
      toast.error("Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      const uploadData = new FormData();
      uploadData.append("image", file);

      const response = await generateUrl(uploadData);
      console.log("Upload response:", response);

      // Handle response structure (it might be a string or an object with data property)
      // Normalize backslashes to forward slashes for cross-platform compatibility
      let fileUrl = typeof response === 'string' ? response : response.data;
      if (fileUrl && typeof fileUrl === 'string') {
        fileUrl = fileUrl.replace(/\\/g, '/');
      }

      if (fileUrl) {
        console.log("Setting testimonialImage to:", fileUrl);
        handleInputChange("testimonialImage", fileUrl);
        toast.success("Image uploaded successfully!");
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error("Failed to upload image:", error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Handle banner upload
  const handleBannerUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Preview the banner locally
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({
        ...prev,
        banner: reader.result,
        bannerFile: file // Keep the file to upload during handleUpdate
      }));
    };
    reader.readAsDataURL(file);
    toast.success("Banner selected! Click 'Update Settings' to save.");
  };

  // Handle audio upload (local preview selection)
  const handleAudioUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Preview the audio locally
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({
        ...prev,
        audio: reader.result, // Local base64 string for direct playback preview
        audioFile: file       // Keep file to upload during handleUpdate
      }));
    };
    reader.readAsDataURL(file);
    toast.success("Order sound selected! Click 'Update Settings' to save.");
  };

  const handleAppointmentSoundUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({
        ...prev,
        appointmentSound: reader.result,
        appointmentSoundFile: file
      }));
    };
    reader.readAsDataURL(file);
    toast.success("Appointment sound selected! Click 'Update Settings' to save.");
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-400">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-12 h-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>
        <p className="text-lg font-medium">No settings found</p>
        <button
          onClick={fetchSettings}
          className="mt-4 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <RoleGuard allow={["Admin"]}>
      <style jsx global>{`
        .html-content h1,
        .html-content h2,
        .html-content h3,
        .html-content h4,
        .html-content h5,
        .html-content h6 {
          margin: 0.5em 0;
          font-weight: bold;
        }
        .html-content h1 {
          font-size: 1.5em;
        }
        .html-content h2 {
          font-size: 1.3em;
        }
        .html-content h3 {
          font-size: 1.1em;
        }
        .html-content p {
          margin: 0.5em 0;
          line-height: 1.6;
        }
        .html-content ul,
        .html-content ol {
          margin: 0.5em 0;
          padding-left: 1.5em;
        }
        .html-content li {
          margin: 0.25em 0;
        }
        .html-content b,
        .html-content strong {
          font-weight: bold;
        }
        .html-content i,
        .html-content em {
          font-style: italic;
        }
        .html-content u {
          text-decoration: underline;
        }
        .html-content s,
        .html-content strike {
          text-decoration: line-through;
        }
        .html-content blockquote {
          margin: 1em 0;
          padding-left: 1em;
          border-left: 3px solid #e5e7eb;
          font-style: italic;
        }
        .html-content a {
          color: #3b82f6;
          text-decoration: underline;
        }
        .html-content a:hover {
          color: #1d4ed8;
        }

        /* ContentEditable specific styles */
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }

        [contenteditable]:focus {
          outline: none;
        }

        [contenteditable] br {
          line-height: 1.6;
        }

        [contenteditable] p {
          margin: 0;
          min-height: 1.2em;
        }

        [contenteditable] p:empty {
          min-height: 1.2em;
        }
        
        /* Hide arrows for number inputs */
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>
      <div className="w-full h-full px-18">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Header
              size="3xl"
              className="bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent"
            >
              App Settings
            </Header>
            <p className="text-gray-600 mt-2">
              Manage your application settings and content
            </p>
          </div>
          <button
            onClick={handleUpdate}
            disabled={saving}
            className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Updating...
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                Update Settings
              </>
            )}
          </button>
        </div>

        {/* Settings Form */}
        <form className="space-y-8">
          {/* App Status & Version */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* App Status */}
            <div className="bg-gradient-to-br from-white to-yellow-50 rounded-2xl shadow-lg border border-yellow-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    App Status
                  </h3>
                  <p className="text-sm text-gray-600">
                    Control whether the app is active or inactive
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.appActive || false}
                    onChange={(e) =>
                      handleInputChange("appActive", e.target.checked)
                    }
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-yellow-500"></div>
                </label>
              </div>
              <div
                className={`px-4 py-2 rounded-full text-sm font-medium inline-block ${formData.appActive
                  ? "bg-amber-200 text-yellow-900"
                  : "bg-red-100 text-red-800"
                  }`}
              >
                {formData.appActive ? "Active" : "Inactive"}
              </div>
            </div>

            {/* Screenshot Protection */}
            <div className="bg-gradient-to-br from-white to-amber-50 rounded-2xl shadow-lg border border-amber-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    Screenshot Protection
                  </h3>
                  <p className="text-sm text-gray-600">
                    Secure Admin Panel from capturing, printing & DevTools inspection
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.screenshotProtectionActive ?? true}
                    onChange={(e) =>
                      handleInputChange("screenshotProtectionActive", e.target.checked)
                    }
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-yellow-500"></div>
                </label>
              </div>
              <div
                className={`px-4 py-2 rounded-full text-sm font-medium inline-block ${
                  (formData.screenshotProtectionActive ?? true)
                    ? "bg-amber-200 text-yellow-900"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {(formData.screenshotProtectionActive ?? true) ? "Active" : "Inactive"}
              </div>
            </div>

            {/* Version Android */}
            <div className="bg-gradient-to-br from-white to-amber-50 rounded-2xl shadow-lg border border-amber-200 p-6">
              <h3 className="text-sm font-bold text-gray-700 mb-4 tracking-wide">
                App Version ( Android )
              </h3>
              <input
                type="number"
                value={formData.version ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  handleInputChange("version", value === "" ? "" : Number(value));
                }}
                className="w-full px-4 py-3 rounded-xl border border-amber-200 focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-white/50 transition-all duration-200 outline-none font-semibold text-gray-700"
                placeholder="1"
              />
            </div>

            {/* Version iOS */}
            <div className="bg-gradient-to-br from-white to-amber-50 rounded-2xl shadow-lg border border-amber-200 p-6">
              <h3 className="text-sm font-bold text-gray-700 mb-4 tracking-wide">
                App Version (IOS)
              </h3>
              <input
                type="number"
                value={formData.iosVersion ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  handleInputChange("iosVersion", value === "" ? "" : Number(value));
                }}
                className="w-full px-4 py-3 rounded-xl border border-amber-200 focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-white/50 transition-all duration-200 outline-none font-semibold text-gray-700"
                placeholder="1"
              />
            </div>

            {/* Video Price */}
            <div className="bg-gradient-to-br from-white to-yellow-50 rounded-2xl shadow-lg border border-yellow-200 p-6">
              <h3 className="text-sm font-bold text-gray-700 mb-4 tracking-wide">
                Video Price ({formData.currency || "₹"})
              </h3>
              <input
                type="text"
                inputMode="decimal"
                value={formData.videoPrice ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || /^\d*\.?\d*$/.test(value)) {
                    handleInputChange("videoPrice", value);
                  }
                }}
                className="w-full px-4 py-3 rounded-xl border border-yellow-200 focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-white/50 transition-all duration-200 outline-none font-semibold text-gray-700"
                placeholder="0"
              />
            </div>

            {/* Razorpay Key */}
            <div className="bg-gradient-to-br from-white to-yellow-50 rounded-2xl shadow-lg border border-yellow-200 p-6">
              <h3 className="text-sm font-bold text-gray-700 mb-4 tracking-wide uppercase">
                Razorpay Key ID
              </h3>
              <input
                type="text"
                value={formData.razorpayKey || ""}
                onChange={(e) => handleInputChange("razorpayKey", e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-yellow-200 focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-white/50 transition-all duration-200 outline-none font-semibold text-gray-700"
                placeholder="rzp_live_..."
              />
            </div>

            {/* Razorpay Secret */}
            <div className="bg-gradient-to-br from-white to-yellow-50 rounded-2xl shadow-lg border border-yellow-200 p-6">
              <h3 className="text-sm font-bold text-gray-700 mb-4 tracking-wide uppercase">
                Razorpay Secret Key
              </h3>
              <input
                type="password"
                value={formData.razorpaySecret || ""}
                onChange={(e) => handleInputChange("razorpaySecret", e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-yellow-200 focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-white/50 transition-all duration-200 outline-none font-semibold text-gray-700"
                placeholder="Enter Razorpay Secret Key"
              />
              <p className="text-xs text-gray-400 mt-2">Must match the Key ID above (both test or both live).</p>
            </div>

            {/* Shipping Charges */}
            <div className="bg-gradient-to-br from-white to-yellow-50 rounded-2xl shadow-lg border border-yellow-200 p-6 lg:col-span-2">
              <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Shipping Charges & Minimum Value ({formData.currency || "₹"})
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Other States */}
                <div className="bg-white/50 border border-yellow-100 p-5 rounded-xl space-y-4">
                  <h4 className="text-md font-semibold text-gray-700 mb-2">Other States</h4>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase">Charge per 500g</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formData.shippingCharges ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "" || /^\d*\.?\d*$/.test(value)) {
                          handleInputChange("shippingCharges", value === "" ? "" : Number(value));
                        }
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-yellow-200 focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-white/50 transition-all duration-200 outline-none font-semibold text-gray-700"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase">Minimum Order Value for Shipping</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formData.minShippingChargesOther ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "" || /^\d*\.?\d*$/.test(value)) {
                          handleInputChange("minShippingChargesOther", value === "" ? "" : Number(value));
                        }
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-yellow-200 focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-white/50 transition-all duration-200 outline-none font-semibold text-gray-700"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Gujarat & Maharashtra */}
                <div className="bg-white/50 border border-yellow-100 p-5 rounded-xl space-y-4">
                  <h4 className="text-md font-semibold text-gray-700 mb-2">Gujarat & Maharashtra</h4>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase">Charge per 500g</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formData.shippingChargesGujaratMaharashtra ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "" || /^\d*\.?\d*$/.test(value)) {
                          handleInputChange("shippingChargesGujaratMaharashtra", value === "" ? "" : Number(value));
                        }
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-yellow-200 focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-white/50 transition-all duration-200 outline-none font-semibold text-gray-700"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase">Minimum Order Value for Shipping</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formData.minShippingChargesGujaratMaharashtra ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "" || /^\d*\.?\d*$/.test(value)) {
                          handleInputChange("minShippingChargesGujaratMaharashtra", value === "" ? "" : Number(value));
                        }
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-yellow-200 focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-white/50 transition-all duration-200 outline-none font-semibold text-gray-700"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Currency */}
            <div className="bg-gradient-to-br from-white to-yellow-50 rounded-2xl shadow-lg border border-yellow-200 p-6 flex flex-col justify-between h-full">
              <div className="flex-1">
                <Dropdown
                  label="App Currency"
                  placeholder="Select Currency"
                  showSearch={true}
                  options={[
                    { value: "₹", label: "₹ - Indian Rupee (INR)" },
                    { value: "$", label: "$ - US Dollar (USD)" },
                    { value: "€", label: "€ - Euro (EUR)" },
                    { value: "£", label: "£ - British Pound (GBP)" },
                    { value: "AED", label: "AED - UAE Dirham" },
                    { value: "SAR", label: "SAR - Saudi Riyal" },
                    { value: "KWD", label: "KWD - Kuwaiti Dinar" },
                    { value: "BHD", label: "BHD - Bahraini Dinar" },
                    { value: "QAR", label: "QAR - Qatari Riyal" },
                    { value: "OMR", label: "OMR - Omani Rial" },
                    { value: "¥", label: "¥ - Japanese Yen (JPY)" },
                    { value: "C$", label: "C$ - Canadian Dollar (CAD)" },
                    { value: "A$", label: "A$ - Australian Dollar (AUD)" },
                    { value: "S$", label: "S$ - Singapore Dollar (SGD)" },
                  ]}
                  value={formData.currency || "₹"}
                  onChange={(val) => handleInputChange("currency", val)}
                />
              </div>
              <p className="text-[11px] text-gray-500 mt-4 leading-relaxed italic opacity-70">
                Changes will reflect in products, plans, and new orders.
              </p>
            </div>

            {/* Video Language */}
            <div className="bg-gradient-to-br from-white to-amber-50 rounded-2xl shadow-lg border border-amber-200 p-6 flex flex-col justify-between h-full">
              <div className="flex-1">
                <h3 className="text-sm font-bold text-gray-700 mb-4 tracking-wide uppercase">
                  Allowed Video Languages
                </h3>
                <div className="space-y-3">
                  {[
                    { id: 1, label: "English" },
                    { id: 2, label: "Gujarati" },
                    { id: 3, label: "Hindi" },
                  ].map((lang) => {
                    const isChecked = (formData.videoLanguage || []).includes(lang.id);
                    return (
                      <label key={lang.id} className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const current = formData.videoLanguage || [];
                              const next = e.target.checked
                                ? [...current, lang.id]
                                : current.filter(id => id !== lang.id);
                              handleInputChange("videoLanguage", next);
                            }}
                            className="sr-only"
                          />
                          <div className={`w-5 h-5 rounded border-2 transition-all ${isChecked ? 'bg-yellow-500 border-yellow-500' : 'bg-white border-gray-300 group-hover:border-yellow-400'}`}>
                            {isChecked && (
                              <svg className="w-full h-full text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                        <span className={`text-sm font-semibold transition-colors ${isChecked ? 'text-gray-900' : 'text-gray-500'}`}>
                          {lang.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <p className="text-[11px] text-gray-500 mt-4 leading-relaxed italic opacity-70">
                Only selected languages will be available for video content.
              </p>
            </div>

            {/* Booking & Slots Settings */}
            <div className="bg-gradient-to-br from-white to-yellow-50 rounded-2xl shadow-lg border border-yellow-200 p-6 lg:col-span-2">
              <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Booking & Slots Settings
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Configure the booking window duration for appointments.
              </p>
              
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">
                  Booking Slot Duration (Days)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formData.bookingSlotDays ?? ""}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    handleInputChange("bookingSlotDays", value === "" ? "" : Number(value));
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-yellow-200 focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-white/50 transition-all duration-200 outline-none font-semibold text-gray-700"
                  placeholder="0"
                />
                <p className="text-xs text-gray-500">
                  Number of days from <strong>today</strong> users can book. Set to 0 to disable booking slots.
                </p>
              </div>

              {/* Info Box */}
              {Number(formData.bookingSlotDays) > 0 && (() => {
                const today = new Date();
                const todayStr = [
                  today.getFullYear(),
                  String(today.getMonth() + 1).padStart(2, '0'),
                  String(today.getDate()).padStart(2, '0')
                ].join('-');
                const endDate = new Date(today);
                endDate.setDate(endDate.getDate() + Number(formData.bookingSlotDays) - 1);
                const endStr = [
                  endDate.getFullYear(),
                  String(endDate.getMonth() + 1).padStart(2, '0'),
                  String(endDate.getDate()).padStart(2, '0')
                ].join('-');
                return (
                  <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                    <svg className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      <strong>Active Override:</strong> Users will only be allowed to book appointments between{" "}
                      <strong>{todayStr}</strong> (today) and{" "}
                      <strong>{endStr}</strong>. Outside this window, bookings are blocked.
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Social Media Links */}
          <div className="bg-gradient-to-br from-white to-amber-50 rounded-2xl shadow-lg border border-amber-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <svg
                className="w-6 h-6 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
              Social Media Links
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Instagram */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Instagram Link
                </label>
                <input
                  type="url"
                  value={formData.instagramLink || ""}
                  onChange={(e) =>
                    handleInputChange("instagramLink", e.target.value)
                  }
                  placeholder="https://instagram.com/..."
                  className="w-full px-4 py-3 rounded-xl border border-amber-200 focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-white/50 transition-all duration-200 outline-none"
                />
              </div>
              {/* YouTube */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  YouTube Link
                </label>
                <input
                  type="url"
                  value={formData.youTubeLink || ""}
                  onChange={(e) =>
                    handleInputChange("youTubeLink", e.target.value)
                  }
                  placeholder="https://youtube.com/..."
                  className="w-full px-4 py-3 rounded-xl border border-amber-200 focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-white/50 transition-all duration-200 outline-none"
                />
              </div>
              {/* Facebook */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Facebook Link
                </label>
                <input
                  type="url"
                  value={formData.facebookLink || ""}
                  onChange={(e) =>
                    handleInputChange("facebookLink", e.target.value)
                  }
                  placeholder="https://facebook.com/..."
                  className="w-full px-4 py-3 rounded-xl border border-amber-200 focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-white/50 transition-all duration-200 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Banner Management */}
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 transition-all hover:shadow-2xl">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shadow-inner">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">App Banner</h3>
                <p className="text-sm text-gray-500">Upload a prominent banner for your mobile application</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Toggle selection between Banner (1) and Product (2) */}
              <div className="space-y-3">
                <label className="block text-sm font-bold text-gray-700">
                  Banner Display Option
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => handleInputChange("bannerShowType", 1)}
                    className={`flex items-center justify-center gap-3 px-6 py-4 rounded-2xl border-2 transition-all duration-300 font-semibold shadow-sm ${Number(formData.bannerShowType || 1) === 1
                        ? "border-amber-500 bg-amber-50 text-amber-900 shadow-amber-100/50"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                      }`}
                  >
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${Number(formData.bannerShowType || 1) === 1 ? "border-amber-500 bg-amber-500" : "border-gray-300"
                      }`}>
                      {Number(formData.bannerShowType || 1) === 1 && (
                        <span className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </span>
                    <span>Banner</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInputChange("bannerShowType", 2)}
                    className={`flex items-center justify-center gap-3 px-6 py-4 rounded-2xl border-2 transition-all duration-300 font-semibold shadow-sm ${Number(formData.bannerShowType || 1) === 2
                        ? "border-amber-500 bg-amber-50 text-amber-900 shadow-amber-100/50"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                      }`}
                  >
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${Number(formData.bannerShowType || 1) === 2 ? "border-amber-500 bg-amber-500" : "border-gray-300"
                      }`}>
                      {Number(formData.bannerShowType || 1) === 2 && (
                        <span className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </span>
                    <span>Product</span>
                  </button>
                </div>
              </div>

              <div className="relative group w-full">
                <div className="w-full aspect-[4/1] md:aspect-[5/1] rounded-[2rem] bg-gray-50 border-4 border-dashed border-gray-200 flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:border-amber-300 group-hover:bg-amber-50/30 shadow-inner">
                  {formData.banner ? (
                    <label htmlFor="banner-upload-main" className="cursor-pointer w-full h-full block">
                      <img
                        src={formData.banner?.startsWith('data:') ? formData.banner : getVideoUrl(formData.banner)}
                        alt="App Banner"
                        className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                      />
                    </label>
                  ) : (
                    <label htmlFor="banner-upload-main" className="flex flex-col items-center justify-center w-full h-full cursor-pointer p-8">
                      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-md mx-auto mb-4 text-gray-300 group-hover:text-amber-400 transition-colors">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                      <p className="text-gray-500 font-semibold group-hover:text-amber-600 transition-colors">Select a banner image</p>
                      <p className="text-xs text-gray-400 mt-1">Recommended size: 1200 x 400 pixels (PNG, JPG)</p>
                    </label>
                  )}
                </div>

                {formData.banner && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, banner: "", bannerFile: null }))}
                    className="absolute top-4 right-4 bg-white/90 backdrop-blur text-red-500 p-2.5 rounded-2xl shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-red-50 hover:scale-110 border border-red-100"
                    title="Remove Banner"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="flex justify-center pt-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerUpload}
                  className="hidden"
                  id="banner-upload-main"
                />
                <label
                  htmlFor="banner-upload-main"
                  className="group px-8 py-4 bg-gradient-to-r from-gray-900 to-gray-800 text-white font-bold rounded-2xl hover:from-amber-600 hover:to-amber-500 transition-all duration-300 cursor-pointer flex items-center gap-3 shadow-xl hover:shadow-amber-200 hover:-translate-y-0.5"
                >
                  <svg className="w-5 h-5 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  {formData.banner ? "Replace Current Banner" : "Upload Banner Image"}
                </label>
              </div>
            </div>
          </div>

          {/* Order Notification Sound */}
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 transition-all hover:shadow-2xl">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shadow-inner">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Order Notification Sound</h3>
                <p className="text-sm text-gray-500">Upload a custom audio file (.mp3, .wav) to play on new orders</p>
              </div>
            </div>

            <div className="space-y-6">
              {formData.audio ? (
                <div className="p-6 rounded-2xl bg-amber-50/50 border border-amber-200/60 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-800 uppercase tracking-widest">Active Sound File</span>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, audio: "", audioFile: null }))}
                      className="text-xs text-red-500 hover:text-red-600 font-bold hover:underline"
                    >
                      Remove Sound
                    </button>
                  </div>
                  <audio
                    src={formData.audio.startsWith('data:') ? formData.audio : getVideoUrl(formData.audio)}
                    controls
                    className="w-full"
                  />
                </div>
              ) : (
                <div className="relative group w-full">
                  <label htmlFor="audio-upload-main" className="flex flex-col items-center justify-center w-full min-h-[140px] cursor-pointer p-6 border-4 border-dashed border-gray-200 rounded-[2rem] bg-gray-50 hover:bg-amber-50/30 hover:border-amber-300 transition-all duration-300 shadow-inner">
                    <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-md mb-3 text-gray-300 group-hover:text-amber-400 transition-colors">
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-gray-500 group-hover:text-amber-600 transition-colors">Select an audio file</p>
                    <p className="text-[10px] text-gray-400 mt-1">Accepts MP3, WAV or AAC (Max 5MB)</p>
                  </label>
                </div>
              )}

              <div className="flex justify-center">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioUpload}
                  className="hidden"
                  id="audio-upload-main"
                />
                <label
                  htmlFor="audio-upload-main"
                  className="group px-8 py-4 bg-gradient-to-r from-gray-900 to-gray-800 text-white font-bold rounded-2xl hover:from-amber-600 hover:to-amber-500 transition-all duration-300 cursor-pointer flex items-center gap-3 shadow-xl hover:shadow-amber-200 hover:-translate-y-0.5"
                >
                  <svg className="w-5 h-5 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  {formData.audio ? "Replace Sound File" : "Upload Sound File"}
                </label>
              </div>
            </div>
          </div>

          {/* Appointment Reminder Sound */}
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 transition-all hover:shadow-2xl">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Appointment Reminder Sound</h3>
                <p className="text-sm text-gray-500">Upload audio to play 2 minutes before upcoming appointments (Super Admin & branch doctors)</p>
              </div>
            </div>

            <div className="space-y-6">
              {formData.appointmentSound ? (
                <div className="p-6 rounded-2xl bg-emerald-50/50 border border-emerald-200/60 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest">Active Appointment Sound</span>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, appointmentSound: "", appointmentSoundFile: null }))}
                      className="text-xs text-red-500 hover:text-red-600 font-bold hover:underline"
                    >
                      Remove Sound
                    </button>
                  </div>
                  <audio
                    src={formData.appointmentSound.startsWith('data:') ? formData.appointmentSound : getVideoUrl(formData.appointmentSound)}
                    controls
                    className="w-full"
                  />
                </div>
              ) : (
                <div className="relative group w-full">
                  <label htmlFor="appointment-sound-upload" className="flex flex-col items-center justify-center w-full min-h-[140px] cursor-pointer p-6 border-4 border-dashed border-gray-200 rounded-[2rem] bg-gray-50 hover:bg-emerald-50/30 hover:border-emerald-300 transition-all duration-300 shadow-inner">
                    <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-md mb-3 text-gray-300 group-hover:text-emerald-400 transition-colors">
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-gray-500 group-hover:text-emerald-600 transition-colors">Select an audio file</p>
                    <p className="text-[10px] text-gray-400 mt-1">Accepts MP3, WAV or AAC (Max 5MB)</p>
                  </label>
                </div>
              )}

              <div className="flex justify-center">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleAppointmentSoundUpload}
                  className="hidden"
                  id="appointment-sound-upload"
                />
                <label
                  htmlFor="appointment-sound-upload"
                  className="group px-8 py-4 bg-gradient-to-r from-gray-900 to-gray-800 text-white font-bold rounded-2xl hover:from-emerald-600 hover:to-emerald-500 transition-all duration-300 cursor-pointer flex items-center gap-3 shadow-xl hover:shadow-emerald-200 hover:-translate-y-0.5"
                >
                  <svg className="w-5 h-5 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  {formData.appointmentSound ? "Replace Appointment Sound" : "Upload Appointment Sound"}
                </label>
              </div>
            </div>
          </div>

          {/* HTML Content */}
          <div className="bg-gradient-to-br from-white to-amber-50 rounded-2xl shadow-lg border border-amber-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <svg
                className="w-6 h-6 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Content Management
            </h3>
            <div className="space-y-8">
              {/* About Us */}
              <div>
                <RichTextEditor
                  label="About Us"
                  value={formData.aboutUs || ""}
                  onChange={(value) => handleInputChange("aboutUs", value)}
                  placeholder="<h2>About Us</h2><p>Your content here...</p>"
                  rows={6}
                  showPreviewButton={false}
                />
              </div>

              {/* Privacy Policy */}
              <div>
                <RichTextEditor
                  label="Privacy Policy"
                  value={formData.privacyPolicy || ""}
                  onChange={(value) =>
                    handleInputChange("privacyPolicy", value)
                  }
                  placeholder="<h3>Privacy Policy</h3><p>Your content here...</p>"
                  rows={6}
                  showPreviewButton={false}
                />
              </div>

              {/* Terms & Conditions */}
              <div>
                <RichTextEditor
                  label="Terms & Conditions"
                  value={formData.termsAndConditions || ""}
                  onChange={(value) =>
                    handleInputChange("termsAndConditions", value)
                  }
                  placeholder="<h3>Terms & Conditions</h3><p>Your content here...</p>"
                  rows={6}
                  showPreviewButton={false}
                />
              </div>

              {/* Refund Policy */}
              <div>
                <RichTextEditor
                  label="Refund Policy"
                  value={formData.refundPolicy || ""}
                  onChange={(value) =>
                    handleInputChange("refundPolicy", value)
                  }
                  placeholder="<h3>Refund Policy</h3><p>Your content here...</p>"
                  rows={6}
                  showPreviewButton={false}
                />
              </div>

              {/* Appointment Description */}
              <MultiLangTextarea
                label="Appointment Description"
                value={formData.appoinmentDescription}
                onChange={(value) => handleInputChange("appoinmentDescription", value)}
                placeholder="Enter appointment description"
              />

              {/* Product Screen Description */}
              <MultiLangTextarea
                label="Product Screen Description"
                value={formData.productScreenDescription}
                onChange={(value) => handleInputChange("productScreenDescription", value)}
                placeholder="Enter product screen description"
              />

            </div>
          </div>

          {/* Testimonial Management */}
          <div className="bg-gradient-to-br from-white to-yellow-50 rounded-2xl shadow-lg border border-yellow-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <svg
                className="w-6 h-6 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              Testimonial Management
            </h3>
            <div className="space-y-8">
              {/* Toggle selection between Image (1) and Description (2) */}
              <div className="space-y-3">
                <label className="block text-sm font-bold text-gray-700">
                  Testimonial Display Option
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => handleInputChange("testimonialShowType", 1)}
                    className={`flex items-center justify-center gap-3 px-6 py-4 rounded-2xl border-2 transition-all duration-300 font-semibold shadow-sm ${Number(formData.testimonialShowType || 1) === 1
                        ? "border-amber-500 bg-amber-50 text-amber-900 shadow-amber-100/50"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                      }`}
                  >
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${Number(formData.testimonialShowType || 1) === 1 ? "border-amber-500 bg-amber-500" : "border-gray-300"
                      }`}>
                      {Number(formData.testimonialShowType || 1) === 1 && (
                        <span className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </span>
                    <span>Image</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInputChange("testimonialShowType", 2)}
                    className={`flex items-center justify-center gap-3 px-6 py-4 rounded-2xl border-2 transition-all duration-300 font-semibold shadow-sm ${Number(formData.testimonialShowType || 1) === 2
                        ? "border-amber-500 bg-amber-50 text-amber-900 shadow-amber-100/50"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                      }`}
                  >
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${Number(formData.testimonialShowType || 1) === 2 ? "border-amber-500 bg-amber-500" : "border-gray-300"
                      }`}>
                      {Number(formData.testimonialShowType || 1) === 2 && (
                        <span className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </span>
                    <span>Description</span>
                  </button>
                </div>
              </div>

              {/* Testimonial Description */}

              <MultiLangTextarea
                label="Testimonial Description"
                value={formData.testimonialDescription}
                onChange={(value) => handleInputChange("testimonialDescription", value)}
                placeholder="Enter testimonial description"
              />

              {/* Testimonial Image Upload */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  Testimonial Image
                </label>
                <div className="flex items-start gap-6">
                  {/* Preview */}
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-2xl bg-amber-100 border-2 border-dashed border-amber-300 flex items-center justify-center overflow-hidden transition-all group-hover:border-amber-400">
                      {formData.testimonialImage ? (
                        <img
                          src={getVideoUrl(formData.testimonialImage)}
                          alt="Testimonial"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <svg
                          className="w-12 h-12 text-amber-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      )}
                    </div>
                    {formData.testimonialImage && (
                      <button
                        type="button"
                        onClick={() =>
                          handleInputChange("testimonialImage", "")
                        }
                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
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
                            d="M6 18L18 6M6 6l18 18"
                          />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Upload Button */}
                  <div className="flex-1">
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="testimonial-image-upload"
                        disabled={isUploadingImage}
                      />
                      <label
                        htmlFor="testimonial-image-upload"
                        className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/30 text-amber-700 font-medium cursor-pointer hover:bg-amber-50 hover:border-amber-400 transition-all ${isUploadingImage ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                      >
                        {isUploadingImage ? (
                          <>
                            <div className="w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                            Uploading...
                          </>
                        ) : (
                          <>
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                              />
                            </svg>
                            {formData.testimonialImage
                              ? "Change Image"
                              : "Upload Image"}
                          </>
                        )}
                      </label>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Recommended: Square image, max 2MB (JPG, PNG)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </RoleGuard>
  );
};

export default SettingsPage;
