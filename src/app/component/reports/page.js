"use client";
import React, { useState, useEffect, useMemo } from "react";
import RoleGuard from "@/components/RoleGuard";
import { Header, Button } from "@/utils/header";
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
  getDailyChecklists,
  getScreenUsages,
  getStocks,
  getVideoReports,
  listVideos
} from "@/Api/AllApi";
import Dropdown from "@/utils/dropdown";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";
import { exportToExcel } from "@/utils/excelExport";
import { FiDownload } from "react-icons/fi";
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

const screenFields = [
  { key: "welcomeScreen", label: "Welcome" },
  { key: "loginScreen", label: "Login" },
  { key: "registerScreen", label: "Register" },
  { key: "appReferenceScreen", label: "App Referral Reference" },
  { key: "languageScreen", label: "Language Screen" },
  { key: "testimonialScreen", label: "Testimonials" },
  { key: "trialVideoBookSuccessScreen", label: "Trial Video Book Success" },
  { key: "programVideoQuestionScreen", label: "Program Video Question" },
  { key: "occupationScreen", label: "Occupation" },
  { key: "locationScreen", label: "Location" },
  { key: "dateOfBirthScreen", label: "DOB Screen" },
  { key: "weightScreen", label: "Weight Screen" },
  { key: "heightScreen", label: "Height Screen" },
  { key: "idealWeightScreen", label: "Ideal Weight" },
  { key: "bodyMeasurementScreen", label: "Body Measurement" },
  { key: "medicalConditionScreen", label: "Medical Condition" },
  { key: "programInquiryScreen", label: "Program Inquiry" },
  { key: "appointmentScreen", label: "Appointment" },
  { key: "appointmentBookScreen", label: "Appointment Book" },
  { key: "waitForDoctorScreen", label: "Wait For Doctor" },
  { key: "videoCallScreen", label: "Video Call" },
  { key: "feedbackScreen", label: "Feedback" },
  { key: "programDetailsScreen", label: "Program Details" },
  { key: "cartScreen", label: "Cart" },
  { key: "addressScreen", label: "Address" },
  { key: "addAddressScreen", label: "Add Address" },
  { key: "editAddressScreen", label: "Edit Address" },
  { key: "waitingScreen", label: "Waiting Screen" },
  { key: "programPurchaseScreen", label: "Program Purchase" },
  { key: "homeScreen", label: "Home" },
  { key: "productScreen", label: "Products" },
  { key: "sessionScreen", label: "Sessions" },
  { key: "moreScreen", label: "More" },
  { key: "customerSupportChatScreen", label: "Customer Support Chat" },
  { key: "dayProgramVideosScreen", label: "Day Program Videos" },
  { key: "programVideoDetailsScreen", label: "Program Video Details" },
  { key: "productDetailsScreen", label: "Product Details" },
  { key: "profileScreen", label: "Profile" },
  { key: "orderHistoryScreen", label: "Order History" },
  { key: "wishlistScreen", label: "Wishlist" },
  { key: "myProgressScreen", label: "My Progress" },
  { key: "referenceScreen", label: "Reference Screen" },
  { key: "myReferenceScreen", label: "My Reference" },
  { key: "editProfileScreen", label: "Edit Profile" },
  { key: "notificationSettingScreen", label: "Notification Setting" },
  { key: "selectLanguageScreen", label: "Select Language" },
  { key: "allFeedbackScreen", label: "All Feedback" },
  { key: "faqScreen", label: "FAQ" },
  { key: "contactUsScreen", label: "Contact Us" },
  { key: "aboutUsScreen", label: "About Us" },
  { key: "termsConditionsScreen", label: "Terms & Conditions" },
  { key: "privacyPolicyScreen", label: "Privacy Policy" },
  { key: "refundPolicyScreen", label: "Refund Policy" }
];

const formatPercent = (value, total) => {
  const numericValue = Number(value) || 0;
  const numericTotal = Number(total) || 0;
  if (numericTotal <= 0) return "0.0";

  return Math.min(100, Math.max(0, (numericValue / numericTotal) * 100)).toFixed(1);
};

