"use client";
import React, { useEffect, useMemo, useState } from "react";
import TimeButton from "@/utils/timebutton";
import toast from "react-hot-toast";
import { validateForm } from "@/utils/validation";
import Dropdown from "@/utils/dropdown";
import { getAllCategoriesApi, getAllPlans } from "@/Api/AllApi";
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
  });
  const [errors, setErrors] = useState({});
  const [categories, setCategories] = useState([]);
  const [plans, setPlans] = useState([]);

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
        category:
          typeof initialValues.category === "string"
            ? initialValues.category
            : initialValues.category?._id ?? "",
        plan:
          typeof initialValues.plan === "string"
            ? initialValues.plan
            : initialValues.plan?._id ?? "",
        requiredCorrectAnswer: initialValues.requiredCorrectAnswer ?? "",
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
        category: "",
        plan: "",
        requiredCorrectAnswer: "",
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

    let errs = validateForm({
      title_english: {
        value: form.title_english,
        rules: isUpdate ? [] : [required("English Title")],
      },
      title_gujarati: {
        value: form.title_gujarati,
        rules: isUpdate ? [] : [required("Gujarati Title")],
      },
      title_hindi: {
        value: form.title_hindi,
        rules: isUpdate ? [] : [required("Hindi Title")],
      },
      video_english_url: {
        value: videoTypeNum === 2 ? form.video_english_url : "ok",
        rules: isUpdate ? [] : [required("English Video URL")],
      },
      video_gujarati_url: {
        value: videoTypeNum === 2 ? form.video_gujarati_url : "ok",
        rules: isUpdate ? [] : [required("Gujarati Video URL")],
      },
      video_hindi_url: {
        value: videoTypeNum === 2 ? form.video_hindi_url : "ok",
        rules: isUpdate ? [] : [required("Hindi Video URL")],
      },
      video_english: {
        value: videoTypeNum === 1 ? form.video_english : "ok",
        rules: isUpdate ? [] : [required("English Video file")],
      },
      video_gujarati: {
        value: videoTypeNum === 1 ? form.video_gujarati : "ok",
        rules: isUpdate ? [] : [required("Gujarati Video file")],
      },
      video_hindi: {
        value: videoTypeNum === 1 ? form.video_hindi : "ok",
        rules: isUpdate ? [] : [required("Hindi Video file")],
      },
      videoSecond: {
        value: videoTypeNum === 2 ? form.videoSecond : "ok",
        rules: isUpdate ? [numberRule("Video seconds")] : [required("Video seconds"), numberRule("Video seconds")],
      },
      thumbnail_english_url: {
        value: thumbTypeNum === 2 ? form.thumbnail_english_url : "ok",
        rules: isUpdate ? [] : [required("English Thumbnail URL")],
      },
      thumbnail_gujarati_url: {
        value: thumbTypeNum === 2 ? form.thumbnail_gujarati_url : "ok",
        rules: isUpdate ? [] : [required("Gujarati Thumbnail URL")],
      },
      thumbnail_hindi_url: {
        value: thumbTypeNum === 2 ? form.thumbnail_hindi_url : "ok",
        rules: isUpdate ? [] : [required("Hindi Thumbnail URL")],
      },
      thumbnail_english: {
        value: thumbTypeNum === 1 ? form.thumbnail_english : "ok",
        rules: isUpdate ? [] : [required("English Thumbnail file")],
      },
      thumbnail_gujarati: {
        value: thumbTypeNum === 1 ? form.thumbnail_gujarati : "ok",
        rules: isUpdate ? [] : [required("Gujarati Thumbnail file")],
      },
      thumbnail_hindi: {
        value: thumbTypeNum === 1 ? form.thumbnail_hindi : "ok",
        rules: isUpdate ? [] : [required("Hindi Thumbnail file")],
      },
      type: { value: typeNum, rules: [required("Type")] },
      day: {
        value: typeNum === 1 ? form.day : "ok",
        rules: isUpdate ? [numberRule("Day")] : [required("Day"), numberRule("Day")],
      },
      category: {
        value: [2, 4].includes(typeNum) ? (form.category ? "ok" : "") : "ok",
        rules: isUpdate ? [] : [required("Category")],
      },
      plan: {
        value: typeNum === 8 ? (form.plan ? "ok" : "") : "ok",
        rules: [required("Plan")],
      },
      requiredCorrectAnswer: {
        value: form.requiredCorrectAnswer,
        rules: isUpdate ? [numberRule("Required Correct Answer")] : [required("Required Correct Answer"), numberRule("Required Correct Answer")],
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
    await onSubmit({
      ...form,
      videoSecond: form.videoSecond ? Number(form.videoSecond) : undefined,
      day: form.day ? Number(form.day) : undefined,
      plan: Number(form.type) === 8 ? form.plan : undefined,
      requiredCorrectAnswer: form.requiredCorrectAnswer ? Number(form.requiredCorrectAnswer) : 0,
    });
  };

  const typeOptions = [
    { label: "Day wise", value: 1 },
    { label: "Session Categories", value: 2 },
    { label: "Categoywise Testimonial", value: 4 },
    { label: "Resume Plan", value: 5 },
    { label: "Trial Video", value: 6 },
    { label: "Body Detoxification", value: 7 },
    { label: "Instruction", value: 8 },
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
          />
          <div className="max-w-xs">
            <label className="block mb-1 font-semibold text-gray-700">Video Duration (Seconds)</label>
            <input
              type="text"
              value={form.videoSecond || ""}
              onChange={(e) => setForm((f) => ({ ...f, videoSecond: e.target.value }))}
              className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
              placeholder="120"
            />
            {errors.videoSecond && <p className="text-amber-600 text-sm mt-1">{errors.videoSecond}</p>}
          </div>
        </>
      )}

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
        />
      )}

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
          {errors.category && <p className="text-amber-600 text-sm mt-1">{errors.category}</p>}
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
          {errors.plan && <p className="text-amber-600 text-sm mt-1">{errors.plan}</p>}
        </div>
      )}

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
          {errors.day && <p className="text-amber-600 text-sm mt-1">{errors.day}</p>}
        </div>
      )}

      <div>
        <label className="block mb-1 font-semibold text-gray-700">Required Correct Answer Count</label>
        <input
          type="text"
          value={form.requiredCorrectAnswer}
          onChange={(e) => setForm((f) => ({ ...f, requiredCorrectAnswer: e.target.value }))}
          className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
          placeholder="e.g. 8"
        />
        {errors.requiredCorrectAnswer && <p className="text-amber-600 text-sm mt-1">{errors.requiredCorrectAnswer}</p>}
      </div>

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
