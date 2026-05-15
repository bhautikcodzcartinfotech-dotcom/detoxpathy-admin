"use client";
import React, { useState, useEffect } from "react";
import TimeButton from "@/utils/timebutton";
import Dropdown from "@/utils/dropdown";
import MultiLanguageInput from "@/components/MultiLanguageInput";

const LANGS = ["english", "gujarati", "hindi"];
const OPTION_KEYS = ["a", "b", "c", "d"];

const emptyOptions = () =>
  LANGS.reduce((acc, lang) => {
    acc[lang] = { a: "", b: "", c: "", d: "" };
    return acc;
  }, {});

// Detect how many consecutive options are filled (based on english lang)
const detectOptionCount = (options) => {
  const eng = options?.english || {};
  if (eng.d?.trim()) return 4;
  if (eng.c?.trim()) return 3;
  if (eng.b?.trim()) return 2;
  return 1;
};

const QuestionForm = ({
  onSubmit,
  onClose,
  editing,
  questionType,
  videos = [],
  selectedVideoId,
  loading = false,
}) => {
  const [form, setForm] = useState({
    questionText_english: "",
    questionText_gujarati: "",
    questionText_hindi: "",
    correctAnswer: "a",
    options: emptyOptions(),
    section: "first",
    videoId: selectedVideoId || "",
  });

  const [errors, setErrors] = useState({});
  const [optionCount, setOptionCount] = useState(4); // 1 = A only, 2 = A+B, 3 = A+B+C, 4 = A+B+C+D

  // ─── Populate form on edit ──────────────────────────────────────────────────
  useEffect(() => {
    if (editing) {
      // Options from backend: { english: { a, b, c, d }, gujarati: {...}, hindi: {...} }
      const rawOptions =
        editing.optionsMultiLang || editing.options || emptyOptions();

      const parsedOptions = LANGS.reduce((acc, lang) => {
        const src = rawOptions[lang] || {};
        acc[lang] = {
          a: src.a || "",
          b: src.b || "",
          c: src.c || "",
          d: src.d || "",
        };
        return acc;
      }, {});

      // Restore option count from saved data
      setOptionCount(detectOptionCount(parsedOptions));

      setForm({
        questionText_english:
          editing.questionTextMultiLang?.english ||
          editing.questionText?.english ||
          "",
        questionText_gujarati:
          editing.questionTextMultiLang?.gujarati ||
          editing.questionText?.gujarati ||
          "",
        questionText_hindi:
          editing.questionTextMultiLang?.hindi ||
          editing.questionText?.hindi ||
          "",
        correctAnswer: editing.correctAnswer || "a",
        options: parsedOptions,
        section: editing.section || "first",
        videoId:
          editing.videoId?._id || editing.videoId || selectedVideoId || "",
      });
    } else {
      setForm((prev) => {
        return {
          ...prev,
          videoId: selectedVideoId || prev.videoId,
        };
      });
    }
  }, [editing, selectedVideoId, videos]);

  // ─── Validation ─────────────────────────────────────────────────────────────
  const validateForm = () => {
    const newErrors = {};

    if (!form.questionText_english.trim())
      newErrors.questionText_english = "English question text is required";
    if (!form.questionText_gujarati.trim())
      newErrors.questionText_gujarati = "Gujarati question text is required";
    if (!form.questionText_hindi.trim())
      newErrors.questionText_hindi = "Hindi question text is required";

    if (questionType === "video") {
      const activeKeys = OPTION_KEYS.slice(0, optionCount);
      for (const lang of LANGS) {
        for (const key of activeKeys) {
          if (!form.options[lang]?.[key]?.trim()) {
            newErrors[`options_${lang}_${key}`] = `${lang} option ${key.toUpperCase()} is required`;
          }
        }
      }
      if (!form.correctAnswer || !activeKeys.includes(form.correctAnswer)) {
        newErrors.correctAnswer = "Please select the correct answer";
      }
      if (!form.videoId) {
        newErrors.videoId = "Please select a video";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ─── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (questionType === "daily") {
      onSubmit({
        questionText_english: form.questionText_english,
        questionText_gujarati: form.questionText_gujarati,
        questionText_hindi: form.questionText_hindi,
        section: form.section,
      });
    } else {
      // Build flat option keys only for active options
      const activeKeys = OPTION_KEYS.slice(0, optionCount);
      const optionFields = {};
      for (const lang of LANGS) {
        for (const key of OPTION_KEYS) {
          // Send value for active keys, empty string for inactive ones
          optionFields[`options_${lang}_${key}`] = activeKeys.includes(key)
            ? form.options[lang][key].trim()
            : "";
        }
      }
      onSubmit({
        questionText_english: form.questionText_english,
        questionText_gujarati: form.questionText_gujarati,
        questionText_hindi: form.questionText_hindi,
        correctAnswer: form.correctAnswer,
        videoId: form.videoId,
        ...optionFields,
      });
    }
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────────


  // ─── Dropdown data ───────────────────────────────────────────────────────────
  const videoOptions = videos.map((v) => ({
    value: v._id,
    label: v.titleMultiLang?.english || v.title || "Untitled Video",
  }));

  const sectionOptions = [
    { value: "first", label: "First Section" },
    { value: "second", label: "Second Section" },
  ];

  const LANG_LABELS = { english: "🇬🇧 English", gujarati: "🇮🇳 Gujarati", hindi: "🇮🇳 Hindi" };

  return (
    <div className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Video Selection ── */}
        {questionType === "video" && (
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-4 rounded-xl border border-yellow-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Video Selection
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Dropdown
                  label="Select Video"
                  options={videoOptions}
                  value={form.videoId}
                  onChange={(value) => {
                    setForm((p) => ({ 
                      ...p, 
                      videoId: value
                    }));
                  }}
                />
                {errors.videoId && (
                  <p className="text-amber-600 text-sm mt-1">{errors.videoId}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Section Selection (daily) ── */}
        {questionType === "daily" && (
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-4 rounded-xl border border-amber-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Daily Question Section
            </h3>
            <Dropdown
              label="Section"
              options={sectionOptions}
              value={form.section}
              onChange={(value) => setForm((p) => ({ ...p, section: value }))}
            />
          </div>
        )}

        {/* ── Question Text ── */}
        <MultiLanguageInput
          label="Question Text"
          icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          values={{
            questionText_english: form.questionText_english,
            questionText_gujarati: form.questionText_gujarati,
            questionText_hindi: form.questionText_hindi,
          }}
          onChange={(values) =>
            setForm((f) => ({
              ...f,
              questionText_english: values.questionText_english,
              questionText_gujarati: values.questionText_gujarati,
              questionText_hindi: values.questionText_hindi,
            }))
          }
          errors={errors}
          type="textarea"
          rows={3}
          sectionClassName=""
        />

        {/* ── Options + Correct Answer (video questions only) ── */}
        {questionType === "video" && (
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-4 rounded-xl border border-amber-200 space-y-5">

            {/* Header row */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Answer Options
              </h3>
            </div>

            {/* ── Number of Options Selector ── */}
            <div className="bg-white rounded-xl border border-yellow-200 p-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-700 mb-3">
                Number of Options
                <span className="ml-2 text-xs font-normal text-gray-400">(how many choices to provide?)</span>
              </p>
              <div className="flex gap-3">
                {[
                  { count: 1, label: "A only" },
                  { count: 2, label: "A – B" },
                  { count: 3, label: "A – C" },
                  { count: 4, label: "A – D" },
                ].map(({ count, label }) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => {
                      setOptionCount(count);
                      // If current correctAnswer is beyond new count, reset it
                      const newActiveKey = OPTION_KEYS[count - 1];
                      if (OPTION_KEYS.indexOf(form.correctAnswer) >= count) {
                        setForm((p) => ({ ...p, correctAnswer: "a" }));
                      }
                    }}
                    className={`flex-1 py-2 px-3 rounded-lg border-2 font-semibold text-sm transition-all duration-150
                      ${optionCount === count
                        ? "border-amber-500 bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-md shadow-yellow-200"
                        : "border-yellow-200 bg-white text-gray-600 hover:border-amber-300 hover:bg-yellow-50"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Correct Answer Picker ── */}
            <div className="bg-white rounded-xl border border-yellow-200 p-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-700 mb-3">
                Correct Answer Key
                <span className="ml-2 text-xs font-normal text-gray-400">(which option is correct?)</span>
              </p>
              <div className="flex gap-3">
                {OPTION_KEYS.slice(0, optionCount).map((key) => (
                  <label
                    key={key}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border-2 cursor-pointer transition-all duration-150 font-semibold text-sm
                      ${form.correctAnswer === key
                        ? "border-amber-500 bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-md shadow-yellow-200"
                        : "border-yellow-200 bg-white text-gray-600 hover:border-amber-300 hover:bg-yellow-50"}`}
                  >
                    <input
                      type="radio"
                      name="correctAnswer"
                      value={key}
                      checked={form.correctAnswer === key}
                      onChange={() => {
                        setForm((p) => ({ ...p, correctAnswer: key }));
                        setErrors((e) => ({ ...e, correctAnswer: "" }));
                      }}
                      className="sr-only"
                    />
                    {key.toUpperCase()}
                  </label>
                ))}
              </div>
              {errors.correctAnswer && (
                <p className="text-amber-600 text-sm mt-2">{errors.correctAnswer}</p>
              )}
            </div>

            {/* ── Per-language option inputs ── */}
            <div className="space-y-4">
              {OPTION_KEYS.slice(0, optionCount).map((key) => (
                <MultiLanguageInput
                  key={key}
                  label={`Option ${key.toUpperCase()}`}
                  icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  values={{
                    english: form.options.english[key],
                    gujarati: form.options.gujarati[key],
                    hindi: form.options.hindi[key],
                  }}
                  onChange={(vals) => {
                    setForm((prev) => ({
                      ...prev,
                      options: {
                        ...prev.options,
                        english: { ...prev.options.english, [key]: vals.english },
                        gujarati: { ...prev.options.gujarati, [key]: vals.gujarati },
                        hindi: { ...prev.options.hindi, [key]: vals.hindi },
                      },
                    }));
                  }}
                  errors={Object.keys(errors).reduce((acc, errKey) => {
                    if (errKey.includes(`options_`) && errKey.endsWith(`_${key}`)) {
                      const lang = errKey.split("_")[1];
                      acc[lang] = errors[errKey];
                    }
                    return acc;
                  }, {})}
                  sectionClassName="!bg-white !p-4 border-yellow-100"
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Form Actions ── */}
        <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 hover:bg-gray-300 rounded-xl transition font-semibold"
          >
            Cancel
          </button>
          <TimeButton loading={loading} type="submit">
            {editing ? "Update Question" : "Create Question"}
          </TimeButton>
        </div>
      </form>
    </div>
  );
};

export default QuestionForm;
