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
  downloadConsultationPdfApi,
} from "@/Api/AllApi";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import toast from "react-hot-toast";

const UserProfilePage = () => {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id;

  const formatYesNo = (value) => {
    if (value === "Yes" || value === "No") return value;
    return value ? "Yes" : "No";
  };

  const formatIndianDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const calculateAge = (dob) => {
    if (!dob) return null;
    try {
      let birthDate;
      if (typeof dob === "string" && dob.includes("/")) {
        const [day, month, year] = dob.split("/").map(Number);
        birthDate = new Date(year, month - 1, day);
      } else {
        birthDate = new Date(dob);
      }

      if (isNaN(birthDate.getTime())) return null;
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    } catch (err) {
      return null;
    }
  };

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

  const handleDayClick = (dayObj) => {
    const report =
      overview?.dailyReports?.find((r) => r.day === dayObj.day) || {};
    const checklist =
      overview?.dailyChecklist?.find((c) => c.day === dayObj.day) || null;
    setSelectedDay({ ...dayObj, answers: report.answers || [], checklist });
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
            <div className="mx-8 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-[#e6f4f1] text-[#134d41] flex items-center justify-center font-bold text-xl shrink-0">
                    {overview.user?.image ? (
                      <img
                        src={`${API_BASE}/${overview.user.image}`}
                        alt={overview.user?.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      overview.user?.name?.[0] || "U"
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">
                      {overview.user?.name} {overview.user?.surname}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1 font-medium tracking-wide">
                      USR-{overview.user?._id?.slice(-6).toUpperCase() || "XXXXXX"} • {overview.user?.mobilePrefix} {overview.user?.mobileNumber} • {overview.user?.email || "No email"}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className={`px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2 ${getPlanStatus().status === 'Active' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                    {getPlanStatus().status} {overview.user?.plan ? `— Day ${overview.user?.planCurrentDay ?? 0}` : ''}
                  </span>
                </div>
              </div>

              {/* Grid Data */}
              <div className="grid grid-cols-1 md:grid-cols-3">
                <div className="border-b md:border-r border-gray-200 p-6">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Branch</div>
                  <div className="text-sm font-medium text-gray-800">{overview.user?.branch?.name || "-"}</div>
                </div>
                <div className="border-b md:border-r border-gray-200 p-6">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Plan Configuration</div>
                  <div className="text-sm font-medium text-gray-800">{overview.user?.plan?.name ? `${overview.user.plan.name} (₹${overview.user.plan.price || 0})` : "-"}</div>
                </div>
                <div className="border-b border-gray-200 p-6">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Gender, Age & DOB</div>
                  <div className="text-sm font-medium text-gray-800">
                    {overview.user?.gender || "-"} • {calculateAge(overview.user?.dob) ? `${calculateAge(overview.user?.dob)} Years` : "-"} • {overview.user?.dob || "-"}
                  </div>
                </div>

                <div className="border-b md:border-r border-gray-200 p-6">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Location</div>
                  <div className="text-sm font-medium text-gray-800">{overview.user?.city || "-"}, {overview.user?.state || "-"}, {overview.user?.country || "-"}</div>
                </div>
                <div className="border-b md:border-r border-gray-200 p-6">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Physical Stats</div>
                  <div className="text-sm font-medium text-gray-800">{overview.user?.height || "-"} cm • {overview.user?.weight || "-"} kg</div>
                </div>
                <div className="border-b border-gray-200 p-6">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Referral Details</div>
                  <div className="text-sm font-medium text-gray-800">
                    Referred By : <span className="font-bold text-amber-700">{overview.user?.referrerName || "-"}</span>
                  </div>
                </div>
                <div className="border-b md:border-r border-gray-200 p-6">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Language & App Referer</div>
                  <div className="text-sm font-medium text-gray-800">{overview.user?.language || "-"} • {overview.user?.appReferer || "-"}</div>
                </div>

                <div className="border-b md:border-r md:border-b-0 border-gray-200 p-6">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Engagements</div>
                  <div className="text-sm font-medium text-gray-800">
                    Trial: {formatYesNo(overview.user?.bookTrial)} | Meet Dr: {formatYesNo(overview.user?.meetDoctor)} | Order: {formatYesNo(overview.user?.order)}
                  </div>
                </div>
                <div className="border-b md:border-r md:border-b-0 border-gray-200 p-6">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Medical Condition</div>
                  <div className="text-sm font-medium text-gray-800">
                    {Array.isArray(overview.user?.medicalDescription)
                      ? (overview.user.medicalDescription.length > 0 ? overview.user.medicalDescription.join(", ") : "-")
                      : (typeof overview.user?.medicalDescription === "string" && overview.user.medicalDescription.trim() !== ""
                        ? overview.user.medicalDescription
                        : "-")}
                  </div>
                </div>
                <div className="border-t border-gray-200 p-6">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Body Measurements</div>
                  <div className="text-sm font-medium text-gray-800 flex flex-wrap gap-x-3 gap-y-1">
                    <span>Biceps: {overview.user?.biceps || "-"}</span>
                    <span>Chest: {overview.user?.chest || "-"}</span>
                    <span>Hip: {overview.user?.hip || "-"}</span>
                    <span>Thigh: {overview.user?.thigh || "-"}</span>
                    <span>Waist: {overview.user?.waist || "-"}</span>
                  </div>
                </div>
                <div className="border-t md:border-l border-gray-200 p-6">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">First Login Date</div>
                  <div className="text-sm font-medium text-gray-800">{formatIndianDate(overview.user?.createdAt)}</div>
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
                          {overview.user.plan.name} (₹{overview.user.plan.price || 0})
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

            {/* ------------------ Program Progress ------------------ */}
            <div className="mx-8 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-800">
                  Program Progress
                </h3>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  {overview.user?.plan?.name || "Standard Plan"} • {overview.user?.plan?.days || 0} Days
                </span>
              </div>

              {overview?.user?.plan?.days ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-[#134D41]">
                      <tr className="text-[10px] font-black text-white uppercase tracking-widest whitespace-nowrap">
                        <th className="px-4 py-4 text-left">Day</th>
                        <th className="px-4 py-4 text-left">Weight</th>
                        <th className="px-4 py-4 text-left">Water</th>
                        <th className="px-4 py-4 text-left">Sleep</th>
                        <th className="px-4 py-4 text-left">Exercise</th>
                        <th className="px-4 py-4 text-left">Juice</th>
                        <th className="px-4 py-4 text-left">Pranayama</th>
                        <th className="px-4 py-4 text-left">Video</th>
                        <th className="px-6 py-4 text-left">Diet Mistake</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {Array.from({ length: overview.user.plan.days })
                        .slice(0, overview.user.planCurrentDay || 0)
                        .map((_, index) => {
                          const dayNum = index + 1;
                          const isCompleted = dayNum <= (overview.user.planCurrentDay || 0);
                          const isCurrent = dayNum === (overview.user.planCurrentDay || 0);

                          const videoDayData = overview.progress?.find((p) => p.day === dayNum);
                          const checklistData = overview.dailyChecklist?.find((c) => c.day === dayNum);

                          return (
                            <tr key={dayNum} className={`hover:bg-teal-50/30 transition-colors ${isCurrent ? 'bg-teal-50/50 font-bold' : ''}`}>
                              <td className="px-4 py-4 whitespace-nowrap text-xs font-bold text-gray-700">
                                Day {dayNum}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-600">
                                {checklistData?.todayWeight ? `${checklistData.todayWeight} kg` : '-'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-600">
                                {checklistData?.waterIntake ? `${checklistData.waterIntake} L` : '-'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-600">
                                {checklistData?.sleepHours ? `${checklistData.sleepHours} hr` : '-'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-600">
                                {checklistData?.exerciseMinutes ? `${checklistData.exerciseMinutes} min` : '-'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-600">
                                {checklistData?.greenJuice ? `${checklistData.greenJuice}x` : '-'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-600">
                                {checklistData?.pranayamaMinutes ? `${checklistData.pranayamaMinutes} min` : '-'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-[10px] font-bold">
                                {videoDayData ? (
                                  <span className="text-red-600 uppercase tracking-tight">Watched</span>
                                ) : <span className="text-gray-300">-</span>}
                              </td>
                              <td className="px-6 py-4 text-xs text-red-500 max-w-[200px] truncate" title={checklistData?.dietMistake}>
                                {checklistData?.dietMistake || '-'}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-10 text-center text-gray-500 italic">No program plan active.</div>
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
                          {h.plan?.name ? `${h.plan.name} (₹${h.plan.price || 0})` : "Plan"}
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
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-gray-800">
                            Video: {va.videoId?.title?.english || "Unknown Title"}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${va.isPassed ? 'bg-teal-600 text-white' : 'bg-red-600 text-white'}`}>
                            {va.isPassed ? 'Passed' : 'Failed'} ({va.correctCount || 0}/{va.answers?.length || 0})
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(va.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="p-4 bg-yellow-50 flex flex-col gap-3">
                        {va.answers && va.answers.length > 0 ? (
                          va.answers.map((ans, i) => (
                            <div key={i} className="flex flex-col border-b border-yellow-200 pb-2 last:border-0 last:pb-0">
                              <span className="text-sm font-medium text-gray-700 tracking-wide">Question : {ans.questionId?.questionText?.english || ans.questionId || "Unknown Question"}</span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-md text-gray-900 font-semibold">Answer : {ans.answer}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${ans.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {ans.isCorrect ? 'Correct' : 'Incorrect'}
                                </span>
                              </div>
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

            {/* ------------------ Consultations ------------------ */}
            <div className="p-6 mx-8 bg-white rounded-2xl shadow-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">Consultations</h3>
              </div>
              {overview.consultations && overview.consultations.length > 0 ? (
                <div className="space-y-4">
                  {overview.consultations.map((c) => (
                    <div
                      key={c._id}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-teal-100 bg-teal-50/30 hover:bg-teal-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">
                            {c.isFirstConsultation ? "First Consultation" : "Follow-up Consultation"}
                          </div>
                          <div className="text-sm text-gray-500 flex flex-wrap gap-x-3">
                            <span>📅 {c.appointmentId?.date || new Date(c.createdAt).toLocaleDateString()}</span>
                            <span>⏰ {c.appointmentId?.startTime || "N/A"} - {c.appointmentId?.endTime || "N/A"}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => downloadConsultationPdfApi(c._id)}
                        className="w-full sm:w-auto px-4 py-2 bg-white border border-teal-200 text-teal-600 rounded-lg text-sm font-bold hover:bg-teal-600 hover:text-white transition-all flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download PDF
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 italic">No consultations recorded yet.</div>
              )}
            </div>

            {/* ------------------ User Feedback ------------------ */}
            <div className="p-6 mx-8 bg-white rounded-2xl shadow-lg border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">User Feedback</h3>
              </div>
              {overview?.feedback ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "App Experience", value: overview.feedback.appExperience },
                    { label: "Doctor Consultant", value: overview.feedback.doctorCostultant },
                    { label: "Product Quality", value: overview.feedback.product },
                    { label: "Support", value: overview.feedback.support },
                  ].map((item, idx) => (
                    <div key={idx} className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex flex-col items-center">
                      <div className="text-xs font-bold text-[#134D41] uppercase tracking-wider mb-2">{item.label}</div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg
                            key={star}
                            className={`w-5 h-5 ${star <= (item.value || 0) ? "text-yellow-500 fill-yellow-500" : "text-gray-300 fill-gray-300"}`}
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <div className="mt-2 text-lg font-bold text-gray-800">{item.value || 0}/5</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 italic">No feedback provided yet.</div>
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

              {/* Daily Checklist Data */}
              {selectedDay.checklist && (
                <div className="mb-6 p-5 rounded-2xl bg-blue-50 border border-blue-100 shadow-sm">
                  <h3 className="text-lg font-bold text-blue-700 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Daily Checklist
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    {[
                      { label: "Water Intake", value: `${selectedDay.checklist.waterIntake} Liter`, icon: "💧" },
                      { label: "Exercise", value: `${selectedDay.checklist.exerciseMinutes} mins`, icon: "🏃" },
                      { label: "Green Juice", value: `${selectedDay.checklist.greenJuice} Times`, icon: "🥤" },
                      { label: "Pranayama", value: `${selectedDay.checklist.pranayamaMinutes} mins`, icon: "🧘" },
                      { label: "Sleep", value: `${selectedDay.checklist.sleepHours} hours`, icon: "🌙" },
                      { label: "Weight", value: `${selectedDay.checklist.todayWeight} kg`, icon: "⚖️" },
                    ].map((item, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-xl border border-blue-50 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                          <span>{item.icon}</span>
                          {item.label}
                        </div>
                        <div className="text-sm font-bold text-gray-800">
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Diet Mistake - Full Width Row */}
                  <div className="bg-white p-4 rounded-xl border border-red-50 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-bold text-red-500 uppercase tracking-wider mb-2">
                      <span>⚠️</span> Diet Mistake
                    </div>
                    <div className="text-sm text-red-600 font-medium leading-relaxed">
                      {selectedDay.checklist.dietMistake || "No mistakes reported for this day."}
                    </div>
                  </div>
                </div>
              )}

              {/* Daily Question Reports */}
              <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Questions Report
              </h3>
              {selectedDay.answers && selectedDay.answers.length ? (
                <div className="space-y-4">
                  {selectedDay.answers.map((a, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl bg-yellow-50 shadow-sm border border-yellow-100 hover:bg-yellow-100 transition"
                    >
                      <div className="text-gray-700 font-medium text-sm">
                        Q: {a.question}
                      </div>
                      <div className="mt-1 text-gray-900 font-bold">
                        A: {a.givenAnswer || "-"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-sm italic">No answers for this day.</div>
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
