"use client";
import React, { useState } from "react";
import Loader from "@/utils/loader";
import NotFoundCard from "@/components/NotFoundCard";
import { ActionButton } from "@/utils/actionbutton";

const QuestionTable = ({
  items,
  loading,
  onEdit,
  onDelete,
  questionType,
  selectedVideoId,
  selectedLanguage = "english", // Default to english if not provided
}) => {
  const [expandedCards, setExpandedCards] = useState({});
  const toggleCard = (cardId) => {
    setExpandedCards((prev) => ({
      ...prev,
      [cardId]: !prev[cardId],
    }));
  };

  const handleDeleteClick = (itemId, itemName) => {
    onDelete(itemId);
  };
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader />
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8 text-center">
        <NotFoundCard
          title="No Questions"
          subtitle={
            questionType === "video"
              ? "Create questions for the selected video to get started."
              : "Create daily questions to get started."
          }
        />
      </div>
    );
  }

  // Helper: resolve a multi-lang text object to a string for a given language
  const getTextInLanguage = (multiLangObj, language = "english") => {
    if (!multiLangObj) return "";
    if (typeof multiLangObj === "string") return multiLangObj;
    if (typeof multiLangObj === "object" && !Array.isArray(multiLangObj)) {
      const result = multiLangObj[language] ?? multiLangObj.english ?? "";
      // If the resolved value is itself an object (e.g. options { a,b,c,d }), don't return it raw
      if (typeof result === "object") return "";
      return Array.isArray(result) ? result.join(", ") : String(result);
    }
    return "";
  };

  // Helper: render options object { a, b, c, d } as labeled rows
  const renderOptions = (optionsObj) => {
    if (!optionsObj || typeof optionsObj !== "object") return null;
    return ["a", "b", "c", "d"].map((key) => (
      <div key={key} className="flex items-start gap-2 text-sm">
        <span className="font-bold text-amber-600 w-5 shrink-0">{key.toUpperCase()}.</span>
        <span className="text-gray-800">{optionsObj[key] || "—"}</span>
      </div>
    ));
  };

  return (
    <div className="space-y-6">
      {/* Question Cards */}
      {items.map((question) => (
        <div
          key={question._id}
          className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300"
        >
          {/* Question Header */}
          <div className="bg-gradient-to-r from-yellow-400 to-amber-300 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <svg
                    className="w-7 h-7 text-yellow-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    Question Details
                  </h3>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                      <span className="font-medium">
                        {questionType === "video"
                          ? "Video Question"
                          : "Daily Question"}
                      </span>
                    </div>
                    {question.section && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                        <span className="font-medium capitalize">
                          {question.section} Section
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ActionButton type="edit" onClick={() => onEdit(question)} />
                <ActionButton
                  type="delete"
                  onClick={() =>
                    handleDeleteClick(
                      question._id,
                      question.question_english ||
                      question.question ||
                      "Question"
                    )
                  }
                />
                <button
                  onClick={() => toggleCard(question._id)}
                  className={`bg-gradient-to-tr from-gray-100 to-gray-50 hover:from-yellow-50 hover:to-yellow-50 
                             text-yellow-600 rounded-full w-10 h-10 inline-flex items-center justify-center 
                             shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}
                  title={
                    expandedCards[question._id]
                      ? "Hide Details"
                      : "Show Details"
                  }
                >
                  <svg
                    className={`w-5 h-5 transition-transform duration-300 ${expandedCards[question._id] ? "rotate-180" : ""
                      }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Multi-Language Content */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedCards[question._id]
                ? "max-h-[2000px] opacity-100"
                : "max-h-0 opacity-0"
              }`}
          >
            <div className="p-6 space-y-6">
              {/* Question Text Row */}
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-5 border border-yellow-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-md">
                    <span className="text-sm font-bold text-white">Q</span>
                  </div>
                  <h4 className="text-lg font-bold text-gray-800">
                    Question Text
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* English Question */}
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-2">
                      English
                    </p>
                    <p className="text-sm text-gray-800 bg-white p-3 rounded-lg border border-yellow-200 h-24 overflow-y-auto">
                      {getTextInLanguage(
                        question.questionTextMultiLang || question.questionText,
                        "english"
                      )}
                    </p>
                  </div>

                  {/* Gujarati Question */}
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-2">
                      Gujarati
                    </p>
                    <p className="text-sm text-gray-800 bg-white p-3 rounded-lg border border-yellow-200 h-24 overflow-y-auto">
                      {getTextInLanguage(
                        question.questionTextMultiLang || question.questionText,
                        "gujarati"
                      )}
                    </p>
                  </div>

                  {/* Hindi Question */}
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-2">
                      Hindi
                    </p>
                    <p className="text-sm text-gray-800 bg-white p-3 rounded-lg border border-yellow-200 h-24 overflow-y-auto">
                      {getTextInLanguage(
                        question.questionTextMultiLang || question.questionText,
                        "hindi"
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Correct Answer + Options — only for video questions */}
              {questionType === "video" && (
                <>
                  {/* Correct Answer: now a single key (a/b/c/d) */}
                  <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-5 border border-amber-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center shadow-md">
                        <span className="text-sm font-bold text-white">A</span>
                      </div>
                      <h4 className="text-lg font-bold text-gray-800">Correct Answer</h4>
                    </div>
                    <div className="flex items-center gap-3">
                      {["a", "b", "c", "d"].map((key) => (
                        <div
                          key={key}
                          className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg border-2 transition-all
                            ${question.correctAnswer === key
                              ? "bg-gradient-to-br from-yellow-400 to-amber-500 border-amber-500 text-white shadow-md shadow-yellow-200"
                              : "bg-white border-amber-200 text-gray-400"}`}
                        >
                          {key.toUpperCase()}
                        </div>
                      ))}
                      <span className="text-sm text-gray-500 ml-2">
                        Option <strong className="text-amber-600">{(question.correctAnswer || "").toUpperCase()}</strong> is correct
                      </span>
                    </div>
                  </div>

                  {/* Options: { english: {a,b,c,d}, gujarati: {...}, hindi: {...} } */}
                  <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-5 border border-yellow-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-md">
                        <span className="text-sm font-bold text-white">O</span>
                      </div>
                      <h4 className="text-lg font-bold text-gray-800">Options</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {["english", "gujarati", "hindi"].map((lang) => {
                        const rawOptions = question.optionsMultiLang || question.options;
                        const langOptions = rawOptions?.[lang] || {};
                        return (
                          <div key={lang}>
                            <p className="text-xs font-semibold text-gray-600 mb-2 capitalize">{lang}</p>
                            <div className="bg-white p-3 rounded-lg border border-yellow-200 space-y-1 min-h-[6rem]">
                              {renderOptions(langOptions)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default QuestionTable;
