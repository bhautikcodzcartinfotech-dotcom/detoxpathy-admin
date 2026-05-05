"use client";
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import RoleGuard from "@/components/RoleGuard";
import { Header } from "@/utils/header";
import toast from "react-hot-toast";
import {
  API_HOST,
  getAppointmentsByBranch,
  getAllBranches,
  deleteAppointment,
  joinAppointmentCall,
  endAppointmentCall,
  generateSlots,
  rescheduleAppointment,
  getAllPlans,
  suggestProgram,
  getSuggestedProgram,
  getUserOverview,
  getUserVideoAnswers,
  getAvailableDoctorsForAppointment,
  getTransferRequests,
  acceptTransferAppointment,
  rejectTransferAppointment,
} from "@/Api/AllApi";
import { io } from "socket.io-client";
import { useAuth } from "@/contexts/AuthContext";
import {
  MdCalendarToday,
  MdOutlinePersonOutline,
  MdAccessTime,
  MdOutlineCategory,
  MdDelete,
  MdVideocam,
  MdCallEnd,
} from "react-icons/md";
import {
  Calendar,
  User,
  Clock,
  ChevronRight,
  Search,
  Filter,
  CheckCircle,
  Clock3,
  XOctagon,
  LayoutGrid,
  Ruler,
  Weight,
  Phone,
  MapPin,
  Mail,
  Activity,
  Layout,
  ClipboardList,
  CheckSquare,
  History,
  MessageSquare,
  Target,
  BarChart4,
} from "lucide-react";
import Dropdown from "@/utils/dropdown";
import ConsultationForm from "./ConsultationForm";

const AGORA_SCRIPT_SRC = "https://download.agora.io/sdk/release/AgoraRTC_N.js";

const getTodayInKolkata = () => {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0')
  ].join('-');
};

const getNowInKolkata = () =>
  new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));


