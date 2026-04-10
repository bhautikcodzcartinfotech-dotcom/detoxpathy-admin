"use client";
import React, { useEffect, useRef, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { Header } from "@/utils/header";
import toast from "react-hot-toast";
import {
  getAppointmentsByBranch,
  getAllBranches,
  deleteAppointment,
  joinAppointmentCall,
  endAppointmentCall,
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

const AGORA_SCRIPT_SRC = "https://download.agora.io/sdk/release/AgoraRTC_N.js";

const AppointmentPage = () => {
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
  const localVideoRef = useRef(null);
  const remoteVideoGridRef = useRef(null);
  const agoraSdkPromiseRef = useRef(null);
  const agoraSessionRef = useRef({
    client: null,
    localAudioTrack: null,
    localVideoTrack: null,
  });
  const getTodayInKolkata = () => {
    const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0')
    ].join('-');
  };

  const [filterDate, setFilterDate] = useState(getTodayInKolkata());
  const [filterStatus, setFilterStatus] = useState("1");
  const [filterType, setFilterType] = useState("");

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

  const getNowInKolkata = () =>
    new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

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
      window.setTimeout(resolve, 0);
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
      "relative min-h-[220px] overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-950 shadow-inner";

    const body = document.createElement("div");
    body.setAttribute("data-remote-body", "true");
    body.className = "h-full w-full";
    tile.appendChild(body);

    const label = document.createElement("div");
    label.className =
      "pointer-events-none absolute left-4 top-4 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white";
    label.textContent = "User";
    tile.appendChild(label);

    remoteVideoGridRef.current.appendChild(tile);
    return body;
  };

  const ensureAgoraSdk = async () => {
    if (typeof window === "undefined") {
      throw new Error("Agora video call only works in the browser");
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
      script.onload = () => resolve(window.AgoraRTC);
      script.onerror = () =>
        reject(new Error("Failed to load Agora video SDK"));
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

  const fetchAppointments = async (branchId, date = filterDate, status = filterStatus, type = filterType) => {
    if (!branchId) return;
    try {
      setLoading(true);
      const params = {};
      if (date) params.date = date;
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

  const openDeleteModal = (id) => {
    setAppointmentToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!appointmentToDelete) return;
    try {
      setLoading(true);
      await deleteAppointment(appointmentToDelete);
      toast.success("Appointment deleted successfully");
      setIsDeleteModalOpen(false);
      setAppointmentToDelete(null);
      fetchAppointments(selectedBranchId, filterDate, filterStatus, filterType);
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Failed to delete appointment");
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
      await cleanupAgoraSession();

      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      agoraSessionRef.current.client = client;

      client.on("user-published", async (user, mediaType) => {
        await client.subscribe(user, mediaType);

        if (mediaType === "video") {
          const remoteBody = ensureRemoteTile(user.uid);
          if (remoteBody) {
            user.videoTrack.play(remoteBody);
          }
        }

        if (mediaType === "audio") {
          user.audioTrack.play();
        }

        setRemoteParticipantCount(client.remoteUsers.length);
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

      agoraSessionRef.current.localAudioTrack = localAudioTrack;
      agoraSessionRef.current.localVideoTrack = localVideoTrack;

      if (localVideoRef.current) {
        localVideoTrack.play(localVideoRef.current);
      }

      const session = await joinAppointmentCall(appointment._id);
      if (!session?.appId || !session?.channelName) {
        throw new Error("Missing Agora channel details");
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
      toast.success("Video call connected");
    } catch (error) {
      console.error(error);
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

  useEffect(() => {
    fetchAllBranches();
  }, []);

  useEffect(() => {
    if (selectedBranchId) {
      fetchAppointments(selectedBranchId, filterDate, filterStatus, filterType);
    } else {
        setLoading(false);
    }
  }, [selectedBranchId, filterDate, filterStatus, filterType]);

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

  return (
    <RoleGuard allow={["Admin", "subadmin"]}>
      <div className="w-full h-full px-4 sm:px-6 lg:px-10 xl:px-18">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex flex-col gap-1">
             <Header size="3xl">Appointments</Header>
             <p className="text-xs text-gray-400">View scheduled appointments for your branch</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            {role === "Admin" && (
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Branch</label>
                <span className="p-1 text-sm font-semibold text-gray-700 whitespace-nowrap">
                  {allBranches.find((b) => b._id === selectedBranchId)?.name || 'Loading...'}
                </span>
                </div>
            )}
            
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Date</label>
              <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="p-1 text-sm font-semibold text-gray-700 focus:outline-none bg-transparent"
              />
            </div>

            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status</label>
              <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="p-1 text-sm font-semibold text-gray-700 focus:outline-none bg-transparent"
              >
                  <option value="">All</option>
                  <option value="1">Upcoming</option>
                  <option value="2">Past</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Type</label>
              <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="p-1 text-sm font-semibold text-gray-700 focus:outline-none bg-transparent"
              >
                  <option value="">All</option>
                  <option value="1">Online</option>
                  <option value="2">Offline</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
          </div>
        ) : appointments.length > 0 ? (
          <div className="bg-white shadow-2xl rounded-[2rem] overflow-hidden border border-gray-100">
            <div className="p-8 border-b border-gray-100 bg-gradient-to-br from-white to-blue-50/30">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight">Scheduled Appointments</h3>
                        <p className="text-sm text-gray-500 mt-1 font-medium italic">List of upcoming user bookings</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-2xl text-blue-700">
                        <MdCalendarToday size={24} />
                    </div>
                </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 text-gray-400 uppercase text-[10px] font-black tracking-[0.2em]">
                  <tr>
                    <th className="px-8 py-5">Date & Day</th>
                    <th className="px-8 py-5 text-center">Time Slot</th>
                    <th className="px-8 py-5 text-center">User / Type</th>
                    <th className="px-8 py-5 text-center">Call</th>
                    <th className="px-8 py-5 text-right whitespace-nowrap">Creation Date</th>
                    <th className="px-8 py-5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {appointments.map((item, idx) => {
                    void currentTimeMarker;
                    const callStatusMeta = getCallStatusMeta(item.call?.status);
                    const isOnline = item.type === 1;
                    const timeState = getAppointmentTimeState(item);
                    const isCurrentCall = activeCallAppointment?._id === item._id;
                    const canReceiveCall =
                      isOnline &&
                      timeState.isLiveWindow &&
                      item.call?.status !== "ended" &&
                      (!activeCallAppointment?._id || isCurrentCall);
                    const canCutCall =
                      isOnline &&
                      timeState.isLiveWindow &&
                      item.call?.status !== "ended";

                    return (
                      <tr key={idx} className="hover:bg-blue-50/10 transition-all group">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-700 text-lg">{item.date}</span>
                              <span className="text-xs text-gray-400 font-medium">{daysMap[item.day] || `Day ${item.day}`}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center justify-center gap-2">
                            <MdAccessTime className="text-gray-400" />
                            <span className="px-4 py-2 bg-gray-100 rounded-xl text-xs font-black text-gray-500 border border-gray-200">
                              {item.startTime}
                            </span>
                            <div className="w-4 h-0.5 bg-gray-200 rounded-full"></div>
                            <span className="px-4 py-2 bg-gray-100 rounded-xl text-xs font-black text-gray-500 border border-gray-200">
                              {item.endTime}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center justify-center gap-4">
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] uppercase font-bold text-gray-300 tracking-tighter mb-1 mt-1">User</span>
                              <div className="flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-600 rounded-lg text-xs font-bold border border-purple-100">
                                <MdOutlinePersonOutline size={14} />
                                <span className="truncate max-w-[150px]">{item.userId?.name} {item.userId?.surname}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] uppercase font-bold text-gray-300 tracking-tighter mb-1 mt-1">Type</span>
                              <div className="flex items-center gap-1 px-3 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-bold border border-green-100">
                                <MdOutlineCategory size={14} />
                                <span>{item.type === 1 ? "Online" : item.type === 2 ? "Offline" : item.type}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          {isOnline ? (
                            <div className="flex flex-col items-center gap-2">
                              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${callStatusMeta.className}`}>
                                {callStatusMeta.label}
                              </span>
                              <span className="text-[11px] font-medium text-gray-400">
                                {item.agoraAppId ? "Agora ready" : "Agora app id missing"}
                              </span>
                              {!timeState.isLiveWindow && (
                                <span className="text-[11px] font-medium text-amber-600">
                                  {timeState.isBeforeWindow
                                    ? "Call opens at appointment time"
                                    : timeState.isAfterWindow
                                    ? "Appointment time ended"
                                    : ""}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex justify-center">
                              <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500 border border-gray-200">
                                No call
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-8 py-6 text-right whitespace-nowrap">
                          <span className="text-xs font-medium text-gray-300 italic">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center justify-center gap-2">
                            {isOnline && timeState.isLiveWindow && (
                              <>
                                <button
                                  onClick={() => handleReceiveCall(item)}
                                  disabled={!canReceiveCall || callLoadingId === item._id}
                                  className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-xs font-black text-blue-700 border border-blue-100 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                                  title="Receive Video Call"
                                >
                                  <MdVideocam size={16} />
                                  <span>{item.call?.status === "ongoing" ? "Rejoin" : "Receive"}</span>
                                </button>
                                <button
                                  onClick={() => handleCutCall(item)}
                                  disabled={!canCutCall || callLoadingId === item._id}
                                  className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-4 py-2 text-xs font-black text-rose-700 border border-rose-100 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                                  title="Cut Video Call"
                                >
                                  <MdCallEnd size={16} />
                                  <span>Cut Call</span>
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => openDeleteModal(item._id)}
                              className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-full transition-colors"
                              title="Delete Appointment"
                            >
                              <MdDelete size={20} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow-2xl rounded-[3rem] p-16 text-center border border-gray-100 flex flex-col items-center max-w-2xl mx-auto mt-10">
            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mb-8 animate-pulse">
                <MdCalendarToday size={48} />
            </div>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight mb-4">No Appointments Found</h3>
            <p className="text-gray-500 mb-10 max-w-sm text-lg leading-relaxed font-medium">It looks like there are no scheduled appointments for this branch right now.</p>
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
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-sky-500">
                      Admin Video Call
                    </p>
                    <h3 className="mt-2 text-2xl font-black text-slate-900">
                      {activeCallAppointment.userId?.name} {activeCallAppointment.userId?.surname}
                    </h3>
                    <p className="mt-2 text-sm font-medium text-slate-500">
                      {activeCallAppointment.date} | {activeCallAppointment.startTime} to {activeCallAppointment.endTime}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center rounded-full border border-sky-100 bg-sky-50 px-4 py-2 text-xs font-black text-sky-700">
                      {callConnected ? "Admin connected" : "Connecting..."}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-500">
                      {remoteParticipantCount > 0
                        ? `${remoteParticipantCount} user stream${remoteParticipantCount > 1 ? "s" : ""}`
                        : "Waiting for user to join"}
                    </span>
                  </div>
                </div>
                {(callSession?.channelName || activeCallAppointment.call?.channelName) && (
                  <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-xs font-medium text-slate-500">
                    Channel:{" "}
                    <span className="font-black text-slate-700">
                      {callSession?.channelName || activeCallAppointment.call?.channelName}
                    </span>
                  </div>
                )}
                {callError && (
                  <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                    {callError}
                  </div>
                )}
              </div>

              <div className="grid gap-6 bg-slate-100/70 p-6 sm:p-8 xl:grid-cols-[340px_minmax(0,1fr)]">
                <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">
                      Admin Camera
                    </h4>
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700 border border-emerald-100">
                      Live preview
                    </span>
                  </div>
                  <div
                    ref={localVideoRef}
                    className="min-h-[260px] overflow-hidden rounded-[1.5rem] bg-slate-950"
                  />
                </div>

                <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">
                      User Camera
                    </h4>
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black text-amber-700 border border-amber-100">
                      {remoteParticipantCount > 0 ? "Connected" : "Waiting"}
                    </span>
                  </div>
                  <div
                    ref={remoteVideoGridRef}
                    className="grid min-h-[320px] gap-4 rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-4 lg:grid-cols-2"
                  />
                  {remoteParticipantCount === 0 && (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500">
                      The admin is ready. When the user joins the same Agora channel, their video will appear here.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                <p className="text-sm font-medium text-slate-500">
                  This modal stays open while the admin call is active.
                </p>
                <button
                  onClick={() => handleCutCall(activeCallAppointment)}
                  disabled={callLoadingId === activeCallAppointment._id}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-rose-600 px-6 py-3 text-sm font-black text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <MdCallEnd size={18} />
                  <span>Cut Video Call</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-xl font-black text-gray-900 mb-2">Delete Appointment</h3>
            <p className="text-gray-500 font-medium mb-6">Are you sure you want to delete this appointment? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setAppointmentToDelete(null);
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </RoleGuard>
  );
};

export default AppointmentPage;
