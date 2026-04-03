"use client";
import React, { useState, useEffect } from "react";
import RoleGuard from "@/components/RoleGuard";
import { Header } from "@/utils/header";
import { getSetting, updateSettingById, listVideos } from "@/Api/AllApi";
import toast from "react-hot-toast";
import Loader from "@/utils/loader";
import RichTextEditor from "@/components/RichTextEditor";

const SettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [formData, setFormData] = useState({});
  const [trialVideos, setTrialVideos] = useState([]);
  const [loadingTrialVideos, setLoadingTrialVideos] = useState(true);

  // Utility function to transform raw video path to API URL
  const getVideoUrl = (rawPath) => {
    if (!rawPath) return '';
    const normalizedPath = rawPath.replace(/\\/g, '/');
    const filePath = normalizedPath.startsWith('uploads/') 
      ? normalizedPath.slice(8) 
      : normalizedPath;
    const encodedPath = encodeURIComponent(filePath);
    return `/api/v1/uploads/${encodedPath}`;
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

      setSettings(settingsData);
      setFormData(settingsData);
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
      setSaving(true);
      await updateSettingById(settings._id, formData);
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
                className={`px-4 py-2 rounded-full text-sm font-medium inline-block ${
                  formData.appActive
                    ? "bg-amber-200 text-yellow-900"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {formData.appActive ? "Active" : "Inactive"}
              </div>
            </div>

            {/* Version */}
            <div className="bg-gradient-to-br from-white to-amber-50 rounded-2xl shadow-lg border border-amber-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                App Version
              </h3>
              <input
                type="number"
                value={formData.version || ""}
                onChange={(e) => handleInputChange("version", e.target.value)}
                className="w-full text-3xl font-bold text-yellow-600 bg-transparent border-none outline-none"
                min="1"
                step="0.1"
                placeholder="1.0"
              />
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
            </div>
          </div>

          {/* Video Display */}
          {formData.resumeLink && (
            <div className="bg-gradient-to-br from-white to-yellow-50 rounded-2xl shadow-lg border border-yellow-200 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      
                {/* Resume Video */}
                <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
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
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Resume Video Preview
                </h3>
        
                <video
                  src={getVideoUrl(formData.resumeLink)}
                  controls
                  className="w-full rounded-xl shadow-lg"
                >
                  Your browser does not support the video tag.
                </video>
                </div>
                  
                {/* Trial Video */}
                <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
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
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Trial Video Preview
                </h3>
        
                <video
                  src={getVideoUrl(formData.trialLink || formData.resumeLink)}
                  controls
                  className="w-full rounded-xl shadow-lg"
                >
                  Your browser does not support the video tag.
                </video>
                </div>
        
              </div>
            </div>
          )}
        </form>
      </div>
    </RoleGuard>
  );
};

export default SettingsPage;