const AppointmentPage = () => {
  const router = useRouter();
  const { role, branches } = useAuth();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [allBranches, setAllBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState(null);
  const [callLoadingId, setCallLoadingId] = useState(null);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [activeCallAppointment, setActiveCallAppointment] = useState(null);
  const [callSession, setCallSession] = useState(null);
  const [callConnected, setCallConnected] = useState(false);
  const [remoteParticipantCount, setRemoteParticipantCount] = useState(0);
  const [callError, setCallError] = useState("");
  const [currentTimeMarker, setCurrentTimeMarker] = useState(Date.now());
  const [searchTerm, setSearchTerm] = useState("");
  const [rescheduleData, setRescheduleData] = useState({
    isOpen: false,
    appointment: null,
    date: getTodayInKolkata(),
    slots: [],
    loadingSlots: false,
    selectedSlot: null,
    submitting: false
  });
  const [allPlans, setAllPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [selectedProgressDay, setSelectedProgressDay] = useState(null);
  const [planSearchTerm, setPlanSearchTerm] = useState("");
  const [showPlanPicker, setShowPlanPicker] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(null);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [userOverviewData, setUserOverviewData] = useState(null);
  const [userVideoAnswers, setUserVideoAnswers] = useState([]);
  const [loadingUserOverview, setLoadingUserOverview] = useState(false);
  const [doctorUpdateLoadingId, setDoctorUpdateLoadingId] = useState(null);
  const [showConsultationForm, setShowConsultationForm] = useState(false);
  const [transferRequests, setTransferRequests] = useState([]);
  const [transferActionLoadingId, setTransferActionLoadingId] = useState(null);
  const localVideoRef = useRef(null);
  const remoteVideoGridRef = useRef(null);
  const agoraSdkPromiseRef = useRef(null);
  const agoraSessionRef = useRef({
    client: null,
    localAudioTrack: null,
    localVideoTrack: null,
  });


  const [filterDate, setFilterDate] = useState(getTodayInKolkata());
  const [filterStatus, setFilterStatus] = useState(""); // Changed to empty string to show all by default
  const [filterType, setFilterType] = useState("");
  const [viewMode, setViewMode] = useState("daily"); // "daily" or "weekly"
  const [weekRange, setWeekRange] = useState({ start: "", end: "" });

  const daysMap = {
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday",
    7: "Sunday",
  };

  const getCallStatusMeta = (status) => {
    if (status === "ongoing") {
      return {
        label: "Live",
        className:
          "bg-emerald-50 text-emerald-700 border border-emerald-100",
      };
    }

    if (status === "ended") {
      return {
        label: "Ended",
        className: "bg-rose-50 text-rose-700 border border-rose-100",
      };
    }

    return {
      label: "Waiting",
      className: "bg-amber-50 text-amber-700 border border-amber-100",
    };
  };



  const parseAppointmentDateTime = (date, time) => {
    if (!date || !time) {
      return null;
    }

    const dateParts = date.split("-").map(Number);
    const timeMatch = String(time).trim().match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);

    if (dateParts.length !== 3 || !timeMatch) {
      return null;
    }

    const [year, month, day] = dateParts;
    let hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);
    const period = timeMatch[3].toUpperCase();

    if (period === "AM") {
      hours = hours === 12 ? 0 : hours;
    } else {
      hours = hours === 12 ? 12 : hours + 12;
    }

    return new Date(year, month - 1, day, hours, minutes, 0, 0);
  };

  const getAppointmentTimeState = (appointment) => {
    const now = getNowInKolkata();
    const start = parseAppointmentDateTime(appointment?.date, appointment?.startTime);
    const end = parseAppointmentDateTime(appointment?.date, appointment?.endTime);

    if (!start || !end) {
      return {
        isLiveWindow: false,
        isBeforeWindow: false,
        isAfterWindow: false,
      };
    }

    return {
      isLiveWindow: now >= start && now <= end,
      isBeforeWindow: now < start,
      isAfterWindow: now > end,
    };
  };

  const waitForPaint = () =>
    new Promise((resolve) => {
      // Give React enough time to flush state and attach refs
      setTimeout(resolve, 150);
    });

  const updateAppointmentCallState = (appointmentId, nextCallState) => {
    setAppointments((currentAppointments) =>
      currentAppointments.map((item) =>
        item._id === appointmentId
          ? {
            ...item,
            call: {
              ...(item.call || {}),
              ...(nextCallState || {}),
            },
          }
          : item
      )
    );
  };

  const clearVideoContainers = () => {
    if (localVideoRef.current) {
      localVideoRef.current.innerHTML = "";
    }

    if (remoteVideoGridRef.current) {
      remoteVideoGridRef.current.innerHTML = "";
    }
  };

  const removeRemoteTile = (uid) => {
    if (!remoteVideoGridRef.current) {
      return;
    }

    const tile = remoteVideoGridRef.current.querySelector(
      `[data-remote-uid="${String(uid)}"]`
    );
    if (tile) {
      tile.remove();
    }
  };

  const ensureRemoteTile = (uid) => {

    if (!remoteVideoGridRef.current) {
      console.warn('[AGORA DOM] ❌ remoteVideoGridRef missing');
      return null;
    }

    const selector = `[data-remote-uid="${String(uid)}"]`;
    const existingTile = remoteVideoGridRef.current.querySelector(selector);
    if (existingTile) {
      const body = existingTile.querySelector("[data-remote-body]");
      return body || existingTile;
    }

    const tile = document.createElement("div");
    tile.setAttribute("data-remote-uid", String(uid));
    tile.className =
      "relative h-full w-full overflow-hidden rounded-2xl sm:rounded-[2rem] bg-slate-900 border border-white/5 shadow-2xl";

    const body = document.createElement("div");
    body.setAttribute("data-remote-body", "true");
    body.className = "h-full w-full";
    tile.appendChild(body);

    const label = document.createElement("div");
    label.className =
      "pointer-events-none absolute left-6 top-6 z-10 rounded-full bg-black/40 backdrop-blur-md px-4 py-1.5 text-xs font-black text-white border border-white/10";
    label.textContent = `Patient Stream`;
    tile.appendChild(label);

    remoteVideoGridRef.current.appendChild(tile);
    return body;
  };

  const ensureAgoraSdk = async () => {
    if (typeof window === "undefined") {
      const err = new Error("Agora video call only works in the browser");
      console.error('[AGORA] ❌ Browser check failed:', err);
      throw err;
    }

    // Check for Secure Context (HTTPS is required for getUserMedia on live servers)
    if (!window.isSecureContext && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      const err = new Error("Camera and Microphone access requires a secure context (HTTPS). Please ensure your live server is using HTTPS.");
      console.error('[AGORA] ❌ Secure context failed:', err);
      throw err;
    }


    if (window.AgoraRTC) {
      return window.AgoraRTC;
    }

    if (agoraSdkPromiseRef.current) {
      return agoraSdkPromiseRef.current;
    }

    agoraSdkPromiseRef.current = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = AGORA_SCRIPT_SRC;
      script.async = true;
      script.onload = () => {
        resolve(window.AgoraRTC);
      };
      script.onerror = (err) => {
        reject(new Error("Failed to load Agora video SDK"));
      };
      document.body.appendChild(script);
    });

    return agoraSdkPromiseRef.current;
  };

  const cleanupAgoraSession = async () => {
    const { client, localAudioTrack, localVideoTrack } = agoraSessionRef.current;

    if (localAudioTrack) {
      try {
        localAudioTrack.stop();
        localAudioTrack.close();
      } catch (error) {
        console.error("Error closing local audio track", error);
      }
    }

    if (localVideoTrack) {
      try {
        localVideoTrack.stop();
        localVideoTrack.close();
      } catch (error) {
        console.error("Error closing local video track", error);
      }
    }

    if (client) {
      try {
        await client.leave();
      } catch (error) {
        console.error("Error leaving Agora client", error);
      }
    }

    agoraSessionRef.current = {
      client: null,
      localAudioTrack: null,
      localVideoTrack: null,
    };
    clearVideoContainers();
    setCallConnected(false);
    setRemoteParticipantCount(0);
  };

  const fetchAllBranches = async () => {
    try {
      const data = await getAllBranches();
      setAllBranches(data);
      if (data.length > 0 && !selectedBranchId) {
        if (role === "subadmin" && branches.length > 0) {
          setSelectedBranchId(branches[0]);
        } else {
          const defaultBranch = role === "Admin" ? data.find(b => b.isMainBranch) : data[0];
          setSelectedBranchId(defaultBranch ? defaultBranch._id : data[0]._id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAllPlans = async () => {
    try {
      const data = await getAllPlans();
      setAllPlans(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const getWeekRange = () => {
    const now = getNowInKolkata();
    const day = now.getDay(); // 0 (Sun) to 6 (Sat)

    // We want Monday to Sunday
    // If today is Sunday (0), we want back 6 days for Monday
    // If today is Monday (1), we want 0 days for Monday
    const diffToMonday = day === 0 ? 6 : day - 1;

    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const formatDate = (d) => {
      return [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0')
      ].join('-');
    };

    return {
      start: formatDate(monday),
      end: formatDate(sunday)
    };
  };

  const fetchAppointments = async (
    branchId,
    date = filterDate,
    status = filterStatus,
    type = filterType,
    range = weekRange,
    mode = viewMode,
    silent = false) => {
    if (!branchId) return;
    try {
      if (!silent) setLoading(true);
      const params = {};

      if (mode === "weekly" && range.start && range.end) {
        params.startDate = range.start;
        params.endDate = range.end;
      } else if (date) {
        params.date = date;
      }

      if (status) params.status = status;
      if (type) params.type = type;
      const data = await getAppointmentsByBranch(branchId, params);
      setAppointments(data || []);
    } catch (e) {
      console.error(e);
      setAppointments([]);
      if (e?.response?.status !== 404) {
        toast.error(e?.response?.data?.message || "Failed to load appointments");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Polling for new appointments every 3 seconds
  useEffect(() => {
    if (!selectedBranchId) return;

    const interval = setInterval(() => {
      // Fetch even during active call to detect system-initiated ends
      if (!loading) {
        fetchAppointments(selectedBranchId, filterDate, filterStatus, filterType, weekRange, viewMode, true);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedBranchId, filterDate, filterStatus, filterType, weekRange, viewMode, loading]);


  // Fetch slots when date or branch changes in reschedule modal
  useEffect(() => {
    if (rescheduleData.isOpen && rescheduleData.appointment && rescheduleData.date) {
      const fetchSlots = async () => {
        try {
          setRescheduleData(prev => ({ ...prev, loadingSlots: true, slots: [], selectedSlot: null }));
          const data = await generateSlots(rescheduleData.appointment.branchId, rescheduleData.date);
          setRescheduleData(prev => ({ ...prev, slots: data.slots || [], loadingSlots: false }));
        } catch (err) {
          toast.error("Failed to fetch available slots");
          setRescheduleData(prev => ({ ...prev, loadingSlots: false }));
        }
      };
      fetchSlots();
    }
  }, [rescheduleData.isOpen, rescheduleData.date]);

  const handleOpenRescheduleModal = (appointment) => {
    setRescheduleData({
      isOpen: true,
      appointment,
      date: appointment.date,
      slots: [],
      loadingSlots: false,
      selectedSlot: null,
      submitting: false
    });
  };

  const handleReschedule = async () => {
    if (!rescheduleData.selectedSlot) {
      toast.error("Please select a time slot");
      return;
    }

    try {
      setRescheduleData(prev => ({ ...prev, submitting: true }));
      const payload = {
        date: rescheduleData.date,
        day: parseDateToDay(rescheduleData.date),
        startTime: rescheduleData.selectedSlot.startTime,
        endTime: rescheduleData.selectedSlot.endTime
      };
      await rescheduleAppointment(rescheduleData.appointment._id, payload);
      toast.success("Appointment rescheduled successfully");
      setRescheduleData(prev => ({ ...prev, isOpen: false }));

      // Refresh current list
      fetchAppointments(selectedBranchId, filterDate, filterStatus, filterType);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to reschedule appointment");
    } finally {
      setRescheduleData(prev => ({ ...prev, submitting: false }));
    }
  };

  const InlineDoctorDropdown = ({ item }) => {
    const [doctors, setDoctors] = useState([]);
    const [fetching, setFetching] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
    const dropdownRef = useRef(null);

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setIsOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      // Also close on scroll to prevent floating dropdown
      window.addEventListener("scroll", () => setIsOpen(false), true);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        window.removeEventListener("scroll", () => setIsOpen(false), true);
      };
    }, []);

    const handleToggle = async (e) => {
      if (isOpen) {
        setIsOpen(false);
        return;
      }

      const rect = dropdownRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom,
        left: rect.left,
        width: Math.max(rect.width, 200)
      });

      setIsOpen(true);
      if (doctors.length === 0) {
        try {
          setFetching(true);
          const data = await getAvailableDoctorsForAppointment(item._id);
          setDoctors(data || []);
        } catch (err) {
          toast.error("Failed to load available doctors");
        } finally {
          setFetching(false);
        }
      }
    };

    const handleChange = async (doctorId) => {
      setIsOpen(false);
      if (!doctorId || doctorId === item.doctor?._id) return;
      try {
        setDoctorUpdateLoadingId(item._id);
        await rescheduleAppointment(item._id, {
          date: item.date,
          day: item.day,
          startTime: item.startTime,
          endTime: item.endTime,
          doctorId
        });
        toast.success("Doctor reassigned successfully");
        fetchAppointments(selectedBranchId, filterDate, filterStatus, filterType);
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to reassign doctor");
      } finally {
        setDoctorUpdateLoadingId(null);
      }
    };

    const isUpdating = doctorUpdateLoadingId === item._id;

    return (
      <div className="relative inline-block" ref={dropdownRef}>
        <div
          onClick={!isUpdating ? handleToggle : undefined}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-sm min-w-[140px] ${isOpen
            ? 'bg-white border-blue-400 ring-2 ring-blue-500/10'
            : 'bg-blue-50/50 border-blue-100/50 hover:border-blue-300'
            } ${isUpdating ? 'opacity-50 cursor-wait' : ''}`}
        >
          <User size={12} className={isOpen ? "text-blue-600" : "text-blue-500"} />
          <span className="text-[12px] font-black text-blue-600 flex-1 truncate">
            {item.doctor?.username || "Select Doctor"}
          </span>
          {isUpdating ? (
            <div className="size-2.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
              <ChevronRight size={10} className="text-blue-400 rotate-90" />
            </motion.div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {isOpen && (
            <motion.div
              style={{ top: coords.top + 8, left: coords.left, width: coords.width }}
              initial={{ opacity: 0, scale: 0.95, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -5 }}
              className="fixed bg-white rounded-2xl border border-gray-100 shadow-[0_30px_90px_rgba(0,0,0,0.2)] z-[9999] overflow-hidden p-1.5"
            >
              <div className="max-h-[260px] overflow-y-auto scrollbar-hide py-1">
                {fetching ? (
                  <div className="flex flex-col items-center justify-center py-6 gap-2">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Checking Availability...</span>
                  </div>
                ) : doctors.length > 0 ? (
                  doctors.map((d) => (
                    <div
                      key={d._id}
                      onClick={() => handleChange(d._id)}
                      className={`px-4 py-3 rounded-xl cursor-pointer transition-all flex items-center justify-between group/opt ${item.doctor?._id === d._id ? 'bg-blue-50/50' : 'hover:bg-gray-50'
                        }`}
                    >
                      <span className={`text-[12px] font-black truncate ${item.doctor?._id === d._id ? 'text-blue-600' : 'text-gray-700'}`}>
                        {d.username}
                      </span>
                      {item.doctor?._id === d._id && <CheckCircle size={14} className="text-blue-500 shrink-0" />}
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center">
                    <span className="text-[10px] font-bold text-gray-400">No candidates available</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const parseDateToDay = (dateString) => {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const jsDay = date.getDay();
    return jsDay === 0 ? '7' : String(jsDay);
  };

  const openDeleteModal = (id) => {
    setAppointmentToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!appointmentToDelete) return;
    try {
      setLoading(true);
      await deleteAppointment(appointmentToDelete);
      toast.success("Appointment cancelled successfully");
      setIsDeleteModalOpen(false);
      setAppointmentToDelete(null);
      fetchAppointments(selectedBranchId, filterDate, filterStatus, filterType);
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Failed to cancel appointment");
      setLoading(false);
      setIsDeleteModalOpen(false);
      setAppointmentToDelete(null);
    }
  };

  const handleReceiveCall = async (appointment) => {
    if (!appointment?._id) {
      return;
    }

    if (activeCallAppointment?._id && activeCallAppointment._id !== appointment._id) {
      toast.error("Cut the current video call before receiving another one");
      return;
    }

    if (!appointment.agoraAppId) {
      toast.error("AGORA_APP_ID is missing on the backend");
      return;
    }

    if (appointment.call?.status === "ended") {
      toast.error("This video call has already ended");
      return;
    }

    try {
      setCallLoadingId(appointment._id);
      setCallError("");
      setIsCallModalOpen(true);
      setActiveCallAppointment(appointment);
      setCallSession(null);
      await waitForPaint();

      const AgoraRTC = await ensureAgoraSdk();

      // Check system requirements
      const checkResult = AgoraRTC.checkSystemRequirements();
      if (!checkResult) {
        const err = new Error("Your browser does not support the video calling feature. Please use a modern browser like Chrome or Firefox.");
        console.error('[AGORA] ❌ System requirements failed');
        throw err;
      }

      // Check if getUserMedia is available (it's often missing on HTTP)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const err = new Error("Your browser or connection is not secure enough to access the camera/microphone. Please use HTTPS.");
        console.error('[AGORA] ❌ getUserMedia unavailable');
        throw err;
      }

      await cleanupAgoraSession();

      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      agoraSessionRef.current.client = client;

      // Enhanced user-published handler with logging
      client.on("user-published", async (user, mediaType) => {

        try {
          await client.subscribe(user, mediaType);

          if (mediaType === "video") {
            // Explicitly request high-quality stream for the remote user
            client.setRemoteVideoStreamType(user.uid, 0);

            const remoteBody = ensureRemoteTile(user.uid);
            if (remoteBody) {
              user.videoTrack.play(remoteBody, { fit: "cover" });
            } else {
              console.warn('[AGORA] ⚠️ No remoteBody for uid:', user.uid);
            }
          } else if (mediaType === "audio") {
            user.audioTrack.play();
          }
        } catch (subError) {
          console.error('[AGORA] ❌ Subscribe failed for uid:', user.uid, mediaType, subError);
        }

        const remoteCount = client.remoteUsers.length;
        setRemoteParticipantCount(remoteCount);
      });

      const handleRemoteUserExit = (user) => {
        removeRemoteTile(user?.uid);
        setRemoteParticipantCount(client.remoteUsers.length);
      };

      client.on("user-left", handleRemoteUserExit);

      client.on("user-unpublished", (user, mediaType) => {
        if (mediaType === "video") {
          removeRemoteTile(user?.uid);
        }
        setRemoteParticipantCount(client.remoteUsers.length);
      });

      const [localAudioTrack, localVideoTrack] = await Promise.all([
        AgoraRTC.createMicrophoneAudioTrack(),
        AgoraRTC.createCameraVideoTrack({
          encoderConfig: "1080p_2", // Ultra High quality: 1920x1080, 30fps, 3150Kbps
        }),
      ]);

      if (localVideoTrack) {
        await localVideoTrack.setOptimizationMode("detail");
      }

      console.log('[AGORA]  Local tracks created:', {
        audio: !!localAudioTrack,
        video: !!localVideoTrack,
        videoEnabled: localVideoTrack?.enabled,
        muted: localVideoTrack?.muted
      });

      agoraSessionRef.current.localAudioTrack = localAudioTrack;
      agoraSessionRef.current.localVideoTrack = localVideoTrack;

      // Enhanced local video setup with better timing
      if (!localVideoRef.current) {
        console.warn('[AGORA] ⚠️ localVideoRef not ready, waiting...');
        // Wait up to 1000ms for React to attach the ref
        for (let i = 0; i < 20; i++) {
          await new Promise((res) => setTimeout(res, 50));
          if (localVideoRef.current) {
            break;
          }
        }
      }

      if (localVideoRef.current) {
        localVideoTrack.play(localVideoRef.current, { fit: "cover" });
      } else {
        console.error('[AGORA] ❌ localVideoRef still missing after wait');
        toast.error("Failed to render camera container - check console");
      }

      const session = await joinAppointmentCall(appointment._id);
      console.log('[AGORA] Backend session:', {
        appId: session?.appId ? `${session.appId.slice(0, 8)}...` : 'MISSING',
        channelName: session?.channelName,
        uid: session?.uid,
        token: session?.token ? 'PRESENT' : 'MISSING',
        callStatus: session?.call?.status
      });

      if (!session?.appId || !session?.channelName) {
        const err = new Error("Missing Agora channel details from backend");
        console.error('[AGORA] ❌ Backend missing session data:', session);
        throw err;
      }

      await client.join(
        session.appId,
        session.channelName,
        session.token || null,
        session.uid || null
      );

      await client.publish([localAudioTrack, localVideoTrack]);

      setCallSession(session);
      setCallConnected(true);
      setActiveCallAppointment((currentAppointment) =>
        currentAppointment
          ? {
            ...currentAppointment,
            call: session.call || currentAppointment.call,
          }
          : currentAppointment
      );
      updateAppointmentCallState(appointment._id, session.call || { status: "ongoing" });

      // Fetch existing suggestion
      try {
        const resp = await getSuggestedProgram(appointment.userId?._id);
        const suggestion = resp?.suggestion || resp;
        setActiveSuggestion(suggestion);
        if (suggestion && suggestion.plans) {
          setSelectedPlanId(suggestion.plans?._id || suggestion.plans);
        } else {
          setSelectedPlanId("");
        }
      } catch (e) {
        console.error("Error fetching suggestion:", e);
        setSelectedPlanId("");
        setActiveSuggestion(null);
      }

      toast.success("Video call connected");
    } catch (error) {
      console.error('[AGORA]  FULL CALL ERROR:', error);
      setCallError(error?.response?.data?.message || error.message);
      toast.error(
        error?.response?.data?.message || error.message || "Failed to receive call"
      );
      await cleanupAgoraSession();
      setIsCallModalOpen(false);
      setActiveCallAppointment(null);
      setCallSession(null);
    } finally {
      setCallLoadingId(null);
    }
  };

  const handleCutCall = async (appointment) => {
    if (!appointment?._id) {
      return;
    }

    try {
      setCallLoadingId(appointment._id);
      await cleanupAgoraSession();
      const updatedAppointment = await endAppointmentCall(appointment._id);
      updateAppointmentCallState(
        appointment._id,
        updatedAppointment?.call || {
          status: "ended",
          endedAt: new Date().toISOString(),
          endedBy: "admin",
        }
      );
      setIsCallModalOpen(false);
      setActiveCallAppointment(null);
      setCallSession(null);
      setCallError("");
      toast.success("Video call ended");
      fetchAppointments(selectedBranchId, filterDate, filterStatus, filterType);
    } catch (error) {
      console.error(error);
      toast.error(
        error?.response?.data?.message || error.message || "Failed to cut the call"
      );
    } finally {
      setCallLoadingId(null);
    }
  };

  const handleSuggestProgram = async () => {
    if (!selectedPlanId) {
      toast.error("Please select a program to suggest");
      return;
    }

    try {
      setSuggesting(true);
      await suggestProgram({
        userId: activeCallAppointment.userId?._id,
        planId: selectedPlanId,
      });
      toast.success("Program suggested successfully");

      // Update local suggestion state
      const suggestedPlan = allPlans.find(p => p._id === selectedPlanId);
      setActiveSuggestion({
        plans: suggestedPlan,
        suggestedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Failed to suggest program");
    } finally {
      setSuggesting(false);
    }
  };

  const fetchTransferRequests = async () => {
    try {
      const data = await getTransferRequests();
      setTransferRequests(data || []);
    } catch (e) {
      console.error("Failed to fetch transfer requests", e);
    }
  };

  const handleAcceptTransfer = async (appointmentId) => {
    try {
      setTransferActionLoadingId(appointmentId);
      await acceptTransferAppointment(appointmentId);
      toast.success("Transfer accepted! Appointment has been reassigned.");
      fetchTransferRequests();
      fetchAppointments(selectedBranchId, filterDate, filterStatus, filterType, weekRange, viewMode);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to accept transfer");
    } finally {
      setTransferActionLoadingId(null);
    }
  };

  const handleRejectTransfer = async (appointmentId) => {
    try {
      setTransferActionLoadingId(appointmentId);
      await rejectTransferAppointment(appointmentId);
      toast.success("Transfer request rejected.");
      fetchTransferRequests();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to reject transfer");
    } finally {
      setTransferActionLoadingId(null);
    }
  };

  useEffect(() => {
    fetchAllBranches();
    fetchAllPlans();
    fetchTransferRequests();
  }, []);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;

    const socket = io(API_HOST, {
      auth: { token },
    });

    socket.on("call_ended", async (data) => {
      console.log("[SOCKET] Received call_ended:", data);

    });

    return () => {
      socket.disconnect();
    };
  }, [activeCallAppointment?._id, selectedBranchId, filterDate, filterStatus, filterType]);

  const toggleUserProfile = async () => {
    if (!showUserProfile && activeCallAppointment?.userId?._id) {
      try {
        setShowConsultationForm(false);
        setLoadingUserOverview(true);
        const [overview, videoAns] = await Promise.all([
          getUserOverview(activeCallAppointment.userId._id),
          getUserVideoAnswers(activeCallAppointment.userId._id).catch(() => [])
        ]);
        setUserOverviewData(overview);
        setUserVideoAnswers(videoAns || []);
        setSelectedProgressDay(overview.user?.planCurrentDay || 1);
        setShowUserProfile(true);
      } catch (err) {
        toast.error("Failed to load user profile");
        console.error(err);
      } finally {
        setLoadingUserOverview(false);
      }
    } else {
      setShowUserProfile(false);
    }
  };

  const toggleConsultationForm = () => {
    if (!showConsultationForm) {
      setShowUserProfile(false);
      setShowConsultationForm(true);
    } else {
      setShowConsultationForm(false);
    }
  };

  useEffect(() => {
    if (selectedBranchId) {
      fetchAppointments(selectedBranchId, filterDate, filterStatus, filterType, weekRange, viewMode);
    } else {
      setLoading(false);
    }
  }, [selectedBranchId, filterDate, filterStatus, filterType, weekRange, viewMode]);

  useEffect(() => {
    return () => {
      cleanupAgoraSession();
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTimeMarker(Date.now());
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!activeCallAppointment || !callConnected) return;

    const doctorId = activeCallAppointment.doctor?._id;
    const currentDate = activeCallAppointment.date;
    if (!doctorId || !currentDate) return;

    const parseTimeToMins = (timeStr) => {
        const match = String(timeStr).trim().match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
        if (!match) return 0;
        let hours = Number(match[1]);
        const mins = Number(match[2]);
        const period = match[3].toUpperCase();
        if (period === 'AM') hours = hours === 12 ? 0 : hours;
        else hours = hours === 12 ? 12 : hours + 12;
        return hours * 60 + mins;
    };

    const currentApptStartMins = parseTimeToMins(activeCallAppointment.startTime);

    const nextAppointments = appointments.filter(app => 
        app.doctor?._id === doctorId && 
        app.date === currentDate && 
        app._id !== activeCallAppointment._id &&
        app.status !== 'cancelled' &&
        parseTimeToMins(app.startTime) > currentApptStartMins
    );

    if (nextAppointments.length === 0) return;

    nextAppointments.sort((a, b) => parseTimeToMins(a.startTime) - parseTimeToMins(b.startTime));
    const nextAppt = nextAppointments[0];

    if (nextAppt) {
        const nextApptStartMins = parseTimeToMins(nextAppt.startTime);
        const now = getNowInKolkata();
        const currentMins = now.getHours() * 60 + now.getMinutes();

        if (currentMins >= nextApptStartMins) {
            toast.error(`Auto ending call. Doctor has another appointment at ${nextAppt.startTime}`);
            handleCutCall(activeCallAppointment);
        }
    }
  }, [currentTimeMarker, activeCallAppointment, callConnected, appointments]);

  const getAppointmentFilterStatus = (appointment) => {
    if ((appointment.status || 'scheduled') === 'cancelled') {
      return 'cancelled';
    }

    const currentDate = getTodayInKolkata();
    const now = getNowInKolkata();
    const currentMinutes = (now.getHours() * 60) + now.getMinutes();
    const isOnline = Number(appointment.type) === 1;

    if (isOnline && appointment.call?.status === 'ended') {
      if (appointment.call.adminJoined && appointment.call.userJoined) {
        return 'completed';
      }
      return 'missed';
    }

    if (appointment.date > currentDate) {
      return 'upcoming';
    }

    if (appointment.date < currentDate) {
      if (isOnline) {
        if (!(appointment.call?.adminJoined && appointment.call?.userJoined)) {
          return 'missed';
        }
      }
      return 'completed';
    }

    const timeMatch = String(appointment.endTime).trim().match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
    if (!timeMatch) return 'upcoming';

    let hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);
    const period = timeMatch[3].toUpperCase();
    if (period === 'AM') hours = (hours === 12 ? 0 : hours);
    else hours = (hours === 12 ? 12 : hours + 12);

    const appointmentEndMinutes = (hours * 60) + minutes;

    if (appointmentEndMinutes >= currentMinutes) {
      return 'upcoming';
    }

    if (isOnline) {
      if (!(appointment.call?.adminJoined && appointment.call?.userJoined)) {
        return 'missed';
      }
    }

    return 'completed';
  };

  const filteredAppointments = appointments.filter((item) => {
    const fullName = `${item.userId?.name} ${item.userId?.surname}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) ||
      item._id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const stats = {
    total: appointments.length,
    completed: appointments.filter(a => getAppointmentFilterStatus(a) === 'completed').length,
    upcoming: appointments.filter(a => getAppointmentFilterStatus(a) === 'upcoming').length,
    missed: appointments.filter(a => getAppointmentFilterStatus(a) === 'missed').length,
    cancelled: appointments.filter(a => getAppointmentFilterStatus(a) === 'cancelled').length,
  };

  return (
    <RoleGuard allow={["Admin", "subadmin"]}>
      <div className="w-full h-full px-4 sm:px-6 lg:px-8 bg-[#F8FAFC] min-h-screen pb-10">
        <div className="flex flex-col gap-1 mb-8 pt-6">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Appointments</h1>
          <p className="text-sm text-gray-500 font-medium">All consultations across all patients. Manage, reassign, or cancel.</p>
        </div>

        {/* ── Transfer Requests Banner ── */}
        {transferRequests.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                </span>
                <h2 className="text-base font-black text-gray-800 uppercase tracking-wider">Pending Transfer Requests</h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-yellow-400 text-black text-xs font-black">{transferRequests.length}</span>
            </div>
            <div className="space-y-3">
              {transferRequests.map((req) => {
                const isLoading = transferActionLoadingId === req._id;
                return (
                  <div key={req._id} className="bg-white border-l-4 border-yellow-400 rounded-2xl p-5 shadow-md flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1">
                      <p className="font-bold text-gray-800 text-sm">
                        Patient: <span className="text-teal-700">{req.userId?.name} {req.userId?.surname}</span>
                      </p>
                      <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                        <span>📅 Date: <strong className="text-gray-700">{req.transferRequest?.date}</strong></span>
                        <span>🕐 Time: <strong className="text-gray-700">{req.transferRequest?.startTime} – {req.transferRequest?.endTime}</strong></span>
                        <span>🏥 Branch: <strong className="text-gray-700">{req.transferRequest?.branchId?.name || "—"}</strong></span>
                        {req.transferRequest?.doctorId && (
                          <span>👨‍⚕️ To Doctor: <strong className="text-gray-700">{req.transferRequest.doctorId?.username}</strong></span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Requested: {req.transferRequest?.requestedAt ? new Date(req.transferRequest.requestedAt).toLocaleString() : "—"}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleAcceptTransfer(req._id)}
                        disabled={isLoading}
                        className="px-5 py-2 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-400 text-black font-bold text-sm hover:from-yellow-500 hover:to-amber-500 transition-all shadow disabled:opacity-50"
                      >
                        {isLoading ? "..." : "✓ Accept"}
                      </button>
                      <button
                        onClick={() => handleRejectTransfer(req._id)}
                        disabled={isLoading}
                        className="px-5 py-2 rounded-xl border border-red-200 bg-red-50 text-red-600 font-bold text-sm hover:bg-red-100 transition-all disabled:opacity-50"
                      >
                        {isLoading ? "..." : "✕ Reject"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: viewMode === "daily" ? "TODAY TOTAL" : "WEEKLY TOTAL", value: stats.total, color: "border-teal-600", icon: LayoutGrid, iconColor: "text-teal-600" },
            { label: "COMPLETED", value: stats.completed, color: "border-green-500", icon: CheckCircle, iconColor: "text-green-500" },
            { label: "UPCOMING", value: stats.upcoming, color: "border-orange-500", icon: Clock3, iconColor: "text-orange-500" },
            { label: "MISSED", value: stats.missed, color: "border-gray-400", icon: XOctagon, iconColor: "text-gray-400" },
            { label: "CANCELLED", value: stats.cancelled, color: "border-red-500", icon: XOctagon, iconColor: "text-red-500" },
          ].map((item, idx) => (
            <div key={idx} className={`bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border-t-4 ${item.color} shadow-sm transition-all hover:shadow-md hover:scale-[1.02]`}>
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-black text-gray-400 tracking-widest">{item.label}</p>
                <item.icon className={`w-4 h-4 ${item.iconColor}`} />
              </div>
              <p className="text-3xl font-black text-gray-900">{item.value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {/* Filters Bar */}
        <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-3 sm:gap-4 mb-8">
          <div className="relative w-full sm:flex-1 sm:min-w-[300px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by patient name or ID..."
              className="w-full h-12 pl-11 pr-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white shadow-sm transition-all text-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-4 w-full sm:w-auto">
            {role === "Admin" && (
              <div className="flex-1 min-w-[160px] sm:flex-none">
                <Dropdown
                  options={allBranches.map((b) => ({ label: b.name, value: b._id }))}
                  value={selectedBranchId}
                  onChange={setSelectedBranchId}
                  placeholder="Select Branch"
                />
              </div>
            )}

            <div className="flex-1 min-w-[140px] sm:flex-none">
              <Dropdown
                options={[
                  { label: "All Status", value: "" },
                  { label: "Upcoming", value: "1" },
                  { label: "Completed", value: "2" },
                  { label: "Missed", value: "4" },
                  { label: "Cancelled", value: "3" },
                ]}
                value={filterStatus}
                onChange={setFilterStatus}
                placeholder="All Status"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl shadow-inner flex-1 sm:flex-none justify-center h-12">
              <button
                onClick={() => {
                  setViewMode("daily");
                  setFilterDate(getTodayInKolkata());
                }}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all h-full ${viewMode === "daily" && filterDate === getTodayInKolkata() ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Today
              </button>
              <button
                onClick={() => {
                  setWeekRange(getWeekRange());
                  setViewMode("weekly");
                }}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all h-full ${viewMode === "weekly" ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Week
              </button>
            </div>

            <div className="h-12 flex items-center gap-2 bg-white px-4 rounded-xl border border-gray-200 shadow-sm flex-1 min-w-[140px] sm:flex-none px-1">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={filterDate}
                onChange={(e) => {
                  setFilterDate(e.target.value);
                  setViewMode("daily");
                }}
                className="text-sm font-bold text-gray-700 bg-transparent focus:outline-none w-full"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
          </div>
        ) : filteredAppointments.length > 0 ? (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-teal-900/5">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/30">
                    <th className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">CON ID</th>
                    <th className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">PATIENT</th>
                    <th className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">BRANCH</th>
                    <th className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">DOCTOR</th>
                    <th className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">DATE & TIME</th>
                    <th className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">STATUS</th>
                    <th className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">ADMIN JOIN</th>
                    <th className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">USER JOIN</th>
                    <th className="px-6 py-5 text-center text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredAppointments.map((item) => {
                    const statusLabel = getAppointmentFilterStatus(item);
                    const isOnline = item.type === 1;
                    const timeState = getAppointmentTimeState(item);
                    const isCurrentCall = activeCallAppointment?._id === item._id;
                    const canReceiveCall = isOnline && timeState.isLiveWindow && item.call?.status !== "ended" && (!activeCallAppointment?._id || isCurrentCall);

                    return (
                      <tr key={item._id} className="group hover:bg-gray-50/80 transition-all duration-200">
                        <td className="px-6 py-6 whitespace-nowrap text-[13px] font-black text-teal-600">
                          CON-{item._id.slice(-6).toUpperCase()}
                        </td>
                        <td className="px-6 py-6 whitespace-nowrap text-[14px] font-bold text-gray-800">
                          {item.userId?.name} {item.userId?.surname}
                        </td>
                        <td className="px-6 py-6 whitespace-nowrap text-[13px] font-black text-teal-700 uppercase tracking-tighter">
                          {item.branchName || item.branchId?.name || "N/A"}
                        </td>
                        <td className="px-6 py-6 whitespace-nowrap">
                          <InlineDoctorDropdown item={item} />
                        </td>
                        <td className="px-6 py-6 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-[13px] font-bold text-gray-800">{item.date === getTodayInKolkata() ? "Today" : item.date}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Clock className="w-3 h-3 text-gray-400" />
                              <span className="text-[12px] font-medium text-gray-500 uppercase tracking-wide">{item.startTime}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-6 whitespace-nowrap">
                          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase shadow-sm ${statusLabel === 'completed' ? 'bg-green-100 text-green-700' :
                            statusLabel === 'cancelled' ? 'bg-red-100 text-red-600' :
                              statusLabel === 'missed' ? 'bg-gray-100 text-gray-600' :
                                'bg-orange-100 text-orange-600'
                            }`}>
                            {statusLabel}
                          </span>
                        </td>
                        <td className="px-6 py-6 whitespace-nowrap">
                          {Number(item.type) === 1 ? (
                            <span className={`px-3 py-1 rounded-lg text-[10px] font-bold border ${item.call?.adminJoined ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                              {item.call?.adminJoined ? 'JOINED' : 'NOT JOINED'}
                            </span>
                          ) : <span className="text-gray-300 text-[10px] font-bold">OFFLINE</span>}
                        </td>
                        <td className="px-6 py-6 whitespace-nowrap">
                          {Number(item.type) === 1 ? (
                            <span className={`px-3 py-1 rounded-lg text-[10px] font-bold border ${item.call?.userJoined ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                              {item.call?.userJoined ? 'JOINED' : 'NOT JOINED'}
                            </span>
                          ) : <span className="text-gray-300 text-[10px] font-bold">OFFLINE</span>}
                        </td>
                        <td className="px-6 py-6">
                          <div className="flex items-center justify-center gap-2">
                            {isOnline && timeState.isLiveWindow && item.call?.status !== "ended" && (
                              <button
                                onClick={() => handleReceiveCall(item)}
                                disabled={!canReceiveCall || callLoadingId === item._id}
                                className="h-9 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black shadow-lg shadow-teal-100 transition-all disabled:opacity-50 flex items-center gap-2"
                              >
                                <MdVideocam size={16} /> Join
                              </button>
                            )}
                            <button className="h-9 px-4 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-xl text-xs font-bold transition-all" onClick={() => handleOpenRescheduleModal(item)}>Reschedule</button>
                            <button className="h-9 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold shadow-sm transition-all" onClick={() => router.push(`/component/users/${item.userId?._id}/profile`)}>View</button>
                            {statusLabel === 'upcoming' && (
                              <button onClick={() => openDeleteModal(item._id)} className="h-9 px-4 bg-white border border-red-100 hover:bg-red-50 text-red-600 rounded-xl text-xs font-bold shadow-sm transition-all">Cancel</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden grid grid-cols-1 gap-4">
              {filteredAppointments.map((item) => {
                const statusLabel = getAppointmentFilterStatus(item);
                const isOnline = item.type === 1;
                const timeState = getAppointmentTimeState(item);
                const isCurrentCall = activeCallAppointment?._id === item._id;
                const canReceiveCall = isOnline && timeState.isLiveWindow && item.call?.status !== "ended" && (!activeCallAppointment?._id || isCurrentCall);

                return (
                  <div key={item._id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm transition-all active:scale-[0.98]">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col">
                        <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest mb-1">CON-{item._id.slice(-6).toUpperCase()}</p>
                        <h4 className="text-lg font-black text-gray-900">{item.userId?.name} {item.userId?.surname}</h4>
                        <p className="text-xs font-bold text-gray-400 flex items-center gap-1.5 mt-1">
                          <MapPin size={12} /> {item.branchName || item.branchId?.name || "N/A"}
                        </p>
                        <div className="mt-2">
                          <InlineDoctorDropdown item={item} />
                        </div>
                      </div>
                      <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${statusLabel === 'completed' ? 'bg-green-100 text-green-700' :
                        statusLabel === 'cancelled' ? 'bg-red-100 text-red-600' :
                          statusLabel === 'missed' ? 'bg-gray-100 text-gray-600' :
                            'bg-orange-100 text-orange-600'
                        }`}>
                        {statusLabel}
                      </span>
                    </div>

                    {Number(item.type) === 1 && (
                      <div className="mb-4 flex gap-2">
                        <div className={`flex-1 flex flex-col items-center p-2 rounded-xl border ${item.call?.adminJoined ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                          <span className="text-[8px] font-black text-gray-400 uppercase mb-1">Admin Joined</span>
                          <span className={`text-[10px] font-bold ${item.call?.adminJoined ? 'text-green-600' : 'text-red-600'}`}>
                            {item.call?.adminJoined ? 'YES' : 'NO'}
                          </span>
                        </div>
                        <div className={`flex-1 flex flex-col items-center p-2 rounded-xl border ${item.call?.userJoined ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                          <span className="text-[8px] font-black text-gray-400 uppercase mb-1">User Joined</span>
                          <span className={`text-[10px] font-bold ${item.call?.userJoined ? 'text-green-600' : 'text-red-600'}`}>
                            {item.call?.userJoined ? 'YES' : 'NO'}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-6 mb-6 p-4 bg-gray-50 rounded-2xl">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-gray-400 uppercase mb-1">Date</span>
                        <span className="text-xs font-bold text-gray-800">{item.date === getTodayInKolkata() ? "Today" : item.date}</span>
                      </div>
                      <div className="w-px h-8 bg-gray-200" />
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-gray-400 uppercase mb-1">Time</span>
                        <span className="text-xs font-bold text-gray-800">{item.startTime}</span>
                      </div>
                      <div className="flex-1" />
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isOnline ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                        {isOnline ? <MdVideocam size={18} /> : <MdCalendarToday size={16} />}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {isOnline && timeState.isLiveWindow && item.call?.status !== "ended" && (
                        <button
                          onClick={() => handleReceiveCall(item)}
                          disabled={!canReceiveCall || callLoadingId === item._id}
                          className="h-12 bg-teal-600 text-white rounded-xl text-xs font-black shadow-lg shadow-teal-100 flex items-center justify-center gap-2 col-span-2 mb-1"
                        >
                          <MdVideocam size={20} /> Join Live Call
                        </button>
                      )}
                      <button className="h-11 bg-teal-50 text-teal-700 rounded-xl text-[11px] font-black uppercase" onClick={() => handleOpenRescheduleModal(item)}>Reschedule</button>
                      <button className="h-11 bg-slate-100 text-slate-700 rounded-xl text-[11px] font-black uppercase" onClick={() => router.push(`/component/users/${item.userId?._id}/profile`)}>View Profile</button>
                      {statusLabel === 'upcoming' && (
                        <button onClick={() => openDeleteModal(item._id)} className="h-11 border border-red-100 text-red-600 rounded-xl text-[11px] font-black uppercase col-span-2 mt-1">Cancel Appointment</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-gray-100 p-20 text-center shadow-sm">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">No Appointments Found</h3>
            <p className="text-gray-500 max-w-sm mx-auto font-medium">There are no scheduled consultations matching your current filters.</p>
          </div>
        )}
        {isCallModalOpen && activeCallAppointment && (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/20 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, x: 200 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 200 }}
              className={`relative flex h-full flex-col lg:flex-row overflow-hidden bg-white shadow-[-20px_0_60px_rgba(0,0,0,0.1)] transition-all duration-500 ${(showUserProfile || showConsultationForm) ? 'w-full' : 'w-full lg:w-[70vw]'}`}
            >
              {/* Left Pane: Full Patient Dashboard (Matches Main Profile Page) */}
              <AnimatePresence>
                {showUserProfile && userOverviewData && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ type: "spring", damping: 30, stiffness: 200 }}
                    className="flex flex-col border-r border-slate-100 bg-white lg:bg-slate-50/30 overflow-hidden absolute inset-0 z-50 lg:relative lg:inset-auto lg:z-0 lg:w-[45%] h-full"
                  >
                    {(() => {
                      const user = userOverviewData.user;
                      return (
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-8 space-y-6">
                          {/* Header: User Profile Title & Back (Close) */}
                          <div className="flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-20 py-4 px-2 -mx-2 border-b border-slate-100 rounded-t-3xl">
                            <div className="flex flex-col">
                              <h4 className="text-2xl font-black text-slate-900 tracking-tight">User Profile</h4>
                            </div>
                            <button
                              onClick={toggleUserProfile}
                              className="bg-slate-900 border border-slate-800 px-4 sm:px-6 py-2 rounded-xl text-[10px] sm:text-xs font-black text-white hover:bg-black transition-all shadow-lg flex items-center gap-2"
                            >
                              <ChevronRight className="w-4 h-4 rotate-180" />
                              Back
                            </button>
                          </div>

                          {/* Section 1: Top Profile Header Card */}
                          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                                <div className="w-16 h-16 rounded-full overflow-hidden bg-teal-500 text-white flex items-center justify-center font-bold text-2xl shrink-0 border-4 border-white shadow-lg">
                                  {user?.image ? (
                                    <img src={`${API_HOST}/${user.image}`} className="w-full h-full object-cover" />
                                  ) : (user?.name?.[0] || "U")}
                                </div>
                                <div className="flex flex-col">
                                  <h5 className="text-xl font-black text-slate-900 leading-none mb-1">
                                    {user?.name} {user?.surname}
                                  </h5>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    USR-{user?._id?.slice(-6).toUpperCase()} • {user?.mobileNumber || "No Mobile"} • {user?.email || "No Email"}
                                  </p>
                                </div>
                              </div>
                              {user?.planHoldDate && (
                                <div className="bg-amber-50 border border-amber-100 px-3 py-1 rounded-full">
                                  <span className="text-[10px] font-black text-amber-600 uppercase">Hold — Day {user?.planCurrentDay || 1}</span>
                                </div>
                              )}
                            </div>

                            {/* Information Grid (Matches Screenshot) */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-4 border-t border-slate-50 pt-6">
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Branch</p>
                                <p className="text-xs font-bold text-slate-700">{user?.branch?.name || "Global"}</p>
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Plan Configuration</p>
                                <p className="text-xs font-bold text-slate-700">{user?.plan?.name || "No Active Plan"} (₹{user?.plan?.price || 0})</p>
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Gender & DOB</p>
                                <p className="text-xs font-bold text-slate-700">{user?.gender || "-"} • {user?.dob || "-"}</p>
                              </div>

                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Location</p>
                                <p className="text-xs font-bold text-slate-700 truncate" title={`${user?.city}, ${user?.state}, ${user?.country}`}>
                                  {user?.city || "-"}, {user?.state || "-"}, {user?.country || "India"}
                                </p>
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Physical Stats</p>
                                <p className="text-xs font-bold text-slate-700">{user?.height || "-"} cm • {user?.weight || "-"} kg</p>
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Language & Referrer</p>
                                <p className="text-xs font-bold text-slate-700">{user?.language || "en"} • {user?.appReferer || "-"}</p>
                              </div>

                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Engagements</p>
                                <p className="text-xs font-bold text-slate-700">Trial: {user?.bookTrial ? "Yes" : "No"} | Meet Dr: {user?.meetDoctor} | Order: {user?.order}</p>
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Medical Condition</p>
                                <p className="text-xs font-bold text-slate-700 truncate" title={Array.isArray(user?.medicalDescription) ? user.medicalDescription.join(", ") : user?.medicalDescription}>
                                  {Array.isArray(user?.medicalDescription) ? user.medicalDescription.join(", ") : user?.medicalDescription || "-"}
                                </p>
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Body Measurements</p>
                                <div className="text-[9px] font-bold text-slate-500 leading-tight">
                                  Biceps: {user?.Biceps || 0} • Chest: {user?.Chest || 0} • Hip: {user?.Hip || 0} • Thigh: {user?.Thigh || 0} • Waist: {user?.Waist || 0}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Section 2: Program Progress */}
                          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                            <h6 className="text-[10px] font-black uppercase tracking-widest text-teal-600 mb-4 items-center flex gap-2"><Target size={14} /> Program Progress</h6>
                            <div className="flex flex-wrap gap-2 mb-6">
                              {[...Array(user?.plan?.days || 15)].map((_, i) => {
                                const dayNum = i + 1;
                                const videoDayData = userOverviewData.progress?.find((p) => p.day === dayNum);
                                const reportData = userOverviewData.dailyReports?.find((r) => r.day === dayNum);
                                const checklistData = userOverviewData.dailyChecklist?.find((c) => c.day === dayNum);
                                const hasData = videoDayData || reportData || checklistData;

                                return (
                                  <button
                                    key={i}
                                    onClick={() => setSelectedProgressDay(dayNum)}
                                    className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center transition-all hover:scale-110 active:scale-95 ${dayNum < (user?.planCurrentDay || 1) ? 'bg-teal-900 text-white shadow-md' :
                                      dayNum === (user?.planCurrentDay || 1) ? 'bg-teal-500 text-white ring-4 ring-teal-100 shadow-lg' :
                                        selectedProgressDay === dayNum ? 'bg-white border-2 border-teal-500 text-teal-600' :
                                          'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                      } ${hasData ? 'ring-1 ring-teal-200' : ''}`}
                                  >
                                    <span className="text-[9px] font-black opacity-60 leading-none mb-0.5">DAY</span>
                                    <span className="text-[13px] font-black leading-none">{dayNum}</span>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Selected Day Context */}
                            {selectedProgressDay && (
                              <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
                                <div className="flex items-center justify-between mb-4">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Details for Day {selectedProgressDay}</p>
                                  {selectedProgressDay === user?.planCurrentDay && (
                                    <span className="px-2 py-0.5 bg-teal-500 text-white text-[8px] font-black rounded-lg uppercase">Today</span>
                                  )}
                                </div>

                                {/* Daily Checklist Snippet */}
                                {(() => {
                                  const checklist = userOverviewData.dailyChecklist?.find(c => c.day === selectedProgressDay);
                                  if (!checklist) return null;
                                  return (
                                    <div className="mb-8 space-y-4">
                                      <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">Daily Vitals</span>
                                        <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
                                      </div>
                                      <div className="grid grid-cols-2 gap-3">
                                        {[
                                          { label: "Water", val: checklist.waterIntake, unit: "Liters", icon: "💧", color: "text-blue-500", bg: "bg-blue-50" },
                                          { label: "Exercise", val: checklist.exerciseMinutes, unit: "Min", icon: "🏃", color: "text-orange-500", bg: "bg-orange-50" },
                                          { label: "Green Juice", val: checklist.greenJuice, unit: "Times", icon: "🥤", color: "text-emerald-500", bg: "bg-emerald-50" },
                                          { label: "Pranayama", val: checklist.pranayamaMinutes, unit: "Min", icon: "🧘", color: "text-indigo-500", bg: "bg-indigo-50" },
                                          { label: "Sleep", val: checklist.sleepHours, unit: "Hrs", icon: "🌙", color: "text-purple-500", bg: "bg-purple-50" },
                                          { label: "Weight", val: checklist.todayWeight, unit: "Kg", icon: "⚖️", color: "text-slate-600", bg: "bg-slate-100" },
                                        ].map((item, idx) => (
                                          <div key={idx} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm transition-all hover:border-slate-200">
                                            <div className="flex items-center gap-2 mb-1.5">
                                              <div className={`w-5 h-5 rounded-lg ${item.bg} flex items-center justify-center text-[10px]`}>
                                                {item.icon}
                                              </div>
                                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</span>
                                            </div>
                                            <div className="flex items-baseline gap-1">
                                              <span className={`text-sm font-black ${item.color}`}>{item.val}</span>
                                              <span className="text-[8px] font-bold text-slate-300 uppercase">{item.unit}</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                      {checklist.dietMistake && (
                                        <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100/50">
                                          <div className="flex items-center gap-2 mb-2">
                                            <div className="w-5 h-5 bg-rose-100 rounded-lg flex items-center justify-center text-[10px]">⚠️</div>
                                            <span className="text-[10px] font-black text-rose-500 uppercase tracking-wider">Diet Mistake

                                            </span>
                                          </div>
                                          <p className="text-[12px] font-black text-slate-700 leading-relaxed italic">
                                            "{checklist.dietMistake}"
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}

                                {/* Daily Report Questions */}
                                {userOverviewData.dailyReports?.find(r => r.day === selectedProgressDay) ? (
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="h-px flex-1 bg-slate-200" />
                                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Report Questions</span>
                                      <div className="h-px flex-1 bg-slate-200" />
                                    </div>
                                    {userOverviewData.dailyReports.find(r => r.day === selectedProgressDay).answers.map((ans, idx) => (
                                      <div key={idx} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                        <p className="text-[10px] font-bold text-slate-400 mb-1">{ans.question}</p>
                                        <p className="text-xs font-black text-slate-800">A: {ans.givenAnswer}</p>
                                      </div>
                                    ))}
                                  </div>
                                ) : !userOverviewData.dailyChecklist?.find(c => c.day === selectedProgressDay) && (
                                  <p className="text-[10px] font-bold text-slate-400 italic">No report or checklist submitted for this day.</p>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Section 3: Plan History */}
                          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm overflow-hidden flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                              <h6 className="text-[10px] font-black uppercase tracking-widest text-teal-600 items-center flex gap-2"><History size={14} /> Plan History</h6>
                              <span className="text-[9px] font-bold text-slate-300 italic">Recent First</span>
                            </div>
                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                              {userOverviewData.planHistory?.length > 0 ? (
                                userOverviewData.planHistory.map((history, i) => (
                                  <div key={history._id} className={`p-4 rounded-2xl border transition-all ${i === 0 ? 'bg-teal-50/50 border-teal-100' : 'bg-slate-50 border-slate-100'}`}>
                                    <div className="flex justify-between items-start mb-1">
                                      <p className="text-xs font-black text-slate-800">{history.plan?.name || "Subscription"} (₹{history.plan?.price || 0})</p>
                                      <p className="text-[8px] font-bold text-slate-400">{new Date(history.createdAt).toLocaleString()}</p>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{history.plan?.days || history.plan?.planDays || "-"} Days</p>
                                  </div>
                                ))
                              ) : (
                                <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">No Plan History Found</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Section 4: Video Answers (Detailed) */}
                          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                            <h6 className="text-[10px] font-black uppercase tracking-widest text-teal-600 mb-6 flex items-center gap-2"><ClipboardList size={14} /> Video Quiz Responses</h6>
                            <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                              {userVideoAnswers && userVideoAnswers.length > 0 ? (
                                userVideoAnswers.map((va) => (
                                  <div key={va._id} className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 transition-all hover:bg-white hover:shadow-md">
                                    <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                                      <p className="text-[11px] font-black text-slate-700 uppercase tracking-wide">
                                        {va.videoId?.title?.english || "Task Assessment"}
                                      </p>
                                      <span className="text-[8px] font-bold text-slate-400 uppercase bg-white px-2 py-1 rounded-md border border-slate-100 tracking-tighter shadow-sm">
                                        {new Date(va.createdAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <div className="space-y-4">
                                      {va.answers?.map((ans, i) => (
                                        <div key={i} className="pl-4 border-l-2 border-teal-100 relative">
                                          <div className="absolute top-1 -left-[3px] w-1.5 h-1.5 bg-teal-500 rounded-full" />
                                          <p className="text-[10px] font-bold text-slate-400 leading-tight mb-1">Q: {ans.questionId?.questionText?.english || ans.questionId}</p>
                                          <p className="text-[13px] font-black text-teal-900">A: {ans.answer}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="py-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                  <ClipboardList className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic">No Video Responses available</p>
                                  <p className="text-[9px] text-slate-300 mt-1">Patient hasn't completed any video quizzes yet.</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Section 5: User Feedback */}
                          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                            <h6 className="text-[10px] font-black uppercase tracking-widest text-teal-600 mb-5 flex items-center gap-2"><MessageSquare size={14} /> User Portfolio Feedback</h6>
                            {userOverviewData.feedback ? (
                              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                  { label: "Consultant", val: userOverviewData.feedback.doctorCostultant, color: "teal" },
                                  { label: "App Experience", val: userOverviewData.feedback.appExperience, color: "blue" },
                                  { label: "Product Info", val: userOverviewData.feedback.product, color: "purple" },
                                  { label: "Support Depth", val: userOverviewData.feedback.support, color: "emerald" },
                                ].map((f, i) => (
                                  <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none">{f.label}</span>
                                    <p className="text-lg font-black text-slate-800 mb-1">{f.val || 0}<span className="text-[10px] text-slate-300">/5</span></p>
                                    <div className="flex gap-0.5">
                                      {[...Array(5)].map((_, star) => (
                                        <div key={star} className={`w-1.5 h-1.5 rounded-full ${star < (f.val || 0) ? 'bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.3)]' : 'bg-slate-200'}`} />
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="p-8 text-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                                <p className="text-[11px] font-bold text-slate-400 italic">No historical feedback provided by this account.</p>
                              </div>
                            )}
                          </div>

                          <div className="h-20" />
                        </div>
                      );
                    })()}
                  </motion.div>
                )}
                {showConsultationForm && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ type: "spring", damping: 30, stiffness: 200 }}
                    className="flex flex-col border-r border-slate-100 bg-white lg:bg-slate-50/30 overflow-hidden absolute inset-0 z-50 lg:relative lg:inset-auto lg:z-0 lg:w-[45%] h-full"
                  >
                    <ConsultationForm
                      appointment={activeCallAppointment}
                      onClose={() => setShowConsultationForm(false)}
                      onSaveSuccess={() => {
                        setShowConsultationForm(false);
                        fetchAppointments(selectedBranchId, filterDate, filterStatus, filterType);
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Right Pane: Video Consultation (User's Style, Full Height) */}
              <div className="flex flex-1 flex-col relative overflow-hidden bg-slate-950 lg:bg-white">
                {/* Header (Restored Date/Time + User's gradient style) */}
                <div className="lg:relative absolute top-0 left-0 right-0 z-20 flex flex-col gap-3 sm:gap-6 border-b border-slate-100 bg-white/80 lg:bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_28%),linear-gradient(135deg,_#ffffff,_#eff6ff)] backdrop-blur-md lg:backdrop-blur-none px-4 sm:px-10 py-4 sm:py-8 shrink-0 transition-all">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-x-2 gap-y-1 mb-1 sm:mb-2">
                        <p className="text-[9px] sm:text-xs font-black uppercase tracking-widest text-teal-600">
                          Live Video Consultation
                        </p>
                        <span className="hidden sm:inline text-[10px] font-bold text-slate-300">|</span>
                        <p className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-tight sm:tracking-widest">
                          {activeCallAppointment.date} • {activeCallAppointment.startTime}
                        </p>
                      </div>
                      <h3 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        {activeCallAppointment.userId?.name} {activeCallAppointment.userId?.surname}
                      </h3>
                    </div>
                    <div className="flex flex-row items-center gap-2 sm:gap-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 sm:px-5 py-1.5 sm:py-2 text-[9px] sm:text-xs font-black text-emerald-700 whitespace-nowrap">
                        <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live
                      </span>
                      <button
                        onClick={toggleUserProfile}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 sm:px-6 py-1.5 sm:py-2.5 text-[9px] sm:text-xs font-black uppercase tracking-widest transition-all ${showUserProfile ? 'bg-teal-600 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'}`}
                      >
                        {loadingUserOverview ? (
                          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <MdOutlinePersonOutline className="size-3.5 sm:size-[18px]" />
                        )}
                        <span>{showUserProfile ? "Hide Profile" : "Profile"}</span>
                      </button>

                      <button
                        onClick={toggleConsultationForm}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 sm:px-6 py-1.5 sm:py-2.5 text-[9px] sm:text-xs font-black uppercase tracking-widest transition-all ${showConsultationForm ? 'bg-teal-600 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'}`}
                      >
                        <ClipboardList className="size-3.5 sm:size-[18px]" />
                        <span>{showConsultationForm ? "Hide form" : "Consultation"}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Video Workspace */}
                <div className="lg:relative absolute inset-0 z-0 bg-slate-950 flex-1 overflow-hidden group">
                  <div
                    ref={remoteVideoGridRef}
                    className={`h-full w-full grid gap-1.5 p-1.5 transition-all duration-500 ${remoteParticipantCount <= 1 ? "grid-cols-1" :
                      remoteParticipantCount === 2 ? "grid-cols-1 md:grid-cols-2" :
                        "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3"
                      }`}
                  />

                  {remoteParticipantCount === 0 && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-xl text-center p-4 sm:p-10">
                      <div className="relative mb-4 sm:mb-8">
                        <div className="absolute inset-0 bg-teal-500 rounded-full blur-3xl opacity-20 animate-pulse" />
                        <div className="relative w-16 h-16 sm:w-24 sm:h-24 bg-teal-500/10 rounded-full border border-teal-500/30 flex items-center justify-center">
                          <User className="w-6 h-6 sm:w-10 sm:h-10 text-teal-400" />
                        </div>
                      </div>
                      <h4 className="text-lg sm:text-2xl font-black text-white mb-2 tracking-tight">Awaiting Patient</h4>
                      <p className="text-slate-500 max-w-xs text-xs sm:text-sm font-medium leading-relaxed">
                        Consultation portal is active. Please wait for {activeCallAppointment.userId?.name} to join.
                      </p>
                    </div>
                  )}

                  {/* PiP Local Feed */}
                  <div className="absolute top-[100px] right-2 sm:top-10 sm:right-10 z-30 w-28 sm:w-56 lg:w-80 aspect-video rounded-xl sm:rounded-[2.5rem] border-2 border-white/10 bg-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden group/pip hover:scale-[1.03] transition-transform duration-300">
                    <div ref={localVideoRef} className="h-full w-full" />
                  </div>
                </div>

                {/* Action Footer (User's style) */}
                <div className="lg:relative absolute bottom-0 left-0 right-0 z-20 border-t border-slate-100 bg-white/80 lg:bg-white backdrop-blur-md lg:backdrop-blur-none px-4 sm:px-10 py-4 sm:py-8 shrink-0 transition-all">
                  <div className="flex flex-col lg:flex-row items-center gap-4 sm:gap-8 justify-between">
                    <div className="flex flex-col gap-2 w-full lg:max-w-xl">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-1">Prescription Suggestion</label>
                      <div className="relative">
                        <div
                          onClick={() => setShowPlanPicker(!showPlanPicker)}
                          className={`flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 border p-2 sm:p-3 rounded-2xl sm:rounded-[1.5rem] w-full cursor-pointer transition-all hover:bg-slate-100 ${selectedPlanId ? 'border-teal-200 bg-teal-50/20' : 'border-slate-200 shadow-sm'}`}
                        >
                          <div className="flex items-center gap-3 sm:gap-4 px-1 sm:px-2 w-full sm:flex-1 min-w-0">
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-[1.25rem] flex items-center justify-center shrink-0 ${selectedPlanId ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20' : 'bg-white border border-slate-100 text-slate-400'}`}>
                              <MdOutlineCategory size={20} className="sm:size-6" />
                            </div>
                            <span className={`text-sm sm:text-base font-black truncate flex-1 ${selectedPlanId ? 'text-teal-900' : 'text-slate-500'}`}>
                              {selectedPlanId ? allPlans.find(p => p._id === selectedPlanId)?.name : 'Select a program...'}
                            </span>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSuggestProgram(); }}
                            disabled={!selectedPlanId || suggesting}
                            className="h-10 sm:h-12 w-full sm:w-auto px-4 sm:px-8 bg-teal-600 hover:bg-teal-700 text-white rounded-xl sm:rounded-2xl text-[10px] sm:text-[11px] font-black uppercase tracking-widest shadow-xl shadow-teal-100 transition-all disabled:opacity-50 active:scale-95 whitespace-nowrap"
                          >
                            {suggesting ? "Wait..." : "Suggest"}
                          </button>
                        </div>

                        <AnimatePresence>
                          {showPlanPicker && (
                            <>
                              <div className="fixed inset-0 z-[100]" onClick={() => setShowPlanPicker(false)} />
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }}
                                className="absolute bottom-full left-0 right-0 mb-6 z-[101] max-h-[400px] overflow-y-auto bg-white rounded-[1rem] border border-slate-100 shadow-[0_30px_90px_rgba(0,0,0,0.15)] p-3 custom-scrollbar"
                              >
                                {allPlans.map(plan => (
                                  <div
                                    key={plan._id}
                                    onClick={() => { setSelectedPlanId(plan._id); setShowPlanPicker(false); }}
                                    className={`p-4 hover:bg-slate-50 rounded-[1.5rem] cursor-pointer transition-all border border-transparent ${selectedPlanId === plan._id ? 'bg-teal-50/50 border-teal-100 shadow-sm' : ''} flex items-center justify-between group`}
                                  >
                                    <div className="flex flex-col">
                                      <span className="text-sm font-black text-slate-800">{plan.name}</span>
                                      <span className="text-[10px] text-teal-600 font-bold tracking-widest uppercase">₹{plan.price} • {plan.days} Days</span>
                                    </div>
                                    <ChevronRight size={16} className={`text-slate-300 group-hover:text-teal-500 transition-colors ${selectedPlanId === plan._id ? 'text-teal-500' : ''}`} />
                                  </div>
                                ))}
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCutCall(activeCallAppointment)}
                      disabled={callLoadingId === activeCallAppointment._id}
                      className="inline-flex items-center justify-center gap-4 rounded-2xl sm:rounded-[1.5rem] bg-rose-600 h-14 sm:h-[70px] px-8 sm:px-10 text-sm sm:text-base font-black text-white hover:bg-rose-700 active:scale-95 shadow-2xl shadow-rose-200 transition-all disabled:opacity-50 w-full lg:w-auto"
                    >
                      <MdCallEnd size={24} />
                      <span>End Consultation</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full mx-4 border border-white/20">
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
                <XOctagon className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">Cancel Appointment</h3>
              <p className="text-gray-500 font-medium mb-8">Are you sure you want to cancel this consultation? This action cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setAppointmentToDelete(null);
                  }}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black rounded-2xl transition-all"
                >
                  No, Keep it
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl shadow-lg shadow-red-200 transition-all"
                >
                  Yes, Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reschedule Modal */}
        {rescheduleData.isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl shadow-teal-900/20 overflow-hidden transform animate-in zoom-in-95 duration-300">
              {/* Header */}
              <div className="px-8 pt-8 pb-6 bg-gradient-to-br from-teal-50 to-white border-b border-teal-100/50">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">Reschedule</h3>
                  <button
                    onClick={() => setRescheduleData(prev => ({ ...prev, isOpen: false }))}
                    className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:shadow-md transition-all"
                  >
                    ×
                  </button>
                </div>
                <p className="text-gray-500 text-sm font-medium">Select a new date and time for the appointment.</p>
              </div>

              <div className="p-8 space-y-6">
                {/* Date Selection */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-600 px-1">Choose Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      min={getTodayInKolkata()}
                      value={rescheduleData.date}
                      onChange={(e) => setRescheduleData(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full h-14 pl-12 pr-4 bg-gray-50 rounded-2xl border border-transparent focus:border-teal-500 focus:bg-white focus:outline-none text-sm font-bold text-gray-700 transition-all"
                    />
                  </div>
                </div>

                {/* Slot Selection */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-600 px-1">Available Slots</label>

                  <div className="grid grid-cols-2 gap-3 max-h-[240px] overflow-y-auto px-1 pb-2 scrollbar-hide">
                    {rescheduleData.loadingSlots ? (
                      <div className="col-span-2 py-12 flex flex-col items-center justify-center gap-4 bg-gray-50 rounded-3xl">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Finding Slots...</span>
                      </div>
                    ) : rescheduleData.slots.length > 0 ? (
                      rescheduleData.slots.map((slot, idx) => (
                        <button
                          key={idx}
                          onClick={() => setRescheduleData(prev => ({ ...prev, selectedSlot: slot }))}
                          className={`h-14 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 transition-all ${rescheduleData.selectedSlot === slot
                            ? 'bg-teal-500 border-teal-500 text-white shadow-lg shadow-teal-500/30'
                            : 'bg-white border-gray-100 text-gray-700 hover:border-teal-200 hover:shadow-md hover:scale-105'
                            }`}
                        >
                          <span className="text-[13px] font-black">{slot.startTime}</span>
                          <span className={`text-[9px] font-black uppercase tracking-tighter opacity-60`}>To {slot.endTime}</span>
                        </button>
                      ))
                    ) : (
                      <div className="col-span-2 py-12 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No Slots Available</p>
                        <p className="text-[10px] text-gray-300 mt-1">Try another date</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-8 pt-0 flex gap-4">
                <button
                  onClick={() => setRescheduleData(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 h-14 rounded-2xl border border-gray-200 text-gray-600 font-black uppercase tracking-widest text-xs hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReschedule}
                  disabled={!rescheduleData.selectedSlot || rescheduleData.submitting}
                  className="flex-[2] h-14 rounded-2xl bg-teal-600 text-white font-black uppercase tracking-[0.15em] text-xs shadow-xl shadow-teal-600/30 hover:bg-teal-700 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-2"
                >
                  {rescheduleData.submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Wait...</span>
                    </>
                  ) : (
                    <span>Confirm Slot</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
};

export default AppointmentPage;

