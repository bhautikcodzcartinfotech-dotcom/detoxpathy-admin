"use client";
import React, { useState, useEffect } from "react";
import TimeButton from "@/utils/timebutton";
import Dropdown from "@/utils/dropdown";
import MultiLanguageInput from "@/components/MultiLanguageInput";
// API calls are handled by the parent component

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
    correctAnswer1_english: "",
    correctAnswer2_english: "",
    correctAnswer1_gujarati: "",
    correctAnswer2_gujarati: "",
    correctAnswer1_hindi: "",
    correctAnswer2_hindi: "",
    section: "first",
    videoId: selectedVideoId || "",
  });

  const [errors, setErrors] = useState({});
  const [copyAnswersToAll, setCopyAnswersToAll] = useState(false);

  useEffect(() => {
    if (editing) {
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
        correctAnswer1_english: editing.correctAnswerMultiLang?.english?.[0] || editing.correctAnswer?.english?.[0] || "",
        correctAnswer2_english: editing.correctAnswerMultiLang?.english?.[1] || editing.correctAnswer?.english?.[1] || "",
        correctAnswer1_gujarati: editing.correctAnswerMultiLang?.gujarati?.[0] || editing.correctAnswer?.gujarati?.[0] || "",
        correctAnswer2_gujarati: editing.correctAnswerMultiLang?.gujarati?.[1] || editing.correctAnswer?.gujarati?.[1] || "",
        correctAnswer1_hindi: editing.correctAnswerMultiLang?.hindi?.[0] || editing.correctAnswer?.hindi?.[0] || "",
        correctAnswer2_hindi: editing.correctAnswerMultiLang?.hindi?.[1] || editing.correctAnswer?.hindi?.[1] || "",
        section: editing.section || "first",
        videoId: editing.videoId || selectedVideoId || "",
      });
    } else {
      // For new questions, set the selectedVideoId if available
      setForm((prev) => ({
        ...prev,
        videoId: selectedVideoId || prev.videoId,
      }));
    }
  }, [editing, selectedVideoId]);

  const validateForm = () => {
    const newErrors = {};

    // Validate question text in all languages
    if (!form.questionText_english.trim()) {
      newErrors.questionText_english = "English question text is required";
    }
    if (!form.questionText_gujarati.trim()) {
      newErrors.questionText_gujarati = "Gujarati question text is required";
    }
    if (!form.questionText_hindi.trim()) {
      newErrors.questionText_hindi = "Hindi question text is required";
    }

    // Validate correct answers 1 and 2 only for video questions, not for daily questions
    if (questionType === "video") {
      if (!form.correctAnswer1_english.trim()) {
        newErrors.correctAnswer1_english = "English correct answer 1 is required";
      }
      if (!form.correctAnswer2_english.trim()) {
        newErrors.correctAnswer2_english = "English correct answer 2 is required";
      }
      if (!form.correctAnswer1_gujarati.trim()) {
        newErrors.correctAnswer1_gujarati = "Gujarati correct answer 1 is required";
      }
      if (!form.correctAnswer2_gujarati.trim()) {
        newErrors.correctAnswer2_gujarati = "Gujarati correct answer 2 is required";
      }
      if (!form.correctAnswer1_hindi.trim()) {
        newErrors.correctAnswer1_hindi = "Hindi correct answer 1 is required";
      }
      if (!form.correctAnswer2_hindi.trim()) {
        newErrors.correctAnswer2_hindi = "Hindi correct answer 2 is required";
      }
    }

    // Validate video selection for video questions
    if (questionType === "video" && !form.videoId) {
      newErrors.videoId = "Please select a video";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Prepare form data based on question type
    let formData = { ...form };

    // For daily questions, don't include correct answer fields
    // For video questions, don't include section
    if (questionType === "daily") {
      const {
        correctAnswer1_english, correctAnswer2_english,
        correctAnswer1_gujarati, correctAnswer2_gujarati,
        correctAnswer1_hindi, correctAnswer2_hindi,
        ...dailyFormData
      } = form;
      formData = dailyFormData;
    } else if (questionType === "video") {
      delete formData.section;
      formData.correctAnswer_english = [formData.correctAnswer1_english, formData.correctAnswer2_english].filter(Boolean);
      formData.correctAnswer_gujarati = [formData.correctAnswer1_gujarati, formData.correctAnswer2_gujarati].filter(Boolean);
      formData.correctAnswer_hindi = [formData.correctAnswer1_hindi, formData.correctAnswer2_hindi].filter(Boolean);
      
      delete formData.correctAnswer1_english; delete formData.correctAnswer2_english;
      delete formData.correctAnswer1_gujarati; delete formData.correctAnswer2_gujarati;
      delete formData.correctAnswer1_hindi; delete formData.correctAnswer2_hindi;
    }

    // Just call onSubmit - let the parent handle the API calls
    onSubmit(formData);
  };

  const handleInputChange = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Auto-copy for correct answers if checkbox is checked
      if (copyAnswersToAll && field.endsWith('_english') && field.startsWith('correctAnswer')) {
        const fieldType = field.replace('_english', '');
        next[`${fieldType}_gujarati`] = value;
        next[`${fieldType}_hindi`] = value;
      }
      return next;
    });

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleCopyChange = (e) => {
    const checked = e.target.checked;
    setCopyAnswersToAll(checked);
    if (checked) {
      setForm((prev) => ({
        ...prev,
        correctAnswer1_gujarati: prev.correctAnswer1_english,
        correctAnswer2_gujarati: prev.correctAnswer2_english,
        correctAnswer1_hindi: prev.correctAnswer1_english,
        correctAnswer2_hindi: prev.correctAnswer2_english,
      }));
    }
  };

  // Prepare video options for dropdown
  const videoOptions = videos.map((video) => ({
    value: video._id,
    label: video.titleMultiLang?.english || video.title || "Untitled Video",
  }));

  // Section options for daily questions
  const sectionOptions = [
    { value: "first", label: "First Section" },
    { value: "second", label: "Second Section" },
  ];

  return (
    <div className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Video Selection (only for video questions) */}
        {questionType === "video" && (
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-4 rounded-xl border border-yellow-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-yellow-600"
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
              Video Selection
            </h3>
            <div>
              <Dropdown
                label="Select Video"
                options={videoOptions}
                value={form.videoId}
                onChange={(value) => handleInputChange("videoId", value)}
              />
              {errors.videoId && (
                <p className="text-amber-600 text-sm mt-1">{errors.videoId}</p>
              )}
            </div>
          </div>
        )}

        {/* Section Selection (only for daily questions) */}
        {questionType === "daily" && (
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-4 rounded-xl border border-amber-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-amber-600"
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
              Daily Question Section
            </h3>
            <div>
              <Dropdown
                label="Section"
                options={sectionOptions}
                value={form.section}
                onChange={(value) => handleInputChange("section", value)}
              />
            </div>
          </div>
        )}

        {/* Question Text - Multi-Language */}
        
          <MultiLanguageInput
            label="Question Text"
            icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            values={{
              questionText_english: form.questionText_english,
              questionText_gujarati: form.questionText_gujarati,
              questionText_hindi: form.questionText_hindi,
            }}
            onChange={(values) => {
              setForm((f) => ({
                ...f,
                questionText_english: values.questionText_english,
                questionText_gujarati: values.questionText_gujarati,
                questionText_hindi: values.questionText_hindi,
              }));
            }}
            errors={errors}
            type="textarea"
            rows={3}
            sectionClassName=""
          />

        {/* Correct Answer - Multi-Language (only for video questions) */}
        {questionType === "video" && (
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-4 rounded-xl border border-amber-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Correct Answers
              </h3>

              <label className="flex items-center cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={copyAnswersToAll}
                    onChange={handleCopyChange}
                    className="sr-only"
                  />
                  <div
                    className={`w-6 h-6 rounded-lg border-2 transition-all duration-200 flex items-center justify-center ${
                      copyAnswersToAll
                        ? "bg-gradient-to-br from-yellow-400 to-amber-500 border-yellow-500 shadow-lg shadow-yellow-200"
                        : "bg-white border-yellow-300 group-hover:border-yellow-400 group-hover:shadow-md"
                    }`}
                  >
                    {copyAnswersToAll && (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              </label>
            </div>
            
            <div className="space-y-6">
              {['english', 'gujarati', 'hindi'].map((lang) => {
                const isDisabled = copyAnswersToAll && lang !== 'english';
                return (
                <div key={lang} className="p-4 bg-white rounded-lg border border-yellow-200 shadow-sm">
                  <label className="block text-md font-bold text-gray-700 mb-3 capitalize flex items-center gap-2">
                    {lang}
                    {isDisabled && (
                      <span className="text-xs font-normal bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                        Auto-filled
                      </span>
                    )}
                  </label>
                  <div className="space-y-3">
                    <div>
                      <textarea
                        placeholder={`Enter ${lang} Answer 1`}
                        value={form[`correctAnswer1_${lang}`]}
                        onChange={(e) => handleInputChange(`correctAnswer1_${lang}`, e.target.value)}
                        className={`w-full border rounded-lg p-3 focus:outline-none focus:ring-2 transition ${isDisabled ? 'bg-yellow-50 border-yellow-300 focus:ring-yellow-400' : 'border-yellow-400 focus:ring-yellow-400'}`}
                        rows={2}
                        disabled={isDisabled}
                      />
                      {errors[`correctAnswer1_${lang}`] && (
                        <p className="text-amber-600 text-sm mt-1">{errors[`correctAnswer1_${lang}`]}</p>
                      )}
                    </div>
                    <div>
                      <textarea
                        placeholder={`Enter ${lang} Answer 2`}
                        value={form[`correctAnswer2_${lang}`]}
                        onChange={(e) => handleInputChange(`correctAnswer2_${lang}`, e.target.value)}
                        className={`w-full border rounded-lg p-3 focus:outline-none focus:ring-2 transition ${isDisabled ? 'bg-yellow-50 border-yellow-300 focus:ring-yellow-400' : 'border-yellow-200 bg-yellow-50 focus:ring-yellow-400'}`}
                        rows={2}
                        disabled={isDisabled}
                      />
                      {errors[`correctAnswer2_${lang}`] && (
                        <p className="text-amber-600 text-sm mt-1">{errors[`correctAnswer2_${lang}`]}</p>
                      )}
                    </div>
                  </div>
                </div>
              )})}
            </div>
          </div>
        )}

        {/* Form Actions */}
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
