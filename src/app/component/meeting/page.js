"use client";

import React, { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { Header, Button } from "@/utils/header";
import Drawer from "@/utils/formanimation";
import { useAuth } from "@/contexts/AuthContext";
import {
    listMeetings,
    createMeeting,
    deleteMeeting,
    updateMeetingRecording,
    syncMeetingRecording,
    uploadMeetingRecordingFile,
    API_BASE,
    API_HOST
} from "@/Api/AllApi";
import toast from "react-hot-toast";
import {
    MdVideocam,
    MdDelete,
    MdAdd,
    MdLink,
    MdAccessTime,
    MdClose,
    MdPlayCircleFilled,
    MdCloudUpload,
    MdSync,
    MdAttachFile
} from "react-icons/md";

const DEFAULT_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23E2E8F0"/><circle cx="50" cy="35" r="20" fill="%2394A3B8"/><path d="M15 85 C 15 65, 85 65, 85 85" fill="%2394A3B8"/></svg>`;

export default function MeetingPage() {
    const { role } = useAuth();
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [btnLoading, setBtnLoading] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    
    // Form state
    const [topic, setTopic] = useState("");
    const [scheduledAt, setScheduledAt] = useState("");

    // Recording modal states (both URL pasting and direct MP4 uploading fallbacks)
    const [recordingModalOpen, setRecordingModalOpen] = useState(false);
    const [selectedMeeting, setSelectedMeeting] = useState(null);
    const [uploadType, setUploadType] = useState("url"); // "url" or "file"
    const [recordingUrlInput, setRecordingUrlInput] = useState("");
    const [recordingFile, setRecordingFile] = useState(null);
    const [saveRecordingLoading, setSaveRecordingLoading] = useState(false);
    const [syncingId, setSyncingId] = useState(null);

    const isSuperAdmin = role === "Admin";

    const fetchData = async () => {
        try {
            setLoading(true);
            const meetingData = await listMeetings();
            setMeetings(Array.isArray(meetingData) ? meetingData : []);
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!topic.trim()) {
            toast.error("Please enter a meeting topic");
            return;
        }

        try {
            setBtnLoading(true);
            const payload = {
                topic: topic.trim(),
                scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined
            };
            const response = await createMeeting(payload);
            toast.success("Meeting scheduled successfully. It is set to record automatically.");
            setMeetings([response, ...meetings]);
            
            // Reset form
            setTopic("");
            setScheduledAt("");
            setDrawerOpen(false);
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to schedule meeting");
        } finally {
            setBtnLoading(false);
        }
    };

    const handleDelete = async (meetingId) => {
        if (!confirm("Are you sure you want to delete this meeting?")) return;

        try {
            await deleteMeeting(meetingId);
            toast.success("Meeting deleted successfully");
            setMeetings(meetings.filter(m => m._id !== meetingId));
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to delete meeting");
        }
    };

    const handleSaveRecording = async (e) => {
        e.preventDefault();
        if (!selectedMeeting) return;

        try {
            setSaveRecordingLoading(true);
            let updatedMeeting;
            if (uploadType === "file") {
                if (!recordingFile) {
                    toast.error("Please select a recording file to upload");
                    setSaveRecordingLoading(false);
                    return;
                }
                updatedMeeting = await uploadMeetingRecordingFile(selectedMeeting._id, recordingFile);
                toast.success("Recording file uploaded successfully!");
            } else {
                updatedMeeting = await updateMeetingRecording(selectedMeeting._id, recordingUrlInput.trim());
                toast.success("Recording link updated successfully");
            }
            setMeetings(meetings.map(m => m._id === selectedMeeting._id ? updatedMeeting : m));
            setRecordingModalOpen(false);
            setSelectedMeeting(null);
            setRecordingUrlInput("");
            setRecordingFile(null);
            setUploadType("url");
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to save recording");
        } finally {
            setSaveRecordingLoading(false);
        }
    };

    const handleSyncRecording = async (meetingId) => {
        try {
            setSyncingId(meetingId);
            const updatedMeeting = await syncMeetingRecording(meetingId);
            toast.success("Recording auto-synced successfully!");
            setMeetings(meetings.map(m => m._id === meetingId ? updatedMeeting : m));
        } catch (err) {
            const apiError = err?.response?.data?.message || "";
            const zoomErr = err?.response?.data?.error || "";
            if (zoomErr.includes("scopes")) {
                toast.error(
                    <span>
                        <strong>Scope Scope Error:</strong> S2S Credentials require the <code>cloud_recording:read</code> permission scope. You can enable it in Zoom Marketplace or upload the file manually below!
                    </span>,
                    { duration: 6000 }
                );
            } else {
                toast.error(apiError || zoomErr || "Failed to auto-sync. Try again or upload the file manually.");
            }
        } finally {
            setSyncingId(null);
        }
    };

    const openRecordingModal = (meeting) => {
        setSelectedMeeting(meeting);
        setRecordingUrlInput(meeting.recordingUrl && meeting.recordingUrl.startsWith("http") ? meeting.recordingUrl : "");
        setUploadType("url");
        setRecordingFile(null);
        setRecordingModalOpen(true);
    };

    const getDoctorImageUrl = (path) => {
        if (!path) return DEFAULT_AVATAR;
        if (path.startsWith("http")) return path;
        return `${API_HOST}/${path}`;
    };

    const getRecordingUrl = (url) => {
        if (!url) return null;
        if (url.startsWith("http")) return url;
        return `${API_BASE}/${url}`;
    };

    return (
        <RoleGuard allow={["Admin", "subadmin"]}>
            <div className="w-full min-h-screen px-6 py-6 bg-[#F8FAFC]">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="space-y-1">
                        <Header size="4xl">Meetings</Header>
                        <p className="text-sm text-gray-500">
                            {isSuperAdmin
                                ? "Schedule video consultations and manage meeting cloud recording files/URLs."
                                : "Join scheduled consultation meetings or watch cloud recordings."}
                        </p>
                    </div>
                    {isSuperAdmin && (
                        <Button 
                            onClick={() => setDrawerOpen(true)}
                            className="flex items-center gap-2 bg-[#134D41] hover:bg-[#0D362E] transition-all duration-300 text-white rounded-xl py-3 px-6 shadow-md hover:shadow-lg font-semibold"
                        >
                            <MdAdd size={20} />
                            Schedule Meeting
                        </Button>
                    )}
                </div>

                {/* Main Content Area */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-[50vh] gap-3">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#134D41]" />
                        <p className="text-gray-500 font-medium">Loading consultation meetings...</p>
                    </div>
                ) : meetings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center bg-white rounded-3xl p-12 shadow-sm border border-gray-100 max-w-2xl mx-auto text-center mt-8">
                        <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center text-[#134D41] mb-6">
                            <MdVideocam size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No Scheduled Meetings</h3>
                        <p className="text-gray-500 mb-6 max-w-md">
                            {isSuperAdmin
                                ? "You haven't scheduled any consultation meetings yet. Click 'Schedule Meeting' to get started."
                                : "There are no consultation meetings scheduled at the moment."}
                        </p>
                        {isSuperAdmin && (
                            <Button onClick={() => setDrawerOpen(true)} className="bg-[#134D41] hover:bg-[#0D362E] text-white py-3 px-6 rounded-xl font-semibold">
                                Schedule a Meeting
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left">
                                <thead>
                                    <tr className="bg-gray-50/70 border-b border-gray-100">
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Topic</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Scheduled Date</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Platform</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Scheduled By</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Recording</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {meetings.map((meeting) => {
                                        const isZoom = meeting.startUrl.includes("zoom");
                                        const displayDate = meeting.scheduledAt || meeting.createdAt;
                                        const date = new Date(displayDate).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric"
                                        });
                                        const time = new Date(displayDate).toLocaleTimeString("en-US", {
                                            hour: "2-digit",
                                            minute: "2-digit"
                                        });

                                        return (
                                            <tr key={meeting._id} className="hover:bg-gray-50/50 transition-all duration-200">
                                                {/* Topic */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2.5 rounded-xl ${isZoom ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                            <MdVideocam size={22} />
                                                        </div>
                                                        <div>
                                                            <span className="font-semibold text-gray-900 block">{meeting.topic}</span>
                                                            <span className="text-xs text-gray-400">ID: {meeting._id.substring(meeting._id.length - 8).toUpperCase()}</span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Date & Time */}
                                                <td className="px-6 py-4">
                                                    <div className="text-sm">
                                                        <span className="font-semibold text-gray-900 block">{date}</span>
                                                        <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                            <MdAccessTime size={13} className="text-gray-400" />
                                                            {time}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Platform */}
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                                                        isZoom 
                                                            ? "bg-blue-50 text-blue-700 border-blue-100" 
                                                            : "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                    }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${isZoom ? 'bg-blue-600' : 'bg-emerald-600'}`} />
                                                        {isZoom ? "Zoom Meeting" : "Jitsi Meet"}
                                                    </span>
                                                </td>

                                                {/* Created By */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <img 
                                                            src={getDoctorImageUrl(meeting.createdBy?.image)} 
                                                            alt={meeting.createdBy?.username || "Admin"} 
                                                            className="w-6 h-6 rounded-full object-cover border border-gray-200" 
                                                            onError={(e) => { 
                                                                e.target.onerror = null; 
                                                                e.target.src = DEFAULT_AVATAR; 
                                                            }}
                                                        />
                                                        <div className="text-xs">
                                                            <span className="font-semibold text-gray-800 block">{meeting.createdBy?.username || "Super Admin"}</span>
                                                            <span className="text-gray-400">{meeting.createdBy?.email || "admin@detoxpathy.com"}</span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Recording */}
                                                <td className="px-6 py-4">
                                                    {meeting.recordingUrl ? (
                                                        <div className="flex items-center gap-2">
                                                            <a 
                                                                href={getRecordingUrl(meeting.recordingUrl)} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all duration-300 shadow-sm"
                                                            >
                                                                <MdPlayCircleFilled size={16} />
                                                                Watch Recording
                                                            </a>
                                                            {isSuperAdmin && (
                                                                <button
                                                                    onClick={() => openRecordingModal(meeting)}
                                                                    className="p-1.5 text-gray-400 hover:text-gray-600 bg-gray-50 border border-gray-100 hover:bg-gray-100 rounded-lg transition-all duration-200"
                                                                    title="Edit Recording File / URL"
                                                                >
                                                                    <MdCloudUpload size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col gap-1.5">
                                                            {isZoom ? (
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                                                                        Auto-Syncing
                                                                    </span>
                                                                    {isSuperAdmin && (
                                                                        <button
                                                                            onClick={() => handleSyncRecording(meeting._id)}
                                                                            disabled={syncingId === meeting._id}
                                                                            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 px-2 py-0.5 rounded transition-all duration-200 disabled:opacity-50"
                                                                            title="Trigger Zoom S2S Cloud recordings fetch manually"
                                                                        >
                                                                            <MdSync className={`w-3.5 h-3.5 ${syncingId === meeting._id ? 'animate-spin' : ''}`} />
                                                                            Sync
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-[10px] text-gray-400 font-semibold bg-gray-50 px-2 py-0.5 rounded border border-gray-100 self-start">
                                                                    No Recording
                                                                </span>
                                                            )}

                                                            {isSuperAdmin && (
                                                                <button
                                                                    onClick={() => openRecordingModal(meeting)}
                                                                    className="text-[10px] text-gray-500 hover:text-[#134D41] hover:underline text-left self-start mt-0.5 flex items-center gap-0.5 font-bold"
                                                                >
                                                                    <MdAttachFile size={12} />
                                                                    Upload / Paste Link
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Actions */}
                                                <td className="px-6 py-4 text-right">
                                                    <div className="inline-flex items-center gap-2">
                                                        <a 
                                                            href={isSuperAdmin ? meeting.startUrl : meeting.joinUrl} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className={`flex items-center gap-1.5 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-sm hover:shadow transition-all duration-300 ${
                                                                isSuperAdmin 
                                                                    ? "bg-[#134D41] hover:bg-[#0D362E]" 
                                                                    : "bg-indigo-600 hover:bg-indigo-700"
                                                            }`}
                                                        >
                                                            <MdLink size={16} />
                                                            {isSuperAdmin ? "Start Meeting" : "Join Meeting"}
                                                        </a>
                                                        {isSuperAdmin && (
                                                            <button
                                                                onClick={() => handleDelete(meeting._id)}
                                                                className="p-2 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition-all duration-300"
                                                                title="Delete Meeting"
                                                            >
                                                                <MdDelete size={18} />
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
                    </div>
                )}

                {/* Create Meeting Drawer */}
                <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)}>
                    <div className="flex flex-col h-full bg-white">
                        {/* Header */}
                        <div className="flex items-center justify-between pb-6 mb-6 border-b border-gray-100">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Schedule Consultation</h2>
                                <p className="text-xs text-gray-400 mt-1">Host a video session open to all doctors.</p>
                            </div>
                            <button 
                                onClick={() => setDrawerOpen(false)}
                                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all duration-200"
                            >
                                <MdClose size={22} />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleCreate} className="flex-1 flex flex-col gap-6">
                            {/* Topic Input */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700 block">Meeting Topic</label>
                                <input
                                    type="text"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    placeholder="e.g. Weekly Doctor Coordination Meeting"
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#134D41]/20 focus:border-[#134D41] transition-all duration-200 text-sm placeholder-gray-400"
                                />
                            </div>

                            {/* Date & Time Input */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700 block">Scheduled Date & Time</label>
                                <input
                                    type="datetime-local"
                                    value={scheduledAt}
                                    onChange={(e) => setScheduledAt(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#134D41]/20 focus:border-[#134D41] transition-all duration-200 text-sm placeholder-gray-400 text-gray-700"
                                />
                            </div>

                            {/* Submit Button */}
                            <div className="mt-auto pt-6 border-t border-gray-100 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setDrawerOpen(false)}
                                    className="flex-1 py-3 px-4 border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={btnLoading}
                                    className="flex-1 py-3 px-4 bg-[#134D41] hover:bg-[#0D362E] disabled:bg-[#134D41]/50 disabled:cursor-not-allowed text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 font-semibold text-sm flex items-center justify-center gap-2"
                                >
                                    {btnLoading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                            Scheduling...
                                        </>
                                    ) : (
                                        "Generate Meeting"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </Drawer>

                {/* Add/Upload Recording Link Dialog Modal */}
                {recordingModalOpen && selectedMeeting && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all duration-300">
                        <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-gray-100 transform scale-100 transition-all duration-300 animate-in fade-in zoom-in-95 duration-200">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Add Meeting Recording</h3>
                                    <p className="text-xs text-gray-400 mt-0.5">Attach a cloud link or upload a local MP4 file.</p>
                                </div>
                                <button 
                                    onClick={() => { setRecordingModalOpen(false); setSelectedMeeting(null); }}
                                    className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all duration-200"
                                >
                                    <MdClose size={20} />
                                </button>
                            </div>

                            {/* Selector tabs */}
                            <div className="flex border border-gray-100 p-1 rounded-2xl bg-gray-50 mb-4 gap-1">
                                <button
                                    type="button"
                                    onClick={() => setUploadType("url")}
                                    className={`flex-1 py-2 text-center rounded-xl text-xs font-semibold transition-all duration-200 ${
                                        uploadType === "url"
                                            ? "bg-[#134D41] text-white shadow-xs"
                                            : "text-gray-500 hover:text-gray-700"
                                    }`}
                                >
                                    Paste Recording URL Link
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setUploadType("file")}
                                    className={`flex-1 py-2 text-center rounded-xl text-xs font-semibold transition-all duration-200 ${
                                        uploadType === "file"
                                            ? "bg-[#134D41] text-white shadow-xs"
                                            : "text-gray-500 hover:text-gray-700"
                                    }`}
                                >
                                    Upload Video File (MP4)
                                </button>
                            </div>

                            {/* Modal Content Form */}
                            <form onSubmit={handleSaveRecording} className="space-y-4">
                                <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-start gap-2.5">
                                    <MdVideocam size={20} className="text-[#134D41] shrink-0 mt-0.5" />
                                    <div>
                                        <span className="text-xs font-bold text-gray-700 block">Topic: {selectedMeeting.topic}</span>
                                        <span className="text-xs text-gray-400">Created: {new Date(selectedMeeting.createdAt).toLocaleDateString()} at {new Date(selectedMeeting.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                </div>

                                {uploadType === "url" ? (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-700 block">Recording URL (Zoom Cloud, Google Drive, MP4, etc.)</label>
                                        <input
                                            type="url"
                                            value={recordingUrlInput}
                                            onChange={(e) => setRecordingUrlInput(e.target.value)}
                                            placeholder="https://zoom.us/rec/play/..."
                                            required
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#134D41]/20 focus:border-[#134D41] transition-all duration-200 text-sm placeholder-gray-400"
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-700 block">Select Video File (MP4, WebM)</label>
                                        <div className="border-2 border-dashed border-gray-200 hover:border-[#134D41] rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 bg-gray-50/50 flex flex-col items-center justify-center gap-2 relative">
                                            <input
                                                type="file"
                                                accept="video/*"
                                                onChange={(e) => setRecordingFile(e.target.files[0])}
                                                required
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                            />
                                            <MdCloudUpload size={32} className="text-gray-400" />
                                            {recordingFile ? (
                                                <span className="text-xs font-bold text-emerald-600 block">{recordingFile.name} ({(recordingFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                                            ) : (
                                                <>
                                                    <span className="text-xs font-bold text-gray-700">Click to choose or drag MP4 video here</span>
                                                    <span className="text-[10px] text-gray-400">Supports standard recording files</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Modal Actions */}
                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => { setRecordingModalOpen(false); setSelectedMeeting(null); }}
                                        className="flex-1 py-3 px-4 border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saveRecordingLoading}
                                        className="flex-1 py-3 px-4 bg-[#134D41] hover:bg-[#0D362E] disabled:bg-[#134D41]/50 disabled:cursor-not-allowed text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 font-semibold text-sm flex items-center justify-center gap-2"
                                    >
                                        {saveRecordingLoading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                                Uploading...
                                            </>
                                        ) : (
                                            "Save Recording"
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </RoleGuard>
    );
}
