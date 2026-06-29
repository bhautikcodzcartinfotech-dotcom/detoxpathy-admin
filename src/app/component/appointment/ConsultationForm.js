"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Plus, Trash2, Save, Loader2, ClipboardCheck } from "lucide-react";
import toast from "react-hot-toast";
import {
    createPatientHistoryApi,
    deletePatientHistoryApi,
    getMedicinesApi,
    getPatientHistoriesApi,
    submitConsultationForm,
    getConsultationCountByUserId
} from "@/Api/AllApi";

const ConsultationForm = ({ appointment, onClose, onSaveSuccess, embedded = false }) => {
    const [patientHistoryOptions, setPatientHistoryOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [medicineSuggestions, setMedicineSuggestions] = useState([]);
    const [activeMedIdx, setActiveMedIdx] = useState(null);
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
        bloodReport: "",
        patientNote: "",
        patientMostWant: "",
        co: "",
        consultationVisit: "first",
        isFirstConsultation: true,
        patientComplaint: "",
        advice: "",
        patientHistory: [],
        currentMedicine: "",
        addiction: "",
        stress: "",
        other: "",
        bimaiDiseases: [{ disease: "", medication: "" }],
        pastSurgery: {
            hasSurgery: false,
            duration: ""
        },
        weightLossHistory: [
            { title: "", duration: "" }
        ]
    });
    const [customHistory, setCustomHistory] = useState("");

    useEffect(() => {
        const u = appointment?.userId;
        const dr = appointment?.doctor;
        if (!u) return;

        const fullName = `${u.name || ""} ${u.surname || ""}`.trim();
        const weightVal = u.weight != null && u.weight !== "" ? String(u.weight) : "";
        const idealVal = u.idealWeight != null && u.idealWeight !== "" ? String(u.idealWeight) : "";
        let requiredLoss = "";
        if (weightVal && idealVal && !isNaN(Number(weightVal)) && !isNaN(Number(idealVal))) {
            const diff = Number(weightVal) - Number(idealVal);
            if (diff > 0) requiredLoss = String(diff);
        }

        const timeLabel = appointment?.startTime
            ? `${appointment.startTime}${appointment?.endTime ? ` - ${appointment.endTime}` : ""}`
            : "";

        setFormData((prev) => ({
            ...prev,
            appointmentId: appointment?._id,
            userId: u._id,
            name: fullName,
            mobileNo: u.mobileNumber || "",
            gender: u.gender || "",
            drName: dr?.username || dr?.name || "",
            height: u.height != null && u.height !== "" ? String(u.height) : "",
            weight: weightVal,
            idealWeight: idealVal,
            requiredLossWeight: requiredLoss,
            consultationDate: appointment?.date || "",
            consultationTime: timeLabel,
            reference: u.appReferer || u.usedReferralCode || "",
            occupation: u.occupation || "",
        }));

        const fetchConsultationCount = async () => {
            try {
               const data = await getConsultationCountByUserId(u._id);
               const count = data?.count || 0;
               
               let visit = 'first';
               if (count === 1) visit = 'second';
               else if (count >= 2) visit = 'third';
               
               setFormData(prev => ({
                   ...prev,
                   consultationVisit: visit,
                   isFirstConsultation: visit === 'first'
               }));
            } catch (err) {
                console.error("Failed to fetch consultation count", err);
            }
       };
       fetchConsultationCount();
    }, [appointment?._id]);

    useEffect(() => {
        const userId = appointment?.userId?._id;
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

    const setConsultationVisit = (visit) => {
        setFormData((prev) => ({
            ...prev,
            consultationVisit: visit,
            isFirstConsultation: visit === "first",
        }));
    };

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

            // find option ID if available
            const opt = patientHistoryOptions.find(p => p.name === optionName || p._id === optionName);
            const newEntry = { name: optionName, duration: '' };
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
                    : [...prev.patientHistory, { name: createdHistory.name, duration: '', _id: createdHistory._id }]
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
            weightLossHistory: [...prev.weightLossHistory, { title: "", duration: "" }]
        }));
    };

    const removeWeightLossRow = (index) => {
        const newHistory = formData.weightLossHistory.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, weightLossHistory: newHistory }));
    };

    const handleBimaiChange = (index, field, value) => {
        const updated = [...formData.bimaiDiseases];
        updated[index][field] = value;
        setFormData(prev => ({ ...prev, bimaiDiseases: updated }));
    };

    const addBimaiRow = () => {
        setFormData(prev => ({
            ...prev,
            bimaiDiseases: [...prev.bimaiDiseases, { disease: "", medication: "" }]
        }));
    };

    const removeBimaiRow = (index) => {
        const updated = formData.bimaiDiseases.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, bimaiDiseases: updated }));
    };

    const handleMedicineInput = async (idx, value) => {
        handleBimaiChange(idx, "medication", value);
        setActiveMedIdx(idx);
        if (!value.trim()) {
            setMedicineSuggestions([]);
            return;
        }
        try {
            const list = await getMedicinesApi({ search: value.trim(), limit: 8 });
            setMedicineSuggestions(Array.isArray(list) ? list : []);
        } catch {
            setMedicineSuggestions([]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);

            const consultation = await submitConsultationForm({
                ...formData,
                appointmentId: appointment._id,
                userId: appointment.userId._id
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

    return (
        <div className={embedded ? "bg-white" : "flex flex-col h-full bg-white"}>
            {!embedded ? (
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                            <ClipboardCheck className="text-teal-600" /> Consultation Entry
                        </h2>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">
                            Patient: {appointment.userId?.name} {appointment.userId?.surname}
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
                        Scroll up to review patient profile
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

                {/* Patient Details */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-4 w-1 bg-teal-500 rounded-full" />
                        <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">Patient Details</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Name</label>
                            <input name="name" value={formData.name} onChange={handleChange} className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Mobile No</label>
                            <input name="mobileNo" value={formData.mobileNo} readOnly className="w-full p-4 rounded-xl bg-slate-100 border border-slate-200 text-sm text-slate-600 cursor-not-allowed" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Gender</label>
                            <select name="gender" value={formData.gender} onChange={handleChange} className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all text-sm">
                                <option value="">Select</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Dr Name</label>
                            <input name="drName" value={formData.drName} onChange={handleChange} className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Height</label>
                            <input name="height" value={formData.height} onChange={handleChange} placeholder="e.g. 170" className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Weight</label>
                            <input name="weight" value={formData.weight} onChange={handleChange} placeholder="e.g. 75" className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Ideal Weight</label>
                            <input name="idealWeight" value={formData.idealWeight} onChange={handleChange} className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Required Loss Weight</label>
                            <input name="requiredLossWeight" value={formData.requiredLossWeight} onChange={handleChange} className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Date</label>
                            <input name="consultationDate" value={formData.consultationDate} onChange={handleChange} className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Time</label>
                            <input name="consultationTime" value={formData.consultationTime} onChange={handleChange} className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Reference</label>
                            <input name="reference" value={formData.reference} onChange={handleChange} className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Occupation</label>
                            <input name="occupation" value={formData.occupation} onChange={handleChange} className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all text-sm" />
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">C/O</label>
                            <textarea name="co" value={formData.co} onChange={handleChange}  className="w-full h-20 p-4 rounded-2xl bg-white border border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all text-sm font-medium resize-none shadow-sm" />
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Blood Report</label>
                            <textarea name="bloodReport" value={formData.bloodReport} onChange={handleChange} placeholder="Blood report details..." className="w-full h-20 p-4 rounded-2xl bg-white border border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all text-sm font-medium resize-none shadow-sm" />
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Patient Note</label>
                            <textarea name="patientNote" value={formData.patientNote} onChange={handleChange} className="w-full h-20 p-4 rounded-2xl bg-white border border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all text-sm font-medium resize-none shadow-sm" />
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Patient Most Want</label>
                            <textarea name="patientMostWant" value={formData.patientMostWant} onChange={handleChange} className="w-full h-20 p-4 rounded-2xl bg-white border border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all text-sm font-medium resize-none shadow-sm" />
                        </div>
                    </div>
                </div>
                
                {/* Basic Info */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-4 w-1 bg-teal-500 rounded-full" />
                        <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">Basic Assessment</h3>
                    </div>
                    
                    <div className="space-y-3">
                        <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Consultation Visit</label>
                        <div className="inline-block px-4 py-2 bg-teal-50 text-teal-700 rounded-full text-xs font-bold uppercase tracking-widest">
                           {formData.consultationVisit} Time
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5 focus-within:transform focus-within:scale-[1.01] transition-transform">
                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Patient Complaints</label>
                            <textarea 
                                name="patientComplaint" 
                                value={formData.patientComplaint}
                                onChange={handleChange}
                                placeholder="Main health concerns..."
                                className="w-full h-24 p-4 rounded-2xl bg-white border border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all text-sm font-medium resize-none shadow-sm"
                            />
                        </div>
                        <div className="space-y-1.5 focus-within:transform focus-within:scale-[1.01] transition-transform">
                            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Advice given</label>
                            <textarea 
                                name="advice" 
                                value={formData.advice}
                                onChange={handleChange}
                                placeholder="Clinical advice or plan highlights..."
                                className="w-full h-24 p-4 rounded-2xl bg-white border border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all text-sm font-medium resize-none shadow-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Patient History */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-4 w-1 bg-teal-500 rounded-full" />
                        <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">Patient History</h3>
                    </div>
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
                            placeholder="Add patient history"
                            className="flex-1 p-3 rounded-xl bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20"
                        />
                        <button
                            type="button"
                            onClick={handleAddPatientHistory}
                            className="bg-teal-50 text-teal-600 p-3 rounded-xl hover:bg-teal-100 transition-colors disabled:opacity-50"
                            disabled={!customHistory.trim()}
                            title="Add patient history"
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
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                                    formData.patientHistory.some(ph => ph.name === option.name)
                                    ? 'bg-teal-600 text-white border-teal-600 shadow-lg shadow-teal-100 scale-105'
                                    : 'bg-white text-slate-500 border-slate-100 hover:border-teal-200 hover:bg-teal-50/30'
                                }`}
                            >
                                {option.name}
                            </button>
                        ))}
                    </div>
                        {patientHistoryOptions.length === 0 && (
                            <p className="text-xs text-slate-400">No patient history added for this user yet.</p>
                        )}

                        {/* Selected histories with duration inputs */}
                        {formData.patientHistory && formData.patientHistory.length > 0 && (
                            <div className="mt-3 space-y-2">
                                {formData.patientHistory.map((h, idx) => (
                                    <div key={h.name || idx} className="flex items-center gap-2">
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-slate-700">{h.name}</div>
                                        </div>
                                        <input
                                            value={h.duration}
                                            onChange={(e) => {
                                                const newPH = [...formData.patientHistory];
                                                newPH[idx] = { ...newPH[idx], duration: e.target.value };
                                                setFormData(prev => ({ ...prev, patientHistory: newPH }));
                                            }}
                                            placeholder="Duration (e.g. 2 years)"
                                            className="w-40 p-2 rounded-xl bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20"
                                        />
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                // if this history is persisted (has _id), delete it from server
                                                if (h._id) {
                                                    try {
                                                        await deletePatientHistoryApi(h._id);
                                                        // remove from options and formData
                                                        setPatientHistoryOptions(prev => prev.filter(p => p._id !== h._id));
                                                        setFormData(prev => ({ ...prev, patientHistory: prev.patientHistory.filter(ph => ph._id !== h._id) }));
                                                        return;
                                                    } catch (err) {
                                                        console.error('Failed to delete patient history', err);
                                                        toast.error(err.response?.data?.message || 'Failed to delete history');
                                                    }
                                                }
                                                // fallback: just toggle
                                                handleHistoryToggle(h.name);
                                            }}
                                            className="text-red-400 p-2 hover:text-red-600 transition-colors"
                                            title="Remove"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                </div>

                {/* Medical Details */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-1 bg-teal-500 rounded-full" />
                            <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">Clinical Details</h3>
                        </div>
                        <button
                            type="button"
                            onClick={addBimaiRow}
                            className="bg-teal-50 text-teal-600 p-2 rounded-xl hover:bg-teal-100 transition-colors"
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                    <div className="space-y-3">
                        {formData.bimaiDiseases.map((item, idx) => (
                            <div key={idx} className="flex gap-2 items-center group">
                                <input
                                    value={item.disease}
                                    onChange={(e) => handleBimaiChange(idx, "disease", e.target.value)}
                                    placeholder="Disease"
                                    className="flex-1 p-3 rounded-xl bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 outline-none transition-all"
                                />
                                <div className="flex-1 relative">
                                    <input
                                        value={item.medication}
                                        onChange={(e) => handleMedicineInput(idx, e.target.value)}
                                        onFocus={() => setActiveMedIdx(idx)}
                                        onBlur={() => setTimeout(() => { setActiveMedIdx(null); setMedicineSuggestions([]); }, 200)}
                                        autoComplete="off"
                                        placeholder="Current Medicine"
                                        className="w-full p-3 rounded-xl bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 outline-none transition-all"
                                    />
                                    {activeMedIdx === idx && medicineSuggestions.length > 0 && (
                                        <div className="absolute z-20 w-full bg-white border border-slate-200 mt-1 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                                            {medicineSuggestions.map((med) => (
                                                <div
                                                    key={med._id || med.name}
                                                    className="p-3 hover:bg-teal-50 cursor-pointer text-sm text-slate-700 font-medium border-b border-slate-50 last:border-0"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => {
                                                        handleBimaiChange(idx, "medication", med.name);
                                                        setMedicineSuggestions([]);
                                                        setActiveMedIdx(null);
                                                    }}
                                                >
                                                    {med.name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeBimaiRow(idx)}
                                    className="text-red-400 p-2 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Addiction */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Addiction / Habits</label>
                        <input
                            name="addiction" value={formData.addiction} onChange={handleChange}
                            className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all text-sm"
                        />
                    </div>
                </div>

                {/* Past Surgery */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Past Surgery</h3>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="checkbox" name="pastSurgery.hasSurgery" 
                                checked={formData.pastSurgery.hasSurgery} onChange={handleChange}
                                className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                            />
                            <span className="text-[10px] font-bold text-slate-500 uppercase">YES</span>
                        </label>
                    </div>
                    {formData.pastSurgery.hasSurgery && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}>
                            <input 
                                name="pastSurgery.duration" value={formData.pastSurgery.duration} onChange={handleChange}
                                placeholder="When did it happen? (e.g. 2 years ago)"
                                className="w-full p-3 rounded-xl bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20 outline-none"
                            />
                        </motion.div>
                    )}
                </div>

                {/* Weight Loss History */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-1 bg-teal-500 rounded-full" />
                            <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">Weight Loss History</h3>
                        </div>
                        <button 
                            type="button" onClick={addWeightLossRow}
                            className="bg-teal-50 text-teal-600 p-2 rounded-xl hover:bg-teal-100 transition-colors"
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                    <div className="space-y-3">
                        {formData.weightLossHistory.map((item, idx) => (
                            <div key={idx} className="flex gap-2 items-center group">
                                <input 
                                    value={item.title} onChange={(e) => handleWeightLossChange(idx, "title", e.target.value)}
                                    placeholder="Program title"
                                    className="flex-1 p-3 rounded-xl bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20"
                                />
                                <input 
                                    value={item.duration} onChange={(e) => handleWeightLossChange(idx, "duration", e.target.value)}
                                    placeholder="Duration"
                                    className="w-32 p-3 rounded-xl bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20"
                                />
                                <button 
                                    type="button" onClick={() => removeWeightLossRow(idx)}
                                    className="text-red-400 p-2 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
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
        </div>
    );
};

export default ConsultationForm;
