"use client";
import React, { useEffect, useMemo, useState } from "react";
import TimeButton from "@/utils/timebutton";
import toast from "react-hot-toast";
import { validateForm } from "@/utils/validation";
import Dropdown from "@/utils/dropdown";
import { getAllCategoriesApi, getAllPlans, generateZoomMeetingApi, generateAgoraSessionApi } from "@/Api/AllApi";
import MultiLanguageInput from "@/components/MultiLanguageInput";

const VideoForm = ({
  onSubmit,
  onCancel,
  loading,
  initialValues = null,
  submitLabel = "Create",
}) => {
  const [form, setForm] = useState({
    // Multi-language titles
    title_english: "",
    title_gujarati: "",
    title_hindi: "",
    // Video settings
    videoType: 1, // 1=file, 2=url
    video_english: null,
    video_gujarati: null,
    video_hindi: null,
    video_english_url: "",
    video_gujarati_url: "",
    video_hindi_url: "",
    videoSecond: "",
    // Thumbnail settings
    thumbnailType: 1, // 1=file, 2=url
    thumbnail_english: null,
    thumbnail_gujarati: null,
    thumbnail_hindi: null,
    thumbnail_english_url: "",
    thumbnail_gujarati_url: "",
    thumbnail_hindi_url: "",
    // Multi-language descriptions
    description_english: "",
    description_gujarati: "",
    description_hindi: "",
    // Other fields
    type: 1,
    day: "",
    category: "",
    plan: "",
    requiredCorrectAnswer: "",
    zoomStartUrl: "",
    sessionName: "",
    sessionPassword: "",
    jwtToken: "",
    accessToken: "",
    meetingNumber: "",
    // Agora settings
    agoraAppId: "",
    agoraChannelName: "",
    agoraToken: "",
    agoraUid: "",
  });
  const [errors, setErrors] = useState({});
  const [selectedLangs, setSelectedLangs] = useState(["english"]);
  const [categories, setCategories] = useState([]);
  const [plans, setPlans] = useState([]);
  const [generatingMeeting, setGeneratingMeeting] = useState(false);

  useEffect(() => {
    if (initialValues) {
      const active = [];
      if (
        initialValues.titleMultiLang?.english ||
        initialValues.videoMultiLang?.english ||
        initialValues.thumbnailMultiLang?.english ||
        initialValues.descriptionMultiLang?.english ||
        initialValues.title ||
        initialValues.video ||
        initialValues.thumbnail ||
        initialValues.description
      ) {
        active.push("english");
      }
      if (
        initialValues.titleMultiLang?.gujarati ||
        initialValues.videoMultiLang?.gujarati ||
        initialValues.thumbnailMultiLang?.gujarati ||
        initialValues.descriptionMultiLang?.gujarati
      ) {
        active.push("gujarati");
      }
      if (
        initialValues.titleMultiLang?.hindi ||
        initialValues.videoMultiLang?.hindi ||
        initialValues.thumbnailMultiLang?.hindi ||
        initialValues.descriptionMultiLang?.hindi
      ) {
        active.push("hindi");
      }
      if (active.length === 0) {
        active.push("english");
      }
      setSelectedLangs(active);

      const resolvedVideoType = initialValues.videoType ?? (Number(initialValues.type) === 10 ? 3 : 1);
      setForm((prev) => ({
        ...prev,
        // Multi-language titles
        title_english: initialValues.titleMultiLang?.english ?? "",
        title_gujarati: initialValues.titleMultiLang?.gujarati ?? "",
        title_hindi: initialValues.titleMultiLang?.hindi ?? "",
        // Video settings
        videoType: resolvedVideoType,
        video_english: null,
        video_gujarati: null,
        video_hindi: null,
        video_english_url:
          resolvedVideoType === 2 || resolvedVideoType === 3
            ? initialValues.videoMultiLang?.english ?? ""
            : "",
        video_gujarati_url:
          resolvedVideoType === 2 || resolvedVideoType === 3
            ? initialValues.videoMultiLang?.gujarati ?? ""
            : "",
        video_hindi_url:
          resolvedVideoType === 2 || resolvedVideoType === 3
            ? initialValues.videoMultiLang?.hindi ?? ""
            : "",
        videoSecond:
          resolvedVideoType === 2 ? initialValues.videoSec ?? "" : "",
        // Thumbnail settings
        thumbnailType: initialValues.thumbnailType ?? 1,
        thumbnail_english: null,
        thumbnail_gujarati: null,
        thumbnail_hindi: null,
        thumbnail_english_url:
          initialValues.thumbnailType === 2
            ? initialValues.thumbnailMultiLang?.english ?? ""
            : "",
        thumbnail_gujarati_url:
          initialValues.thumbnailType === 2
            ? initialValues.thumbnailMultiLang?.gujarati ?? ""
            : "",
        thumbnail_hindi_url:
          initialValues.thumbnailType === 2
            ? initialValues.thumbnailMultiLang?.hindi ?? ""
            : "",
        // Multi-language descriptions
        description_english: initialValues.descriptionMultiLang?.english ?? "",
        description_gujarati: initialValues.descriptionMultiLang?.gujarati ?? "",
        description_hindi: initialValues.descriptionMultiLang?.hindi ?? "",
        // Other fields
        type: initialValues.type ?? 1,
        day: initialValues.type === 1 ? initialValues.day ?? "" : "",
        category:
          typeof initialValues.category === "string"
            ? initialValues.category
            : initialValues.category?._id ?? "",
        plan:
          typeof initialValues.plan === "string"
            ? initialValues.plan
            : initialValues.plan?._id ?? "",
        requiredCorrectAnswer: initialValues.requiredCorrectAnswer ?? "",
        zoomStartUrl: initialValues.zoomStartUrl ?? "",
        sessionName: initialValues.sessionName ?? "",
        sessionPassword: initialValues.sessionPassword ?? "",
        jwtToken: initialValues.jwtToken ?? "",
        accessToken: initialValues.accessToken ?? "",
        meetingNumber: initialValues.meetingNumber ?? "",
        agoraAppId: initialValues.agoraAppId ?? "",
        agoraChannelName: initialValues.agoraChannelName ?? "",
        agoraToken: initialValues.agoraToken ?? "",
        agoraUid: initialValues.agoraUid ?? "",
      }));
      setErrors({});
    } else {
      setSelectedLangs(["english"]);
      setForm({
        title_english: "",
        title_gujarati: "",
        title_hindi: "",
        videoType: 1,
        video_english: null,
        video_gujarati: null,
        video_hindi: null,
        video_english_url: "",
        video_gujarati_url: "",
        video_hindi_url: "",
        videoSecond: "",
        thumbnailType: 1,
        thumbnail_english: null,
        thumbnail_gujarati: null,
        thumbnail_hindi: null,
        thumbnail_english_url: "",
        thumbnail_gujarati_url: "",
        thumbnail_hindi_url: "",
        description_english: "",
        description_gujarati: "",
        description_hindi: "",
        type: 1,
        day: "",
        category: "",
        plan: "",
        requiredCorrectAnswer: "",
        zoomStartUrl: "",
        sessionName: "",
        sessionPassword: "",
        jwtToken: "",
        accessToken: "",
        meetingNumber: "",
        agoraAppId: "",
        agoraChannelName: "",
        agoraToken: "",
        agoraUid: "",
      });
      setErrors({});
    }
  }, [initialValues]);

  useEffect(() => {
    const loadCats = async () => {
      try {
        const list = await getAllCategoriesApi();
        setCategories(Array.isArray(list) ? list : []);
      } catch (e) {
        setCategories([]);
      }
    };
    loadCats();
  }, []);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const list = await getAllPlans();
        setPlans(Array.isArray(list) ? list : []);
      } catch (e) {
        setPlans([]);
      }
    };
    loadPlans();
  }, []);

  const categoryTypeByVideoType = {
    2: 2,
    4: 1,
  };

  const shouldShowCategory = [2, 4].includes(Number(form.type));
  const shouldShowPlan = Number(form.type) === 8;
  const selectedCategoryType = categoryTypeByVideoType[Number(form.type)];

  const filteredCategories = useMemo(() => {
    if (!selectedCategoryType) return [];
    return categories.filter(
      (category) => Number(category.type) === selectedCategoryType
    );
  }, [categories, selectedCategoryType]);

  const validate = () => {
    const required = (label) => (v) =>
      v === undefined || v === null || String(v).trim() === ""
        ? `${label} is required.`
        : null;
    const numberRule = (label) => (v) => {
      if (v === "" || v === "ok") return null;
      const n = Number(String(v).trim());
      return isNaN(n) ? `${label} must be a number.` : null;
    };
    const isUpdate = Boolean(initialValues);
    const videoTypeNum = Number(form.videoType);
    const thumbTypeNum = Number(form.thumbnailType);
    const typeNum = Number(form.type);
    const isAgoraSession = videoTypeNum === 3;

    const hasAnyTitle = selectedLangs.some(
      (lang) => form[`title_${lang}`] && form[`title_${lang}`].trim() !== ""
    );

    if (!hasAnyTitle) {
      toast.error("At least one Title (English, Gujarati, or Hindi) is required.");
      return false;
    }

    for (const lang of selectedLangs) {
      const titleVal = form[`title_${lang}`];
      if (titleVal && titleVal.trim() !== "") {
        // Video check
        let hasVideo = false;
        if (videoTypeNum === 3) {
          hasVideo = true;
        } else if (videoTypeNum === 2) {
          hasVideo = !!(form[`video_${lang}_url`] && form[`video_${lang}_url`].trim() !== "");
        } else {
          const existingVideo = initialValues?.videoMultiLang?.[lang] || (lang === "english" && typeof initialValues?.video === "string" ? initialValues.video : "");
          hasVideo = !!(form[`video_${lang}`] || (isUpdate && existingVideo && Number(initialValues.videoType) === 1));
        }

        if (!hasVideo) {
          toast.error(`${lang.charAt(0).toUpperCase() + lang.slice(1)} Video is required because ${lang} title is provided.`);
          return false;
        }

        // Thumbnail check
        let hasThumb = false;
        if (thumbTypeNum === 2) {
          hasThumb = !!(form[`thumbnail_${lang}_url`] && form[`thumbnail_${lang}_url`].trim() !== "");
        } else {
          const existingThumb = initialValues?.thumbnailMultiLang?.[lang] || (lang === "english" && typeof initialValues?.thumbnail === "string" ? initialValues.thumbnail : "");
          hasThumb = !!(form[`thumbnail_${lang}`] || (isUpdate && existingThumb && Number(initialValues.thumbnailType) === 1));
        }

        if (!hasThumb) {
          toast.error(`${lang.charAt(0).toUpperCase() + lang.slice(1)} Thumbnail is required because ${lang} title is provided.`);
          return false;
        }
      }
    }

    let errs = validateForm({
      title_english: {
        value: form.title_english,
        rules: [],
      },
      title_gujarati: {
        value: form.title_gujarati,
        rules: [],
      },
      title_hindi: {
        value: form.title_hindi,
        rules: [],
      },
      video_english_url: {
        value: videoTypeNum === 2 ? form.video_english_url : "ok",
        rules: [],
      },
      video_gujarati_url: {
        value: videoTypeNum === 2 ? form.video_gujarati_url : "ok",
        rules: [],
      },
      video_hindi_url: {
        value: videoTypeNum === 2 ? form.video_hindi_url : "ok",
        rules: [],
      },
      agoraChannelName: {
        value: videoTypeNum === 3 ? form.agoraChannelName : "ok",
        rules: isUpdate ? [] : [required("Agora Session must be generated before saving")],
      },
      video_english: {
        value: videoTypeNum === 1 ? form.video_english : "ok",
        rules: [],
      },
      video_gujarati: {
        value: videoTypeNum === 1 ? form.video_gujarati : "ok",
        rules: [],
      },
      video_hindi: {
        value: videoTypeNum === 1 ? form.video_hindi : "ok",
        rules: [],
      },
      videoSecond: {
        value: videoTypeNum === 2 ? (form.video_english_url || form.video_gujarati_url || form.video_hindi_url ? form.videoSecond : "ok") : "ok",
        rules: (isUpdate || !(form.video_english_url || form.video_gujarati_url || form.video_hindi_url)) ? [numberRule("Video seconds")] : [required("Video seconds"), numberRule("Video seconds")],
      },
      thumbnail_english_url: {
        value: thumbTypeNum === 2 ? form.thumbnail_english_url : "ok",
        rules: [],
      },
      thumbnail_gujarati_url: {
        value: thumbTypeNum === 2 ? form.thumbnail_gujarati_url : "ok",
        rules: [],
      },
      thumbnail_hindi_url: {
        value: thumbTypeNum === 2 ? form.thumbnail_hindi_url : "ok",
        rules: [],
      },
      thumbnail_english: {
        value: thumbTypeNum === 1 ? form.thumbnail_english : "ok",
        rules: [],
      },
      thumbnail_gujarati: {
        value: thumbTypeNum === 1 ? form.thumbnail_gujarati : "ok",
        rules: [],
      },
      thumbnail_hindi: {
        value: thumbTypeNum === 1 ? form.thumbnail_hindi : "ok",
        rules: [],
      },
      type: { value: isAgoraSession ? 10 : typeNum, rules: [required("Type")] },
      day: {
        value: isAgoraSession ? "ok" : (typeNum === 1 ? form.day : "ok"),
        rules: isUpdate ? [numberRule("Day")] : [required("Day"), numberRule("Day")],
      },
      category: {
        value: isAgoraSession ? "ok" : ([2, 4].includes(typeNum) ? (form.category ? "ok" : "") : "ok"),
        rules: isUpdate ? [] : [required("Category")],
      },
      plan: {
        value: isAgoraSession ? "ok" : (typeNum === 8 ? (form.plan ? "ok" : "") : "ok"),
        rules: [required("Plan")],
      },
      requiredCorrectAnswer: {
        value: (isAgoraSession || typeNum === 6) ? (form.requiredCorrectAnswer || "0") : form.requiredCorrectAnswer,
        rules: (isUpdate || typeNum === 6) ? [numberRule("Required Correct Answer")] : [required("Required Correct Answer"), numberRule("Required Correct Answer")],
      },
    });

    setErrors(errs);
    if (Object.keys(errs).length) {
      const firstKey = Object.keys(errs)[0];
      toast.error(errs[firstKey]);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const isAgoraSession = Number(form.videoType) === 3;
    
    // Construct cleaned form data based on selectedLangs
    const cleanedForm = { ...form };
    const languages = ["english", "gujarati", "hindi"];
    for (const lang of languages) {
      if (!selectedLangs.includes(lang)) {
        cleanedForm[`title_${lang}`] = "";
        cleanedForm[`video_${lang}`] = null;
        cleanedForm[`video_${lang}_url`] = "";
        cleanedForm[`thumbnail_${lang}`] = null;
        cleanedForm[`thumbnail_${lang}_url`] = "";
        cleanedForm[`description_${lang}`] = "";
      }
    }

    await onSubmit({
      ...cleanedForm,
      type: isAgoraSession ? 10 : Number(form.type),
      videoSecond: isAgoraSession ? 0 : (form.videoSecond ? Number(form.videoSecond) : undefined),
      day: isAgoraSession ? undefined : (form.day ? Number(form.day) : undefined),
      plan: !isAgoraSession && Number(form.type) === 8 ? form.plan : undefined,
      requiredCorrectAnswer: isAgoraSession ? 0 : (form.requiredCorrectAnswer ? Number(form.requiredCorrectAnswer) : 0),
      agoraAppId: isAgoraSession ? form.agoraAppId : undefined,
      agoraChannelName: isAgoraSession ? form.agoraChannelName : undefined,
      agoraToken: isAgoraSession ? form.agoraToken : undefined,
      agoraUid: isAgoraSession ? (form.agoraUid ? Number(form.agoraUid) : 0) : undefined,
      sessionName: isAgoraSession ? form.sessionName : undefined,
    });
  };

  const typeOptions = [
    { label: "Day wise", value: 1 },
    { label: "Session Categories", value: 2 },
    { label: "Categoywise Testimonial", value: 4 },
    { label: "Resume Plan", value: 5 },
    { label: "Detox Session", value: 6 },
    { label: "Free Video", value: 7 },
    { label: "Instruction", value: 8 },
    { label: "Hold Video", value: 9 },
    { label: "book appointment video", value: 11 },
    { label: "rating screen video", value: 12 },
  ];

  const videoTypeOptions = [
    { label: "Upload File", value: 1 },
    { label: "Video URL", value: 2 },
    { label: "Agora session", value: 3 },
  ];

  const thumbTypeOptions = [
    { label: "Upload File", value: 1 },
    { label: "Thumbnail URL", value: 2 },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Form Languages Selector */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-xl border border-emerald-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-[#134D41]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5c-.313 1.567-.88 3.225-1.701 4.795m0 0a18.82 18.82 0 01-4.088-3.155m4.088 3.155L8.4 17" />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Form Languages</h3>
          </div>
        </div>
        <div className="flex gap-2">
          {[
            { id: "english", label: "Eng", flag: "🇬🇧" },
            { id: "gujarati", label: "Guj", flag: "🇮🇳" },
            { id: "hindi", label: "Hin", flag: "🇮🇳" }
          ].map((lang) => {
            const isSelected = selectedLangs.includes(lang.id);
            return (
              <button
                key={lang.id}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    setSelectedLangs(selectedLangs.filter((l) => l !== lang.id));
                    setForm((f) => ({
                      ...f,
                      [`title_${lang.id}`]: "",
                      [`video_${lang.id}`]: null,
                      [`video_${lang.id}_url`]: "",
                      [`thumbnail_${lang.id}`]: null,
                      [`thumbnail_${lang.id}_url`]: "",
                      [`description_${lang.id}`]: "",
                    }));
                  } else {
                    setSelectedLangs([...selectedLangs, lang.id]);
                  }
                }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-[#134D41] text-white border-[#134D41] shadow-sm hover:bg-[#0f3d33]"
                    : "bg-white text-gray-600 border-gray-200 hover:border-[#134D41] hover:bg-emerald-50"
                }`}
              >
                <span>{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <MultiLanguageInput
        label="Video Title"
        icon="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h3a1 1 0 110 2h-1v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6H4a1 1 0 110-2h3zM9 6v10h6V6H9z"
        fields={selectedLangs}
        values={{
          title_english: form.title_english,
          title_gujarati: form.title_gujarati,
          title_hindi: form.title_hindi,
        }}
        onChange={(values) => {
          setForm((f) => ({
            ...f,
            title_english: values.title_english,
            title_gujarati: values.title_gujarati,
            title_hindi: values.title_hindi,
          }));
        }}
        errors={errors}
        type="text"
        showCopyCheckbox={false}
      />

      <div className="grid grid-cols-2 gap-3">
        <Dropdown
          label="Video Type"
          options={videoTypeOptions}
          value={form.videoType}
          onChange={(v) =>
            setForm((f) => ({
              ...f,
              videoType: v,
              video_english: null,
              video_gujarati: null,
              video_hindi: null,
              video_english_url: "",
              video_gujarati_url: "",
              video_hindi_url: "",
              videoSecond: "",
              zoomStartUrl: "",
              sessionName: "",
              sessionPassword: "",
              jwtToken: "",
              accessToken: "",
              meetingNumber: "",
            }))
          }
        />
        <Dropdown
          label="Thumbnail Type"
          options={thumbTypeOptions}
          value={form.thumbnailType}
          onChange={(v) =>
            setForm((f) => ({
              ...f,
              thumbnailType: v,
              thumbnail_english: null,
              thumbnail_gujarati: null,
              thumbnail_hindi: null,
              thumbnail_english_url: "",
              thumbnail_gujarati_url: "",
              thumbnail_hindi_url: "",
            }))
          }
        />
      </div>

      {Number(form.videoType) === 1 && (
        <MultiLanguageInput
          key="video-files"
          label="Video Files"
          icon="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          fields={selectedLangs}
          values={{
            video_english: form.video_english,
            video_gujarati: form.video_gujarati,
            video_hindi: form.video_hindi,
          }}
          onChange={(values) => {
            setForm((f) => ({
              ...f,
              video_english: values.video_english,
              video_gujarati: values.video_gujarati,
              video_hindi: values.video_hindi,
            }));
          }}
          errors={errors}
          type="file"
          accept="video/*"
          showCopyCheckbox={false}
        />
      )}

      {Number(form.videoType) === 2 && (
        <>
          <MultiLanguageInput
            key="video-urls"
            label="Video URLs"
            icon="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            fields={selectedLangs}
            values={{
              video_english_url: form.video_english_url || "",
              video_gujarati_url: form.video_gujarati_url || "",
              video_hindi_url: form.video_hindi_url || "",
            }}
            onChange={(values) => {
              setForm((f) => ({
                ...f,
                video_english_url: values.video_english_url || "",
                video_gujarati_url: values.video_gujarati_url || "",
                video_hindi_url: values.video_hindi_url || "",
              }));
            }}
            errors={errors}
            type="text"
            showCopyCheckbox={false}
          />
          <div className="max-w-xs">
            <label className="block mb-1 font-semibold text-gray-700">Video Duration (Seconds)</label>
            <input
              type="text"
              value={form.videoSecond || ""}
              onChange={(e) => setForm((f) => ({ ...f, videoSecond: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-4 focus:ring-[#134D41]/5 focus:border-[#134D41] transition bg-gray-50"
              placeholder="120"
            />
            {errors.videoSecond && <p className="text-red-500 text-sm mt-1">{errors.videoSecond}</p>}
          </div>
        </>
      )}

      {Number(form.videoType) === 3 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block mb-1 font-semibold text-gray-700">Agora Session</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={generatingMeeting}
                onClick={async () => {
                  try {
                    setGeneratingMeeting(true);
                    const topic = form.title_english || "Detoxpathy Session Meeting";
                    const result = await generateAgoraSessionApi(topic);
                    if (result && result.channelName) {
                      setForm((f) => ({
                        ...f,
                        agoraAppId: result.appId || "",
                        agoraChannelName: result.channelName || "",
                        agoraToken: result.token || "",
                        agoraUid: result.uid || "",
                        sessionName: result.sessionName || topic,
                      }));
                      toast.success("Agora session generated successfully!");
                    } else {
                      toast.error("Failed to generate Agora session. Invalid response.");
                    }
                  } catch (err) {
                    const errorMsg = err?.response?.data?.message || err?.response?.data?.error || err.message || "Failed to generate session";
                    toast.error(errorMsg);
                  } finally {
                    setGeneratingMeeting(false);
                  }
                }}
                className={`px-6 py-3 text-white rounded-xl transition duration-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap shadow-md hover:shadow-lg ${
                  generatingMeeting ? "bg-gray-400 cursor-not-allowed" : "bg-[#134D41] hover:bg-[#0f3d33]"
                }`}
              >
                {generatingMeeting ? "Generating..." : "Generate Agora Session"}
              </button>
              {form.agoraChannelName && (
                <span className="text-sm text-emerald-600 font-semibold flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  Agora Session Generated
                </span>
              )}
            </div>
            {errors.agoraChannelName && <p className="text-red-500 text-sm mt-1">{errors.agoraChannelName}</p>}
          </div>

          {form.agoraChannelName && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 border border-gray-200 rounded-2xl">
              <div>
                <label className="block mb-1 font-semibold text-xs text-gray-500 uppercase tracking-wider">Agora App ID</label>
                <input
                  type="text"
                  readOnly
                  value={form.agoraAppId}
                  className="w-full border border-gray-200 rounded-xl p-3 bg-gray-100 cursor-not-allowed focus:outline-none text-gray-700 text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block mb-1 font-semibold text-xs text-gray-500 uppercase tracking-wider">Channel Name</label>
                <input
                  type="text"
                  readOnly
                  value={form.agoraChannelName}
                  className="w-full border border-gray-200 rounded-xl p-3 bg-gray-100 cursor-not-allowed focus:outline-none text-gray-700 text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block mb-1 font-semibold text-xs text-gray-500 uppercase tracking-wider">Token</label>
                <input
                  type="text"
                  readOnly
                  value={form.agoraToken}
                  className="w-full border border-gray-200 rounded-xl p-3 bg-gray-100 cursor-not-allowed focus:outline-none text-gray-700 text-sm font-semibold truncate"
                />
              </div>
              <div>
                <label className="block mb-1 font-semibold text-xs text-gray-500 uppercase tracking-wider">UID</label>
                <input
                  type="text"
                  readOnly
                  value={form.agoraUid}
                  className="w-full border border-gray-200 rounded-xl p-3 bg-gray-100 cursor-not-allowed focus:outline-none text-gray-700 text-sm font-semibold"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {Number(form.thumbnailType) === 1 ? (
        <MultiLanguageInput
          key="thumbnail-files"
          label="Thumbnail Files"
          icon="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          fields={selectedLangs}
          values={{
            thumbnail_english: form.thumbnail_english,
            thumbnail_gujarati: form.thumbnail_gujarati,
            thumbnail_hindi: form.thumbnail_hindi,
          }}
          onChange={(values) => {
            setForm((f) => ({
              ...f,
              thumbnail_english: values.thumbnail_english,
              thumbnail_gujarati: values.thumbnail_gujarati,
              thumbnail_hindi: values.thumbnail_hindi,
            }));
          }}
          errors={errors}
          type="file"
          accept="image/*"
          showCopyCheckbox={false}
        />
      ) : (
        <MultiLanguageInput
          key="thumbnail-urls"
          label="Thumbnail URLs"
          icon="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          fields={selectedLangs}
          values={{
            thumbnail_english_url: form.thumbnail_english_url || "",
            thumbnail_gujarati_url: form.thumbnail_gujarati_url || "",
            thumbnail_hindi_url: form.thumbnail_hindi_url || "",
          }}
          onChange={(values) => {
            setForm((f) => ({
              ...f,
              thumbnail_english_url: values.thumbnail_english_url || "",
              thumbnail_gujarati_url: values.thumbnail_gujarati_url || "",
              thumbnail_hindi_url: values.thumbnail_hindi_url || "",
            }));
          }}
          errors={errors}
          type="text"
          showCopyCheckbox={false}
        />
      )}

      {Number(form.videoType) !== 3 && (
        <>
          <div>
            <label className="block mb-1 font-semibold text-gray-700">Type</label>
            <Dropdown
              options={typeOptions}
              value={form.type}
              onChange={(v) =>
                setForm((f) => ({
                  ...f,
                  type: v,
                  day: "",
                  category: "",
                  plan: "",
                }))
              }
              disabled={Boolean(initialValues)}
            />
          </div>

          {shouldShowCategory && (
            <div>
              <Dropdown
                label="Category"
                options={filteredCategories.map((c) => ({
                  label: c.categoryTitle,
                  value: c._id,
                }))}
                value={form.category}
                onChange={(val) => setForm((f) => ({ ...f, category: val }))}
              />
              {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
            </div>
          )}

          {shouldShowPlan && (
            <div>
              <Dropdown
                label="Plan"
                options={plans.map((p) => ({
                  label: p.name,
                  value: p._id,
                }))}
                value={form.plan}
                onChange={(val) => setForm((f) => ({ ...f, plan: val }))}
              />
              {errors.plan && <p className="text-red-500 text-sm mt-1">{errors.plan}</p>}
            </div>
          )}

          {Number(form.type) === 1 && (
            <div>
              <label className="block mb-1 font-semibold text-gray-700">Day</label>
              <input
                type="text"
                value={form.day}
                onChange={(e) => setForm((f) => ({ ...f, day: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-4 focus:ring-[#134D41]/5 focus:border-[#134D41] transition bg-gray-50"
                placeholder="1"
              />
              {errors.day && <p className="text-red-500 text-sm mt-1">{errors.day}</p>}
            </div>
          )}

          <div>
            <label className="block mb-1 font-semibold text-gray-700">Correct Answer Count</label>
            <input
              type="text"
              value={form.requiredCorrectAnswer}
              onChange={(e) => setForm((f) => ({ ...f, requiredCorrectAnswer: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-4 focus:ring-[#134D41]/5 focus:border-[#134D41] transition bg-gray-50"
              placeholder="e.g. 8"
            />
            {errors.requiredCorrectAnswer && <p className="text-red-500 text-sm mt-1">{errors.requiredCorrectAnswer}</p>}
          </div>
        </>
      )}

      <MultiLanguageInput
        label="Video Description"
        icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        fields={selectedLangs}
        values={{
          description_english: form.description_english,
          description_gujarati: form.description_gujarati,
          description_hindi: form.description_hindi,
        }}
        onChange={(values) => {
          setForm((f) => ({
            ...f,
            description_english: values.description_english,
            description_gujarati: values.description_gujarati,
            description_hindi: values.description_hindi,
          }));
        }}
        errors={errors}
        type="textarea"
        rows={3}
        showCopyCheckbox={false}
      />

      <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-all duration-300 font-black text-xs uppercase tracking-widest"
        >
          Cancel
        </button>
        <TimeButton loading={loading} type="submit" className="px-8 py-3">
          {submitLabel}
        </TimeButton>
      </div>
    </form>
  );
};

export default VideoForm;
