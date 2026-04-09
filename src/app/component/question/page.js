"use client";
import React, { useState, useEffect } from "react";
import RoleGuard from "@/components/RoleGuard";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import Dropdown from "@/utils/dropdown";
import Drawer from "@/utils/formanimation";
import { Header, Button } from "../../../utils/header";
import QuestionForm from "./questionForm";
import QuestionTable from "./questionTable";
import {
  getAllQuestions,
  listVideos,
  deleteQuestion,
  createQuestionByVideoId,
  createQuestionDaily,
  updateQuestion,
} from "@/Api/AllApi";
import toast from "react-hot-toast";

const QuestionPage = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState([]);
  const [videos, setVideos] = useState([]);
  const [editing, setEditing] = useState(null);
  const [questionType, setQuestionType] = useState("video"); // "video" or "daily"
  const [selectedVideoId, setSelectedVideoId] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("english");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState(null);

  // Fetch videos for dropdown
  const fetchVideos = async () => {
    try {
      const data = await listVideos();
      setVideos(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to fetch videos:", e);
    }
  };

  // Fetch questions based on type
  const fetchQuestions = async () => {
    try {
      setListLoading(true);
      setError("");

      const params = {
        page: 1,
        limit: 100, // Get all questions
      };

      if (questionType === "video") {
        if (!selectedVideoId) {
          setQuestions([]);
          return;
        }
        params.type = 1; // video questions
        params.videoId = selectedVideoId;
        // Only add language filter for video questions
        params.language = selectedLanguage;
      } else {
        params.type = 2; // daily questions
        // For daily questions, don't filter by language by default
        // params.language = selectedLanguage; // Commented out
      }

      const data = await getAllQuestions(params);
      setQuestions(Array.isArray(data?.questions) ? data.questions : []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load questions");
      toast.error(e?.response?.data?.message || "Failed to load questions");
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [questionType, selectedVideoId, selectedLanguage]);

  const handleSubmit = async (formData) => {
    try {
      setLoading(true);

      if (editing) {
        if (questionType === "video") {
          const videoId = formData.videoId || selectedVideoId;
          if (!videoId) {
            toast.error("Please select a video first");
            return;
          }
          formData.videoId = videoId;
        }
        await updateQuestion(editing._id, formData);
        toast.success("Question updated successfully");
      } else {
        if (questionType === "video") {
          // Check if videoId is in formData or selectedVideoId
          const videoId = formData.videoId || selectedVideoId;

          if (!videoId) {
            toast.error("Please select a video first");
            return;
          }
          formData.videoId = videoId;
          await createQuestionByVideoId(formData);
        } else {
          await createQuestionDaily(formData);
        }
        toast.success("Question created successfully");
      }
      setIsOpen(false);
      setEditing(null);
      fetchQuestions();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to create question");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (question) => {
    setEditing(question);
    setIsOpen(true);
  };

  const handleDelete = (questionId) => {
    setQuestionToDelete(questionId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!questionToDelete) return;

    try {
      await deleteQuestion(questionToDelete);
      toast.success("Question deleted successfully");
      fetchQuestions();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to delete question");
    } finally {
      setShowDeleteDialog(false);
      setQuestionToDelete(null);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setEditing(null);
  };

  // Get video title for display
  const getVideoTitle = (videoId) => {
    const video = videos.find((v) => v._id === videoId);
    if (!video) return "Unknown Video";

    // Try to get title in selected language, fallback to English
    if (video.titleMultiLang && typeof video.titleMultiLang === "object") {
      return (
        video.titleMultiLang[selectedLanguage] ||
        video.titleMultiLang.english ||
        video.title
      );
    }
    return video.title || "Unknown Video";
  };

  // Prepare video options for dropdown
  const videoOptions = videos.map((video) => ({
    value: video._id,
    label: getVideoTitle(video._id),
  }));

  // Language options
  const languageOptions = [
    { value: "english", label: "English" },
    { value: "gujarati", label: "Gujarati" },
    { value: "hindi", label: "Hindi" },
  ];

  return (
    <RoleGuard allow={["Admin"]}>
      <div className="w-full h-full px-18">
        <div className="flex items-center justify-between mb-6">
          <Header size="3xl">Question Management</Header>
          <Button onClick={() => setIsOpen(true)}>Create Question</Button>
        </div>

        {/* Question Type Selection */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-2xl p-6 border border-yellow-200 shadow-sm">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
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
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              Question Type
            </h3>
            <div className="flex gap-4">
              <button
                onClick={() => setQuestionType("video")}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                  questionType === "video"
                    ? "bg-gradient-to-r from-yellow-400 to-amber-400 text-white shadow-lg transform scale-105"
                    : "bg-white text-gray-600 hover:bg-yellow-100 hover:text-yellow-700 border border-yellow-200"
                }`}
              >
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
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Video Questions
              </button>
              <button
                onClick={() => setQuestionType("daily")}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                  questionType === "daily"
                    ? "bg-gradient-to-r from-yellow-400 to-amber-400 text-white shadow-lg transform scale-105"
                    : "bg-white text-gray-600 hover:bg-yellow-100 hover:text-yellow-700 border border-yellow-200"
                }`}
              >
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
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Daily Questions
              </button>
            </div>
          </div>
        </div>

        {/* Video Selection (only for video questions) */}
        {questionType === "video" && (
          <div className="mb-6">
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-6 border border-amber-200 shadow-sm">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
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
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                Video Selection
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Dropdown
                    label="Select Video"
                    options={videoOptions}
                    value={selectedVideoId}
                    onChange={setSelectedVideoId}
                  />
                </div>
                <div>
                  <Dropdown
                    label="Display Language"
                    options={languageOptions}
                    value={selectedLanguage}
                    onChange={setSelectedLanguage}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
            {error}
          </div>
        )}

        {/* Questions Table */}
        <QuestionTable
          items={questions}
          loading={listLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          questionType={questionType}
          selectedVideoId={selectedVideoId}
          selectedLanguage={
            questionType === "video" ? selectedLanguage : undefined
          }
        />

        {/* Question Form Drawer */}
        <Drawer isOpen={isOpen} onClose={handleClose}>
          <div className="mb-6 text-center">
            <h2 className="text-3xl font-bold text-yellow-600">
              {editing ? "Update Question" : "Create Question"}
            </h2>
          </div>
          <QuestionForm
            onSubmit={handleSubmit}
            onClose={handleClose}
            editing={editing}
            questionType={questionType}
            videos={videos}
            selectedVideoId={selectedVideoId}
            loading={loading}
          />
        </Drawer>

        {/* Delete Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={confirmDelete}
          title="Delete Question"
          message="Are you sure you want to delete this question? This action cannot be undone."
          type="danger"
        />
      </div>
    </RoleGuard>
  );
};

export default QuestionPage;
