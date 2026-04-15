"use client";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import RoleGuard from "@/components/RoleGuard";
import { Header } from "@/utils/header";
import toast from "react-hot-toast";
import {
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
} from "@/Api/AllApi";
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
  LayoutGrid
} from "lucide-react";

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
  const [suggesting, setSuggesting] = useState(false); // Add searchTerm state
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
      "relative h-full w-full overflow-hidden rounded-[2rem] bg-slate-900 border border-white/5 shadow-2xl";

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
    mode = viewMode) => {
    if (!branchId) return;
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

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
        AgoraRTC.createCameraVideoTrack(),
      ]);
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
        appId: session?.appId ? `${session.appId.slice(0,8)}...` : 'MISSING',
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
        if (suggestion && suggestion.plans) {
          setSelectedPlanId(suggestion.plans?._id || suggestion.plans);
        } else {
          setSelectedPlanId("");
        }
      } catch (e) {
        setSelectedPlanId("");
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
      setSelectedPlanId("");
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Failed to suggest program");
    } finally {
      setSuggesting(false);
    }
  };

  useEffect(() => {
    fetchAllBranches();
    fetchAllPlans();
  }, []);

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
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, []);

  const getAppointmentFilterStatus = (appointment) => {
    if ((appointment.status || 'scheduled') === 'cancelled') {
        return 'cancelled';
    }

    if (Number(appointment.type) === 1 && appointment.call?.status === 'ended') {
        return 'completed';
    }

    const currentDate = getTodayInKolkata();
    const now = getNowInKolkata();
    const currentMinutes = (now.getHours() * 60) + now.getMinutes();

    if (appointment.date > currentDate) {
        return 'upcoming';
    }

    if (appointment.date < currentDate) {
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

    return appointmentEndMinutes >= currentMinutes ? 'upcoming' : 'completed';
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
    cancelled: appointments.filter(a => getAppointmentFilterStatus(a) === 'cancelled').length,
  };

  return (
    <RoleGuard allow={["Admin", "subadmin"]}>
      <div className="w-full h-full px-4 sm:px-6 lg:px-8 bg-[#F8FAFC] min-h-screen pb-10">
        <div className="flex flex-col gap-1 mb-8 pt-6">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Appointments</h1>
          <p className="text-sm text-gray-500 font-medium">All consultations across all patients. Manage, reassign, or cancel.</p>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: viewMode === "daily" ? "TODAY TOTAL" : "WEEKLY TOTAL", value: stats.total, color: "border-teal-600", icon: LayoutGrid, iconColor: "text-teal-600" },
            { label: "COMPLETED", value: stats.completed, color: "border-green-500", icon: CheckCircle, iconColor: "text-green-500" },
            { label: "UPCOMING", value: stats.upcoming, color: "border-orange-500", icon: Clock3, iconColor: "text-orange-500" },
            { label: "CANCELLED", value: stats.cancelled, color: "border-red-500", icon: XOctagon, iconColor: "text-red-500" },
          ].map((item, idx) => (
            <div key={idx} className={`bg-white p-6 rounded-2xl border-t-4 ${item.color} shadow-sm transition-all hover:shadow-md hover:scale-[1.02]`}>
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-black text-gray-400 tracking-widest">{item.label}</p>
                <item.icon className={`w-4 h-4 ${item.iconColor}`} />
              </div>
              <p className="text-3xl font-black text-gray-900">{item.value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex-1 min-w-[300px] relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by patient name or ID..."
              className="w-full h-12 pl-11 pr-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white shadow-sm transition-all text-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {role === "Admin" && (
            <div className="h-12 flex items-center gap-2 bg-white px-4 rounded-xl border border-gray-200 shadow-sm min-w-[180px]">
              <LayoutGrid className="w-4 h-4 text-gray-400" />
              <select
                className="text-sm font-bold text-gray-700 bg-transparent focus:outline-none cursor-pointer w-full"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
              >
                {allBranches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div className="h-12 flex items-center gap-2 bg-white px-4 rounded-xl border border-gray-200 shadow-sm">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              className="text-sm font-bold text-gray-700 bg-transparent focus:outline-none cursor-pointer"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="1">Upcoming</option>
              <option value="2">Completed</option>
              <option value="3">Cancelled</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-gray-100 p-1.5 rounded-xl shadow-inner">
             <button 
                onClick={() => {
                  setViewMode("daily");
                  setFilterDate(getTodayInKolkata());
                }}
                className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${viewMode === "daily" && filterDate === getTodayInKolkata() ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
                Today
             </button>
             <button 
                onClick={() => {
                  setWeekRange(getWeekRange());
                  setViewMode("weekly");
                }}
                className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${viewMode === "weekly" ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
                This Week
             </button>
          </div>
          
          <div className="h-12 flex items-center gap-2 bg-white px-4 rounded-xl border border-gray-200 shadow-sm">
             <Calendar className="w-4 h-4 text-gray-400" />
             <input
                type="date"
                value={filterDate}
                onChange={(e) => {
                  setFilterDate(e.target.value);
                  setViewMode("daily");
                }}
                className="text-sm font-bold text-gray-700 bg-transparent focus:outline-none"
             />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
          </div>
        ) : filteredAppointments.length > 0 ? (
          <div className="overflow-x-auto bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-teal-900/5">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/30">
                  <th className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">CON ID</th>
                  <th className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">PATIENT</th>
                  <th className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">BRANCH</th>
                  <th className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">DATE & TIME</th>
                  <th className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">STATUS</th>
                  <th className="px-6 py-5 text-center text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredAppointments.map((item, idx) => {
                  const statusLabel = getAppointmentFilterStatus(item);
                  const isOnline = item.type === 1;
                  const timeState = getAppointmentTimeState(item);
                  const isCurrentCall = activeCallAppointment?._id === item._id;
                  const canReceiveCall =
                    isOnline &&
                    timeState.isLiveWindow &&
                    item.call?.status !== "ended" &&
                    (!activeCallAppointment?._id || isCurrentCall);

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
                         <div className="flex flex-col">
                            <span className="text-[13px] font-bold text-gray-800">
                               {item.date === getTodayInKolkata() ? "Today" : item.date}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                               <Clock className="w-3 h-3 text-gray-400" />
                               <span className="text-[12px] font-medium text-gray-500 uppercase tracking-wide">
                                  {item.startTime}
                               </span>
                            </div>
                         </div>
                      </td>

                      <td className="px-6 py-6 whitespace-nowrap">
                         <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase shadow-sm ${
                            statusLabel === 'completed' ? 'bg-green-100 text-green-700' :
                            statusLabel === 'cancelled' ? 'bg-red-100 text-red-600' :
                            'bg-orange-100 text-orange-600'
                         }`}>
                            {statusLabel}
                         </span>
                      </td>

                      <td className="px-6 py-6">
                        <div className="flex items-center justify-center gap-2">
                          {isOnline && timeState.isLiveWindow && item.call?.status !== "ended" && (
                             <button
                                onClick={() => handleReceiveCall(item)}
                                disabled={!canReceiveCall || callLoadingId === item._id}
                                className="h-9 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black shadow-lg shadow-teal-100 transition-all disabled:opacity-50 flex items-center gap-2"
                             >
                                <MdVideocam size={16} />
                                Join
                             </button>
                          )}
                          <button
                            className="h-9 px-4 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-xl text-xs font-bold transition-all"
                            onClick={() => handleOpenRescheduleModal(item)}
                          >
                            Reschedule
                          </button>
                          <button
                            className="h-9 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold shadow-sm transition-all"
                            onClick={() => router.push(`/component/users/${item.userId?._id}/profile`)}
                          >
                            View
                          </button>
                          {statusLabel === 'upcoming' && (
                             <button
                               onClick={() => openDeleteModal(item._id)}
                               className="h-9 px-4 bg-white border border-red-100 hover:bg-red-50 text-red-600 rounded-xl text-xs font-bold shadow-sm transition-all"
                             >
                               Cancel
                             </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
      </div>

      {isCallModalOpen && activeCallAppointment && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md px-4 py-6 overflow-y-auto">
          <div className="mx-auto flex min-h-full max-w-6xl items-center justify-center">
            <div className="w-full overflow-hidden rounded-[2rem] border border-white/10 bg-white shadow-[0_40px_120px_rgba(15,23,42,0.35)]">
              <div className="flex flex-col gap-6 border-b border-slate-100 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_28%),linear-gradient(135deg,_#ffffff,_#eff6ff)] px-6 py-6 sm:px-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-teal-600">
                      Doctor Video Consultation
                    </p>
                    <h3 className="mt-2 text-2xl font-black text-slate-900">
                      {activeCallAppointment.userId?.name} {activeCallAppointment.userId?.surname}
                    </h3>
                    <p className="mt-2 text-sm font-medium text-slate-500">
                      {activeCallAppointment.date} | {activeCallAppointment.startTime} to {activeCallAppointment.endTime}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center rounded-full border border-teal-100 bg-teal-50 px-4 py-2 text-xs font-black text-teal-700">
                      {callConnected ? "Connected" : "Connecting..."}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-500">
                      {remoteParticipantCount > 0
                        ? `${remoteParticipantCount} user stream${remoteParticipantCount > 1 ? "s" : ""}`
                        : "Waiting for user to join"}
                    </span>
                  </div>
                </div>
                {callError && (
                  <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                    {callError}
                  </div>
                )}
              </div>

              <div className="relative bg-slate-900 min-h-[500px] lg:h-[650px] overflow-hidden group">
                {/* Main Remote Participant Area - Now Full Screen within modal */}
                <div
                  ref={remoteVideoGridRef}
                  className={`h-full w-full grid gap-2 p-2 transition-all duration-500 bg-slate-950 ${
                    remoteParticipantCount <= 1 ? "grid-cols-1" : 
                    remoteParticipantCount === 2 ? "grid-cols-2" : 
                    "grid-cols-2 lg:grid-cols-3"
                  }`}
                />

                {/* Waiting State Overlay */}
                {remoteParticipantCount === 0 && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-md text-center p-8">
                    <div className="relative mb-8">
                       <div className="absolute inset-0 bg-teal-500 rounded-full blur-2xl opacity-20 animate-pulse" />
                       <div className="relative w-24 h-24 bg-teal-500/10 rounded-full border border-teal-500/30 flex items-center justify-center">
                          <User className="w-10 h-10 text-teal-400" />
                       </div>
                    </div>
                    <h4 className="text-2xl font-black text-white mb-2 tracking-tight">Waiting for Patient</h4>
                    <p className="text-slate-400 max-w-sm text-sm font-medium leading-relaxed">
                      Your consultation link is live. Please wait here while the patient ({activeCallAppointment.userId?.name}) joins the call.
                    </p>
                  </div>
                )}

                {/* Local Feed - Now Picture in Picture (PiP) */}
                <div className="absolute top-8 right-8 z-30 w-48 lg:w-72 aspect-video rounded-[1.5rem] border-2 border-white/20 bg-slate-800 shadow-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-95 group/pip ring-1 ring-black/50">
                  <div className="absolute top-3 left-3 z-[40] flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 opacity-0 group-hover/pip:opacity-100 transition-opacity">
                     <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                     <span className="text-[10px] font-black text-white uppercase tracking-widest">You (Doctor)</span>
                  </div>
                  <div ref={localVideoRef} className="h-full w-full" />
                </div>

                {/* Patient Floating Badge */}
                <div className="absolute bottom-8 left-8 z-30 flex items-center gap-4 p-4 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl transition-all duration-300 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-teal-500/20">
                    {activeCallAppointment.userId?.name?.[0]}
                  </div>
                  <div>
                    <h5 className="text-base font-black text-white leading-tight">
                      {activeCallAppointment.userId?.name} {activeCallAppointment.userId?.surname}
                    </h5>
                    <div className="flex items-center gap-2 mt-1">
                       <span className={`w-2 h-2 rounded-full ${remoteParticipantCount > 0 ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
                       <p className="text-[11px] text-teal-300 font-bold uppercase tracking-widest">
                          {remoteParticipantCount > 0 ? "Live Consultation" : "Awaiting Connection"}
                       </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                <div className="flex flex-col lg:flex-row items-center gap-6">
                  <div className="flex flex-col gap-1.5 w-full lg:w-auto">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Program Suggestion</label>
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-2xl w-full">
                      <div className="flex-1 flex items-center gap-2 px-3">
                         <MdOutlineCategory className="text-teal-600 shrink-0" size={20} />
                         <select
                           className="bg-transparent text-sm font-bold text-slate-700 focus:outline-none w-full cursor-pointer"
                           value={selectedPlanId}
                           onChange={(e) => setSelectedPlanId(e.target.value)}
                         >
                           <option value="">Choose a program to suggest...</option>
                           {allPlans.map((plan) => (
                             <option key={plan._id} value={plan._id}>
                               {plan.name} (₹{plan.price})
                             </option>
                           ))}
                         </select>
                      </div>
                      <button
                        onClick={handleSuggestProgram}
                        disabled={!selectedPlanId || suggesting}
                        className="h-10 px-6 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-teal-100 disabled:opacity-50 disabled:shadow-none"
                      >
                        {suggesting ? "Wait..." : "Suggest"}
                      </button>
                    </div>
                  </div>

                  <div className="w-[1px] h-12 bg-slate-100 hidden lg:block" />

                  <div className="flex flex-col gap-1.5 w-full lg:w-auto">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">End Call</label>
                    <button
                      onClick={() => handleCutCall(activeCallAppointment)}
                      disabled={callLoadingId === activeCallAppointment._id}
                      className="inline-flex items-center justify-center gap-3 rounded-2xl bg-rose-600 h-[54px] px-8 text-sm font-black text-white transition-all hover:bg-rose-700 hover:scale-[1.02] active:scale-95 shadow-lg shadow-rose-200 disabled:cursor-not-allowed disabled:opacity-50 w-full"
                    >
                      <MdCallEnd size={20} />
                      <span>End Consultation</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
             <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl shadow-teal-900/20 overflow-hidden transform animate-in zoom-in-95 duration-300">
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
                                  className={`h-14 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 transition-all ${
                                    rescheduleData.selectedSlot === slot 
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
    </RoleGuard>
  );
};

export default AppointmentPage;

