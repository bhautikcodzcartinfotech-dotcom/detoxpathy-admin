"use client";
import React, { useState, useEffect, useMemo } from "react";
import RoleGuard from "@/components/RoleGuard";
import { Header } from "@/utils/header";
import {
  getAllBranches,
  getAllPlans,
  getAllUsers,
  getAllOrders,
  getAppointmentsByBranch,
  getLogs,
  listSubAdmins,
  getAllMedicalConditions,
  getAllAppReferences,
  getDailyChecklists
} from "@/Api/AllApi";
import Dropdown from "@/utils/dropdown";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";
import {
  MdSummarize,
  MdCalendarMonth,
  MdShoppingCart,
  MdVideoLibrary,
  MdHistory,
  MdSearch,
  MdFilterList,
  MdLocationCity,
  MdLanguage,
  MdPerson,
  MdTimer,
  MdHealthAndSafety,
  MdVideoSettings,
  MdWaterDrop,
  MdFitnessCenter,
  MdLocalDrink,
  MdSelfImprovement,
  MdBedtime,
  MdMonitorWeight,
  MdWarning,
  MdRefresh
} from "react-icons/md";

const ReportsPage = () => {
  const { role, branches } = useAuth();
  const [reportType, setReportType] = useState("users");
  const [viewType, setViewType] = useState("user"); // user | doctor
  const [loading, setLoading] = useState(false);
  const [rawData, setRawData] = useState([]);

  // Basic Filters
  const [allBranches, setAllBranches] = useState([]);
  const [allPlans, setAllPlans] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Advanced User Filters (Matching Users Page)
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | inactive
  const [totalUserCount, setTotalUserCount] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [selectedGender, setSelectedGender] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedAge, setSelectedAge] = useState("");
  const [selectedReferrer, setSelectedReferrer] = useState("");
  const [skipBodyMeasurement, setSkipBodyMeasurement] = useState("");
  const [allDoctors, setAllDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");

  // New Requested Filters
  const [medicalConditions, setMedicalConditions] = useState([]);
  const [appReferences, setAppReferences] = useState([]);
  const [selectedMedicalCondition, setSelectedMedicalCondition] = useState("");
  const [selectedAppReference, setSelectedAppReference] = useState("");
  const [selectedVideoLanguage, setSelectedVideoLanguage] = useState("");
  const [selectedConsultingType, setSelectedConsultingType] = useState(""); // online | offline
  const [selectedVideoWatchStatus, setSelectedVideoWatchStatus] = useState(""); // watched | not_watched
  const [selectedResultStatus, setSelectedResultStatus] = useState("");
  const [localOnlineFilter, setLocalOnlineFilter] = useState("");
  const [checklistReportEnabled, setChecklistReportEnabled] = useState(false);

  // Daily Checklist Specific Filters
  const [filterWater, setFilterWater] = useState("");
  const [filterExercise, setFilterExercise] = useState("");
  const [filterJuice, setFilterJuice] = useState("");
  const [filterPranayama, setFilterPranayama] = useState("");
  const [filterSleep, setFilterSleep] = useState("");

  useEffect(() => {
    fetchInitialData();
  }, [role, branches]);

  useEffect(() => {
    fetchReportData();
    // Reset doctor if not in new branch/city
    if (selectedDoctorId) {
      const doc = allDoctors.find(d => String(d._id) === String(selectedDoctorId));
      if (doc) {
        const docBranches = Array.isArray(doc.fullBranches) ? doc.fullBranches : [];
        const matchesBranch = !selectedBranchId || docBranches.some(b => String(b._id || b) === String(selectedBranchId));
        const matchesCity = !selectedCity || docBranches.some(b => String(b.city || "").toLowerCase().includes(selectedCity.toLowerCase()));
        if (!matchesBranch || !matchesCity) setSelectedDoctorId("");
      }
    }
  }, [reportType, selectedBranchId, selectedPlanId, startDate, endDate, selectedCity, checklistReportEnabled]);

  const fetchInitialData = async () => {
    try {
      const [branchList, planList, subAdmins, allUsers, medicalList, referenceList] = await Promise.all([
        getAllBranches() || [],
        getAllPlans() || [],
        listSubAdmins() || [],
        getAllUsers() || [],
        getAllMedicalConditions() || [],
        getAllAppReferences() || []
      ]);

      setMedicalConditions(medicalList || []);
      setAppReferences(referenceList || []);

      // Set total user count for percentage calculations
      setTotalUserCount(Array.isArray(allUsers) ? allUsers.length : 0);

      const doctors = (subAdmins || []).filter(s => {
        const type = String(s.adminType || "").toLowerCase();
        const role = String(s.role || "").toLowerCase();
        return type.includes("sub") || role.includes("doctor") || role.includes("subadmin");
      });

      let filteredBranches = branchList || [];
      const currentRole = String(role || "").toLowerCase();

      if (role && currentRole !== "admin") {
        const assignedBranchIds = Array.isArray(branches)
          ? branches.map(b => String(b._id || b))
          : [];
        filteredBranches = filteredBranches.filter(b => assignedBranchIds.includes(String(b._id)));
      }

      setAllBranches(filteredBranches);
      setAllPlans(planList || []);

      const enhancedDoctors = doctors.map(d => {
        const rawDocBranches = Array.isArray(d.branch) ? d.branch : [d.branch].filter(Boolean);
        const fullBranches = rawDocBranches.map(b => {
          const bId = String(b._id || b);
          const found = (branchList || []).find(bl => String(bl._id) === bId);
          return found ? found : (typeof b === 'object' ? b : { _id: b, name: "Branch " + b });
        });
        return { ...d, fullBranches };
      });
      setAllDoctors(enhancedDoctors);

      if (currentRole !== "admin" && filteredBranches.length > 0) {
        setSelectedBranchId(filteredBranches[0]._id);
      } else {
        setSelectedBranchId("");
      }
    } catch (e) {
      console.error("Failed to fetch initial data", e);
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      let result = [];
      const branchToFetch = selectedBranchId || "all";

      if (checklistReportEnabled) {
        const checklists = await getDailyChecklists({ limit: 10000 });
        result = checklists || [];
      } else {
        switch (reportType) {
          case "users":
            const allUserList = await getAllUsers();
            result = allUserList || [];
            break;
          case "reschedule":
            const logs = await getLogs({
              action: "update appointment",
              branchId: selectedBranchId,
              startDate,
              endDate
            });
            result = logs || [];
            break;
          case "orders":
            const orderData = await getAllOrders({
              search: "",
              status: "",
              limit: 1000
            });
            result = orderData?.orders || [];
            break;
          case "video":
            const users = await getAllUsers();
            result = users || [];
            break;
          case "appointments":
          default:
            const appointmentParams = {
              startDate,
              endDate,
              search: ""
            };
            result = await getAppointmentsByBranch(branchToFetch, appointmentParams);
            break;
        }
      }
      setRawData(Array.isArray(result) ? result : []);
    } catch (e) {
      console.error(`Failed to fetch ${reportType} report`, e);
      setRawData([]);
      toast.error("Failed to fetch report data");
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dob) => {
    if (!dob) return null;
    let birthDate;
    if (dob.includes("/")) {
      const parts = dob.split("/");
      if (parts.length !== 3) return null;
      birthDate = new Date(parts[2], parts[1] - 1, parts[0]);
    } else {
      birthDate = new Date(dob);
    }
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const filteredData = useMemo(() => {
    let data = [...rawData];

    // Find selected doctor details for branch-based matching
    const selectedDoc = selectedDoctorId ? allDoctors.find(d => String(d._id) === String(selectedDoctorId)) : null;
    const docBranchIds = selectedDoc
      ? (Array.isArray(selectedDoc.fullBranches) ? selectedDoc.fullBranches : []).map(b => String(b._id))
      : [];

    return data.filter(item => {
      let user = null;
      if (checklistReportEnabled || reportType === 'appointments' || reportType === 'orders') user = item.userId;
      else if (reportType === 'video' || reportType === 'users') user = item;
      else if (reportType === 'reschedule') user = item.user;

      const userBranchId = String(user?.branch?._id || user?.branch || user?.branchId?._id || user?.branchId || "");

      // 12. Doctor Filter Logic
      if (selectedDoctorId) {
        const directDoctorId = item.doctor?._id || item.doctor || user?.doctor?._id || user?.doctor || item.doctorId?._id || item.doctorId;
        const matchesDirectly = directDoctorId && String(directDoctorId) === String(selectedDoctorId);

        // B. Branch-Based Check (Users are in the doctor's branch)
        const matchesViaBranch = userBranchId && docBranchIds.includes(userBranchId);

        if (!matchesDirectly && !matchesViaBranch) return false;
      }

      if (viewType === "doctor") {
        if (reportType === 'appointments' && !item.doctor) return false;
        if (reportType === 'reschedule' && !["sub admin", "sub doctor"].includes(String(item.user?.adminType || "").toLowerCase())) return false;
        if (reportType === 'orders' || reportType === 'video') return false;
      } else if (viewType === "user") {
        if (!user && reportType !== 'reschedule') return false;
        if (reportType === 'reschedule' && !user) return true;
      }

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesSearch =
          (user?.name || "").toLowerCase().includes(term) ||
          (user?.surname || "").toLowerCase().includes(term) ||
          (user?.mobileNumber || "").includes(term) ||
          (item._id || "").toLowerCase().includes(term);
        if (!matchesSearch) return false;
      }

      if (selectedBranchId) {
        const itemBranchId = item.branchId?._id || item.branchId || item.branch?._id || item.branch || user?.branch?._id || user?.branch;
        if (String(itemBranchId) !== String(selectedBranchId)) return false;
      }

      if (selectedPlanId) {
        const itemPlanId = user?.plan?._id || user?.plan || item.planId?._id || item.planId;
        if (String(itemPlanId) !== String(selectedPlanId)) return false;
      }

      if (statusFilter !== "all") {
        const isInactive = user?.isDeleted || user?.isBlocked;
        if (statusFilter === "active" && isInactive) return false;
        if (statusFilter === "inactive" && !isInactive) return false;
      }

      if (selectedGender && user?.gender?.toLowerCase() !== selectedGender.toLowerCase()) return false;
      if (selectedLanguage && user?.language?.toLowerCase() !== selectedLanguage.toLowerCase()) return false;
      if (selectedCity && !user?.city?.toLowerCase().includes(selectedCity.toLowerCase())) return false;
      if (selectedState && !user?.state?.toLowerCase().includes(selectedState.toLowerCase())) return false;

      if (selectedAge) {
        const age = calculateAge(user?.dob);
        if (age !== parseInt(selectedAge)) return false;
      }

      if (selectedReferrer && user?.usedReferralCode !== selectedReferrer && user?.referralCode !== selectedReferrer) return false;

      if (selectedResultStatus === "passed" && !user?.giveAnswer) return false;
      if (selectedResultStatus === "failed" && user?.giveAnswer) return false;

      // Timeline Filter (Client-side for types that don't filter on server)
      if (startDate || endDate) {
        const itemDate = new Date(item.createdAt || item.date || item.appointmentDate);
        if (startDate && itemDate < new Date(startDate)) return false;
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (itemDate > end) return false;
        }
      }

      if (skipBodyMeasurement) {
        const hasMeasurement = (user?.waist && user?.waist != "0") || (user?.hip && user?.hip != "0");
        if (skipBodyMeasurement === "skip" && hasMeasurement) return false;
        if (skipBodyMeasurement === "with" && !hasMeasurement) return false;
      }

      if (reportType === 'video' && (item.planCurrentDay || 0) === 0) return false;

      if (selectedMedicalCondition && !user?.medicalDescription?.includes(selectedMedicalCondition)) return false;
      if (selectedAppReference && user?.appReferer !== selectedAppReference && user?.usedReferralCode !== selectedAppReference) return false;
      if (selectedVideoLanguage && user?.videoLanguage !== selectedVideoLanguage) return false;
      if (selectedConsultingType) {
        const type = String(item.appointmentType || user?.appointmentType || "");
        if (type !== selectedConsultingType) return false;
      }
      if (selectedVideoWatchStatus === "not_watched" && user?.seeVideo) return false;
      if (selectedVideoWatchStatus === "watched" && !user?.seeVideo) return false;

      if (localOnlineFilter === "local_online") {
        const appType = String(item.appointmentType || user?.appointmentType || "");
        if (appType !== "1") return false; // 1 is Online
        const userCity = (user?.city || "").trim().toLowerCase();
        if (!userCity) return false;
        const hasBranchInCity = allBranches.some(b => b.city && b.city.trim().toLowerCase() === userCity);
        if (!hasBranchInCity) return false;
      }

      if (checklistReportEnabled) {
        if (filterWater && String(item.waterIntake || 0) !== String(filterWater)) return false;
        if (filterExercise && String(item.exerciseMinutes || 0) !== String(filterExercise)) return false;
        if (filterJuice && String(item.greenJuice || 0) !== String(filterJuice)) return false;
        if (filterPranayama && String(item.pranayamaMinutes || 0) !== String(filterPranayama)) return false;
        if (filterSleep && String(item.sleepHours || 0) !== String(filterSleep)) return false;
      }

      return true;
    });
  }, [rawData, reportType, viewType, searchTerm, selectedBranchId, selectedPlanId, statusFilter, selectedGender, selectedLanguage, selectedCity, selectedState, selectedAge, selectedReferrer, skipBodyMeasurement, selectedDoctorId, allDoctors, selectedMedicalCondition, selectedAppReference, selectedVideoLanguage, selectedConsultingType, selectedVideoWatchStatus, selectedResultStatus, startDate, endDate, checklistReportEnabled, filterWater, filterExercise, filterJuice, filterPranayama, filterSleep, localOnlineFilter, allBranches]);

  const { activeCount, inactiveCount } = useMemo(() => {
    let active = 0;
    let inactive = 0;
    filteredData.forEach(item => {
      const user = checklistReportEnabled || reportType === 'appointments' || reportType === 'orders' ? item.userId : (reportType === 'reschedule' ? item.user : item);
      if (user?.isDeleted || user?.isBlocked) inactive++;
      else active++;
    });
    return { activeCount: active, inactiveCount: inactive };
  }, [filteredData, reportType, checklistReportEnabled]);

  // Advanced Stats Calculation
  const advancedStats = useMemo(() => {
    if (!filteredData.length) return {
      avgWeight: 0, highestWeight: 0, lowestWeight: 0,
      avgHeight: 0, highestHeight: 0, lowestHeight: 0,
      avgIdealWeight: 0,
      topState: "N/A",
      refPerformance: { highest: "N/A", lowest: "N/A" }
    };

    let totalW = 0, highW = 0, lowW = 999;
    let totalH = 0, highH = 0, lowH = 999;
    let totalIW = 0;
    const stateCounts = {};
    const refCounts = {};

    filteredData.forEach(item => {
      const u = checklistReportEnabled || reportType === 'appointments' || reportType === 'orders' ? item.userId : (reportType === 'reschedule' ? item.user : item);
      if (!u) return;

      // Weight stats
      const w = Number(u.weight || 0);
      if (w > 0) {
        totalW += w;
        if (w > highW) highW = w;
        if (w < lowW) lowW = w;
      }

      // Height stats
      const h = Number(u.height || 0);
      if (h > 0) {
        totalH += h;
        if (h > highH) highH = h;
        if (h < lowH) lowH = h;
      }

      // Ideal Weight
      const iw = Number(u.idealWeight || 0);
      if (iw > 0) totalIW += iw;

      // States for appointments
      if (u.state) {
        stateCounts[u.state] = (stateCounts[u.state] || 0) + 1;
      }

      // Referrers
      const ref = u.appReferer || u.usedReferralCode || "Direct";
      refCounts[ref] = (refCounts[ref] || 0) + 1;
    });

    const topState = Object.entries(stateCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
    const sortedRefs = Object.entries(refCounts).sort((a, b) => b[1] - a[1]);

    return {
      avgWeight: (totalW / filteredData.length || 0).toFixed(1),
      highestWeight: highW,
      lowestWeight: lowW === 999 ? 0 : lowW,
      avgHeight: (totalH / filteredData.length || 0).toFixed(1),
      highestHeight: highH,
      lowestHeight: lowH === 999 ? 0 : lowH,
      avgIdealWeight: (totalIW / filteredData.length || 0).toFixed(1),
      topState,
      refPerformance: {
        highest: sortedRefs[0]?.[0] || "N/A",
        lowest: sortedRefs[sortedRefs.length - 1]?.[0] || "N/A"
      }
    };
  }, [filteredData, reportType]);

  const reportOptions = [
    { label: "All Users", value: "users" },
    { label: "Appointments", value: "appointments" },
    { label: "Reschedule Appointments", value: "reschedule" },
    { label: "Orders", value: "orders" },
    { label: "User Video Watch", value: "video" },
  ];

  const renderTable = () => {
    if (loading) return <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-600"></div></div>;
    if (filteredData.length === 0) return <div className="text-center p-10 text-gray-500 font-medium">No records found matching your filters.</div>;

    if (checklistReportEnabled) {
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] text-gray-400 uppercase bg-gray-50/50 font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Patient</th>
                <th className="px-6 py-4 whitespace-nowrap">Assigned Plan</th>
                <th className="px-4 py-4 text-center whitespace-nowrap">Day</th>
                <th className="px-4 py-4 text-center whitespace-nowrap">Water Intake</th>
                <th className="px-4 py-4 text-center whitespace-nowrap">Exercise</th>
                <th className="px-4 py-4 text-center whitespace-nowrap">Green Juice</th>
                <th className="px-4 py-4 text-center whitespace-nowrap">Pranayama</th>
                <th className="px-4 py-4 text-center whitespace-nowrap">Sleep Hours</th>
                <th className="px-4 py-4 text-center whitespace-nowrap">Weight</th>
                <th className="px-6 py-4 whitespace-nowrap">Mistakes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredData.map((item) => (
                <tr key={item._id} className="bg-white hover:bg-gray-50/80 transition-colors text-xs">
                  <td className="px-6 py-4 font-semibold text-gray-900 whitespace-nowrap">
                    {item.userId?.name || "Unknown"} {item.userId?.surname || ""}
                  </td>
                  <td className="px-6 py-4 text-indigo-600 font-bold whitespace-nowrap">
                    {item.planId?.name || "N/A"}
                  </td>
                  <td className="px-4 py-4 text-gray-500 font-bold text-center whitespace-nowrap">
                    Day {item.day}
                  </td>
                  <td className="px-4 py-4 text-gray-700 text-center whitespace-nowrap">
                    {item.waterIntake || 0} times
                  </td>
                  <td className="px-4 py-4 text-gray-700 text-center whitespace-nowrap">
                    {item.exerciseMinutes || 0} mins
                  </td>
                  <td className="px-4 py-4 text-gray-700 text-center whitespace-nowrap">
                    {item.greenJuice || 0} times
                  </td>
                  <td className="px-4 py-4 text-gray-700 text-center whitespace-nowrap">
                    {item.pranayamaMinutes || 0} mins
                  </td>
                  <td className="px-4 py-4 text-gray-700 text-center whitespace-nowrap">
                    {item.sleepHours || 0} hrs
                  </td>
                  <td className="px-4 py-4 text-gray-500 text-center whitespace-nowrap">
                    {item.todayWeight ? `${item.todayWeight} kg` : "-"}
                  </td>
                  <td className="px-6 py-4 text-rose-600 italic font-medium max-w-[150px] truncate" title={item.dietMistake}>
                    {item.dietMistake || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    switch (reportType) {
      case "users":
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-gray-400 uppercase bg-gray-50/50 font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Mobile</th>
                  <th className="px-6 py-4">Responsible Doctor</th>
                  <th className="px-6 py-4">City / State</th>
                  <th className="px-6 py-4">DOB</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredData.map((item) => {
                  const userBranchId = String(item.branch?._id || item.branch || "");
                  const assignedDoctors = allDoctors.filter(d =>
                    (Array.isArray(d.fullBranches) ? d.fullBranches : []).some(b => String(b._id) === userBranchId)
                  ).map(d => d.username).join(", ") || "No Doctor Assigned";

                  return (
                    <tr key={item._id} className="bg-white hover:bg-gray-50/80 transition-colors text-xs">
                      <td className="px-6 py-4 font-semibold text-gray-900">{item.name} {item.surname}</td>
                      <td className="px-6 py-4 text-gray-500 font-medium">{item.mobileNumber}</td>
                      <td className="px-6 py-4 text-indigo-600 font-bold">{assignedDoctors}</td>
                      <td className="px-6 py-4 text-gray-500">{item.city || 'N/A'}, {item.state || 'N/A'}</td>
                      <td className="px-6 py-4 text-gray-500">{item.dob || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${item.isDeleted || item.isBlocked ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                          }`}>
                          {item.isDeleted || item.isBlocked ? "Inactive" : "Active"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );

      case "orders":
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-gray-400 uppercase bg-gray-50/50 font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Order ID</th>
                  <th className="px-6 py-4">Patient</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredData.map((item) => (
                  <tr key={item._id} className="bg-white hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900 text-xs">#{item._id.slice(-6).toUpperCase()}</td>
                    <td className="px-6 py-4 font-semibold">{item.userId?.name} {item.userId?.surname}</td>
                    <td className="px-6 py-4 text-gray-500">{item.userId?.mobileNumber}</td>
                    <td className="px-6 py-4 font-black text-gray-900">₹{item.totalAmount}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${item.orderStatus === "delivered" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                        }`}>
                        {item.orderStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{new Date(item.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "video":
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-gray-400 uppercase bg-gray-50/50 font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Patient</th>
                  <th className="px-6 py-4">Progress</th>
                  <th className="px-6 py-4">Plan</th>
                  <th className="px-6 py-4">Branch</th>
                  <th className="px-6 py-4">Language</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredData.map((item) => (
                  <tr key={item._id} className="bg-white hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900">{item.name} {item.surname}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, (item.planCurrentDay / 30) * 100)}%` }}></div>
                        </div>
                        <span className="text-[10px] font-black text-indigo-600 uppercase">Day {item.planCurrentDay}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{item.plan?.name || "N/A"}</td>
                    <td className="px-6 py-4 text-gray-600">{item.branch?.name || "N/A"}</td>
                    <td className="px-6 py-4 capitalize text-gray-500">{item.language || "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "reschedule":
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-gray-400 uppercase bg-gray-50/50 font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Admin/Doctor</th>
                  <th className="px-6 py-4">Event Details</th>
                  <th className="px-6 py-4">Branch</th>
                  <th className="px-6 py-4">IP Address</th>
                  <th className="px-6 py-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredData.map((item) => (
                  <tr key={item._id} className="bg-white hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900">{item.user?.username || 'System'}</td>
                    <td className="px-6 py-4 text-gray-700 italic">"{item.action}"</td>
                    <td className="px-6 py-4 text-gray-600">{item.branch?.name || "Global"}</td>
                    <td className="px-6 py-4 text-[10px] font-mono text-gray-400">{item.ipAddress}</td>
                    <td className="px-6 py-4 text-gray-500">{new Date(item.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "appointments":
      default:
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-gray-400 uppercase bg-gray-50/50 font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Patient</th>
                  <th className="px-6 py-4">Assigned Doctor</th>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredData.map((item) => (
                  <tr key={item._id} className="bg-white hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900">{item.userId?.name} {item.userId?.surname}</td>
                    <td className="px-6 py-4 font-medium text-indigo-600">{item.doctor?.username || "Unassigned"}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold">{item.date}</span>
                        <span className="text-[10px] text-gray-400 uppercase">{item.startTime} - {item.endTime}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 capitalize font-bold text-xs">{item.status}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${item.type === 1 ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                        }`}>
                        {item.type === 1 ? "Online" : "Offline"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
    }
  };

  const resetAllFilters = () => {
    setSearchTerm("");
    setSelectedBranchId("");
    setSelectedDoctorId("");
    setSelectedPlanId("");
    setSelectedMedicalCondition("");
    setSelectedGender("");
    setSelectedAge("");
    setSelectedCity("");
    setSelectedState("");
    setSelectedAppReference("");
    setStatusFilter("all");
    setSelectedVideoWatchStatus("");
    setSelectedVideoLanguage("");
    setSelectedConsultingType("");
    setSkipBodyMeasurement("");
    setSelectedResultStatus("");
    setSelectedLanguage("");
    setStartDate("");
    setEndDate("");
    setChecklistReportEnabled(false);
    setFilterWater("");
    setFilterExercise("");
    setFilterJuice("");
    setFilterPranayama("");
    setFilterSleep("");
    setLocalOnlineFilter("");
  };

  return (
    <RoleGuard allow={["Admin", "subadmin"]}>
      <div className="w-full h-full px-6 py-6 flex flex-col gap-6 bg-gray-50/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-8 bg-white rounded-[2rem] border border-gray-100 shadow-sm relative z-40">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>
          <div className="flex flex-col relative z-10">
            <Header size="4xl" className="flex items-center gap-3">
              <MdSummarize className="text-indigo-600" />
              Advanced Reports
            </Header>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-[0.2em] mt-2">Operational Analytics & Patient Tracking</p>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <div className="w-64">
              <Dropdown
                options={[
                  { label: "User", value: "user" },
                  { label: "Doctor", value: "doctor" }
                ]}
                value={viewType}
                onChange={setViewType}
                placeholder="Select View"
              />
            </div>
          </div>
        </div>

        {/* Summary Stat Cards - Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group transition-all hover:shadow-md">
            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Results</span>
              <div className="flex items-end gap-2 mt-2">
                <span className="text-4xl font-black text-gray-900 leading-none">{filteredData.length}</span>
                <div className="flex flex-col ml-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter leading-tight">Records Found</span>
                  <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-tighter leading-tight">
                    {totalUserCount > 0 ? ((filteredData.length / totalUserCount) * 100).toFixed(1) : 0}% of All Users
                  </span>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <div className="w-full h-1 bg-gray-50 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 w-full opacity-20"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group transition-all hover:shadow-md">
            <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Status</span>
              <div className="flex items-end gap-2 mt-2">
                <span className="text-4xl font-black text-green-600 leading-none">{activeCount}</span>
                <div className="flex flex-col ml-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter leading-tight">
                    {filteredData.length > 0 ? ((activeCount / filteredData.length) * 100).toFixed(1) : 0}% of Filter
                  </span>
                  <span className="text-[10px] font-bold text-green-500 uppercase tracking-tighter leading-tight">
                    {totalUserCount > 0 ? ((activeCount / totalUserCount) * 100).toFixed(1) : 0}% of All
                  </span>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <div className="w-full h-1 bg-gray-50 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 transition-all duration-500" style={{
                    width: `${filteredData.length > 0 ? (activeCount / filteredData.length) * 100 : 0}%`
                  }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group transition-all hover:shadow-md">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Inactive Status</span>
              <div className="flex items-end gap-2 mt-2">
                <span className="text-4xl font-black text-red-600 leading-none">{inactiveCount}</span>
                <div className="flex flex-col ml-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter leading-tight">
                    {filteredData.length > 0 ? ((inactiveCount / filteredData.length) * 100).toFixed(1) : 0}% of Filter
                  </span>
                  <span className="text-[10px] font-bold text-red-500 uppercase tracking-tighter leading-tight">
                    {totalUserCount > 0 ? ((inactiveCount / totalUserCount) * 100).toFixed(1) : 0}% of All
                  </span>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <div className="w-full h-1 bg-gray-50 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 transition-all duration-500" style={{
                    width: `${filteredData.length > 0 ? (inactiveCount / filteredData.length) * 100 : 0}%`
                  }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* New Analytics Boxes - Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
            <div className="absolute top-0 left-0 w-full h-1 bg-blue-400"></div>
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Avg Weight & Height</span>
            <div className="mt-3 flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-600">Weight</span>
                <span className="text-lg font-black text-gray-900">{advancedStats.avgWeight} kg</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase">
                <span>H: {advancedStats.highestWeight}</span>
                <span>L: {advancedStats.lowestWeight}</span>
              </div>
              <div className="h-0.5 bg-gray-50 mt-1"></div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs font-bold text-gray-600">Height</span>
                <span className="text-lg font-black text-gray-900">{advancedStats.avgHeight} cm</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
            <div className="absolute top-0 left-0 w-full h-1 bg-purple-400"></div>
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Ideal Weight & Geography</span>
            <div className="mt-3 flex flex-col gap-2">
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Avg Ideal Weight</span>
                <span className="text-xl font-black text-purple-600">{advancedStats.avgIdealWeight} kg</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Top Booking State</span>
                <span className="text-sm font-black text-gray-800 truncate">{advancedStats.topState}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
            <div className="absolute top-0 left-0 w-full h-1 bg-amber-400"></div>
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Referral Performance</span>
            <div className="mt-3 flex flex-col gap-2">
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase block text-amber-600">Highest Source</span>
                <span className="text-sm font-black text-gray-800 truncate">{advancedStats.refPerformance.highest}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase block text-gray-400">Lowest Source</span>
                <span className="text-sm font-black text-gray-600 truncate">{advancedStats.refPerformance.lowest}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
            <div className="absolute top-0 left-0 w-full h-1 bg-rose-400"></div>
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Engagement Overview</span>
            <div className="mt-3 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Video Viewers</span>
                <span className="text-lg font-black text-rose-500">
                  {filteredData.filter(item => {
                    const u = checklistReportEnabled || reportType === 'appointments' || reportType === 'orders' ? item.userId : (reportType === 'reschedule' ? item.user : item);
                    return u?.seeVideo;
                  }).length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Answered Qs</span>
                <span className="text-lg font-black text-rose-500">
                  {filteredData.filter(item => {
                    const u = checklistReportEnabled || reportType === 'appointments' || reportType === 'orders' ? item.userId : (reportType === 'reschedule' ? item.user : item);
                    return u?.giveAnswer;
                  }).length}
                </span>
              </div>
            </div>
          </div>
        </div>        {/* Ultra-Compact 6-Column Precision Grid */}
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm relative overflow-visible">
          <div className="px-6 py-5 flex flex-col gap-5">
            {/* Row 1: Core & Identity */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black text-indigo-600 uppercase tracking-widest px-1">Report</label>
                <Dropdown options={reportOptions} value={reportType} onChange={(val) => { setReportType(val); setRawData([]); setSearchTerm(""); }} placeholder="Report" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black text-indigo-600 uppercase tracking-widest px-1">Branch</label>
                <Dropdown options={[{ label: "All Branches", value: "" }, ...(allBranches || []).map(b => ({ label: b.name, value: b._id }))]} value={selectedBranchId} onChange={setSelectedBranchId} placeholder="Branch" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black text-indigo-600 uppercase tracking-widest px-1">Doctor</label>
                <Dropdown options={[{ label: "All Doctors", value: "" }, ...(allDoctors || []).filter(d => { const docBranches = Array.isArray(d.fullBranches) ? d.fullBranches : []; return !selectedBranchId || docBranches.some(b => String(b._id || b) === String(selectedBranchId)); }).map(d => ({ label: d.username || d.name || "Unknown", value: d._id }))]} value={selectedDoctorId} onChange={setSelectedDoctorId} placeholder="Doctor" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black text-indigo-600 uppercase tracking-widest px-1">Plan</label>
                <Dropdown options={[{ label: "All Plans", value: "" }, ...(allPlans || []).map(p => ({ label: p.name, value: p._id }))]} value={selectedPlanId} onChange={setSelectedPlanId} placeholder="Plan" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black text-teal-600 uppercase tracking-widest px-1">Medical</label>
                <Dropdown options={[{ label: "All Conditions", value: "" }, ...medicalConditions.map(m => ({ label: m.name, value: m.name }))]} value={selectedMedicalCondition} onChange={setSelectedMedicalCondition} placeholder="Condition" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black text-teal-600 uppercase tracking-widest px-1">Gender</label>
                <Dropdown options={[{ label: "All Genders", value: "" }, { label: "Male", value: "male" }, { label: "Female", value: "female" }]} value={selectedGender} onChange={setSelectedGender} />
              </div>
            </div>

            {/* Row 2: Demographics & Geography */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black text-teal-600 uppercase tracking-widest px-1">Age</label>
                <input type="number" placeholder="Exact Age..." value={selectedAge} onChange={(e) => setSelectedAge(e.target.value)} className="w-full h-[40px] px-3 bg-gray-50/50 border border-gray-100 rounded-xl text-xs font-medium focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:bg-white transition-all" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest px-1">City</label>
                <input type="text" placeholder="City..." value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} className="w-full h-[40px] px-3 bg-gray-50/50 border border-gray-100 rounded-xl text-xs font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest px-1">State</label>
                <input type="text" placeholder="State..." value={selectedState} onChange={(e) => setSelectedState(e.target.value)} className="w-full h-[40px] px-3 bg-gray-50/50 border border-gray-100 rounded-xl text-xs font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest px-1">Source</label>
                <Dropdown options={[{ label: "All Sources", value: "" }, ...appReferences.map(r => ({ label: r.name, value: r.name }))]} value={selectedAppReference} onChange={setSelectedAppReference} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest px-1">Status</label>
                <Dropdown options={[{ label: "All Status", value: "all" }, { label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }]} value={statusFilter} onChange={setStatusFilter} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest px-1">Branch City Online</label>
                <Dropdown options={[{ label: "All Bookings", value: "" }, { label: "Local Online Only", value: "local_online" }]} value={localOnlineFilter} onChange={setLocalOnlineFilter} />
              </div>
            </div>

            {/* Row 3: Engagement & Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black text-violet-600 uppercase tracking-widest px-1">Video Watch</label>
                <Dropdown options={[{ label: "All", value: "" }, { label: "Watched", value: "watched" }, { label: "Not Watched", value: "not_watched" }]} value={selectedVideoWatchStatus} onChange={setSelectedVideoWatchStatus} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black text-violet-600 uppercase tracking-widest px-1">Video Lang.</label>
                <Dropdown options={[{ label: "All Lang", value: "" }, { label: "English", value: "en" }, { label: "Hindi", value: "hi" }, { label: "Gujarati", value: "gu" }]} value={selectedVideoLanguage} onChange={setSelectedVideoLanguage} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black text-violet-600 uppercase tracking-widest px-1">Appoint. Type</label>
                <Dropdown options={[{ label: "All Types", value: "" }, { label: "Online", value: "1" }, { label: "Offline", value: "2" }]} value={selectedConsultingType} onChange={setSelectedConsultingType} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black text-violet-600 uppercase tracking-widest px-1">Body Stats</label>
                <Dropdown options={[{ label: "Show All", value: "" }, { label: "With Data", value: "with" }, { label: "Missing Data", value: "skip" }]} value={skipBodyMeasurement} onChange={setSkipBodyMeasurement} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black text-violet-600 uppercase tracking-widest px-1">Ans Status</label>
                <Dropdown options={[{ label: "All", value: "" }, { label: "Passed", value: "passed" }, { label: "Failed", value: "failed" }]} value={selectedResultStatus} onChange={setSelectedResultStatus} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black text-violet-600 uppercase tracking-widest px-1">Language</label>
                <Dropdown options={[{ label: "All", value: "" }, { label: "English", value: "en" }, { label: "Hindi", value: "hi" }, { label: "Gujarati", value: "gu" }]} value={selectedLanguage} onChange={setSelectedLanguage} />
              </div>
            </div>

            {/* Row 4: Search, Timeline & Checklist Report */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
              <div className="lg:col-span-3 flex flex-col gap-1">
                <label className="text-[9px] font-black text-indigo-600 uppercase tracking-widest px-1">Global Patient Search</label>
                <div className="relative">
                  <input type="text" placeholder="Name, mobile or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full h-[40px] pl-10 pr-4 bg-gray-50/50 border border-gray-100 rounded-xl text-xs font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all" />
                  <MdSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                </div>
              </div>
              <div className="lg:col-span-4 flex flex-col gap-1">
                <label className="text-[9px] font-black text-indigo-600 uppercase tracking-widest px-1">Timeline Scope</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-[40px] px-3 bg-gray-50/50 border border-gray-100 rounded-xl text-[10px] font-bold focus:outline-none focus:bg-white transition-all" />
                  </div>
                  <span className="text-gray-300 font-bold text-[10px] uppercase">To</span>
                  <div className="flex-1 relative">
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-[40px] px-3 bg-gray-50/50 border border-gray-100 rounded-xl text-[10px] font-bold focus:outline-none focus:bg-white transition-all" />
                  </div>
                </div>
              </div>
              <div className="lg:col-span-3 flex flex-col gap-1">
                <label className="text-[9px] font-black text-violet-600 uppercase tracking-widest px-1">Daily Checklist Report</label>
                <Dropdown 
                  options={[
                    { label: "Normal (Disabled)", value: "disabled" },
                    { label: "Show Daily Checklist Data", value: "enabled" }
                  ]} 
                  value={checklistReportEnabled ? "enabled" : "disabled"} 
                  onChange={(val) => {
                    setChecklistReportEnabled(val === "enabled");
                    if (val !== "enabled") {
                      setFilterWater("");
                      setFilterExercise("");
                      setFilterJuice("");
                      setFilterPranayama("");
                      setFilterSleep("");
                    }
                  }} 
                />
              </div>
              <div className="lg:col-span-2 flex flex-col gap-1">
                <button
                  type="button"
                  onClick={resetAllFilters}
                  title="Reset All Filters"
                  className="w-full h-[40px] bg-gray-50 text-gray-600 border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <MdRefresh size={18} className="transition-transform group-hover:rotate-180" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Row 5: Dynamic Checklist Filters */}
            {checklistReportEnabled && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-3 pt-3 mt-3 border-t border-gray-100 border-dashed">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black text-teal-600 uppercase tracking-widest px-1 flex items-center gap-1"><MdWaterDrop/> Water Intake</label>
                  <input type="number" placeholder="Exact times..." value={filterWater} onChange={(e) => setFilterWater(e.target.value)} className="w-full h-[40px] px-3 bg-gray-50/50 border border-gray-100 rounded-xl text-xs font-medium focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:bg-white transition-all" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black text-orange-600 uppercase tracking-widest px-1 flex items-center gap-1"><MdFitnessCenter/> Exercise</label>
                  <input type="number" placeholder="Exact mins..." value={filterExercise} onChange={(e) => setFilterExercise(e.target.value)} className="w-full h-[40px] px-3 bg-gray-50/50 border border-gray-100 rounded-xl text-xs font-medium focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:bg-white transition-all" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest px-1 flex items-center gap-1"><MdLocalDrink/> Green Juice</label>
                  <input type="number" placeholder="Exact times..." value={filterJuice} onChange={(e) => setFilterJuice(e.target.value)} className="w-full h-[40px] px-3 bg-gray-50/50 border border-gray-100 rounded-xl text-xs font-medium focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black text-cyan-600 uppercase tracking-widest px-1 flex items-center gap-1"><MdSelfImprovement/> Pranayama</label>
                  <input type="number" placeholder="Exact mins..." value={filterPranayama} onChange={(e) => setFilterPranayama(e.target.value)} className="w-full h-[40px] px-3 bg-gray-50/50 border border-gray-100 rounded-xl text-xs font-medium focus:outline-none focus:ring-4 focus:ring-cyan-500/10 focus:bg-white transition-all" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black text-indigo-600 uppercase tracking-widest px-1 flex items-center gap-1"><MdBedtime/> Sleep Hours</label>
                  <input type="number" placeholder="Exact hours..." value={filterSleep} onChange={(e) => setFilterSleep(e.target.value)} className="w-full h-[40px] px-3 bg-gray-50/50 border border-gray-100 rounded-xl text-xs font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all" />
                </div>
              </div>
            )}
          </div>
        </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
        <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gradient-to-r from-gray-50/50 to-transparent">
          <h2 className="font-black text-gray-900 flex items-center gap-3 text-lg">
            <div className={`p-2 rounded-xl bg-white shadow-sm border border-gray-50`}>
              {reportType === 'users' && !checklistReportEnabled && <MdPerson className="text-indigo-500" />}
              {reportType === 'appointments' && !checklistReportEnabled && <MdCalendarMonth className="text-blue-500" />}
              {reportType === 'orders' && !checklistReportEnabled && <MdShoppingCart className="text-green-500" />}
              {reportType === 'video' && !checklistReportEnabled && <MdVideoLibrary className="text-purple-500" />}
              {reportType === 'reschedule' && !checklistReportEnabled && <MdHistory className="text-amber-500" />}
              {checklistReportEnabled && <MdSummarize className="text-teal-500" />}
            </div>
            {checklistReportEnabled ? "Daily Checklist" : reportOptions.find(o => o.value === reportType)?.label} Data
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black text-gray-400 bg-gray-100/80 px-4 py-2 rounded-full uppercase tracking-widest border border-gray-50">
              {filteredData.length} Results Found
            </span>
          </div>
        </div>

        <div className="p-0">
          {/* Active Filters Bar */}
          <div className="px-8 py-3 bg-white border-b border-gray-50 flex items-center gap-3 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Active Filters:</span>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold border border-indigo-100/50 flex items-center gap-1.5 whitespace-nowrap">
                <span className="opacity-50">Type:</span> {reportOptions.find(o => o.value === reportType)?.label}
              </span>
              {selectedBranchId && (
                <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold border border-blue-100/50 flex items-center gap-1.5 whitespace-nowrap">
                  <span className="opacity-50">Branch:</span> {allBranches.find(b => b._id === selectedBranchId)?.name}
                </span>
              )}
              {selectedDoctorId && (
                <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-[10px] font-bold border border-purple-100/50 flex items-center gap-1.5 whitespace-nowrap">
                  <span className="opacity-50">Doctor:</span> {allDoctors.find(d => d._id === selectedDoctorId)?.username || "Selected Doctor"}
                </span>
              )}
              {selectedMedicalCondition && (
                <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[10px] font-bold border border-rose-100/50 flex items-center gap-1.5 whitespace-nowrap">
                  <span className="opacity-50">Disease:</span> {selectedMedicalCondition}
                </span>
              )}
              {selectedCity && (
                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold border border-emerald-100/50 flex items-center gap-1.5 whitespace-nowrap">
                  <span className="opacity-50">City:</span> {selectedCity}
                </span>
              )}
              {selectedState && (
                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold border border-emerald-100/50 flex items-center gap-1.5 whitespace-nowrap">
                  <span className="opacity-50">State:</span> {selectedState}
                </span>
              )}
              {statusFilter !== "all" && (
                <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-bold border border-green-100/50 flex items-center gap-1.5 whitespace-nowrap">
                  <span className="opacity-50">Status:</span> {statusFilter}
                </span>
              )}
              {localOnlineFilter === "local_online" && (
                <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold border border-blue-100/50 flex items-center gap-1.5 whitespace-nowrap">
                  <span className="opacity-50">Booking:</span> Local Online
                </span>
              )}
              {selectedGender && (
                <span className="px-3 py-1 bg-pink-50 text-pink-600 rounded-full text-[10px] font-bold border border-pink-100/50 flex items-center gap-1.5 whitespace-nowrap">
                  <span className="opacity-50">Gender:</span> {selectedGender}
                </span>
              )}
              {selectedAge && (
                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold border border-indigo-100/50 flex items-center gap-1.5 whitespace-nowrap">
                  <span className="opacity-50">Age:</span> {selectedAge}
                </span>
              )}
              {selectedVideoWatchStatus && (
                <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-bold border border-amber-100/50 flex items-center gap-1.5 whitespace-nowrap">
                  <span className="opacity-50">Video:</span> {selectedVideoWatchStatus}
                </span>
              )}
              {searchTerm && (
                <span className="px-3 py-1 bg-slate-50 text-slate-600 rounded-full text-[10px] font-bold border border-slate-100/50 flex items-center gap-1.5 whitespace-nowrap">
                  <span className="opacity-50">Search:</span> "{searchTerm}"
                </span>
              )}
            </div>
          </div>
          {renderTable()}
        </div>
      </div>
      </div>
    </RoleGuard>
  );
};

export default ReportsPage;
