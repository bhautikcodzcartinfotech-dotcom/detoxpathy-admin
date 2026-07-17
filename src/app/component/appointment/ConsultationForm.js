"use client";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Trash2, Save, Loader2, ClipboardCheck } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
    createPatientHistoryApi,
    deletePatientHistoryApi,
    getPatientHistoriesApi,
    submitConsultationForm,
    generateUrl,
    resolveImageUrl,
    getUserOverview,
    downloadConsultationPdfApi
} from "@/Api/AllApi";

const ConsultationForm = ({ appointment, onClose, onSaveSuccess, embedded = false, patient = null }) => {
    const { user: currentUser } = useAuth();
    const [patientHistoryOptions, setPatientHistoryOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        appointmentId: appointment?._id,
        userId: appointment?.userId?._id,
        name: "",
        mobileNo: "",
        gender: "",
        drName: "",
        height: "",
        weight: "",
        idealWeight: "",
        requiredLossWeight: "",
        consultationDate: "",
        consultationTime: "",
        reference: "",
        occupation: "",
        city: "",
        state: "",
        country: "",
        co: [{ complaint: "", duration: "" }],
        patientHistory: [], // Option 1: K/C/O
        pastSurgery: { // Option 2: Past Surgery
            hasSurgery: false,
            duration: ""
        },
        weightLossHistory: [{ title: "", duration: "", howMuch: "", addiction: "" }],
        advice: "",
        bloodReport: "",
        xRay: "",
        usc: "",
        mri: "",
        patientNote: "",
        beforePhoto: "",
        afterPhoto: "",
        planDay: ""
    });
    const [customHistory, setCustomHistory] = useState("");
    const [fetchedUser, setFetchedUser] = useState(null);
    const [hasLoadedUserData, setHasLoadedUserData] = useState(false);
    const [pastConsultations, setPastConsultations] = useState([]);
    const [selectedPastConsultation, setSelectedPastConsultation] = useState(null);

    useEffect(() => {
        const userId = patient?._id || appointment?.userId?._id;
        if (!userId) return;

        let active = true;
        const fetchUserData = async () => {
            try {
                const overview = await getUserOverview(userId);
                if (active && overview?.user) {
                    setFetchedUser(overview.user);
                }
                if (active && Array.isArray(overview?.consultations)) {
                    setPastConsultations(overview.consultations);
                }
            } catch (err) {
                console.error("Failed to fetch user overview for autofill:", err);
            }
        };

        fetchUserData();
        return () => {
            active = false;
        };
    }, [patient?._id, appointment?.userId?._id]);

    useEffect(() => {
        const u = fetchedUser || patient || appointment?.userId;
        const dr = appointment?.doctor;
        if (!u) return;

        if (hasLoadedUserData) return;

        const fullName = `${u.name || ""} ${u.surname || ""}`.trim();
        const weightVal = u.weight != null && u.weight !== "" ? String(u.weight) : "";
        const idealVal = u.idealWeight != null && u.idealWeight !== "" ? String(u.idealWeight) : "";
        let requiredLoss = "";
        if (weightVal && idealVal && !isNaN(Number(weightVal)) && !isNaN(Number(idealVal))) {
            const diff = Number(weightVal) - Number(idealVal);
            if (diff > 0) requiredLoss = String(parseFloat(diff.toFixed(2)));
        }

        const timeLabel = appointment?.startTime
            ? `${appointment.startTime}${appointment?.endTime ? ` - ${appointment.endTime}` : ""}`
            : "";

        const isBeforeUploaded = !!(u.before?.front || u.before?.side);
        const isAfterUploaded = !!(u.after?.front || u.after?.side);

        setFormData((prev) => ({
            ...prev,
            appointmentId: appointment?._id,
            userId: u._id,
            name: fullName,
            mobileNo: u.mobileNumber || "",
            gender: u.gender || "",
            drName: dr?.username || dr?.name || currentUser?.username || currentUser?.name || "",
            height: u.height != null && u.height !== "" ? String(u.height) : "",
            weight: weightVal,
            idealWeight: idealVal,
            requiredLossWeight: requiredLoss,
            consultationDate: appointment?.date || new Date().toISOString().split('T')[0],
            consultationTime: timeLabel,
            reference: u.appReferer || u.usedReferralCode || "",
            occupation: u.occupation || "",
            city: u.city || "",
            state: u.state || "",
            country: u.country || "",
            beforePhoto: isBeforeUploaded ? "Yes" : "No",
            afterPhoto: isAfterUploaded ? "Yes" : "No",
            planDay: patient?.planDay || appointment?.planDay || ""
        }));

        if (fetchedUser || u.height || u.weight) {
            setHasLoadedUserData(true);
        }
    }, [appointment?._id, patient, currentUser, fetchedUser, hasLoadedUserData]);

    useEffect(() => {
        const weightVal = formData.weight;
        const idealVal = formData.idealWeight;
        if (weightVal && idealVal && !isNaN(Number(weightVal)) && !isNaN(Number(idealVal))) {
            const diff = Number(weightVal) - Number(idealVal);
            if (diff > 0) {
                const rounded = String(parseFloat(diff.toFixed(2)));
                setFormData(prev => {
                    if (prev.requiredLossWeight === rounded) return prev;
                    return { ...prev, requiredLossWeight: rounded };
                });
            } else {
                setFormData(prev => {
                    if (prev.requiredLossWeight === "") return prev;
                    return { ...prev, requiredLossWeight: "" };
                });
            }
        } else {
            setFormData(prev => {
                if (prev.requiredLossWeight === "") return prev;
                return { ...prev, requiredLossWeight: "" };
            });
        }
    }, [formData.weight, formData.idealWeight]);

    useEffect(() => {
        const userId = patient?._id || appointment?.userId?._id;
        if (!userId) {
            setPatientHistoryOptions([]);
            return;
        }

        let cancelled = false;

        const fetchPatientHistories = async () => {
            try {
                const list = await getPatientHistoriesApi({ userId, limit: 100 });
                if (!cancelled) {
                    setPatientHistoryOptions(Array.isArray(list) ? list : []);
                }
            } catch (err) {
                if (!cancelled) {
                    console.error("Error fetching patient history", err);
                    setPatientHistoryOptions([]);
                }
            }
        };

        fetchPatientHistories();

        return () => {
            cancelled = true;
        };
    }, [appointment?.userId?._id]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (name.includes(".")) {
            const [parent, child] = name.split(".");
            setFormData(prev => ({
                ...prev,
                [parent]: {
                    ...prev[parent],
                    [child]: type === "checkbox" ? checked : value
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: type === "checkbox" ? checked : value
            }));
        }
    };

    const handleHistoryToggle = (optionName) => {
        setFormData(prev => {
            const exists = prev.patientHistory.find(ph => ph.name === optionName);
            if (exists) {
                return { ...prev, patientHistory: prev.patientHistory.filter(ph => ph.name !== optionName) };
            }

            const opt = patientHistoryOptions.find(p => p.name === optionName || p._id === optionName);
            const newEntry = { name: optionName, duration: '', medicine: '' };
            if (opt && opt._id) newEntry._id = opt._id;

            return { ...prev, patientHistory: [...prev.patientHistory, newEntry] };
        });
    };

    const handleAddPatientHistory = async () => {
        const name = customHistory.trim();
        if (!name || !formData.userId) return;

        try {
            const createdHistory = await createPatientHistoryApi({
                userId: formData.userId,
                name
            });

            setPatientHistoryOptions((prev) => {
                const exists = prev.some(
                    (item) => item.name.toLowerCase() === createdHistory.name.toLowerCase()
                );
                if (exists) return prev;
                return [...prev, createdHistory].sort((a, b) =>
                    a.name.localeCompare(b.name)
                );
            });

            setFormData((prev) => ({
                ...prev,
                patientHistory: prev.patientHistory.some(ph => ph.name === createdHistory.name)
                    ? prev.patientHistory
                    : [...prev.patientHistory, { name: createdHistory.name, duration: '', medicine: '', _id: createdHistory._id }]
            }));
            setCustomHistory("");
        } catch (err) {
            console.error("Failed to add patient history", err);
            toast.error(err.response?.data?.message || "Failed to add patient history");
        }
    };

    const handleWeightLossChange = (index, field, value) => {
        const newHistory = [...formData.weightLossHistory];
        newHistory[index][field] = value;
        setFormData(prev => ({ ...prev, weightLossHistory: newHistory }));
    };

    const addWeightLossRow = () => {
        setFormData(prev => ({
            ...prev,
            weightLossHistory: [...prev.weightLossHistory, { title: "", duration: "", howMuch: "", addiction: "" }]
        }));
    };

    const removeWeightLossRow = (index) => {
        const newHistory = formData.weightLossHistory.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, weightLossHistory: newHistory }));
    };

    const handleCoChange = (index, field, value) => {
        const newCo = [...formData.co];
        newCo[index][field] = value;
        setFormData(prev => ({ ...prev, co: newCo }));
    };

    const addCoRow = () => {
        setFormData(prev => ({
            ...prev,
            co: [...prev.co, { complaint: "", duration: "" }]
        }));
    };

    const removeCoRow = (index) => {
        const newCo = formData.co.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, co: newCo }));
    };

    const handlePhotoUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        const uploadData = new FormData();
        uploadData.append("image", file);

        const toastId = toast.loading(`Uploading ${type} photo...`);
        try {
            const uploadResponse = await generateUrl(uploadData);
            const url = typeof uploadResponse === "string"
                ? uploadResponse
                : uploadResponse?.data;

            if (!url || typeof url !== "string") {
                throw new Error("Invalid image URL returned from upload");
            }

            setFormData(prev => ({
                ...prev,
                [`${type}Photo`]: url
            }));
            toast.success(`${type} photo uploaded successfully!`, { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error(`Failed to upload ${type} photo`, { id: toastId });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);

            const consultation = await submitConsultationForm({
                ...formData,
                appointmentId: appointment?._id || undefined,
                userId: patient?._id || appointment?.userId?._id || formData.userId
            });

            toast.success("Consultation saved successfully!");
            if (onSaveSuccess) onSaveSuccess(consultation);
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to save consultation");
        } finally {
            setLoading(false);
        }
    };

    const patientName = patient
        ? `${patient.name || ""} ${patient.surname || ""}`.trim()
        : appointment?.userId
        ? `${appointment.userId.name || ""} ${appointment.userId.surname || ""}`.trim()
        : "";

    return (
        <div className={embedded ? "bg-white" : "flex flex-col h-full bg-white"}>
            {!embedded ? (
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                            <ClipboardCheck className="text-teal-600" /> Consultation Entry
                        </h2>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">
                            Patient: {patientName || "N/A"}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                        <X size={20} />
                    </button>
                </div>
            ) : (
                <div className="pt-2 pb-4">
                    <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                        <ClipboardCheck className="text-teal-600" /> Consultation Entry
                    </h2>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">
                        Enter the consultation details below for {patientName || "the patient"}.
                    </p>
                </div>
            )}

            <form
                onSubmit={handleSubmit}
                className={
                    embedded
                        ? "space-y-8 pb-4"
                        : "flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar pb-24"
                }
            >

                {/* Previous Consultations List */}
                {pastConsultations.length > 0 && (
                    <div className="bg-amber-50/40 border border-amber-100 rounded-2xl p-4 mb-4">
                        <div className="flex items-center gap-2 mb-3">
                            <ClipboardCheck className="text-amber-600 w-5 h-5" />
                            <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider">Previous Consultations</h4>
                        </div>
                        <div className="flex flex-wrap gap-2.5">
                            {pastConsultations.map((c) => (
                                <div
                                    key={c._id}
                                    className="flex items-center gap-2 bg-white border border-slate-100 rounded-xl px-3 py-2 shadow-sm text-xs font-bold text-slate-700"
                                >
                                    <span>📅 {c.consultationDate || new Date(c.createdAt).toLocaleDateString()} {c.planDay ? `(Day ${c.planDay})` : ""}</span>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedPastConsultation(c)}
                                        className="p-1 hover:bg-slate-100 rounded text-teal-600 hover:text-teal-700 transition-colors flex items-center justify-center cursor-pointer"
                                        title="View Details"
                                    >
                                        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 1 - Patient Details */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-4 w-1 bg-teal-500 rounded-full" />
                        <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">1 - Patient Details</h3>
                    </div>
                    
                    {/* Line 1 - Name, Gender, Mobile Number */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Name</label>
                            <input name="name" value={formData.name} onChange={handleChange} className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all text-sm font-medium" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Gender</label>
                            <select name="gender" value={formData.gender} onChange={handleChange} className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all text-sm font-medium">
                                <option value="">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Mobile Number</label>
                            <input name="mobileNo" value={formData.mobileNo} onChange={handleChange} className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all text-sm font-medium" />
                        </div>
                    </div>

                    {/* Next line - Height, Weight, Ideal Weight, Required Loss Weight */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Height (cm)</label>
                            <input name="height" value={formData.height} onChange={handleChange} placeholder="e.g. 170" className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all text-sm font-medium" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Weight (kg)</label>
                            <input name="weight" value={formData.weight} onChange={handleChange} placeholder="e.g. 75" className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all text-sm font-medium" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Ideal Weight (kg)</label>
                            <input name="idealWeight" value={formData.idealWeight} onChange={handleChange} placeholder="e.g. 65" className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all text-sm font-medium" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Required Loss (kg)</label>
                            <input name="requiredLossWeight" value={formData.requiredLossWeight} onChange={handleChange} placeholder="e.g. 10" className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all text-sm font-medium" />
                        </div>
                    </div>

                    {/* Next line - Date, Time, Consultation Day, Occupation, Reference */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Date</label>
                            <input name="consultationDate" value={formData.consultationDate} onChange={handleChange} placeholder="YYYY-MM-DD" className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all text-sm font-medium" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Time</label>
                            <input name="consultationTime" value={formData.consultationTime} onChange={handleChange} placeholder="e.g. 10:00 AM" className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all text-sm font-medium" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Consultation Day</label>
                            <input name="planDay" value={formData.planDay} onChange={handleChange} placeholder="e.g. 5" className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all text-sm font-medium" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Occupation</label>
                            <input name="occupation" value={formData.occupation} onChange={handleChange} placeholder="e.g. Engineer" className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all text-sm font-medium" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Reference</label>
                            <input name="reference" value={formData.reference} onChange={handleChange} placeholder="e.g. Google Search" className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all text-sm font-medium" />
                        </div>
                    </div>

                    {/* Next line - Dr.Name, City, State, Country */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Dr. Name</label>
                            <input name="drName" value={formData.drName} onChange={handleChange} className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all text-sm font-medium" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">City</label>
                            <input name="city" value={formData.city} onChange={handleChange} placeholder="e.g. Surat" className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all text-sm font-medium" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">State</label>
                            <input name="state" value={formData.state} onChange={handleChange} placeholder="e.g. Gujarat" className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all text-sm font-medium" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Country</label>
                            <input name="country" value={formData.country} onChange={handleChange} placeholder="e.g. India" className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all text-sm font-medium" />
                        </div>
                    </div>
                </div>

                {/* 2 - C/O (Complaints & Duration) */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-1 bg-teal-500 rounded-full" />
                            <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">2 - C/O (Complaints & Duration)</h3>
                        </div>
                        <button
                            type="button" onClick={addCoRow}
                            className="bg-teal-50 text-teal-600 p-2 rounded-xl hover:bg-teal-100 transition-colors shrink-0"
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                    <div className="space-y-3">
                        {formData.co.map((item, idx) => (
                            <div key={idx} className="flex gap-3 items-center group">
                                <input
                                    value={item.complaint} onChange={(e) => handleCoChange(idx, "complaint", e.target.value)}
                                    placeholder="Complaint"
                                    className="flex-1 p-3.5 rounded-xl bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20 outline-none transition-all font-medium"
                                />
                                <input
                                    value={item.duration} onChange={(e) => handleCoChange(idx, "duration", e.target.value)}
                                    placeholder="Duration (e.g. 1 month)"
                                    className="w-48 p-3.5 rounded-xl bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20 outline-none transition-all font-medium"
                                />
                                {formData.co.length > 1 && (
                                    <button
                                        type="button" onClick={() => removeCoRow(idx)}
                                        className="text-red-400 p-2 hover:text-red-600 transition-colors shrink-0"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3 - Patient History */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-4 w-1 bg-teal-500 rounded-full" />
                        <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">3 - Patient History</h3>
                    </div>
                    
                    {/* Option 1: K/C/O */}
                    <div className="space-y-3">
                        <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1 block">Option 1: K/C/O</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={customHistory}
                                onChange={(e) => setCustomHistory(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleAddPatientHistory();
                                    }
                                }}
                                placeholder="Add new K/C/O option"
                                className="flex-1 p-3 rounded-xl bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20 font-medium"
                            />
                            <button
                                type="button"
                                onClick={handleAddPatientHistory}
                                className="bg-teal-50 text-teal-600 p-3 rounded-xl hover:bg-teal-100 transition-colors disabled:opacity-50 shrink-0"
                                disabled={!customHistory.trim()}
                            >
                                <Plus size={18} />
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {patientHistoryOptions.map(option => (
                                <button
                                    key={option._id || option.name}
                                    type="button"
                                    onClick={() => handleHistoryToggle(option.name)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${formData.patientHistory.some(ph => ph.name === option.name)
                                            ? 'bg-teal-600 text-white border-teal-600 shadow-lg shadow-teal-100 scale-105'
                                            : 'bg-white text-slate-500 border-slate-100 hover:border-teal-200 hover:bg-teal-50/30'
                                        }`}
                                >
                                    {option.name}
                                </button>
                            ))}
                        </div>

                        {formData.patientHistory && formData.patientHistory.length > 0 && (
                            <div className="mt-3 space-y-3">
                                {formData.patientHistory.map((h, idx) => (
                                    <div key={h.name || idx} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center bg-slate-50/50 p-4 rounded-xl border border-slate-150">
                                        <div className="text-sm font-black text-slate-800 truncate px-2">{h.name}</div>
                                        <input
                                            value={h.duration}
                                            onChange={(e) => {
                                                const newPH = [...formData.patientHistory];
                                                newPH[idx] = { ...newPH[idx], duration: e.target.value };
                                                setFormData(prev => ({ ...prev, patientHistory: newPH }));
                                            }}
                                            placeholder="Duration (e.g. 2 years)"
                                            className="p-3 rounded-xl bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20 font-medium"
                                        />
                                        <div className="flex gap-2 items-center">
                                            <input
                                                value={h.medicine}
                                                onChange={(e) => {
                                                    const newPH = [...formData.patientHistory];
                                                    newPH[idx] = { ...newPH[idx], medicine: e.target.value };
                                                    setFormData(prev => ({ ...prev, patientHistory: newPH }));
                                                }}
                                                placeholder="Medicine details"
                                                className="flex-1 p-3 rounded-xl bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20 font-medium"
                                            />
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    if (h._id) {
                                                        try {
                                                            await deletePatientHistoryApi(h._id);
                                                            setPatientHistoryOptions(prev => prev.filter(p => p._id !== h._id));
                                                            setFormData(prev => ({ ...prev, patientHistory: prev.patientHistory.filter(ph => ph._id !== h._id) }));
                                                            return;
                                                        } catch (err) {
                                                            console.error('Failed to delete patient history', err);
                                                            toast.error(err.response?.data?.message || 'Failed to delete history');
                                                        }
                                                    }
                                                    handleHistoryToggle(h.name);
                                                }}
                                                className="text-red-400 p-2 hover:text-red-600 transition-colors shrink-0"
                                                title="Remove"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="border-t border-slate-100 my-4" />

                    {/* Option 2: Past Surgery */}
                    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Option 2: Past Surgery</label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox" name="pastSurgery.hasSurgery"
                                    checked={formData.pastSurgery?.hasSurgery || false} onChange={handleChange}
                                    className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                />
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Had Surgery</span>
                            </label>
                        </div>
                        {formData.pastSurgery?.hasSurgery && (
                            <div className="animate-fadeIn">
                                <input
                                    name="pastSurgery.duration" value={formData.pastSurgery.duration || ""} onChange={handleChange}
                                    placeholder="Surgery details & duration (e.g. Appendix, 3 years ago)"
                                    className="w-full p-3 rounded-xl bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20 outline-none font-medium"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* 4 - Past Weight Loss History */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-1 bg-teal-500 rounded-full" />
                            <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">4 - Past Weight Loss History</h3>
                        </div>
                        <button
                            type="button" onClick={addWeightLossRow}
                            className="bg-teal-50 text-teal-600 p-2 rounded-xl hover:bg-teal-100 transition-colors shrink-0"
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                    
                    <div className="space-y-3">
                        {formData.weightLossHistory.map((item, idx) => (
                            <div key={idx} className="flex gap-3 items-center group">
                                <input
                                    value={item.title} onChange={(e) => handleWeightLossChange(idx, "title", e.target.value)}
                                    placeholder="Program title"
                                    className="flex-1 p-3.5 rounded-xl bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20 font-medium"
                                />
                                <input
                                    value={item.duration} onChange={(e) => handleWeightLossChange(idx, "duration", e.target.value)}
                                    placeholder="Duration"
                                    className="w-36 p-3.5 rounded-xl bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20 font-medium"
                                />
                                <input
                                    value={item.howMuch} onChange={(e) => handleWeightLossChange(idx, "howMuch", e.target.value)}
                                    placeholder="How much weight lost"
                                    className="w-44 p-3.5 rounded-xl bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20 font-medium"
                                />
                                <div className="flex gap-2 items-center flex-1">
                                    <input
                                        value={item.addiction} onChange={(e) => handleWeightLossChange(idx, "addiction", e.target.value)}
                                        placeholder="Addiction / Habits details"
                                        className="flex-1 p-3.5 rounded-xl bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20 font-medium"
                                    />
                                    {formData.weightLossHistory.length > 1 && (
                                        <button
                                            type="button" onClick={() => removeWeightLossRow(idx)}
                                            className="text-red-400 p-2 hover:text-red-600 transition-colors shrink-0"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 5 - Advice & Reports */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-4 w-1 bg-teal-500 rounded-full" />
                        <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">5 - Advice & Medical Reports</h3>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Clinical Advice</label>
                        <textarea
                            name="advice"
                            value={formData.advice}
                            onChange={handleChange}
                            placeholder="Clinical advice..."
                            className="w-full h-24 p-4 rounded-2xl bg-white border border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all text-sm font-medium resize-none shadow-sm"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Blood Report</label>
                            <textarea
                                name="bloodReport"
                                value={formData.bloodReport}
                                onChange={handleChange}
                                placeholder="Blood report details..."
                                className="w-full h-20 p-4 rounded-xl bg-white border border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all text-sm font-medium resize-none shadow-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">X-Ray</label>
                            <textarea
                                name="xRay"
                                value={formData.xRay}
                                onChange={handleChange}
                                placeholder="X-Ray details..."
                                className="w-full h-20 p-4 rounded-xl bg-white border border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all text-sm font-medium resize-none shadow-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">USG (Ultrasound)</label>
                            <textarea
                                name="usc"
                                value={formData.usc}
                                onChange={handleChange}
                                placeholder="USG details..."
                                className="w-full h-20 p-4 rounded-xl bg-white border border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all text-sm font-medium resize-none shadow-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">CT / MRI</label>
                            <textarea
                                name="mri"
                                value={formData.mri}
                                onChange={handleChange}
                                placeholder="CT/MRI details..."
                                className="w-full h-20 p-4 rounded-xl bg-white border border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all text-sm font-medium resize-none shadow-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* 6 - Patient Note */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-4 w-1 bg-teal-500 rounded-full" />
                        <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">6 - Patient Notes</h3>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Patient Note</label>
                        <textarea name="patientNote" value={formData.patientNote} onChange={handleChange} className="w-full h-24 p-4 rounded-2xl bg-white border border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all text-sm font-medium resize-none shadow-sm" />
                    </div>
                </div>

                {/* 7 - Photo Status (Before & After) */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-4 w-1 bg-teal-500 rounded-full" />
                        <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">7 - Photos (Before & After)</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Before Photo Status */}
                        <div className="p-5 border border-slate-100 rounded-2xl bg-slate-50/50 flex flex-col justify-between">
                            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block mb-2">Before Photo Uploaded in Profile</span>
                            <div className={`text-base font-black px-4 py-2 rounded-xl text-center w-24 ${
                                formData.beforePhoto === "Yes"
                                    ? 'bg-green-50 text-green-700 border border-green-200'
                                    : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                                {formData.beforePhoto === "Yes" ? "Yes" : "No"}
                            </div>
                        </div>

                        {/* After Photo Status */}
                        <div className="p-5 border border-slate-100 rounded-2xl bg-slate-50/50 flex flex-col justify-between">
                            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block mb-2">After Photo Uploaded in Profile</span>
                            <div className={`text-base font-black px-4 py-2 rounded-xl text-center w-24 ${
                                formData.afterPhoto === "Yes"
                                    ? 'bg-green-50 text-green-700 border border-green-200'
                                    : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                                {formData.afterPhoto === "Yes" ? "Yes" : "No"}
                            </div>
                        </div>
                    </div>
                </div>
            </form>

            <div
                className={
                    embedded
                        ? "pt-6 mt-4 border-t border-slate-100 flex items-center justify-end gap-3"
                        : "p-6 bg-white border-t border-slate-100 flex items-center justify-end gap-3 sticky bottom-0"
                }
            >
                <button
                    type="button" onClick={onClose}
                    className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                >
                    Discard
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="bg-slate-900 border border-slate-800 px-8 py-3 rounded-2xl text-[11px] font-bold text-white hover:bg-black transition-all shadow-xl shadow-slate-200 flex items-center gap-2 uppercase tracking-widest disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    {loading ? "Saving..." : "Save Consultation"}
                </button>
            </div>

            {/* View Past Consultation Modal */}
            {typeof window !== "undefined" && createPortal(
                <AnimatePresence>
                    {selectedPastConsultation && (
                    <>
                        <motion.div
                            className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedPastConsultation(null)}
                        />
                        <motion.div
                            className="fixed inset-x-4 inset-y-4 md:inset-x-20 md:inset-y-10 bg-white rounded-3xl shadow-2xl z-[70] p-6 overflow-y-auto flex flex-col"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        >
                            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        <ClipboardCheck className="text-teal-600" />
                                        Past Consultation: {selectedPastConsultation.consultationDate || new Date(selectedPastConsultation.createdAt).toLocaleDateString()}
                                    </h3>
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">
                                        Day: {selectedPastConsultation.planDay || "N/A"} | Doctor: {selectedPastConsultation.drName || "N/A"}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedPastConsultation(null)}
                                    className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 py-6 space-y-6 text-sm text-slate-700">
                                {/* Section 1 - Patient Details Grid */}
                                <div className="space-y-2">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">1 - Patient Details</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                        <div>
                                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Name</span>
                                            <span className="text-sm font-bold text-slate-800">{selectedPastConsultation.name || "-"}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Mobile Number</span>
                                            <span className="text-sm font-bold text-slate-800">{selectedPastConsultation.mobileNo || "-"}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Gender</span>
                                            <span className="text-sm font-bold text-slate-800">{selectedPastConsultation.gender || "-"}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Occupation</span>
                                            <span className="text-sm font-bold text-slate-800">{selectedPastConsultation.occupation || "-"}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Height (cm)</span>
                                            <span className="text-sm font-bold text-slate-800">{selectedPastConsultation.height || "-"}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Weight (kg)</span>
                                            <span className="text-sm font-bold text-slate-800">{selectedPastConsultation.weight || "-"}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Ideal Weight</span>
                                            <span className="text-sm font-bold text-slate-800">{selectedPastConsultation.idealWeight || "-"}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Required Loss</span>
                                            <span className="text-sm font-bold text-slate-800">
                                                {selectedPastConsultation.requiredLossWeight && !isNaN(Number(selectedPastConsultation.requiredLossWeight))
                                                    ? parseFloat(Number(selectedPastConsultation.requiredLossWeight).toFixed(2))
                                                    : selectedPastConsultation.requiredLossWeight || "-"}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Date</span>
                                            <span className="text-sm font-bold text-slate-800">{selectedPastConsultation.consultationDate || "-"}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Time</span>
                                            <span className="text-sm font-bold text-slate-800">{selectedPastConsultation.consultationTime || "-"}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Consultation Day</span>
                                            <span className="text-sm font-bold text-slate-800">{selectedPastConsultation.planDay || "-"}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Reference</span>
                                            <span className="text-sm font-bold text-slate-800">{selectedPastConsultation.reference || "-"}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Dr. Name</span>
                                            <span className="text-sm font-bold text-slate-800">{selectedPastConsultation.drName || "-"}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">City</span>
                                            <span className="text-sm font-bold text-slate-800">{selectedPastConsultation.city || "-"}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">State</span>
                                            <span className="text-sm font-bold text-slate-800">{selectedPastConsultation.state || "-"}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Country</span>
                                            <span className="text-sm font-bold text-slate-800">{selectedPastConsultation.country || "-"}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2 - Complaints */}
                                <div className="space-y-2">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">2 - Complaints (C/O)</h4>
                                    {selectedPastConsultation.co && selectedPastConsultation.co.length > 0 ? (
                                        <div className="border border-slate-100 rounded-2xl p-4 bg-white space-y-2 shadow-sm">
                                            {selectedPastConsultation.co.map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center border-b border-slate-50 last:border-0 pb-2 last:pb-0">
                                                    <span className="font-bold text-slate-800">{item.complaint || "-"}</span>
                                                    <span className="text-xs font-semibold text-slate-500">{item.duration || "-"}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs italic text-slate-400 ml-1">No complaints recorded</p>
                                    )}
                                </div>

                                {/* Section 3 - Medical Conditions & Surgery */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">3 - Patient History & Surgery</h4>
                                    
                                    <div className="space-y-2">
                                        <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">Option 1: K/C/O</span>
                                        {selectedPastConsultation.patientHistory && selectedPastConsultation.patientHistory.length > 0 ? (
                                            <div className="border border-slate-100 rounded-2xl p-4 bg-white space-y-2 shadow-sm">
                                                {selectedPastConsultation.patientHistory.map((item, idx) => (
                                                    <div key={idx} className="flex justify-between items-center border-b border-slate-50 last:border-0 pb-2 last:pb-0">
                                                        <span className="font-bold text-slate-800">{item.name || "-"}</span>
                                                        <span className="text-xs font-semibold text-slate-500">{item.duration || "-"} {item.medicine ? `· ${item.medicine}` : ""}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs italic text-slate-400 ml-1">No patient history recorded</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">Option 2: Past Surgery</span>
                                        <div className="border border-slate-100 rounded-2xl p-4 bg-white shadow-sm">
                                            <span className="font-bold text-slate-800">
                                                {selectedPastConsultation.pastSurgery?.hasSurgery ? `Yes (Duration: ${selectedPastConsultation.pastSurgery?.duration || "-"})` : "No"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 4 - Weight Loss History */}
                                <div className="space-y-2">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">4 - Past Weight Loss History</h4>
                                    {selectedPastConsultation.weightLossHistory && selectedPastConsultation.weightLossHistory.length > 0 ? (
                                        <div className="border border-slate-100 rounded-2xl p-4 bg-white space-y-2 shadow-sm">
                                            {selectedPastConsultation.weightLossHistory.map((item, idx) => (
                                                <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 border-b border-slate-50 last:border-0 pb-2 last:pb-0">
                                                    <div>
                                                        <span className="block text-[9px] font-extrabold text-slate-400 uppercase font-bold text-slate-400">Program</span>
                                                        <span className="font-bold text-slate-800">{item.title || "-"}</span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-[9px] font-extrabold text-slate-400 uppercase font-bold text-slate-400">Duration</span>
                                                        <span className="font-semibold text-slate-600">{item.duration || "-"}</span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-[9px] font-extrabold text-slate-400 uppercase font-bold text-slate-400">Weight Lost</span>
                                                        <span className="font-semibold text-slate-600">{item.howMuch || "-"}</span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-[9px] font-extrabold text-slate-400 uppercase font-bold text-slate-400">Addiction / Habits</span>
                                                        <span className="font-semibold text-slate-600">{item.addiction || "-"}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs italic text-slate-400 ml-1">No past weight loss history recorded</p>
                                    )}
                                </div>

                                {/* Section 5 - Advice & Medical Reports */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">5 - Advice & Medical Reports</h4>
                                    
                                    <div className="space-y-2">
                                        <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">Clinical Advice</span>
                                        <div className="border border-slate-100 rounded-2xl p-4 bg-white shadow-sm whitespace-pre-wrap leading-relaxed">
                                            {selectedPastConsultation.advice || "No advice recorded"}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">Blood Report</span>
                                            <div className="border border-slate-100 rounded-2xl p-4 bg-white shadow-sm whitespace-pre-wrap leading-relaxed">
                                                {selectedPastConsultation.bloodReport || "No details"}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">X-Ray</span>
                                            <div className="border border-slate-100 rounded-2xl p-4 bg-white shadow-sm whitespace-pre-wrap leading-relaxed">
                                                {selectedPastConsultation.xRay || "No details"}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">USG (Ultrasound)</span>
                                            <div className="border border-slate-100 rounded-2xl p-4 bg-white shadow-sm whitespace-pre-wrap leading-relaxed">
                                                {selectedPastConsultation.usc || "No details"}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">CT / MRI</span>
                                            <div className="border border-slate-100 rounded-2xl p-4 bg-white shadow-sm whitespace-pre-wrap leading-relaxed">
                                                {selectedPastConsultation.mri || "No details"}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 6 - Patient Note */}
                                <div className="space-y-2">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">6 - Doctor Notes</h4>
                                    <div className="border border-slate-100 rounded-2xl p-4 bg-white shadow-sm whitespace-pre-wrap leading-relaxed text-amber-800 bg-amber-50/10">
                                        {selectedPastConsultation.patientNote || "No note recorded"}
                                    </div>
                                </div>

                                {/* Section 7 - Photos Upload Status */}
                                <div className="space-y-2">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">7 - Photos Upload Status</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-4 border border-slate-100 rounded-2xl bg-white shadow-sm flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-600">Before Photo Uploaded</span>
                                            <span className={`text-xs font-black px-3 py-1 rounded-lg ${
                                                selectedPastConsultation.beforePhoto === "Yes" ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                            }`}>{selectedPastConsultation.beforePhoto || "No"}</span>
                                        </div>
                                        <div className="p-4 border border-slate-100 rounded-2xl bg-white shadow-sm flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-600">After Photo Uploaded</span>
                                            <span className={`text-xs font-black px-3 py-1 rounded-lg ${
                                                selectedPastConsultation.afterPhoto === "Yes" ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                            }`}>{selectedPastConsultation.afterPhoto || "No"}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => downloadConsultationPdfApi(selectedPastConsultation._id)}
                                    className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                                >
                                    Download PDF
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedPastConsultation(null)}
                                    className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all active:scale-95"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>,
            document.body
        )}
        </div>
    );
};

export default ConsultationForm;
