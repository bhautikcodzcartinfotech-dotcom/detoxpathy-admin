"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import RoleGuard from "@/components/RoleGuard";
import { Header, Button } from "@/utils/header";
import Loader from "@/utils/loader";
import {
  API_BASE,
  getUserOverview,
  holdUserPlan,
  resumeUserPlan,
  getUserVideoAnswers,
} from "@/Api/AllApi";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import toast from "react-hot-toast";

const UserProfilePage = () => {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id;

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null); // for popup
  const [closing, setClosing] = useState(false);
  const [planActionLoading, setPlanActionLoading] = useState(false);
  const [videoAnswers, setVideoAnswers] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "warning",
    onConfirm: null,
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await getUserOverview(userId);
        setOverview(data || null);

        // Fetch user video answers
        try {
          const vData = await getUserVideoAnswers(userId);
          setVideoAnswers(vData || []);
        } catch (err) {
          console.error("Failed to load video answers", err);
        }
      } catch {
        setOverview(null);
      } finally {
        setLoading(false);
      }
    };
    if (userId) load();
  }, [userId]);

  // handle popup close with fade-out
  const closePopup = () => {
    setClosing(true);
    setTimeout(() => {
      setSelectedDay(null);
      setClosing(false);
    }, 200);
  };

  // day select ke time answers bhi attach karo
  const handleDayClick = (dayObj) => {
    const report =
      overview?.dailyReports?.find((r) => r.day === dayObj.day) || {};
    setSelectedDay({ ...dayObj, answers: report.answers || [] });
  };

  // Plan management functions
  const handleHoldPlan = () => {
    setConfirmDialog({
      isOpen: true,
      title: "Hold Plan",
      message: `Are you sure you want to HOLD the plan for ${overview.user?.name}? This will pause their current plan progress.`,
      type: "warning",
      onConfirm: async () => {
        try {
          setPlanActionLoading(true);
          await holdUserPlan(userId);

          // Update local state immediately
          setOverview((prev) => ({
            ...prev,
            user: {
              ...prev.user,
              planHoldDate: new Date().toISOString().split("T")[0],
              planResumeDate: null,
            },
          }));

          toast.success(`Plan held successfully for ${overview.user?.name}!`);
        } catch (err) {
          toast.error(err?.response?.data?.message || "Failed to hold plan");
        } finally {
          setPlanActionLoading(false);
          setConfirmDialog({
            isOpen: false,
            title: "",
            message: "",
            type: "warning",
            onConfirm: null,
          });
        }
      },
    });
  };

  const handleResumePlan = () => {
    setConfirmDialog({
      isOpen: true,
      title: "Resume Plan",
      message: `Are you sure you want to RESUME the plan for ${overview.user?.name}? This will continue their plan from where it was held.`,
      type: "success",
      onConfirm: async () => {
        try {
          setPlanActionLoading(true);
          await resumeUserPlan(userId);

          // Update local state immediately
          setOverview((prev) => ({
            ...prev,
            user: {
              ...prev.user,
              planResumeDate: new Date().toISOString().split("T")[0],
              planCurrentDay: (prev.user.planCurrentDay || 0) + 1,
              planCurrentDate: new Date().toISOString().split("T")[0],
            },
          }));

          toast.success(
            `Plan resumed successfully for ${overview.user?.name}!`
          );
        } catch (err) {
          toast.error(err?.response?.data?.message || "Failed to resume plan");
        } finally {
          setPlanActionLoading(false);
          setConfirmDialog({
            isOpen: false,
            title: "",
            message: "",
            type: "warning",
            onConfirm: null,
          });
        }
      },
    });
  };

  // Get plan status
  const getPlanStatus = () => {
    if (!overview?.user?.activated || !overview?.user?.plan) {
      return {
        status: "No Plan",
        color: "bg-gray-100 text-gray-800",
        icon: (
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ),
      };
    }
    if (overview.user.planHoldDate && !overview.user.planResumeDate) {
      return {
        status: "Hold",
        color: "bg-amber-100 text-amber-800",
        icon: (
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
              d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
      };
    }
    return {
      status: "Active",
      color: "bg-amber-300 text-yellow-800",
      icon: (
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
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    };
  };

  const isDeleted = Boolean(overview?.user?.isDeleted);

  return (
    <RoleGuard allow={["Admin", "subadmin"]}>
      <div className="py-6 px-6 md:px-12">
        <div className="flex items-center justify-between mb-6 px-8">
          <Header size="3xl">User Profile</Header>
          <Button onClick={() => router.back()}>Back</Button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center min-h-[60vh]">
            <Loader />
          </div>
        ) : !overview ? (
          <div className="text-gray-600">No user found.</div>
        ) : (
          <div className="space-y-8">
            <div className="p-8 mx-8 bg-white rounded-2xl shadow-lg flex flex-col md:flex-row items-center gap-6">
              {/* User Image */}
              <div className="w-25 h-25 rounded-full overflow-hidden bg-amber-100 shadow">
                {overview.user?.image ? (
                  <img
                    src={`${API_BASE}/${overview.user.image}`}
                    alt={overview.user?.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-2xl font-bold text-yellow-600">
                    {overview.user?.name?.[0] || "U"}
                  </div>
                )}
              </div>

              {/* User Info */}
              <div className="flex-1 space-y-2">
                <h2 className="text-3xl font-bold text-gray-800">
                  {overview.user?.name} {overview.user?.surname}
                </h2>
                <p className="text-md text-gray-600">
                  {overview.user?.gender} • {overview.user?.age} yrs
                </p>
                <p className="text-md text-gray-600">
                  {overview.user?.city}, {overview.user?.state},{" "}
                  {overview.user?.country}
                </p>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5 text-md">
                <div className="p-5 rounded-xl bg-amber-100 shadow-sm">
                  <div className="text-gray-500">Plan</div>
                  <div className="font-semibold text-gray-800">
                    {overview.user?.plan?.name || "-"}
                  </div>
                </div>
                <div className="p-5 rounded-xl bg-amber-100 shadow-sm">
                  <div className="text-gray-500">Day</div>
                  <div className="font-semibold text-gray-800">
                    {overview.user?.planCurrentDay ?? 0}
                  </div>
                </div>
                <div className="p-5 rounded-xl bg-amber-100 shadow-sm">
                  <div className="text-gray-500">Branch</div>
                  <div className="font-semibold text-gray-800">
                    {overview.user?.branch?.name || "-"}
                  </div>
                </div>
                <div className="p-5 rounded-xl bg-amber-100 shadow-sm">
                  <div className="text-gray-500">Mobile</div>
                  <div className="font-semibold text-gray-800">
                    {overview.user?.mobilePrefix} {overview.user?.mobileNumber}
                  </div>
                </div>
                <div className="p-5 rounded-xl bg-amber-100 shadow-sm">
                  <div className="text-gray-500">Height / Weight</div>
                  <div className="font-semibold text-gray-800">
                    {overview.user?.height} cm / {overview.user?.weight} kg
                  </div>
                </div>
                <div className="p-5 rounded-xl bg-amber-100 shadow-sm">
                  <div className="text-gray-500">Language</div>
                  <div className="font-semibold text-gray-800">
                    {overview.user?.language || "-"}
                  </div>
                </div>
                <div className="p-5 rounded-xl bg-amber-100 shadow-sm">
                  <div className="text-gray-500">Trial Booked</div>
                  <div className="font-semibold text-gray-800">
                    {overview.user?.bookTrial ? "Yes" : "No"}
                  </div>
                </div>
                <div className="p-5 rounded-xl bg-amber-100 shadow-sm">
                  <div className="text-gray-500">Medical Condition</div>
                  <div className="font-semibold text-gray-800">
                    {Array.isArray(overview.user?.medicalDescription)
                      ? (overview.user.medicalDescription.length > 0 ? overview.user.medicalDescription.join(", ") : "-")
                      : (typeof overview.user?.medicalDescription === "string" && overview.user.medicalDescription.trim() !== ""
                        ? overview.user.medicalDescription
                        : "-")}
                  </div>
                </div>
                <div className="p-5 rounded-xl bg-amber-100 shadow-sm">
                  <div className="text-gray-500">App Referer</div>
                  <div className="font-semibold text-gray-800">
                    {overview.user?.appReferer || "-"}
                  </div>
                </div>
                <div className="p-5 rounded-xl bg-amber-100 shadow-sm col-span-2 md:col-span-3">
                  <div className="text-gray-500">Body Measurements</div>
                  <div className="font-semibold text-gray-800 flex flex-wrap gap-x-6 gap-y-2 mt-1">
                    <span>Arm: {overview.user?.Arm || "-"}</span>
                    <span>Chest: {overview.user?.Chest || "-"}</span>
                    <span>Hip: {overview.user?.Hip || "-"}</span>
                    <span>Thigh: {overview.user?.Thigh || "-"}</span>
                    <span>Waist: {overview.user?.Waist || "-"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ------------------ Plan Management Section ------------------ */}
            {overview?.user?.plan && (
              <div className="p-8 mx-8 bg-white rounded-2xl shadow-lg border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <h3 className="text-2xl font-bold text-gray-800">
                      Plan Management
                    </h3>
                    <span
                      className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${getPlanStatus().color
                        }`}
                    >
                      <span className="mr-2">{getPlanStatus().icon}</span>
                      {getPlanStatus().status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Plan Details Card */}
                  <div className="bg-gradient-to-br from-yellow-50 to-amber-100 rounded-xl p-6 border border-yellow-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
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
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">
                          Current Plan
                        </h4>
                        <p className="text-sm text-gray-600">
                          {overview.user.plan.name}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Current Day:</span>
                        <span className="font-semibold text-gray-800">
                          {overview.user.planCurrentDay || 0}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Status:</span>
                        <span
                          className={`font-semibold ${getPlanStatus()
                            .color.replace("bg-", "text-")
                            .replace("-100", "-800")}`}
                        >
                          {getPlanStatus().status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Plan History Card */}
                  <div className="bg-gradient-to-br from-yellow-50 to-amber-100 rounded-xl p-6 border border-amber-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center">
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
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">
                          Plan History
                        </h4>
                        <p className="text-sm text-gray-600">
                          Hold & Resume Dates
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {overview.user.planHoldDate && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Hold Date:</span>
                          <span className="font-semibold text-amber-600">
                            {new Date(
                              overview.user.planHoldDate
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {overview.user.planResumeDate && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Resume Date:</span>
                          <span className="font-semibold text-yellow-600">
                            {new Date(
                              overview.user.planResumeDate
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {!overview.user.planHoldDate &&
                        !overview.user.planResumeDate && (
                          <div className="text-sm text-gray-500 italic">
                            No hold/resume history
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Action Buttons Card */}
                  <div className="bg-gradient-to-br from-yellow-50 to-amber-100 rounded-xl p-6 border border-yellow-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
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
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">
                          Quick Actions
                        </h4>
                        <p className="text-sm text-gray-600">
                          Manage plan status
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {overview.user.planHoldDate &&
                        !overview.user.planResumeDate ? (
                        <button
                          onClick={handleResumePlan}
                          disabled={planActionLoading}
                          className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:transform-none flex items-center justify-center gap-2"
                        >
                          {planActionLoading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
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
                                d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          )}
                          Resume Plan
                        </button>
                      ) : (
                        <button
                          onClick={handleHoldPlan}
                          disabled={planActionLoading || isDeleted}
                          className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:transform-none flex items-center justify-center gap-2"
                        >
                          {planActionLoading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
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
                                d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          )}
                          Hold Plan
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------ Progress by Day ------------------ */}
            <div className="p-8 mx-7 bg-white rounded-2xl shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">
                  Progress by Day
                </h3>
                <span className="text-sm text-gray-500">Latest first</span>
              </div>

              {Array.isArray(overview.progress) && overview.progress.length ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-8">
                  {overview.progress.map((d) => (
                    <div
                      key={d.day}
                      className="rounded-2xl bg-white shadow-lg transition overflow-hidden"
                    >
                      {d.firstThumbnail ? (
                        <img
                          src={`${API_BASE}/${d.firstThumbnail.english}`}
                          alt={`Day ${d.day}`}
                          className="w-full h-50 bg-amber-100 object-cover"
                        />
                      ) : (
                        <div className="w-full h-50 bg-amber-100" />
                      )}
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Day</span>
                          <span className="text-sm font-semibold text-gray-800">
                            {d.day}
                          </span>
                        </div>

                        {/* progress bar */}
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-400"
                            style={{ width: `${d.dayProgressPercent || 0}%` }}
                          />
                        </div>
                        <div className="text-right text-xs text-gray-600">
                          {d.dayProgressPercent || 0}%
                        </div>

                        {/* Button to open popup */}
                        <Button
                          className="w-full bg-yellow-400 hover:bg-yellow-500 text-black rounded py-2 mt-1 mb-3 shadow"
                          onClick={() => handleDayClick(d)}
                        >
                          View Report
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500">No progress yet.</div>
              )}
            </div>

            {/* ------------------ Plan History ------------------ */}
            <div className="p-6 mx-8 bg-white rounded-2xl shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">
                  Plan History
                </h3>
                <span className="text-sm text-gray-500">Recent first</span>
              </div>
              {Array.isArray(overview.planHistory) &&
                overview.planHistory.length ? (
                <div className="space-y-4">
                  {overview.planHistory.map((h) => (
                    <div
                      key={h._id}
                      className="flex items-center justify-between rounded-xl bg-amber-100 shadow-md p-4  hover:shadow-lg transition"
                    >
                      <div>
                        <div className="font-semibold text-gray-800 text-base">
                          {h.plan?.name || "Plan"}
                        </div>
                        <div className="text-sm text-gray-600">
                          {h.plan?.days ? `${h.plan.days} days` : ""}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(h.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500">No plan changes yet.</div>
              )}
            </div>

            {/* ------------------ Video Answers ------------------ */}
            <div className="p-6 mx-8 bg-white rounded-2xl shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">
                  Video Answers
                </h3>
              </div>
              {videoAnswers && videoAnswers.length > 0 ? (
                <div className="space-y-6">
                  {videoAnswers.map((va) => (
                    <div
                      key={va._id}
                      className="rounded-xl border border-amber-200 overflow-hidden shadow-sm"
                    >
                      <div className="bg-amber-100 px-4 py-3 border-b border-amber-200 flex justify-between items-center">
                        <span className="font-semibold text-gray-800">
                          Video: {va.videoId?.title?.english || "Unknown Title"}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(va.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="p-4 bg-yellow-50 flex flex-col gap-3">
                        {va.answers && va.answers.length > 0 ? (
                          va.answers.map((ans, i) => (
                            <div key={i} className="flex flex-col border-b border-yellow-200 pb-2 last:border-0 last:pb-0">
                              <span className="text-sm font-medium text-gray-700 tracking-wide">Question : {ans.questionId?.questionText?.english || ans.questionId || "Unknown Question"}</span>
                              <span className="text-md text-gray-900 mt-1 font-semibold">Answer : {ans.answer}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-gray-500">No answers recorded.</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500">No video answers available.</div>
              )}
            </div>
          </div>
        )}

        {/* ------------------ Popup Modal ------------------ */}
        {selectedDay && (
          <div
            className={`fixed inset-0 flex items-center justify-center z-50 bg-black/50 ${closing ? "animate-fade-out" : "animate-fade-in"
              }`}
          >
            <div className="bg-white w-[90%] md:w-[70%] lg:w-[50%] rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
              {/* Close Button */}
              <button
                className="absolute top-3 right-3 text-gray-600 hover:text-gray-900"
                onClick={closePopup}
              >
                ✕
              </button>

              <h2 className="text-xl font-bold mb-4 text-yellow-500">
                Day {selectedDay.day} - Detailed Report
              </h2>

              {selectedDay.answers && selectedDay.answers.length ? (
                <div className="space-y-4">
                  {selectedDay.answers.map((a, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl bg-yellow-50 shadow hover:bg-yellow-100 transition"
                    >
                      <div className="text-gray-700 font-medium">
                        {a.question}
                      </div>
                      <div className="mt-1 text-gray-900 font-semibold">
                        {a.givenAnswer || "-"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500">No answers for this day.</div>
              )}
            </div>
          </div>
        )}

        {/* Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={confirmDialog.isOpen}
          onClose={() =>
            setConfirmDialog({
              isOpen: false,
              title: "",
              message: "",
              type: "warning",
              onConfirm: null,
            })
          }
          onConfirm={confirmDialog.onConfirm}
          title={confirmDialog.title}
          message={confirmDialog.message}
          type={confirmDialog.type}
          confirmText="Confirm"
          cancelText="Cancel"
        />
      </div>
    </RoleGuard>
  );
};

export default UserProfilePage;
