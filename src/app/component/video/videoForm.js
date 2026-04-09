"use client";
import React, { useEffect, useMemo, useState } from "react";
import TimeButton from "@/utils/timebutton";
import toast from "react-hot-toast";
import { validateForm } from "@/utils/validation";
import Dropdown from "@/utils/dropdown";
import { getAllCategoriesApi } from "@/Api/AllApi";
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
    type: 1, // 1..5
    day: "",
    category: [],
  });
  const [errors, setErrors] = useState({});
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (initialValues) {
      setForm((prev) => ({
        ...prev,
        // Multi-language titles
        title_english:
          initialValues.titleMultiLang?.english ??
          initialValues.title?.english ??
          "",
        title_gujarati:
          initialValues.titleMultiLang?.gujarati ??
          initialValues.title?.gujarati ??
          "",
        title_hindi:
          initialValues.titleMultiLang?.hindi ??
          initialValues.title?.hindi ??
          "",
        // Video settings
        videoType: initialValues.videoType ?? 1,
        video_english: null,
        video_gujarati: null,
        video_hindi: null,
        video_english_url:
          initialValues.videoType === 2
            ? initialValues.videoMultiLang?.english ??
              initialValues.video?.english ??
              ""
            : "",
        video_gujarati_url:
          initialValues.videoType === 2
            ? initialValues.videoMultiLang?.gujarati ??
              initialValues.video?.gujarati ??
              ""
            : "",
        video_hindi_url:
          initialValues.videoType === 2
            ? initialValues.videoMultiLang?.hindi ??
              initialValues.video?.hindi ??
              ""
            : "",
        videoSecond:
          initialValues.videoType === 2 ? initialValues.videoSec ?? "" : "",
        // Thumbnail settings
        thumbnailType: initialValues.thumbnailType ?? 1,
        thumbnail_english: null,
        thumbnail_gujarati: null,
        thumbnail_hindi: null,
        thumbnail_english_url:
          initialValues.thumbnailType === 2
            ? initialValues.thumbnailMultiLang?.english ??
              initialValues.thumbnail?.english ??
              ""
            : "",
        thumbnail_gujarati_url:
          initialValues.thumbnailType === 2
            ? initialValues.thumbnailMultiLang?.gujarati ??
              initialValues.thumbnail?.gujarati ??
              ""
            : "",
        thumbnail_hindi_url:
          initialValues.thumbnailType === 2
            ? initialValues.thumbnailMultiLang?.hindi ??
              initialValues.thumbnail?.hindi ??
              ""
            : "",
        // Multi-language descriptions
        description_english:
          initialValues.descriptionMultiLang?.english ??
          initialValues.description?.english ??
          "",
        description_gujarati:
          initialValues.descriptionMultiLang?.gujarati ??
          initialValues.description?.gujarati ??
          "",
        description_hindi:
          initialValues.descriptionMultiLang?.hindi ??
          initialValues.description?.hindi ??
          "",
        // Other fields
        type: initialValues.type ?? 1,
        day: initialValues.type === 1 ? initialValues.day ?? "" : "",
        category: Array.isArray(initialValues.category)
          ? initialValues.category
          : [],
      }));
      setErrors({});
    } else {
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
        category: [],
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
    const videoTypeNum = Number(form.videoType);
    const thumbTypeNum = Number(form.thumbnailType);
    const typeNum = Number(form.type);

    let errs = validateForm({
      // Multi-language title validation
      title_english: {
        value: form.title_english,
        rules: [required("English Title")],
      },
      title_gujarati: {
        value: form.title_gujarati,
        rules: [required("Gujarati Title")],
      },
      title_hindi: {
        value: form.title_hindi,
        rules: [required("Hindi Title")],
      },

      // Video validation
      video_english_url: {
        value: videoTypeNum === 2 ? form.video_english_url : "ok",
        rules: [required("English Video URL")],
      },
      video_gujarati_url: {
        value: videoTypeNum === 2 ? form.video_gujarati_url : "ok",
        rules: [required("Gujarati Video URL")],
      },
      video_hindi_url: {
        value: videoTypeNum === 2 ? form.video_hindi_url : "ok",
        rules: [required("Hindi Video URL")],
      },
      video_english: {
        value: videoTypeNum === 1 ? form.video_english : "ok",
        rules: [required("English Video file")],
      },
      video_gujarati: {
        value: videoTypeNum === 1 ? form.video_gujarati : "ok",
        rules: [required("Gujarati Video file")],
      },
      video_hindi: {
        value: videoTypeNum === 1 ? form.video_hindi : "ok",
        rules: [required("Hindi Video file")],
      },
      videoSecond: {
        value: videoTypeNum === 2 ? form.videoSecond : "ok",
        rules: [required("Video seconds"), numberRule("Video seconds")],
      },

      // Thumbnail validation
      thumbnail_english_url: {
        value: thumbTypeNum === 2 ? form.thumbnail_english_url : "ok",
        rules: [required("English Thumbnail URL")],
      },
      thumbnail_gujarati_url: {
        value: thumbTypeNum === 2 ? form.thumbnail_gujarati_url : "ok",
        rules: [required("Gujarati Thumbnail URL")],
      },
      thumbnail_hindi_url: {
        value: thumbTypeNum === 2 ? form.thumbnail_hindi_url : "ok",
        rules: [required("Hindi Thumbnail URL")],
      },
      thumbnail_english: {
        value: thumbTypeNum === 1 ? form.thumbnail_english : "ok",
        rules: [required("English Thumbnail file")],
      },
      thumbnail_gujarati: {
        value: thumbTypeNum === 1 ? form.thumbnail_gujarati : "ok",
        rules: [required("Gujarati Thumbnail file")],
      },
      thumbnail_hindi: {
        value: thumbTypeNum === 1 ? form.thumbnail_hindi : "ok",
        rules: [required("Hindi Thumbnail file")],
      },

      // Other validations
      type: { value: typeNum, rules: [required("Type")] },
      day: {
        value: typeNum === 1 ? form.day : "ok",
        rules: [required("Day"), numberRule("Day")],
      },
      category: {
        value: typeNum === 4 ? (form.category?.length ? "ok" : "") : "ok",
        rules: [required("Category")],
      },
    });
    // Allow day 0 as valid; remove previous restriction

    setErrors(errs);
    if (Object.keys(errs).length) {
      // help debugging which field is blocking submit
      const firstKey = Object.keys(errs)[0];
      console.warn("Video form validation errors:", errs);
      toast.error(errs[firstKey]);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // quick signal that handler is wired
    // remove later if noisy
    console.log("videoForm.handleSubmit invoked");
    if (!validate()) return;
    await onSubmit({
      ...form,
      videoSecond: form.videoSecond ? Number(form.videoSecond) : undefined,
      day: form.day ? Number(form.day) : undefined,
    });
  };

  const typeOptions = [
    { label: "Day wise", value: 1 },
    { label: "Webinar/Live", value: 2 },
    { label: "Testimonial", value: 3 },
    { label: "Categoywise Testimonial", value: 4 },
    { label: "Resume Plan", value: 5 },
    { label: "Trial Video", value: 6 },
    { label: "Body Detoxification", value: 7 },
  ];

  const videoTypeOptions = [
    { label: "Upload File", value: 1 },
    { label: "Video URL", value: 2 },
  ];

  const thumbTypeOptions = [
    { label: "Upload File", value: 1 },
    { label: "Thumbnail URL", value: 2 },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Multi-language Title Section */}
      <MultiLanguageInput
        label="Video Title"
        icon="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h3a1 1 0 110 2h-1v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6H4a1 1 0 110-2h3zM9 6v10h6V6H9z"
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

      {/* Multi-language Video Section - match title UI */}
      {Number(form.videoType) === 1 ? (
        <MultiLanguageInput
          key="video-files"
          label="Video Files"
          icon="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
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
        />
      ) : (
        <>
          <MultiLanguageInput
            key="video-urls"
            label="Video URLs"
            icon="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
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
            placeholder={{
              english: "https://...",
              gujarati: "https://...",
              hindi: "https://...",
            }}
          />
          <div className="max-w-xs">
            <label className="block mb-1 font-semibold text-gray-700">
              Video Duration (Seconds)
            </label>
            <input
              type="text"
              value={form.videoSecond || ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, videoSecond: e.target.value }))
              }
              className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
              placeholder="120"
            />
            {errors.videoSecond && (
              <p className="text-amber-600 text-sm mt-1">
                {errors.videoSecond}
              </p>
            )}
          </div>
        </>
      )}

      {/* Multi-language Thumbnail Section - match title UI */}
      {Number(form.thumbnailType) === 1 ? (
        <MultiLanguageInput
          key="thumbnail-files"
          label="Thumbnail Files"
          icon="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
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
        />
      ) : (
        <MultiLanguageInput
          key="thumbnail-urls"
          label="Thumbnail URLs"
          icon="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
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
          placeholder={{
            english: "https://...",
            gujarati: "https://...",
            hindi: "https://...",
          }}
        />
      )}

      <div>
        <label className="block mb-1 font-semibold text-gray-700">Type</label>
        <Dropdown
          options={typeOptions}
          value={form.type}
          onChange={(v) => setForm((f) => ({ ...f, type: v, day: "" }))}
          disabled={Boolean(initialValues)}
        />
      </div>

      {Number(form.type) === 1 && (
        <div>
          <label className="block mb-1 font-semibold text-gray-700">Day</label>
          <input
            type="text"
            value={form.day}
            onChange={(e) => setForm((f) => ({ ...f, day: e.target.value }))}
            className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
            placeholder="1"
          />
          {errors.day && (
            <p className="text-amber-600 text-sm mt-1">{errors.day}</p>
          )}
        </div>
      )}

      {Number(form.type) === 4 && (
        <div>
          <Dropdown
            label="Category"
            options={categories.map((c) => ({
              label: c.categoryTitle,
              value: c._id,
            }))}
            value={form.category}
            onChange={(val) => setForm((f) => ({ ...f, category: val }))}
            placeholder="Select category"
          />
          {errors.category && (
            <p className="text-amber-600 text-sm mt-1">{errors.category}</p>
          )}
        </div>
      )}

      {/* Multi-language Description Section */}
      <MultiLanguageInput
        label="Video Description"
        icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
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
        sectionClassName="from-amber-50 to-yellow-50 border-amber-200"
      />

      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2 bg-gray-200 hover:bg-gray-300 rounded-xl transition font-semibold"
        >
          Cancel
        </button>
        <TimeButton loading={loading} type="submit">
          {submitLabel}
        </TimeButton>
      </div>
    </form>
  );
};

export default VideoForm;
