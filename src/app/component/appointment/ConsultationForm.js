"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Plus, Trash2, Save, Loader2, ClipboardCheck } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import { API_HOST } from "@/Api/AllApi";

const ConsultationForm = ({ appointment, onClose, onSaveSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        appointmentId: appointment?._id,
        userId: appointment?.userId?._id,
        isFirstConsultation: false,
        patientComplaint: "",
        advice: "",
        patientHistory: [],
        currentMedicine: "",
        addiction: "",
        stress: "",
        other: "",
        pastSurgery: {
            hasSurgery: false,
            duration: ""
        },
        weightLossHistory: [
            { title: "", duration: "" }
        ]
    });
    const [customHistory, setCustomHistory] = useState("");

    const histsoryOptions = [
        "Diabetes", "Hypertension", "Thyroid", "PCOS/PCOD", 
        "Cholesterol", "Acidity", "Constipation", "Migraine", 
        "Back Pain", "Joint Pain", "Hair Fall", "Skin Issues"
    ];

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

    const handleHistoryToggle = (option) => {
        setFormData(prev => ({
            ...prev,
            patientHistory: prev.patientHistory.includes(option)
                ? prev.patientHistory.filter(h => h !== option)
                : [...prev.patientHistory, option]
        }));
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const response = await axios.post(`${API_HOST}/api/admin/consultation/create`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                toast.success("Consultation saved successfully!");
                if (onSaveSuccess) onSaveSuccess(response.data.data);
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to save consultation");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white sticky top-0 z-10">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
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

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar pb-24">
                
                {/* Basic Info */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-4 w-1 bg-teal-500 rounded-full" />
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Basic Assessment</h3>
                    </div>
                    <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:bg-white transition-all group">
                        <input 
                            type="checkbox" 
                            name="isFirstConsultation" 
                            checked={formData.isFirstConsultation}
                            onChange={handleChange}
                            className="w-5 h-5 rounded-lg border-slate-300 text-teal-600 focus:ring-teal-500"
                        />
                        <span className="text-xs font-semibold text-slate-700 tracking-wide uppercase">First Time Consultation?</span>
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5 focus-within:transform focus-within:scale-[1.01] transition-transform">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Patient Complaints</label>
                            <textarea 
                                name="patientComplaint" 
                                value={formData.patientComplaint}
                                onChange={handleChange}
                                placeholder="Main health concerns..."
                                className="w-full h-24 p-4 rounded-2xl bg-white border border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all text-sm font-medium resize-none shadow-sm"
                            />
                        </div>
                        <div className="space-y-1.5 focus-within:transform focus-within:scale-[1.01] transition-transform">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Advice given</label>
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
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Patient History</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {histsoryOptions.map(option => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => handleHistoryToggle(option)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                                    formData.patientHistory.includes(option)
                                    ? 'bg-teal-600 text-white border-teal-600 shadow-lg shadow-teal-100 scale-105'
                                    : 'bg-white text-slate-500 border-slate-100 hover:border-teal-200 hover:bg-teal-50/30'
                                }`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Medical Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-4 w-1 bg-teal-500 rounded-full" />
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Clinical Details</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Current Medicines</label>
                                <input 
                                    name="currentMedicine" value={formData.currentMedicine} onChange={handleChange}
                                    className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Addiction / Habits</label>
                                <input 
                                    name="addiction" value={formData.addiction} onChange={handleChange}
                                    className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-4 w-1 bg-teal-500 rounded-full" />
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">State of Mind</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Stress Levels</label>
                                <input 
                                    name="stress" value={formData.stress} onChange={handleChange}
                                    className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Other Remarks</label>
                                <input 
                                    name="other" value={formData.other} onChange={handleChange}
                                    className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all text-sm"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Past Surgery */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Past Surgery Details</h3>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="checkbox" name="pastSurgery.hasSurgery" 
                                checked={formData.pastSurgery.hasSurgery} onChange={handleChange}
                                className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                            />
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Had Surgery?</span>
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
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Weight Loss History</h3>
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

            {/* Footer */}
            <div className="p-6 bg-white border-t border-slate-100 flex items-center justify-end gap-3 sticky bottom-0">
                <button 
                    type="button" onClick={onClose}
                    className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                >
                    Discard
                </button>
                <button 
                    onClick={handleSubmit} 
                    disabled={loading}
                    className="bg-slate-900 border border-slate-800 px-8 py-3 rounded-2xl text-[11px] font-bold text-white hover:bg-black transition-all shadow-xl shadow-slate-200 flex items-center gap-2 uppercase tracking-[0.1em] disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    {loading ? "Saving..." : "Save Consultation"}
                </button>
            </div>
        </div>
    );
};

export default ConsultationForm;