const ReportsPage = () => {
  const { role, branches } = useAuth();
  const [reportType, setReportType] = useState("users");
  const [viewType, setViewType] = useState("user"); // user | doctor
  const [loading, setLoading] = useState(false);
  const [rawData, setRawData] = useState([]);
  const [allUsersList, setAllUsersList] = useState([]);

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
  const [usedReferralFilter, setUsedReferralFilter] = useState(""); // "" | "has_used" | "not_used"
  const appReferenceOptions = useMemo(() => {
    const options = [{ label: "All Sources", value: "" }];
    appReferences.forEach(r => {
      options.push({ label: r.name, value: r.name });
    });
    if (!appReferences.some(r => r.name === "App Referral")) {
      options.push({ label: "App Referral", value: "App Referral" });
    }
    return options;
  }, [appReferences]);
  const [selectedVideoLanguage, setSelectedVideoLanguage] = useState("");
  const [selectedConsultingType, setSelectedConsultingType] = useState(""); // online | offline
  const [selectedVideoWatchStatus, setSelectedVideoWatchStatus] = useState(""); // watched | not_watched
  const [selectedResultStatus, setSelectedResultStatus] = useState("");
  const [selectedAppointmentStatus, setSelectedAppointmentStatus] = useState("");
  const [screenUsages, setScreenUsages] = useState([]);
  const [screenDateFilter, setScreenDateFilter] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [localOnlineFilter, setLocalOnlineFilter] = useState("");
  const [rescheduleFilter, setRescheduleFilter] = useState(""); // "" (All) | "rescheduled" | "non_rescheduled"
  const [checklistReportEnabled, setChecklistReportEnabled] = useState(false);

  // Daily Checklist Specific Filters
  const [filterWater, setFilterWater] = useState("");
  const [filterExercise, setFilterExercise] = useState("");
  const [filterJuice, setFilterJuice] = useState("");
  const [filterPranayama, setFilterPranayama] = useState("");
  const [filterSleep, setFilterSleep] = useState("");
  const [productReportSubView, setProductReportSubView] = useState("highest_revenue"); // highest_revenue | normal_stock
  const [itemTypeFilter, setItemTypeFilter] = useState("all"); // all | Product | Plan

  // Video Reports Specific State
  const [allVideos, setAllVideos] = useState([]);
  const [selectedVideoId, setSelectedVideoId] = useState("");
  const [selectedMinPercentageOption, setSelectedMinPercentageOption] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

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
    // Reset page to 1 when filters change
    setCurrentPage(1);
  }, [reportType, selectedBranchId, selectedPlanId, startDate, endDate, selectedCity, checklistReportEnabled, screenDateFilter, viewType, productReportSubView, allPlans, selectedVideoId, selectedMinPercentageOption]);

  const fetchInitialData = async () => {
    try {
      const [branchList, planList, subAdmins, allUsers, medicalList, referenceList, videoList] = await Promise.all([
        getAllBranches().catch((e) => { console.error("Error loading branches", e); return []; }),
        getAllPlans().catch((e) => { console.error("Error loading plans", e); return []; }),
        listSubAdmins().catch((e) => { console.error("Error loading doctors", e); return []; }),
        getAllUsers().catch((e) => { console.error("Error loading users", e); return []; }),
        getAllMedicalConditions().catch((e) => { console.error("Error loading medical conditions", e); return []; }),
        getAllAppReferences().catch((e) => { console.error("Error loading app references", e); return []; }),
        listVideos().catch((e) => { console.error("Error loading videos", e); return []; })
      ]);
      setAllVideos(videoList || []);

      setMedicalConditions(medicalList || []);
      setAppReferences(referenceList || []);
      setAllUsersList(allUsers || []);

      const doctors = (subAdmins || []).filter(s => {
        const type = String(s.adminType || "").toLowerCase();
        const role = String(s.role || "").toLowerCase();
        return type.includes("sub") || role.includes("doctor") || role.includes("subadmin");
      });

      let filteredBranches = branchList || [];
      const currentRole = String(role || "").toLowerCase();

      const assignedBranchIds = Array.isArray(branches)
        ? branches.map(b => String(b._id || b))
        : [];
      const isMainBranchStaff = currentRole !== "admin" && filteredBranches.some(
        b => assignedBranchIds.includes(String(b._id)) && b.isMainBranch
      );

      if (role && currentRole !== "admin" && !isMainBranchStaff) {
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

      if (currentRole !== "admin" && !isMainBranchStaff && filteredBranches.length > 0) {
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

      if (viewType === "videoReports") {
        const params = {};
        if (selectedVideoId) params.videoId = selectedVideoId;
        if (selectedMinPercentageOption) params.minPercentage = selectedMinPercentageOption;
        const videoReportsData = await getVideoReports(params);
        result = videoReportsData || [];
      } else if (viewType === "highest_selling_products") {
        const [orderData, stockList] = await Promise.all([
          getAllOrders({ search: "", status: "", limit: 10000 }).catch(e => ({ orders: [] })),
          getStocks(selectedBranchId ? { branchId: selectedBranchId } : {}).catch(e => [])
        ]);
        const orders = orderData?.orders || [];
        const stocks = stockList || [];

        const productMap = {};

        // Pre-populate productMap with all plans from allPlans state so we show all plan data
        allPlans.forEach(p => {
          if (p && p._id) {
            productMap[p._id] = {
              _id: p._id,
              name: p.name || "Unknown Plan",
              type: "Plan",
              available: 0,
              sold: 0,
              orderSoldQty: 0,
              totalRevenue: 0
            };
          }
        });

        // Populate and aggregate from Stock list
        stocks.forEach(s => {
          const itemObj = s.productId || s.planId;
          if (itemObj) {
            const itemId = itemObj._id || itemObj;
            const availableStock = s.available || 0;
            const soldStock = s.sold || 0;

            if (!productMap[itemId]) {
              productMap[itemId] = {
                _id: itemId,
                name: itemObj.name || "Unknown Item",
                type: s.productId ? "Product" : "Plan",
                available: 0,
                sold: 0,
                orderSoldQty: 0,
                totalRevenue: 0
              };
            }
            productMap[itemId].available += availableStock;
            productMap[itemId].sold += soldStock;
          }
        });

        // Populate/Update from Orders
        orders.forEach(o => {
          if (selectedBranchId) {
            const oBranchId = o.branchId?._id || o.branchId || null;
            const targetBranch = selectedBranchId === "null" ? null : selectedBranchId;
            if (String(oBranchId) !== String(targetBranch)) {
              return;
            }
          }

          if (startDate || endDate) {
            const orderDate = new Date(o.createdAt);
            if (startDate && orderDate < new Date(startDate)) return;
            if (endDate) {
              const end = new Date(endDate);
              end.setHours(23, 59, 59, 999);
              if (orderDate > end) return;
            }
          }

          if (Array.isArray(o.products)) {
            o.products.forEach(p => {
              const productObj = p.productId || p.product;
              if (productObj) {
                const pId = productObj._id || productObj;
                if (!productMap[pId]) {
                  productMap[pId] = {
                    _id: pId,
                    name: productObj.name || p.name || "Unknown Product",
                    type: "Product",
                    available: 0,
                    sold: 0,
                    orderSoldQty: 0,
                    totalRevenue: 0
                  };
                }
                productMap[pId].orderSoldQty += (p.quantity || 1);
                productMap[pId].totalRevenue += ((p.price || productObj.price || 0) * (p.quantity || 1));
              }
            });
          }
          if (Array.isArray(o.plans)) {
            o.plans.forEach(p => {
              const planObj = p.planId || p.plan;
              if (planObj) {
                const pId = planObj._id || planObj;
                if (!productMap[pId]) {
                  productMap[pId] = {
                    _id: pId,
                    name: planObj.name || p.name || "Unknown Plan",
                    type: "Plan",
                    available: 0,
                    sold: 0,
                    orderSoldQty: 0,
                    totalRevenue: 0
                  };
                }
                productMap[pId].orderSoldQty += (p.quantity || 1);
                productMap[pId].totalRevenue += ((p.price || planObj.price || 0) * (p.quantity || 1));
              }
            });
          }
        });

        // Convert to array and format with unified metrics
        const formattedList = Object.values(productMap).map(item => {
          const availableQty = item.available || 0;
          const soldQty = item.orderSoldQty || item.sold || 0;
          const totalQty = availableQty + soldQty;
          return {
            ...item,
            soldQty,
            totalQty,
            availableQty
          };
        });

        // Sort based on sub-view selection
        if (productReportSubView === "highest_sold") {
          result = formattedList.sort((a, b) => b.soldQty - a.soldQty);
        } else if (productReportSubView === "highest_revenue") {
          result = formattedList.sort((a, b) => b.totalRevenue - a.totalRevenue);
        } else {
          // normal_stock
          result = formattedList.sort((a, b) => a.name.localeCompare(b.name));
        }
      } else if (checklistReportEnabled) {
        const checklists = await getDailyChecklists({ limit: 10000 });
        result = checklists || [];
      } else {
        switch (reportType) {
          case "users":
            const allUserList = await getAllUsers();
            result = allUserList || [];
            break;
          case "screen":
            const allUsersForScreen = await getAllUsers();
            result = allUsersForScreen || [];

            const screenParams = { limit: 10000 };
            if (screenDateFilter) {
              screenParams.date = screenDateFilter;
            }
            try {
              const screenData = await getScreenUsages(screenParams);
              setScreenUsages(screenData?.docs || []);
            } catch (err) {
              console.error("Failed to fetch screen usages:", err);
              setScreenUsages([]);
            }
            break;
          case "reschedule":
            const logs = await getLogs({
              action: "update appointment",
              branchId: selectedBranchId,
              startDate,
              endDate
            });
            result = logs?.logs || [];
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
          case "videoReports":
            const videoReportsData = await getVideoReports({ minPercentage: selectedMinPercentageOption });
            result = videoReportsData || [];
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
    // Precompute used referral codes for "Sent Referrals" filter
    const allUsedReferralCodes = new Set();
    allUsersList.forEach(u => {
      if (u.usedReferralCode) {
        allUsedReferralCodes.add(u.usedReferralCode);
      }
    });

    return data.filter(item => {
      if (viewType === "videoReports") {
        const matchesSearch = !searchTerm ||
          (item.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.userSurname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.videoTitle?.english && item.videoTitle.english.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.videoTitle?.hindi && item.videoTitle.hindi.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.videoTitle?.gujarati && item.videoTitle.gujarati.toLowerCase().includes(searchTerm.toLowerCase())));
        return matchesSearch;
      }

      if (viewType === "highest_selling_products") {
        const matchesSearch = !searchTerm || item.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = itemTypeFilter === "all" || item.type === itemTypeFilter;
        return matchesSearch && matchesType;
      }

      if (reportType === 'videoReports') {
        const matchesSearch = !searchTerm ||
          (item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.surname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.mobileNumber?.includes(searchTerm) ||
            item.email?.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesSearch;
      }

      let user = null;
      if (checklistReportEnabled || reportType === 'appointments' || reportType === 'orders') {
        const uId = typeof item.userId === 'object' ? item.userId?._id : item.userId;
        user = allUsersList.find(u => String(u._id) === String(uId)) || item.userId;
      } else if (reportType === 'video' || reportType === 'users' || reportType === 'screen') {
        user = item;
      } else if (reportType === 'reschedule') {
        user = item.user;
      }

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
        if (reportType === 'orders' || reportType === 'video' || reportType === 'screen') return false;
      } else if (viewType === "user") {
        if (!user && reportType !== 'reschedule' && reportType !== 'appointments' && reportType !== 'orders') return false;
        if (!user && (reportType === 'users' || reportType === 'video' || reportType === 'screen')) return false;
        if (reportType === 'reschedule' && !user) return true;
      }

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesSearch =
          (user?.name || "").toLowerCase().includes(term) ||
          (user?.surname || "").toLowerCase().includes(term) ||
          (user?.mobileNumber || "").includes(term) ||
          (user?.username || "").toLowerCase().includes(term) ||
          (user?.email || "").toLowerCase().includes(term) ||
          (item._id || "").toLowerCase().includes(term);
        if (!matchesSearch) return false;
      }

      if (selectedBranchId) {
        const itemBranchId = item.branchId?._id || item.branchId || item.branch?._id || item.branch || user?.branch?._id || user?.branch;
        if (String(itemBranchId) !== String(selectedBranchId)) return false;
      }

      // Timeline Filter (Client-side for types that don't filter on server)
      if (reportType !== 'screen' && (startDate || endDate)) {
        const itemDate = new Date(item.createdAt || item.date || item.appointmentDate || item.timestamp);
        if (startDate && itemDate < new Date(startDate)) return false;
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (itemDate > end) return false;
        }
      }

      // If reschedule, bypass patient-specific filters
      if (reportType === 'reschedule') {
        return true;
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

      if (usedReferralFilter === "has_used" && !user?.usedReferralCode) return false;
      if (usedReferralFilter === "sent_referrals" && !allUsedReferralCodes.has(user?.referralCode)) return false;
      if (usedReferralFilter === "not_used" && user?.usedReferralCode) return false;

      if (selectedResultStatus === "passed" && !user?.giveAnswer) return false;
      if (selectedResultStatus === "failed" && user?.giveAnswer) return false;

      if (skipBodyMeasurement) {
        const hasMeasurement = (user?.waist && user?.waist != "0") || (user?.hip && user?.hip != "0");
        if (skipBodyMeasurement === "skip" && hasMeasurement) return false;
        if (skipBodyMeasurement === "with" && !hasMeasurement) return false;
      }

      if (reportType === 'video' && (item.planCurrentDay || 0) === 0) return false;

      if (selectedMedicalCondition && !user?.medicalDescription?.includes(selectedMedicalCondition)) return false;
      if (selectedAppReference) {
        const userSource = user?.appReferer || (user?.usedReferralCode ? "App Referral" : "Direct");
        if (userSource !== selectedAppReference) return false;
      }
      if (selectedVideoLanguage && user?.videoLanguage !== selectedVideoLanguage) return false;
      if (selectedConsultingType) {
        const type = String(item.appointmentType || user?.appointmentType || "");
        if (type !== selectedConsultingType) return false;
      }
      if (selectedVideoWatchStatus === "not_watched" && user?.seeVideo) return false;
      if (selectedVideoWatchStatus === "watched" && !user?.seeVideo) return false;

      if (reportType === 'appointments' && selectedAppointmentStatus) {
        if (item.status !== selectedAppointmentStatus) return false;
      }

      if (localOnlineFilter === "local_online") {
        const appType = String(item.appointmentType || user?.appointmentType || "");
        if (appType !== "1") return false; // 1 is Online
        const userCity = (user?.city || "").trim().toLowerCase();
        if (!userCity) return false;
        const hasBranchInCity = allBranches.some(b => b.city && b.city.trim().toLowerCase() === userCity);
        if (!hasBranchInCity) return false;
      }

      if (reportType === 'appointments' && rescheduleFilter) {
        const isAppRescheduled = !!item.isRescheduled;
        if (rescheduleFilter === 'rescheduled' && !isAppRescheduled) return false;
        if (rescheduleFilter === 'non_rescheduled' && isAppRescheduled) return false;
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
  }, [rawData, reportType, viewType, searchTerm, selectedBranchId, selectedPlanId, statusFilter, selectedGender, selectedLanguage, selectedCity, selectedState, selectedAge, selectedReferrer, skipBodyMeasurement, selectedDoctorId, allDoctors, selectedMedicalCondition, selectedAppReference, selectedVideoLanguage, selectedConsultingType, selectedVideoWatchStatus, selectedResultStatus, selectedAppointmentStatus, screenDateFilter, startDate, endDate, checklistReportEnabled, filterWater, filterExercise, filterJuice, filterPranayama, filterSleep, localOnlineFilter, allBranches, allUsersList, itemTypeFilter, usedReferralFilter]);

  // Reset page when any dependency of filteredData changes (i.e. filteredData itself updates)
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredData]);

  const sortedFilteredData = useMemo(() => {
    let data = [...filteredData];
    if (reportType === "screen") {
      data.sort((a, b) => {
        const usageA = screenUsages.find(su => String(su.userId?._id || su.userId) === String(a._id));
        const usageB = screenUsages.find(su => String(su.userId?._id || su.userId) === String(b._id));

        const countA = usageA ? Object.entries(usageA)
          .filter(([key, val]) => key.endsWith("Screen") && typeof val === "number")
          .reduce((sum, [_, val]) => sum + val, 0) : 0;

        const countB = usageB ? Object.entries(usageB)
          .filter(([key, val]) => key.endsWith("Screen") && typeof val === "number")
          .reduce((sum, [_, val]) => sum + val, 0) : 0;

        return countB - countA;
      });
    }
    return data;
  }, [filteredData, reportType, screenUsages]);

  const paginatedData = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return sortedFilteredData.slice(startIdx, startIdx + itemsPerPage);
  }, [sortedFilteredData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedFilteredData.length / itemsPerPage);

  const reportTotalCount = rawData.length;
  const reportTotalLabel = reportType === "users" || reportType === "video" || reportType === "screen"
    ? "All Users"
    : "All Records";

  const { activeCount, inactiveCount } = useMemo(() => {
    let active = 0;
    let inactive = 0;
    filteredData.forEach(item => {
      let user = null;
      if (checklistReportEnabled || reportType === 'appointments' || reportType === 'orders') {
        const uId = typeof item.userId === 'object' ? item.userId?._id : item.userId;
        user = allUsersList.find(u => String(u._id) === String(uId)) || item.userId;
      } else if (reportType === 'reschedule') {
        user = item.user;
      } else {
        user = item;
      }

      if (user?.isDeleted || user?.isBlocked) inactive++;
      else active++;
    });
    return { activeCount: active, inactiveCount: inactive };
  }, [filteredData, reportType, checklistReportEnabled, allUsersList]);

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
      let u = null;
      if (checklistReportEnabled || reportType === 'appointments' || reportType === 'orders') {
        const uId = typeof item.userId === 'object' ? item.userId?._id : item.userId;
        u = allUsersList.find(usr => String(usr._id) === String(uId)) || item.userId;
      } else if (reportType === 'reschedule') {
        u = item.user;
      } else {
        u = item;
      }

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
      const ref = u.appReferer || (u.usedReferralCode ? "App Referral" : "Direct");
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

  // Video Report Stats Calculation
  const videoReportStats = useMemo(() => {
    if (viewType !== "videoReports" || !filteredData.length) {
      return {
        totalUsers: 0,
        avgWatchPercentage: 0,
        completedCount: 0,
        totalWatchedSeconds: 0
      };
    }

    let totalWatchPercentage = 0;
    let completedCount = 0;
    let totalWatchedSeconds = 0;
    const uniqueUserIds = new Set();

    filteredData.forEach(item => {
      const percentage = typeof item.watchPercentage === 'number' ? item.watchPercentage : 0;
      totalWatchPercentage += percentage;
      if (item.isCompleted) completedCount++;
      totalWatchedSeconds += item.watchedSeconds || 0;
      if (item.userId) uniqueUserIds.add(String(item.userId));
    });

    return {
      totalUsers: uniqueUserIds.size,
      avgWatchPercentage: filteredData.length > 0 ? (totalWatchPercentage / filteredData.length).toFixed(1) : 0,
      completedCount,
      totalWatchedSeconds
    };
  }, [viewType, filteredData]);

  // Appointment Conversion Stats Calculation
  const appointmentConversionStats = useMemo(() => {
    if (reportType !== "appointments" || !filteredData.length || !allUsersList.length) {
      return {
        totalAppointments: 0,
        usersWithPlan: 0,
        conversionPercentage: 0
      };
    }

    const uniqueUserIdsFromAppointments = new Set();
    filteredData.forEach(appointment => {
      const userId = typeof appointment.userId === 'object' ? appointment.userId?._id : appointment.userId;
      if (userId) uniqueUserIdsFromAppointments.add(String(userId));
    });

    let usersWithPlan = 0;
    uniqueUserIdsFromAppointments.forEach(userId => {
      const user = allUsersList.find(u => String(u._id) === userId);
      if (user && (user.plan || user.planId)) {
        usersWithPlan++;
      }
    });

    const conversionPercentage = uniqueUserIdsFromAppointments.size > 0
      ? ((usersWithPlan / uniqueUserIdsFromAppointments.size) * 100).toFixed(1)
      : 0;

    return {
      totalAppointments: filteredData.length,
      totalUniqueUsers: uniqueUserIdsFromAppointments.size,
      usersWithPlan,
      conversionPercentage
    };
  }, [reportType, filteredData, allUsersList]);

  const reportOptions = [
    { label: "All Users", value: "users" },
    { label: "Appointments", value: "appointments" },
    { label: "Orders", value: "orders" },
    { label: "User Video Watch", value: "video" },
    { label: "Screen Usage", value: "screen" },
    { label: "Video Reports", value: "videoReports" },
  ];

  const renderTable = () => {
    if (loading) return <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-600"></div></div>;
    if (filteredData.length === 0) return <div className="text-center p-10 text-gray-500 font-medium">No records found matching your filters.</div>;

    if (viewType === "videoReports") {
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] text-left">
            <thead className="text-[11px] text-gray-400 uppercase bg-gray-50/50 font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Rank</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Video</th>
                <th className="px-6 py-4">Watched Seconds</th>
                <th className="px-6 py-4">Total Seconds</th>
                <th className="px-6 py-4">Watch Percentage</th>
                <th className="px-6 py-4">Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedData.map((item, index) => {
                const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
                return (
                  <tr key={`${item.userId}-${item.videoId}-${index}`} className="bg-white hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 text-center font-bold text-gray-400">#{globalIndex}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900">{item.userName} {item.userSurname}</td>
                    <td className="px-6 py-4 text-gray-600">{item.videoTitle?.english || item.videoTitle || "Unknown Video"}</td>
                    <td className="px-6 py-4 text-center font-bold text-indigo-600">{item.watchedSeconds}s</td>
                    <td className="px-6 py-4 text-center font-bold text-gray-600">{item.totalSeconds}s</td>
                    <td className="px-6 py-4 text-center font-bold text-indigo-600">
                      {(typeof item.watchPercentage === 'number' ? item.watchPercentage : 0).toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs text-black font-black uppercase ${item.isCompleted ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                        {item.isCompleted ? "Yes" : "No"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    } else if (viewType === "highest_selling_products") {
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] text-left">
            {productReportSubView === "highest_sold" && (
              <>
                <thead className="text-[11px] text-gray-400 uppercase bg-gray-50/50 font-bold tracking-wider">
                  <tr>
                    <th className="px-6 py-4 whitespace-nowrap">Product Name</th>
                    <th className="px-6 py-4 whitespace-nowrap text-center">Total Stock</th>
                    <th className="px-6 py-4 whitespace-nowrap text-center">Sold Quantity</th>
                    <th className="px-6 py-4 whitespace-nowrap text-center">Percentage Sold (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedData.map((item, index) => {
                    const tQty = Number(item.totalQty || 0);
                    const sQty = Number(item.soldQty || 0);
                    const pct = tQty > 0 ? ((sQty / tQty) * 100).toFixed(1) : "0.0";
                    return (
                      <tr key={item._id || index} className="bg-white hover:bg-gray-50/80 transition-colors">
                        <td className="px-6 py-4 font-semibold text-gray-900">{item.name || "Unknown"}</td>
                        <td className="px-6 py-4 text-center font-bold text-gray-600">{tQty}</td>
                        <td className="px-6 py-4 text-center font-bold text-indigo-600">{sQty}</td>
                        <td className="px-6 py-4 text-center font-black text-indigo-500">{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </>
            )}

            {productReportSubView === "highest_revenue" && (
              <>
                <thead className="text-[11px] text-gray-400 uppercase bg-gray-50/50 font-bold tracking-wider">
                  <tr>
                    <th className="px-6 py-4 whitespace-nowrap text-center w-20">Rank</th>
                    <th className="px-6 py-4 whitespace-nowrap">Product Name</th>
                    <th className="px-6 py-4 whitespace-nowrap text-center">Total Revenue (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedData.map((item, index) => {
                    const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
                    return (
                      <tr key={item._id || index} className="bg-white hover:bg-gray-50/80 transition-colors">
                        <td className="px-6 py-4 text-center font-bold text-gray-400">#{globalIndex}</td>
                        <td className="px-6 py-4 font-semibold text-gray-900">{item.name || "Unknown"}</td>
                        <td className="px-6 py-4 text-center font-bold text-green-600">₹{Number(item.totalRevenue || 0).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </>
            )}

            {productReportSubView === "normal_stock" && (
              <>
                <thead className="text-[11px] text-gray-400 uppercase bg-gray-50/50 font-bold tracking-wider">
                  <tr>
                    <th className="px-6 py-4 whitespace-nowrap">Product Name</th>
                    <th className="px-6 py-4 whitespace-nowrap text-center">Stock Left</th>
                    <th className="px-6 py-4 whitespace-nowrap text-center">Total Stock</th>
                    <th className="px-6 py-4 whitespace-nowrap text-center">Stock Left Percentage (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedData.map((item, index) => {
                    const pct = item.totalQty > 0 ? ((item.availableQty / item.totalQty) * 100).toFixed(1) : "0.0";
                    return (
                      <tr key={item._id || index} className="bg-white hover:bg-gray-50/80 transition-colors">
                        <td className="px-6 py-4 font-semibold text-gray-900">{item.name || "Unknown"}</td>
                        <td className="px-6 py-4 text-center font-bold text-emerald-600">{Number(item.availableQty)}</td>
                        <td className="px-6 py-4 text-center font-bold text-gray-600">{Number(item.totalQty)}</td>
                        <td className="px-6 py-4 text-center font-black text-emerald-500">{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </>
            )}
          </table>
        </div>
      );
    }

    if (checklistReportEnabled) {
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] text-left">
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
              {paginatedData.map((item) => (
                <tr key={item._id} className="bg-white hover:bg-gray-50/80 transition-colors text-xs text-black">
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
            <table className="w-full text-[11px] text-left">
              <thead className="text-[11px] text-gray-400 uppercase bg-gray-50/50 font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Mobile</th>
                  <th className="px-6 py-4">Responsible Doctor</th>
                  <th className="px-6 py-4">City / State</th>
                  <th className="px-6 py-4">DOB</th>
                  <th className="px-6 py-4">Referrer</th>
                  <th className="px-6 py-4 text-center">Referrals Sent</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedData.map((item) => {
                  const userBranchId = String(item.branch?._id || item.branch || "");
                  const assignedDoctors = allDoctors.filter(d =>
                    (Array.isArray(d.fullBranches) ? d.fullBranches : []).some(b => String(b._id) === userBranchId)
                  ).map(d => d.username).join(", ") || "No Doctor Assigned";
                  const referrerUser = item.usedReferralCode
                    ? allUsersList.find(u => u.referralCode === item.usedReferralCode)
                    : null;
                  // Calculate how many referrals this user has sent
                  const referralsSentCount = allUsersList.filter(u => u.usedReferralCode === item.referralCode).length;
                  return (
                    <tr key={item._id} className="bg-white hover:bg-gray-50/80 transition-colors text-xs text-black">
                      <td className="px-6 py-4 font-semibold text-gray-900">{item.name} {item.surname}</td>
                      <td className="px-6 py-4 text-gray-500 font-medium">{item.mobileNumber}</td>
                      <td className="px-6 py-4 text-indigo-600 font-bold">{assignedDoctors}</td>
                      <td className="px-6 py-4 text-gray-500">{item.city || 'N/A'}, {item.state || 'N/A'}</td>
                      <td className="px-6 py-4 text-gray-500">{item.dob || 'N/A'}</td>
                      <td className="px-6 py-4 text-violet-600 font-medium">
                        {referrerUser
                          ? `${referrerUser.name} ${referrerUser.surname || ""}`.trim()
                          : item.usedReferralCode
                            ? "Referral Code Used"
                            : "N/A"
                        }
                      </td>
                      <td className="px-6 py-4 text-center text-indigo-600 font-bold">
                        {referralsSentCount}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-[11px] font-black uppercase ${item.isDeleted || item.isBlocked ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
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
            <table className="w-full text-[11px] text-left">
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
                {paginatedData.map((item) => (
                  <tr key={item._id} className="bg-white hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900 text-xs text-black">#{item._id.slice(-6).toUpperCase()}</td>
                    <td className="px-6 py-4 font-semibold">{item.userId ? `${item.userId.name || ""} ${item.userId.surname || ""}` : "Deleted User"}</td>
                    <td className="px-6 py-4 text-gray-500">{item.userId?.mobileNumber || "N/A"}</td>
                    <td className="px-6 py-4 font-semibold">{item.userId ? `${item.userId.name} ${item.userId.surname || ""}` : "Unknown Patient (Deleted)"}</td>
                    <td className="px-6 py-4 text-gray-500">{item.userId?.mobileNumber || "N/A"}</td>
                    <td className="px-6 py-4 font-black text-gray-900">₹{item.totalAmount}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs text-black font-black uppercase tracking-tighter ${item.orderStatus === "delivered" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
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
            <table className="w-full text-[11px] text-left">
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
                {paginatedData.map((item) => (
                  <tr key={item._id} className="bg-white hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900">{item.name} {item.surname}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, (item.planCurrentDay / 30) * 100)}%` }}></div>
                        </div>
                        <span className="text-xs text-black font-black text-indigo-600 uppercase">Day {item.planCurrentDay}</span>
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
      case "videoReports":
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] text-left">
              <thead className="text-[11px] text-gray-400 uppercase bg-gray-50/50 font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Rank</th>
                  <th className="px-6 py-4">Patient</th>
                  <th className="px-6 py-4">Mobile</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Total Videos Watched</th>
                  <th className="px-6 py-4">Completed Videos</th>
                  <th className="px-6 py-4">Watch Percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedData.map((item, index) => {
                  const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
                  return (
                    <tr key={item.userId || index} className="bg-white hover:bg-gray-50/80 transition-colors">
                      <td className="px-6 py-4 text-center font-bold text-gray-400">#{globalIndex}</td>
                      <td className="px-6 py-4 font-semibold text-gray-900">{item.name} {item.surname}</td>
                      <td className="px-6 py-4 text-gray-600">{item.mobileNumber}</td>
                      <td className="px-6 py-4 text-gray-600">{item.email}</td>
                      <td className="px-6 py-4 text-center font-bold text-indigo-600">{item.totalVideos}</td>
                      <td className="px-6 py-4 text-center font-bold text-green-600">{item.completedVideos}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, typeof item.watchPercentage === 'number' ? item.watchPercentage : 0)}%` }}></div>
                          </div>
                          <span className="text-xs text-black font-black text-indigo-600 uppercase">{(typeof item.watchPercentage === 'number' ? item.watchPercentage : 0).toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );

      case "reschedule":
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] text-left">
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
                {paginatedData.map((item) => (
                  <tr key={item._id} className="bg-white hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900">{item.user?.username || 'System'}</td>
                    <td className="px-6 py-4 text-gray-700 italic">"{item.action}"</td>
                    <td className="px-6 py-4 text-gray-600">{item.branch?.name || "Global"}</td>
                    <td className="px-6 py-4 text-xs text-black font-mono text-gray-400">{item.ipAddress}</td>
                    <td className="px-6 py-4 text-gray-500">{new Date(item.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case "screen":
        return (
          <div className="w-full max-w-[calc(100vw-80px)] lg:max-w-[calc(100vw-380px)] overflow-x-auto">
            <table className="w-full text-xs text-black text-left">
              <thead className="text-xs text-black text-gray-400 uppercase bg-gray-50/50 font-bold tracking-wider">
                <tr>
                  <th className="px-2 py-1.5 whitespace-nowrap">Patient</th>
                  {screenFields.map((f) => (
                    <th key={f.key} className="px-2 py-1.5 text-center whitespace-nowrap">
                      {f.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedData.map((item) => {
                  const userUsage = screenUsages.find(su => String(su.userId?._id || su.userId) === String(item._id));
                  return (
                    <tr key={item._id} className="bg-white hover:bg-gray-50/80 transition-colors text-xs text-black">
                      <td className="px-2 py-1 font-semibold text-gray-900 whitespace-nowrap">
                        {item.name} {item.surname}
                      </td>
                      {screenFields.map((f) => {
                        const count = userUsage ? (userUsage[f.key] || 0) : 0;
                        return (
                          <td key={f.key} className="px-2 py-1 text-center text-gray-700 whitespace-nowrap">
                            {count > 0 ? count : "-"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );

      case "appointments":
      default:
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] text-left">
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
                {paginatedData.map((item) => (
                  <tr key={item._id} className="bg-white hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900">{item.userId ? `${item.userId.name || ""} ${item.userId.surname || ""}` : "Deleted User"}</td>
                    <td className="px-6 py-4 font-medium text-indigo-600">{item.doctor?.username || "Unassigned"}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold">{item.date}</span>
                        <span className="text-xs text-black text-gray-400 uppercase">{item.startTime} - {item.endTime}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 capitalize font-bold text-xs text-black">
                      <div className="flex flex-col gap-1">
                        <span>{item.status}</span>
                        {item.isRescheduled && (
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-600 text-[11px] font-black uppercase w-max tracking-tighter">
                            Rescheduled
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs text-black font-black uppercase tracking-tighter ${item.type === 1 ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
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

  const exportFilteredDataToExcel = () => {
    try {
      const dataToExport = sortedFilteredData;
      if (!dataToExport || dataToExport.length === 0) {
        toast.error("No data available to export");
        return;
      }

      let sheetName = "";
      let titleText = "";
      let columns = [];
      let rows = [];

      const subtitleText = `Exported on: ${new Date().toLocaleString()}`;

      if (viewType === "videoReports") {
        sheetName = "Video Reports";
        titleText = "Video Watch Progress Report";
        columns = [
          { width: 60 },
          { width: 180 },
          { width: 220 },
          { width: 120 },
          { width: 120 },
          { width: 130 },
          { width: 100 }
        ];

        rows = [
          { height: 25, cells: [{ value: titleText, styleId: "Title", mergeAcross: 6 }] },
          { height: 18, cells: [{ value: subtitleText, styleId: "SubTitle", mergeAcross: 6 }] },
          { height: 10, cells: [] },
          {
            height: 25,
            cells: [
              { value: "Rank", styleId: "HeaderB2B" },
              { value: "Patient Name", styleId: "HeaderB2B" },
              { value: "Video Title", styleId: "HeaderB2B" },
              { value: "Watched (s)", styleId: "HeaderB2B" },
              { value: "Total (s)", styleId: "HeaderB2B" },
              { value: "Watch %", styleId: "HeaderB2B" },
              { value: "Completed", styleId: "HeaderB2B" }
            ]
          }
        ];

        dataToExport.forEach((item, index) => {
          rows.push({
            height: 20,
            cells: [
              { value: index + 1, type: "Number", styleId: "CellCenter" },
              { value: `${item.userName || ""} ${item.userSurname || ""}`.trim(), styleId: "CellNormal" },
              { value: item.videoTitle?.english || item.videoTitle || "Unknown Video", styleId: "CellNormal" },
              { value: item.watchedSeconds || 0, type: "Number", styleId: "CellRight" },
              { value: item.totalSeconds || 0, type: "Number", styleId: "CellRight" },
              { value: Number((typeof item.watchPercentage === 'number' ? item.watchPercentage : 0).toFixed(1)), type: "Number", styleId: "CellRight" },
              { value: item.isCompleted ? "Yes" : "No", styleId: "CellCenter" }
            ]
          });
        });

      } else if (viewType === "highest_selling_products") {
        sheetName = "Products Report";
        titleText = productReportSubView === "highest_sold"
          ? "Highest Selling Products (By Qty)"
          : productReportSubView === "highest_revenue"
            ? "Highest Revenue Products"
            : "Products Stock Inventory";

        if (productReportSubView === "highest_sold") {
          columns = [{ width: 220 }, { width: 120 }, { width: 120 }, { width: 130 }];
          rows = [
            { height: 25, cells: [{ value: titleText, styleId: "Title", mergeAcross: 3 }] },
            { height: 18, cells: [{ value: subtitleText, styleId: "SubTitle", mergeAcross: 3 }] },
            { height: 10, cells: [] },
            {
              height: 25,
              cells: [
                { value: "Product Name", styleId: "HeaderB2C" },
                { value: "Total Stock", styleId: "HeaderB2C" },
                { value: "Sold Quantity", styleId: "HeaderB2C" },
                { value: "Percentage Sold (%)", styleId: "HeaderB2C" }
              ]
            }
          ];

          dataToExport.forEach(item => {
            const tQty = Number(item.totalQty || 0);
            const sQty = Number(item.soldQty || 0);
            const pct = tQty > 0 ? Number(((sQty / tQty) * 100).toFixed(1)) : 0;
            rows.push({
              height: 20,
              cells: [
                { value: item.name || "Unknown", styleId: "CellNormal" },
                { value: tQty, type: "Number", styleId: "CellRight" },
                { value: sQty, type: "Number", styleId: "CellRight" },
                { value: pct, type: "Number", styleId: "CellRight" }
              ]
            });
          });

        } else if (productReportSubView === "highest_revenue") {
          columns = [{ width: 80 }, { width: 250 }, { width: 150 }];
          rows = [
            { height: 25, cells: [{ value: titleText, styleId: "Title", mergeAcross: 2 }] },
            { height: 18, cells: [{ value: subtitleText, styleId: "SubTitle", mergeAcross: 2 }] },
            { height: 10, cells: [] },
            {
              height: 25,
              cells: [
                { value: "Rank", styleId: "HeaderB2C" },
                { value: "Product Name", styleId: "HeaderB2C" },
                { value: "Total Revenue (INR)", styleId: "HeaderB2C" }
              ]
            }
          ];

          dataToExport.forEach((item, index) => {
            rows.push({
              height: 20,
              cells: [
                { value: index + 1, type: "Number", styleId: "CellCenter" },
                { value: item.name || "Unknown", styleId: "CellNormal" },
                { value: Number(item.totalRevenue || 0), type: "Number", styleId: "CellRight" }
              ]
            });
          });

        } else {
          columns = [{ width: 220 }, { width: 120 }, { width: 120 }, { width: 150 }];
          rows = [
            { height: 25, cells: [{ value: titleText, styleId: "Title", mergeAcross: 3 }] },
            { height: 18, cells: [{ value: subtitleText, styleId: "SubTitle", mergeAcross: 3 }] },
            { height: 10, cells: [] },
            {
              height: 25,
              cells: [
                { value: "Product Name", styleId: "HeaderB2C" },
                { value: "Stock Left", styleId: "HeaderB2C" },
                { value: "Total Stock", styleId: "HeaderB2C" },
                { value: "Stock Left (%)", styleId: "HeaderB2C" }
              ]
            }
          ];

          dataToExport.forEach(item => {
            const pct = item.totalQty > 0 ? Number(((item.availableQty / item.totalQty) * 100).toFixed(1)) : 0;
            rows.push({
              height: 20,
              cells: [
                { value: item.name || "Unknown", styleId: "CellNormal" },
                { value: Number(item.availableQty || 0), type: "Number", styleId: "CellRight" },
                { value: Number(item.totalQty || 0), type: "Number", styleId: "CellRight" },
                { value: pct, type: "Number", styleId: "CellRight" }
              ]
            });
          });
        }

      } else if (checklistReportEnabled) {
        sheetName = "Checklist Report";
        titleText = "Daily Patients Checklist Report";
        columns = [
          { width: 180 },
          { width: 180 },
          { width: 80 },
          { width: 100 },
          { width: 100 },
          { width: 100 },
          { width: 100 },
          { width: 100 },
          { width: 100 },
          { width: 250 }
        ];

        rows = [
          { height: 25, cells: [{ value: titleText, styleId: "Title", mergeAcross: 9 }] },
          { height: 18, cells: [{ value: subtitleText, styleId: "SubTitle", mergeAcross: 9 }] },
          { height: 10, cells: [] },
          {
            height: 25,
            cells: [
              { value: "Patient", styleId: "HeaderHSN" },
              { value: "Assigned Plan", styleId: "HeaderHSN" },
              { value: "Day", styleId: "HeaderHSN" },
              { value: "Water Intake", styleId: "HeaderHSN" },
              { value: "Exercise", styleId: "HeaderHSN" },
              { value: "Green Juice", styleId: "HeaderHSN" },
              { value: "Pranayama", styleId: "HeaderHSN" },
              { value: "Sleep Hours", styleId: "HeaderHSN" },
              { value: "Weight", styleId: "HeaderHSN" },
              { value: "Diet Mistakes", styleId: "HeaderHSN" }
            ]
          }
        ];

        dataToExport.forEach(item => {
          rows.push({
            height: 20,
            cells: [
              { value: `${item.userId?.name || "Unknown"} ${item.userId?.surname || ""}`.trim(), styleId: "CellNormal" },
              { value: item.planId?.name || "N/A", styleId: "CellNormal" },
              { value: `Day ${item.day || 0}`, styleId: "CellCenter" },
              { value: `${item.waterIntake || 0} times`, styleId: "CellCenter" },
              { value: `${item.exerciseMinutes || 0} mins`, styleId: "CellCenter" },
              { value: `${item.greenJuice || 0} times`, styleId: "CellCenter" },
              { value: `${item.pranayamaMinutes || 0} mins`, styleId: "CellCenter" },
              { value: `${item.sleepHours || 0} hrs`, styleId: "CellCenter" },
              { value: item.todayWeight ? `${item.todayWeight} kg` : "-", styleId: "CellCenter" },
              { value: item.dietMistake || "-", styleId: "CellNormal" }
            ]
          });
        });

      } else {
        switch (reportType) {
          case "users":
            sheetName = "Users Report";
            titleText = "Registered Patients Report";
            columns = [
              { width: 180 },
              { width: 120 },
              { width: 220 },
              { width: 150 },
              { width: 150 },
              { width: 100 },
              { width: 180 },
              { width: 120 },
              { width: 100 }
            ];

            rows = [
              { height: 25, cells: [{ value: titleText, styleId: "Title", mergeAcross: 8 }] },
              { height: 18, cells: [{ value: subtitleText, styleId: "SubTitle", mergeAcross: 8 }] },
              { height: 10, cells: [] },
              {
                height: 25,
                cells: [
                  { value: "Patient Name", styleId: "HeaderB2B" },
                  { value: "Mobile Number", styleId: "HeaderB2B" },
                  { value: "Responsible Doctor(s)", styleId: "HeaderB2B" },
                  { value: "City", styleId: "HeaderB2B" },
                  { value: "State", styleId: "HeaderB2B" },
                  { value: "DOB", styleId: "HeaderB2B" },
                  { value: "Referrer", styleId: "HeaderB2B" },
                  { value: "Referrals Sent", styleId: "HeaderB2B" },
                  { value: "Status", styleId: "HeaderB2B" }
                ]
              }
            ];

            dataToExport.forEach(item => {
              const userBranchId = String(item.branch?._id || item.branch || "");
              const assignedDoctors = allDoctors.filter(d =>
                (Array.isArray(d.fullBranches) ? d.fullBranches : []).some(b => String(b._id) === userBranchId)
              ).map(d => d.username).join(", ") || "No Doctor Assigned";
              const referrerUser = item.usedReferralCode
                ? allUsersList.find(u => u.referralCode === item.usedReferralCode)
                : null;
              const referrerName = referrerUser
                ? `${referrerUser.name} ${referrerUser.surname || ""}`.trim()
                : item.usedReferralCode
                  ? "Referral Code Used"
                  : "N/A";
              const referralsSentCount = allUsersList.filter(u => u.usedReferralCode === item.referralCode).length;

              rows.push({
                height: 20,
                cells: [
                  { value: `${item.name || ""} ${item.surname || ""}`.trim(), styleId: "CellNormal" },
                  { value: item.mobileNumber || "N/A", styleId: "CellCenter" },
                  { value: assignedDoctors, styleId: "CellNormal" },
                  { value: item.city || "N/A", styleId: "CellNormal" },
                  { value: item.state || "N/A", styleId: "CellNormal" },
                  { value: item.dob || "N/A", styleId: "CellCenter" },
                  { value: referrerName, styleId: "CellNormal" },
                  { value: referralsSentCount, type: "Number", styleId: "CellCenter" },
                  { value: (item.isDeleted || item.isBlocked) ? "Inactive" : "Active", styleId: "CellCenter" }
                ]
              });
            });
            break;

          case "orders":
            sheetName = "Orders Report";
            titleText = "Sales Orders Report";
            columns = [
              { width: 100 },
              { width: 180 },
              { width: 120 },
              { width: 130 },
              { width: 100 },
              { width: 110 }
            ];

            rows = [
              { height: 25, cells: [{ value: titleText, styleId: "Title", mergeAcross: 5 }] },
              { height: 18, cells: [{ value: subtitleText, styleId: "SubTitle", mergeAcross: 5 }] },
              { height: 10, cells: [] },
              {
                height: 25,
                cells: [
                  { value: "Order ID", styleId: "HeaderHSN" },
                  { value: "Patient Name", styleId: "HeaderHSN" },
                  { value: "Contact No", styleId: "HeaderHSN" },
                  { value: "Amount (INR)", styleId: "HeaderHSN" },
                  { value: "Status", styleId: "HeaderHSN" },
                  { value: "Order Date", styleId: "HeaderHSN" }
                ]
              }
            ];

            dataToExport.forEach(item => {
              const patientName = item.userId ? `${item.userId.name || ""} ${item.userId.surname || ""}`.trim() : "Deleted User";
              const contact = item.userId?.mobileNumber || "N/A";
              rows.push({
                height: 20,
                cells: [
                  { value: `ORD-${item._id.slice(-6).toUpperCase()}`, styleId: "CellCenter" },
                  { value: patientName, styleId: "CellNormal" },
                  { value: contact, styleId: "CellCenter" },
                  { value: Number(item.totalAmount || 0), type: "Number", styleId: "CellRight" },
                  { value: String(item.orderStatus || "").toUpperCase(), styleId: "CellCenter" },
                  { value: new Date(item.createdAt).toLocaleDateString(), styleId: "CellCenter" }
                ]
              });
            });
            break;

          case "video":
            sheetName = "Video Watch Progress";
            titleText = "Patient Program Video Watch Progress";
            columns = [
              { width: 180 },
              { width: 100 },
              { width: 180 },
              { width: 150 },
              { width: 120 }
            ];

            rows = [
              { height: 25, cells: [{ value: titleText, styleId: "Title", mergeAcross: 4 }] },
              { height: 18, cells: [{ value: subtitleText, styleId: "SubTitle", mergeAcross: 4 }] },
              { height: 10, cells: [] },
              {
                height: 25,
                cells: [
                  { value: "Patient Name", styleId: "HeaderB2B" },
                  { value: "Watch Progress", styleId: "HeaderB2B" },
                  { value: "Program Plan", styleId: "HeaderB2B" },
                  { value: "Assigned Branch", styleId: "HeaderB2B" },
                  { value: "Language", styleId: "HeaderB2B" }
                ]
              }
            ];

            dataToExport.forEach(item => {
              rows.push({
                height: 20,
                cells: [
                  { value: `${item.name || ""} ${item.surname || ""}`.trim(), styleId: "CellNormal" },
                  { value: `Day ${item.planCurrentDay || 0}`, styleId: "CellCenter" },
                  { value: item.plan?.name || "N/A", styleId: "CellNormal" },
                  { value: item.branch?.name || "N/A", styleId: "CellNormal" },
                  { value: String(item.language || "N/A").toUpperCase(), styleId: "CellCenter" }
                ]
              });
            });
            break;

          case "reschedule":
            sheetName = "Reschedule Logs";
            titleText = "Doctor Appointment Reschedule Log";
            columns = [
              { width: 150 },
              { width: 280 },
              { width: 150 },
              { width: 120 },
              { width: 150 }
            ];

            rows = [
              { height: 25, cells: [{ value: titleText, styleId: "Title", mergeAcross: 4 }] },
              { height: 18, cells: [{ value: subtitleText, styleId: "SubTitle", mergeAcross: 4 }] },
              { height: 10, cells: [] },
              {
                height: 25,
                cells: [
                  { value: "Admin / Doctor", styleId: "HeaderHSN" },
                  { value: "Event Details", styleId: "HeaderHSN" },
                  { value: "Branch Context", styleId: "HeaderHSN" },
                  { value: "IP Address", styleId: "HeaderHSN" },
                  { value: "Timestamp", styleId: "HeaderHSN" }
                ]
              }
            ];

            dataToExport.forEach(item => {
              rows.push({
                height: 20,
                cells: [
                  { value: item.user?.username || "System", styleId: "CellNormal" },
                  { value: item.action || "", styleId: "CellNormal" },
                  { value: item.branch?.name || "Global", styleId: "CellNormal" },
                  { value: item.ipAddress || "N/A", styleId: "CellCenter" },
                  { value: new Date(item.timestamp).toLocaleString(), styleId: "CellCenter" }
                ]
              });
            });
            break;

          case "screen":
            sheetName = "Screen Usage";
            titleText = "Detailed Screen Usage Statistics";
            columns = [{ width: 180 }];
            screenFields.forEach(() => columns.push({ width: 120 }));

            const screenHeaders = [{ value: "Patient Name", styleId: "HeaderB2B" }];
            screenFields.forEach(f => {
              screenHeaders.push({ value: f.label, styleId: "HeaderB2B" });
            });

            rows = [
              { height: 25, cells: [{ value: titleText, styleId: "Title", mergeAcross: screenFields.length }] },
              { height: 18, cells: [{ value: subtitleText, styleId: "SubTitle", mergeAcross: screenFields.length }] },
              { height: 10, cells: [] },
              {
                height: 25,
                cells: screenHeaders
              }
            ];

            dataToExport.forEach(item => {
              const userUsage = screenUsages.find(su => String(su.userId?._id || su.userId) === String(item._id));
              const usageCells = [{ value: `${item.name || ""} ${item.surname || ""}`.trim(), styleId: "CellNormal" }];

              screenFields.forEach(f => {
                const count = userUsage ? (userUsage[f.key] || 0) : 0;
                usageCells.push({
                  value: count > 0 ? count : 0,
                  type: "Number",
                  styleId: "CellCenter"
                });
              });

              rows.push({
                height: 20,
                cells: usageCells
              });
            });
            break;

          case "appointments":
          default:
            sheetName = "Appointments Report";
            titleText = "Doctor Consultations Appointments Report";
            columns = [
              { width: 180 },
              { width: 150 },
              { width: 130 },
              { width: 120 },
              { width: 100 }
            ];

            rows = [
              { height: 25, cells: [{ value: titleText, styleId: "Title", mergeAcross: 4 }] },
              { height: 18, cells: [{ value: subtitleText, styleId: "SubTitle", mergeAcross: 4 }] },
              { height: 10, cells: [] },
              {
                height: 25,
                cells: [
                  { value: "Patient Name", styleId: "HeaderB2C" },
                  { value: "Assigned Doctor", styleId: "HeaderB2C" },
                  { value: "Appointment Date & Time", styleId: "HeaderB2C" },
                  { value: "Status", styleId: "HeaderB2C" },
                  { value: "Type", styleId: "HeaderB2C" }
                ]
              }
            ];

            dataToExport.forEach(item => {
              const patientName = item.userId ? `${item.userId.name || ""} ${item.userId.surname || ""}`.trim() : "Deleted User";
              const doctorName = item.doctor?.username || "Unassigned";
              const statusLabel = item.isRescheduled ? `${item.status || ""} (RESCHEDULED)` : (item.status || "");
              rows.push({
                height: 20,
                cells: [
                  { value: patientName, styleId: "CellNormal" },
                  { value: doctorName, styleId: "CellNormal" },
                  { value: `${item.date || ""} ${item.startTime || ""} - ${item.endTime || ""}`, styleId: "CellCenter" },
                  { value: statusLabel.toUpperCase(), styleId: "CellCenter" },
                  { value: item.type === 1 ? "Online" : "Offline", styleId: "CellCenter" }
                ]
              });
            });
            break;
        }
      }

      exportToExcel({
        filename: `${sheetName.replace(/\s+/g, "_")}_Export_${new Date().toISOString().split("T")[0]}.xls`,
        sheets: [
          {
            name: sheetName,
            columns: columns,
            rows: rows
          }
        ]
      });

      toast.success(`Successfully exported ${sheetName} Excel file!`);
    } catch (err) {
      console.error("Failed to export Excel report:", err);
      toast.error("An error occurred during Excel export");
    }
  };

  const resetAllFilters = () => {
    setSearchTerm("");
    setSelectedBranchId("");
    setSelectedDoctorId("");
    setSelectedPlanId("");
    setItemTypeFilter("all");
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
    setSelectedAppointmentStatus("");
    setUsedReferralFilter("");
    setScreenDateFilter(() => {
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    });
    setStartDate("");
    setEndDate("");
    setChecklistReportEnabled(false);
    setFilterWater("");
    setFilterExercise("");
    setFilterJuice("");
    setFilterPranayama("");
    setFilterSleep("");
    setLocalOnlineFilter("");
    setRescheduleFilter("");
    setSelectedMinPercentageOption("");
    setSelectedVideoId("");
  };

  return (
    <RoleGuard allow={["Admin", "subadmin"]} permission="show reports page">
      <div className="w-full h-full px-6 py-6 flex flex-col gap-8 bg-gray-50/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-8 bg-white rounded-[2rem] border border-gray-100 shadow-sm relative z-40 overflow-visible">
          <div className="absolute inset-0 overflow-hidden rounded-[2rem] pointer-events-none">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>
          </div>
          <div className="flex flex-col relative z-10">
            <Header size="4xl" className="flex items-center gap-3">
              Reports
            </Header>
            <p className="text-xs text-black text-gray-400 font-bold uppercase tracking-[0.2em] mt-2">Operational Analytics & Patient Tracking</p>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            {viewType === "highest_selling_products" && (
              <div className="w-64">
                <Dropdown
                  options={[
                    { label: "Total Revenue (Top Rank)", value: "highest_revenue" },
                    { label: "Stock Inventory (Left Stock)", value: "normal_stock" }
                  ]}
                  value={productReportSubView}
                  onChange={setProductReportSubView}
                  placeholder="Select Sub-View"
                />
              </div>
            )}
            <div className="w-64">
              <Dropdown
                options={[
                  { label: "User", value: "user" },
                  { label: "Doctor", value: "doctor" },
                  { label: "Products", value: "highest_selling_products" },
                  { label: "Videos", value: "videoReports" }
                ]}
                value={viewType}
                onChange={setViewType}
                placeholder="Select View"
              />
            </div>
          </div>
        </div>

        {/* Ultra-Compact 6-Column Precision Grid */}
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm relative overflow-visible">
          <div className="px-6 py-5 flex flex-col gap-5">
            {viewType === "videoReports" ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-3 items-end">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-indigo-600 uppercase tracking-widest px-1">Watch Percentage</label>
                  <Dropdown
                    options={[
                      { label: "All", value: "" },
                      { label: "20%", value: "20" },
                      { label: "40%", value: "40" },
                      { label: "60%", value: "60" },
                      { label: "80%", value: "80" },
                      { label: "100%", value: "100" }
                    ]}
                    value={selectedMinPercentageOption}
                    onChange={setSelectedMinPercentageOption}
                    placeholder="Select Percentage"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-indigo-600 uppercase tracking-widest px-1">Specific Video</label>
                  <Dropdown
                    options={[
                      { label: "All Videos", value: "" },
                      ...(allVideos || []).map(v => ({
                        label: v.title?.english || v.title || "Unknown Video",
                        value: v._id
                      }))
                    ]}
                    value={selectedVideoId}
                    onChange={setSelectedVideoId}
                    placeholder="Select Video"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-indigo-600 uppercase tracking-widest px-1">Global Search</label>
                  <div className="relative">
                    <input type="text" placeholder="Search user or video..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full h-[40px] pl-10 pr-4 bg-gray-50/50 border border-gray-100 rounded-xl text-xs text-black font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all placeholder:text-black" />
                    <MdSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    title="Reset All Filters"
                    className="w-full h-[40px] bg-gray-50 text-gray-600 border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-xl text-xs text-black font-bold transition-all placeholder:text-black flex items-center justify-center gap-2 shadow-sm"
                  >
                    <MdRefresh size={18} className="transition-transform group-hover:rotate-180" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>
            ) : reportType === "appointments" ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-x-6 gap-y-3 items-end">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-indigo-600 uppercase tracking-widest px-1">Report</label>
                  <Dropdown options={reportOptions} value={reportType} onChange={(val) => { setReportType(val); setRawData([]); setSearchTerm(""); }} placeholder="Report" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-indigo-600 uppercase tracking-widest px-1">Branch</label>
                  <Dropdown options={[{ label: "All Branches", value: "" }, ...(allBranches || []).map(b => ({ label: b.name, value: b._id }))]} value={selectedBranchId} onChange={setSelectedBranchId} placeholder="Branch" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-indigo-600 uppercase tracking-widest px-1">Doctor</label>
                  <Dropdown options={[{ label: "All Doctors", value: "" }, ...(allDoctors || []).filter(d => { const docBranches = Array.isArray(d.fullBranches) ? d.fullBranches : []; return !selectedBranchId || docBranches.some(b => String(b._id || b) === String(selectedBranchId)); }).map(d => ({ label: d.username || d.name || "Unknown", value: d._id }))]} value={selectedDoctorId} onChange={setSelectedDoctorId} placeholder="Doctor" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-indigo-600 uppercase tracking-widest px-1">Appoint. Type</label>
                  <Dropdown options={[{ label: "All Types", value: "" }, { label: "Online", value: "1" }, { label: "Offline", value: "2" }]} value={selectedConsultingType} onChange={setSelectedConsultingType} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-amber-600 uppercase tracking-widest px-1">Reschedule</label>
                  <Dropdown
                    options={[
                      { label: "All", value: "" },
                      { label: "Rescheduled Only", value: "rescheduled" },
                      { label: "Not Rescheduled", value: "non_rescheduled" }
                    ]}
                    value={rescheduleFilter}
                    onChange={setRescheduleFilter}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-indigo-600 uppercase tracking-widest px-1">Global Patient Search</label>
                  <div className="relative">
                    <input type="text" placeholder="Name, mobile or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full h-[40px] pl-10 pr-4 bg-gray-50/50 border border-gray-100 rounded-xl text-xs text-black font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all placeholder:text-black" />
                    <MdSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    title="Reset All Filters"
                    className="w-full h-[40px] bg-gray-50 text-gray-600 border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-xl text-xs text-black font-bold transition-all placeholder:text-black flex items-center justify-center gap-2 shadow-sm"
                  >
                    <MdRefresh size={18} className="transition-transform group-hover:rotate-180" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>
            ) : reportType === "videoReports" ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-3 items-end">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-indigo-600 uppercase tracking-widest px-1">Report</label>
                  <Dropdown options={reportOptions} value={reportType} onChange={(val) => { setReportType(val); setRawData([]); setSearchTerm(""); }} placeholder="Report" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-indigo-600 uppercase tracking-widest px-1">Watch Percentage</label>
                  <Dropdown
                    options={[
                      { label: "All", value: "" },
                      { label: "20%", value: "20" },
                      { label: "40%", value: "40" },
                      { label: "60%", value: "60" },
                      { label: "80%", value: "80" },
                      { label: "100%", value: "100" }
                    ]}
                    value={selectedMinPercentageOption}
                    onChange={setSelectedMinPercentageOption}
                    placeholder="Select Percentage"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-indigo-600 uppercase tracking-widest px-1">Specific Video</label>
                  <Dropdown
                    options={[
                      { label: "All Videos", value: "" },
                      ...(allVideos || []).map(v => ({
                        label: v.title?.english || v.title || "Unknown Video",
                        value: v._id
                      }))
                    ]}
                    value={selectedVideoId}
                    onChange={setSelectedVideoId}
                    placeholder="Select Video"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-indigo-600 uppercase tracking-widest px-1">Global Search</label>
                  <div className="relative">
                    <input type="text" placeholder="Name, mobile or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full h-[40px] pl-10 pr-4 bg-gray-50/50 border border-gray-100 rounded-xl text-xs text-black font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all placeholder:text-black" />
                    <MdSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    title="Reset All Filters"
                    className="w-full h-[40px] bg-gray-50 text-gray-600 border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-xl text-xs text-black font-bold transition-all placeholder:text-black flex items-center justify-center gap-2 shadow-sm"
                  >
                    <MdRefresh size={18} className="transition-transform group-hover:rotate-180" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Row 1: Core & Identity */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-black text-indigo-600 uppercase tracking-widest px-1">Report</label>
                    <Dropdown options={reportOptions} value={reportType} onChange={(val) => { setReportType(val); setRawData([]); setSearchTerm(""); }} placeholder="Report" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-black text-indigo-600 uppercase tracking-widest px-1">Branch</label>
                    <Dropdown options={[{ label: "All Branches", value: "" }, ...(allBranches || []).map(b => ({ label: b.name, value: b._id }))]} value={selectedBranchId} onChange={setSelectedBranchId} placeholder="Branch" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-black text-indigo-600 uppercase tracking-widest px-1">Doctor</label>
                    <Dropdown options={[{ label: "All Doctors", value: "" }, ...(allDoctors || []).filter(d => { const docBranches = Array.isArray(d.fullBranches) ? d.fullBranches : []; return !selectedBranchId || docBranches.some(b => String(b._id || b) === String(selectedBranchId)); }).map(d => ({ label: d.username || d.name || "Unknown", value: d._id }))]} value={selectedDoctorId} onChange={setSelectedDoctorId} placeholder="Doctor" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-black text-indigo-600 uppercase tracking-widest px-1">Plan</label>
                    <Dropdown options={[{ label: "All Plans", value: "" }, ...(allPlans || []).map(p => ({ label: p.name, value: p._id }))]} value={selectedPlanId} onChange={setSelectedPlanId} placeholder="Plan" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-black text-teal-600 uppercase tracking-widest px-1">Medical</label>
                    <Dropdown options={[{ label: "All Conditions", value: "" }, ...medicalConditions.map(m => ({ label: m.name, value: m.name }))]} value={selectedMedicalCondition} onChange={setSelectedMedicalCondition} placeholder="Condition" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-black text-teal-600 uppercase tracking-widest px-1">Gender</label>
                    <Dropdown options={[{ label: "All Genders", value: "" }, { label: "Male", value: "male" }, { label: "Female", value: "female" }]} value={selectedGender} onChange={setSelectedGender} />
                  </div>
                </div>

                {/* Row 2: Demographics & Geography */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-black text-teal-600 uppercase tracking-widest px-1">Age</label>
                    <input type="number" placeholder="Exact Age..." value={selectedAge} onChange={(e) => setSelectedAge(e.target.value)} className="w-full h-[40px] px-3 bg-white border border-gray-200 rounded-xl text-xs text-black font-medium focus:outline-none focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500 focus:shadow-lg hover:border-amber-500/50 shadow-sm transition-all placeholder:text-black" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-black text-blue-600 uppercase tracking-widest px-1">City</label>
                    <input type="text" placeholder="City..." value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} className="w-full h-[40px] px-3 bg-white border border-gray-200 rounded-xl text-xs text-black font-medium focus:outline-none focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500 focus:shadow-lg hover:border-amber-500/50 shadow-sm transition-all placeholder:text-black" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-black text-blue-600 uppercase tracking-widest px-1">State</label>
                    <input type="text" placeholder="State..." value={selectedState} onChange={(e) => setSelectedState(e.target.value)} className="w-full h-[40px] px-3 bg-white border border-gray-200 rounded-xl text-xs text-black font-medium focus:outline-none focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500 focus:shadow-lg hover:border-amber-500/50 shadow-sm transition-all placeholder:text-black" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-black text-blue-600 uppercase tracking-widest px-1">Source</label>
                    <Dropdown options={appReferenceOptions} value={selectedAppReference} onChange={setSelectedAppReference} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-black text-blue-600 uppercase tracking-widest px-1">Status</label>
                    <Dropdown options={[{ label: "All Status", value: "all" }, { label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }]} value={statusFilter} onChange={setStatusFilter} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-black text-blue-600 uppercase tracking-widest px-1">Referral</label>
                    <Dropdown options={[
                      { label: "All Users", value: "" },
                      { label: "Used Referral (Referred Users)", value: "has_used" },
                      { label: "Sent Referrals (Referrers)", value: "sent_referrals" },
                      { label: "No Referral", value: "not_used" }
                    ]} value={usedReferralFilter} onChange={setUsedReferralFilter} />
                  </div>
                </div>

                {/* Row 3: Engagement & Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-x-6 gap-y-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-black text-violet-600 uppercase tracking-widest px-1">Video Watch</label>
                    <Dropdown options={[{ label: "All", value: "" }, { label: "Watched", value: "watched" }, { label: "Not Watched", value: "not_watched" }]} value={selectedVideoWatchStatus} onChange={setSelectedVideoWatchStatus} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-black text-violet-600 uppercase tracking-widest px-1">Video Lang.</label>
                    <Dropdown options={[{ label: "All Lang", value: "" }, { label: "English", value: "en" }, { label: "Hindi", value: "hi" }, { label: "Gujarati", value: "gu" }]} value={selectedVideoLanguage} onChange={setSelectedVideoLanguage} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-black text-violet-600 uppercase tracking-widest px-1">Appoint. Type</label>
                    <Dropdown options={[{ label: "All Types", value: "" }, { label: "Online", value: "1" }, { label: "Offline", value: "2" }]} value={selectedConsultingType} onChange={setSelectedConsultingType} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-black text-violet-600 uppercase tracking-widest px-1">Branch City Online</label>
                    <Dropdown options={[{ label: "All Bookings", value: "" }, { label: "Local Online Only", value: "local_online" }]} value={localOnlineFilter} onChange={setLocalOnlineFilter} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-black text-violet-600 uppercase tracking-widest px-1">Body Stats</label>
                    <Dropdown options={[{ label: "Show All", value: "" }, { label: "With Data", value: "with" }, { label: "Missing Data", value: "skip" }]} value={skipBodyMeasurement} onChange={setSkipBodyMeasurement} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-black text-violet-600 uppercase tracking-widest px-1">Ans Status</label>
                    <Dropdown options={[{ label: "All", value: "" }, { label: "Passed", value: "passed" }, { label: "Failed", value: "failed" }]} value={selectedResultStatus} onChange={setSelectedResultStatus} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-black text-violet-600 uppercase tracking-widest px-1">Language</label>
                    <Dropdown options={[{ label: "All", value: "" }, { label: "English", value: "en" }, { label: "Hindi", value: "hi" }, { label: "Gujarati", value: "gu" }]} value={selectedLanguage} onChange={setSelectedLanguage} />
                  </div>
                </div>
                {reportType === "appointments" && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-black text-amber-600 uppercase tracking-widest px-1">Reschedule Appointments</label>
                    <Dropdown
                      options={[
                        { label: "All", value: "" },
                        { label: "Reschedule", value: "rescheduled" }
                      ]}
                      value={rescheduleFilter}
                      onChange={setRescheduleFilter}
                    />
                  </div>
                )}

                {/* Row 4: Search, Timeline & Checklist Report */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
                  <div className="lg:col-span-3 flex flex-col gap-1">
                    <label className="text-[11px] font-black text-indigo-600 uppercase tracking-widest px-1">Global Patient Search</label>
                    <div className="relative">
                      <input type="text" placeholder="Name, mobile or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full h-[40px] pl-10 pr-4 bg-white border border-gray-200 rounded-xl text-xs text-black font-medium focus:outline-none focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500 focus:shadow-lg hover:border-amber-500/50 shadow-sm transition-all placeholder:text-black" />
                      <MdSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    </div>
                  </div>
                  <div className="lg:col-span-4 flex flex-col gap-1">
                    <label className="text-[11px] font-black text-indigo-600 uppercase tracking-widest px-1">Timeline Scope</label>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 relative">
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-[40px] px-3 bg-white border border-gray-200 rounded-xl text-xs text-black font-bold focus:outline-none focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500 focus:shadow-lg hover:border-amber-500/50 shadow-sm transition-all placeholder:text-black" />
                      </div>
                      <span className="text-gray-300 font-bold text-xs text-black uppercase">To</span>
                      <div className="flex-1 relative">
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-[40px] px-3 bg-white border border-gray-200 rounded-xl text-xs text-black font-bold focus:outline-none focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500 focus:shadow-lg hover:border-amber-500/50 shadow-sm transition-all placeholder:text-black" />
                      </div>
                    </div>
                  </div>
                  <div className="lg:col-span-3 flex flex-col gap-1">
                    <label className="text-[11px] font-black text-violet-600 uppercase tracking-widest px-1">Daily Checklist Report</label>
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
                      className="w-full h-[40px] bg-gray-50 text-gray-600 border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-xl text-xs text-black font-bold transition-all placeholder:text-black flex items-center justify-center gap-2 shadow-sm"
                    >
                      <MdRefresh size={18} className="transition-transform group-hover:rotate-180" />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Row 5: Dynamic Checklist Filters */}
            {checklistReportEnabled && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-3 pt-3 mt-3 border-t border-gray-100 border-dashed">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-teal-600 uppercase tracking-widest px-1 flex items-center gap-1"><MdWaterDrop /> Water Intake</label>
                  <input type="number" placeholder="Exact times..." value={filterWater} onChange={(e) => setFilterWater(e.target.value)} className="w-full h-[40px] px-3 bg-white border border-gray-200 rounded-xl text-xs text-black font-medium focus:outline-none focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500 focus:shadow-lg hover:border-amber-500/50 shadow-sm transition-all placeholder:text-black" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-orange-600 uppercase tracking-widest px-1 flex items-center gap-1"><MdFitnessCenter /> Exercise</label>
                  <input type="number" placeholder="Exact mins..." value={filterExercise} onChange={(e) => setFilterExercise(e.target.value)} className="w-full h-[40px] px-3 bg-white border border-gray-200 rounded-xl text-xs text-black font-medium focus:outline-none focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500 focus:shadow-lg hover:border-amber-500/50 shadow-sm transition-all placeholder:text-black" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-emerald-600 uppercase tracking-widest px-1 flex items-center gap-1"><MdLocalDrink /> Green Juice</label>
                  <input type="number" placeholder="Exact times..." value={filterJuice} onChange={(e) => setFilterJuice(e.target.value)} className="w-full h-[40px] px-3 bg-white border border-gray-200 rounded-xl text-xs text-black font-medium focus:outline-none focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500 focus:shadow-lg hover:border-amber-500/50 shadow-sm transition-all placeholder:text-black" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-cyan-600 uppercase tracking-widest px-1 flex items-center gap-1"><MdSelfImprovement /> Pranayama</label>
                  <input type="number" placeholder="Exact mins..." value={filterPranayama} onChange={(e) => setFilterPranayama(e.target.value)} className="w-full h-[40px] px-3 bg-white border border-gray-200 rounded-xl text-xs text-black font-medium focus:outline-none focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500 focus:shadow-lg hover:border-amber-500/50 shadow-sm transition-all placeholder:text-black" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-indigo-600 uppercase tracking-widest px-1 flex items-center gap-1"><MdBedtime /> Sleep Hours</label>
                  <input type="number" placeholder="Exact hours..." value={filterSleep} onChange={(e) => setFilterSleep(e.target.value)} className="w-full h-[40px] px-3 bg-white border border-gray-200 rounded-xl text-xs text-black font-medium focus:outline-none focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500 focus:shadow-lg hover:border-amber-500/50 shadow-sm transition-all placeholder:text-black" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Summary Stat Cards - Row 1 */}
        {viewType === "videoReports" ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group transition-all placeholder:text-black hover:shadow-md">
              <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-black font-black text-gray-400 uppercase tracking-widest">Total Users</span>
                <div className="flex items-end gap-2 mt-2">
                  <span className="text-4xl font-black text-gray-900 leading-none">{videoReportStats.totalUsers}</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <div className="w-full h-1 bg-gray-50 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 w-full opacity-20"></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group transition-all placeholder:text-black hover:shadow-md">
              <div className="absolute top-0 left-0 w-full h-1 bg-purple-500"></div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-black font-black text-gray-400 uppercase tracking-widest">Avg Watch Percentage</span>
                <div className="flex items-end gap-2 mt-2">
                  <span className="text-4xl font-black text-purple-600 leading-none">{videoReportStats.avgWatchPercentage}%</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <div className="w-full h-1 bg-gray-50 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 transition-all placeholder:text-black duration-500" style={{
                      width: `${Math.min(100, Number(videoReportStats.avgWatchPercentage))}%`
                    }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group transition-all placeholder:text-black hover:shadow-md">
              <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-black font-black text-gray-400 uppercase tracking-widest">Completed</span>
                <div className="flex items-end gap-2 mt-2">
                  <span className="text-4xl font-black text-green-600 leading-none">{videoReportStats.completedCount}</span>
                  <div className="flex flex-col ml-2">
                    <span className="text-xs text-black font-bold text-gray-400 uppercase tracking-tighter leading-tight">
                      {filteredData.length > 0 ? ((videoReportStats.completedCount / filteredData.length) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <div className="w-full h-1 bg-gray-50 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 transition-all placeholder:text-black duration-500" style={{
                      width: `${filteredData.length > 0 ? (videoReportStats.completedCount / filteredData.length) * 100 : 0}%`
                    }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group transition-all placeholder:text-black hover:shadow-md">
              <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-black font-black text-gray-400 uppercase tracking-widest">Total Watch Time</span>
                <div className="flex items-end gap-2 mt-2">
                  <span className="text-4xl font-black text-amber-600 leading-none">
                    {Math.floor(videoReportStats.totalWatchedSeconds / 60)}m
                  </span>
                  <span className="text-lg font-bold text-gray-500">
                    {videoReportStats.totalWatchedSeconds % 60}s
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <div className="w-full h-1 bg-gray-50 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 w-full opacity-20"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : viewType !== "highest_selling_products" && (
          <>
            <div className={`grid grid-cols-1 md:grid-cols-3 ${reportType === "appointments" ? "lg:grid-cols-4" : ""} gap-6`}>
              <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group transition-all placeholder:text-black hover:shadow-md">
                <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-black font-black text-gray-400 uppercase tracking-widest">Total Results</span>
                  <div className="flex items-end gap-2 mt-2">
                    <span className="text-4xl font-black text-gray-900 leading-none">{filteredData.length}</span>
                    <div className="flex flex-col ml-2">
                      <span className="text-xs text-black font-bold text-gray-400 uppercase tracking-tighter leading-tight">Records Found</span>
                      <span className="text-xs text-black font-bold text-indigo-500 uppercase tracking-tighter leading-tight">
                        {formatPercent(filteredData.length, reportTotalCount)}% of {reportTotalLabel}
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

              <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group transition-all placeholder:text-black hover:shadow-md">
                <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-black font-black text-gray-400 uppercase tracking-widest">Active Status</span>
                  <div className="flex items-end gap-2 mt-2">
                    <span className="text-4xl font-black text-green-600 leading-none">{activeCount}</span>
                    <div className="flex flex-col ml-2">
                      <span className="text-xs text-black font-bold text-gray-400 uppercase tracking-tighter leading-tight">
                        {filteredData.length > 0 ? ((activeCount / filteredData.length) * 100).toFixed(1) : 0}% of Filter
                      </span>
                      <span className="text-xs text-black font-bold text-green-500 uppercase tracking-tighter leading-tight">
                        {formatPercent(activeCount, reportTotalCount)}% of All
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="w-full h-1 bg-gray-50 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 transition-all placeholder:text-black duration-500" style={{
                        width: `${filteredData.length > 0 ? (activeCount / filteredData.length) * 100 : 0}%`
                      }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group transition-all placeholder:text-black hover:shadow-md">
                <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-black font-black text-gray-400 uppercase tracking-widest">Inactive Status</span>
                  <div className="flex items-end gap-2 mt-2">
                    <span className="text-4xl font-black text-red-600 leading-none">{inactiveCount}</span>
                    <div className="flex flex-col ml-2">
                      <span className="text-xs text-black font-bold text-gray-400 uppercase tracking-tighter leading-tight">
                        {filteredData.length > 0 ? ((inactiveCount / filteredData.length) * 100).toFixed(1) : 0}% of Filter
                      </span>
                      <span className="text-xs text-black font-bold text-red-500 uppercase tracking-tighter leading-tight">
                        {formatPercent(inactiveCount, reportTotalCount)}% of All
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="w-full h-1 bg-gray-50 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 transition-all placeholder:text-black duration-500" style={{
                        width: `${filteredData.length > 0 ? (inactiveCount / filteredData.length) * 100 : 0}%`
                      }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {reportType === "appointments" && (
                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group transition-all placeholder:text-black hover:shadow-md">
                  <div className="absolute top-0 left-0 w-full h-1 bg-teal-500"></div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-black font-black text-gray-400 uppercase tracking-widest">Plan Conversion</span>
                    <div className="flex items-end gap-2 mt-2">
                      <span className="text-4xl font-black text-teal-600 leading-none">{appointmentConversionStats.usersWithPlan}</span>
                      <div className="flex flex-col ml-2">
                        <span className="text-xs text-black font-bold text-gray-400 uppercase tracking-tighter leading-tight">
                          {appointmentConversionStats.conversionPercentage}% Conversion
                        </span>
                        <span className="text-xs text-black font-bold text-teal-500 uppercase tracking-tighter leading-tight">
                          of {appointmentConversionStats.totalUniqueUsers} Users
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <div className="w-full h-1 bg-gray-50 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-500 transition-all placeholder:text-black duration-500" style={{
                          width: `${appointmentConversionStats.conversionPercentage}%`
                        }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* New Analytics Boxes - Row 2 */}
            {reportType === "users" && !checklistReportEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden transition-all placeholder:text-black hover:shadow-md">
                  <div className="absolute top-0 left-0 w-full h-1 bg-blue-400"></div>
                  <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Avg Weight & Height</span>
                  <div className="mt-3 flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-black font-bold text-gray-600">Weight</span>
                      <span className="text-lg font-black text-gray-900">{advancedStats.avgWeight} kg</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-black text-gray-400 font-bold uppercase">
                      <span>High: {advancedStats.highestWeight}</span>
                      <span>Low: {advancedStats.lowestWeight}</span>
                    </div>
                    <div className="h-0.5 bg-gray-50 mt-1"></div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-black font-bold text-gray-600">Height</span>
                      <span className="text-lg font-black text-gray-900">{advancedStats.avgHeight} cm</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden transition-all placeholder:text-black hover:shadow-md">
                  <div className="absolute top-0 left-0 w-full h-1 bg-purple-400"></div>
                  <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Ideal Weight & Geography</span>
                  <div className="mt-3 flex flex-col gap-2">
                    <div>
                      <span className="text-xs text-black text-gray-400 font-bold uppercase block">Avg Ideal Weight</span>
                      <span className="text-xl font-black text-purple-600">{advancedStats.avgIdealWeight} kg</span>
                    </div>
                    <div>
                      <span className="text-xs text-black text-gray-400 font-bold uppercase block">Top Booking State</span>
                      <span className="text-[11px] font-black text-gray-800 truncate">{advancedStats.topState}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden transition-all placeholder:text-black hover:shadow-md">
                  <div className="absolute top-0 left-0 w-full h-1 bg-amber-400"></div>
                  <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Referral Performance</span>
                  <div className="mt-3 flex flex-col gap-2">
                    <div>
                      <span className="text-xs text-black text-gray-400 font-bold uppercase block text-amber-600">Highest Source</span>
                      <span className="text-[11px] font-black text-gray-800 truncate">{advancedStats.refPerformance.highest}</span>
                    </div>
                    <div>
                      <span className="text-xs text-black text-gray-400 font-bold uppercase block text-gray-400">Lowest Source</span>
                      <span className="text-[11px] font-black text-gray-600 truncate">{advancedStats.refPerformance.lowest}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden transition-all placeholder:text-black hover:shadow-md">
                  <div className="absolute top-0 left-0 w-full h-1 bg-rose-400"></div>
                  <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Engagement Overview</span>
                  <div className="mt-3 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-black text-gray-400 font-bold uppercase">Video Viewers</span>
                      <span className="text-lg font-black text-rose-500">
                        {filteredData.filter(item => {
                          const u = checklistReportEnabled || reportType === 'appointments' || reportType === 'orders' ? item.userId : (reportType === 'reschedule' ? item.user : item);
                          return u?.seeVideo;
                        }).length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-black text-gray-400 font-bold uppercase">Answered Qs</span>
                      <span className="text-lg font-black text-rose-500">
                        {filteredData.filter(item => {
                          const u = checklistReportEnabled || reportType === 'appointments' || reportType === 'orders' ? item.userId : (reportType === 'reschedule' ? item.user : item);
                          return u?.giveAnswer;
                        }).length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
          <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gradient-to-r from-gray-50/50 to-transparent">
            <h2 className="font-black text-gray-900 flex items-center gap-3 text-lg">
              <div className={`p-2 rounded-xl bg-white shadow-sm border border-gray-50`}>
                {viewType === "videoReports" ? (
                  <MdVideoLibrary className="text-indigo-500" />
                ) : viewType === "highest_selling_products" ? (
                  itemTypeFilter === "Plan" ? <MdSummarize className="text-teal-500" /> : <MdShoppingCart className="text-green-500" />
                ) : (
                  <>
                    {reportType === 'users' && !checklistReportEnabled && <MdPerson className="text-indigo-500" />}
                    {reportType === 'appointments' && !checklistReportEnabled && <MdCalendarMonth className="text-blue-500" />}
                    {reportType === 'orders' && !checklistReportEnabled && <MdShoppingCart className="text-green-500" />}
                    {reportType === 'video' && !checklistReportEnabled && <MdVideoLibrary className="text-purple-500" />}
                    {reportType === 'videoReports' && <MdVideoLibrary className="text-indigo-500" />}
                    {reportType === 'reschedule' && !checklistReportEnabled && <MdHistory className="text-amber-500" />}
                    {reportType === 'screen' && !checklistReportEnabled && <MdVideoSettings className="text-violet-500" />}
                    {checklistReportEnabled && <MdSummarize className="text-teal-500" />}
                  </>
                )}
              </div>
              {viewType === "videoReports"
                ? "Video Reports"
                : viewType === "highest_selling_products"
                  ? (itemTypeFilter === "Plan" ? "Plan" : "Product")
                  : (checklistReportEnabled ? "Daily Checklist" : reportOptions.find(o => o.value === reportType)?.label)} Data
            </h2>
            <div className="flex items-center gap-4">
              {viewType === "videoReports" && selectedVideoId && (
                <span className="text-xs text-black font-black text-purple-600 bg-purple-50 px-4 py-2 rounded-full uppercase tracking-widest border border-purple-100/50 flex items-center gap-1.5">
                  <span className="opacity-60">Avg Watch:</span> {videoReportStats.avgWatchPercentage}%
                </span>
              )}
              <span className="text-xs text-black font-black text-gray-400 bg-gray-100/80 px-4 py-2 rounded-full uppercase tracking-widest border border-gray-50">
                {filteredData.length} Results Found
              </span>
              <button
                type="button"
                onClick={exportFilteredDataToExcel}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 border border-emerald-100 hover:border-emerald-200 rounded-full text-xs text-black font-black uppercase tracking-widest transition-all placeholder:text-black shadow-sm active:scale-95"
              >
                <FiDownload size={12} />
                Export to Excel
              </button>
            </div>
          </div>

          <div className="p-0">
            {/* Active Filters Bar */}
            <div className="px-8 py-3 bg-white border-b border-gray-50 flex items-center gap-3 overflow-x-auto no-scrollbar">
              <span className="text-xs text-black font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Active Filters:</span>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs text-black font-bold border border-indigo-100/50 flex items-center gap-1.5 whitespace-nowrap">
                  <span className="opacity-50">Type:</span> {viewType === "highest_selling_products" ? (itemTypeFilter === "Plan" ? "Plans" : "Products") : reportOptions.find(o => o.value === reportType)?.label}
                </span>
                {viewType === "videoReports" && selectedMinPercentageOption && (
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs text-black font-bold border border-indigo-100/50 flex items-center gap-1.5 whitespace-nowrap">
                    <span className="opacity-50">Min Watch %:</span> {selectedMinPercentageOption}%
                  </span>
                )}
                {viewType === "videoReports" && selectedVideoId && (
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs text-black font-bold border border-blue-100/50 flex items-center gap-1.5 whitespace-nowrap">
                    <span className="opacity-50">Video:</span> {allVideos.find(v => v._id === selectedVideoId)?.title?.english || "Selected Video"}
                  </span>
                )}
                {selectedBranchId && (
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs text-black font-bold border border-blue-100/50 flex items-center gap-1.5 whitespace-nowrap">
                    <span className="opacity-50">Branch:</span> {allBranches.find(b => b._id === selectedBranchId)?.name}
                  </span>
                )}
                {selectedDoctorId && (
                  <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-xs text-black font-bold border border-purple-100/50 flex items-center gap-1.5 whitespace-nowrap">
                    <span className="opacity-50">Doctor:</span> {allDoctors.find(d => d._id === selectedDoctorId)?.username || "Selected Doctor"}
                  </span>
                )}
                {selectedMedicalCondition && (
                  <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-xs text-black font-bold border border-rose-100/50 flex items-center gap-1.5 whitespace-nowrap">
                    <span className="opacity-50">Disease:</span> {selectedMedicalCondition}
                  </span>
                )}
                {selectedCity && (
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs text-black font-bold border border-emerald-100/50 flex items-center gap-1.5 whitespace-nowrap">
                    <span className="opacity-50">City:</span> {selectedCity}
                  </span>
                )}
                {selectedState && (
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs text-black font-bold border border-emerald-100/50 flex items-center gap-1.5 whitespace-nowrap">
                    <span className="opacity-50">State:</span> {selectedState}
                  </span>
                )}
                {statusFilter !== "all" && (
                  <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs text-black font-bold border border-green-100/50 flex items-center gap-1.5 whitespace-nowrap">
                    <span className="opacity-50">Status:</span> {statusFilter}
                  </span>
                )}
                {localOnlineFilter === "local_online" && (
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs text-black font-bold border border-blue-100/50 flex items-center gap-1.5 whitespace-nowrap">
                    <span className="opacity-50">Booking:</span> Local Online
                  </span>
                )}
                {rescheduleFilter && (
                  <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-xs text-black font-bold border border-amber-100/50 flex items-center gap-1.5 whitespace-nowrap">
                    <span className="opacity-50">Reschedule:</span> Reschedule
                  </span>
                )}
                {selectedGender && (
                  <span className="px-3 py-1 bg-pink-50 text-pink-600 rounded-full text-xs text-black font-bold border border-pink-100/50 flex items-center gap-1.5 whitespace-nowrap">
                    <span className="opacity-50">Gender:</span> {selectedGender}
                  </span>
                )}
                {selectedAge && (
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs text-black font-bold border border-indigo-100/50 flex items-center gap-1.5 whitespace-nowrap">
                    <span className="opacity-50">Age:</span> {selectedAge}
                  </span>
                )}
                {usedReferralFilter && (
                  <span className="px-3 py-1 bg-violet-50 text-violet-600 rounded-full text-xs text-black font-bold border border-violet-100/50 flex items-center gap-1.5 whitespace-nowrap">
                    <span className="opacity-50">Referral:</span> {
                      usedReferralFilter === 'has_used'
                        ? 'Used Referral (Referred Users)'
                        : usedReferralFilter === 'sent_referrals'
                          ? 'Sent Referrals (Referrers)'
                          : 'No Referral'
                    }
                  </span>
                )}
                {selectedVideoWatchStatus && (
                  <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-xs text-black font-bold border border-amber-100/50 flex items-center gap-1.5 whitespace-nowrap">
                    <span className="opacity-50">Video:</span> {selectedVideoWatchStatus}
                  </span>
                )}
                {selectedAppointmentStatus && (
                  <span className="px-3 py-1 bg-violet-50 text-violet-600 rounded-full text-xs text-black font-bold border border-violet-100/50 flex items-center gap-1.5 whitespace-nowrap">
                    <span className="opacity-50">Appoint. Status:</span> {selectedAppointmentStatus}
                  </span>
                )}
                {screenDateFilter && reportType === "screen" && (
                  <span className="px-3 py-1 bg-violet-50 text-violet-600 rounded-full text-xs text-black font-bold border border-violet-100/50 flex items-center gap-1.5 whitespace-nowrap">
                    <span className="opacity-50">Screen Date:</span> {screenDateFilter}
                  </span>
                )}
                {viewType === "highest_selling_products" && itemTypeFilter !== "all" && (
                  <span className="px-3 py-1 bg-violet-50 text-violet-600 rounded-full text-xs text-black font-bold border border-violet-100/50 flex items-center gap-1.5 whitespace-nowrap">
                    <span className="opacity-50">Item Type:</span> {itemTypeFilter === "Product" ? "Products Only" : "Plans Only"}
                  </span>
                )}
                {searchTerm && (
                  <span className="px-3 py-1 bg-slate-50 text-slate-600 rounded-full text-xs text-black font-bold border border-slate-100/50 flex items-center gap-1.5 whitespace-nowrap">
                    <span className="opacity-50">Search:</span> "{searchTerm}"
                  </span>
                )}
              </div>
            </div>
            {renderTable()}

            {/* Pagination Controls like Order Page type */}
            {filteredData.length > 20 && (
              <div className="mt-8 flex justify-center items-center gap-4 py-6 bg-white rounded-b-[2rem] border-t border-gray-50">
                <Button
                  variant="secondary"
                  disabled={currentPage === 1 || loading}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                >
                  Previous
                </Button>
                <span className="text-[11px] font-bold text-gray-700">
                  Page {currentPage} of {Math.ceil(filteredData.length / 20)}
                </span>
                <Button
                  variant="secondary"
                  disabled={currentPage === Math.ceil(filteredData.length / 20) || loading}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredData.length / 20)))}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </RoleGuard>
  );
};

export default ReportsPage;
