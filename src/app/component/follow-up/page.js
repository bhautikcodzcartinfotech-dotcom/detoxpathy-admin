"use client";

import React, { useEffect, useMemo, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { Header, Button } from "@/utils/header";
import { getAppointmentFollowUps } from "@/Api/AllApi";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import ConsultationForm from "../appointment/ConsultationForm";

const getTodayDateString = () => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
};

const normalizePhone = (prefix, number) => {
    if (!prefix && !number) return "-";
    return `${prefix || ""}${number || ""}`.trim();
};

const FollowUpPage = () => {
    const [isConsultationOpen, setIsConsultationOpen] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);

    const handleOpenConsultation = (patient) => {
        setSelectedPatient(patient);
        setIsConsultationOpen(true);
    };

    const today = useMemo(() => getTodayDateString(), []);
    const [date, setDate] = useState(today);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState([]);
    const [success, setSuccess] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const fetchFollowUps = async (selectedDate) => {
        try {
            setLoading(true);
            setError("");
            const response = await getAppointmentFollowUps(selectedDate);
            setSuccess(Boolean(response.success));
            setMessage(response.message || "");
            setData(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            const errMsg = err?.response?.data?.message || err?.message || "Failed to load follow-ups";
            setError(errMsg);
            toast.error(errMsg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFollowUps(date);
    }, [date]);

    const handleDateChange = (event) => {
        setDate(event.target.value);
    };

    return (
        <RoleGuard allow={["Admin", "subadmin"]} permission="show follow-up page">
            <div className="w-full h-full px-4 sm:px-6 lg:px-10 xl:px-18">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <Header size="3xl">Follow Up</Header>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-3 py-2 shadow-sm">
                            <label htmlFor="follow-up-date" className="text-sm font-semibold text-gray-700">
                                Date
                            </label>
                            <input
                                id="follow-up-date"
                                type="date"
                                value={date}
                                min={today}
                                onChange={handleDateChange}
                                className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#134D41]"
                            />
                        </div>
                        <Button onClick={() => fetchFollowUps(date)} disabled={loading}>
                            {loading ? "Loading..." : "Refresh"}
                        </Button>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div className="hidden lg:block overflow-x-auto bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-teal-900/5">
                        <table className="min-w-full">
                            <thead>
                                <tr className="border-b border-gray-50 bg-gray-50/30">
                                    <th className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">#</th>
                                    <th className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Name</th>
                                    <th className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Mobile</th>
                                    <th className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Branch</th>
                                    <th className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Day</th>
                                    <th className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Has Appointment</th>
                                    <th className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Appointment</th>
                                    <th className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Doctor</th>
                                    <th className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 bg-white">
                                {data.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="px-6 py-16 text-center text-sm text-gray-500">
                                            {loading ? "Fetching follow-up records..." : "No follow-up records found for this date."}
                                        </td>
                                    </tr>
                                ) : (
                                    data.map((item, index) => {
                                        const appointment = item.appointment || null;
                                        const doctor = appointment?.doctor || {};
                                        return (
                                            <tr key={item._id + index} className="group hover:bg-gray-50/80 transition-all duration-200">
                                                <td className="px-6 py-6 whitespace-nowrap text-[13px] font-black text-teal-600">{index + 1}</td>
                                                <td className="px-6 py-6 whitespace-nowrap text-[14px] font-bold text-gray-800">
                                                    <div className="flex flex-col">
                                                        <span>{`${item.name || ""}${item.surname ? ` ${item.surname}` : ""}`.trim() || "-"}</span>
                                                        {item.dayProgress !== undefined && item.dayProgress !== null && (
                                                            <div className="flex items-center gap-1.5 mt-1">
                                                                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[50px]">
                                                                    <div
                                                                        className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full transition-all duration-500"
                                                                        style={{
                                                                            width: `${Math.max(0, Math.min(Number(item.dayProgress) || 0, 100))}%`,
                                                                        }}
                                                                    />
                                                                </div>
                                                                <span className="text-[8px] font-bold text-teal-600">
                                                                    {Math.round(Number(item.dayProgress) || 0)}%
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6 whitespace-nowrap text-[13px] font-black text-gray-700">{normalizePhone(item.mobilePrefix, item.mobileNumber)}</td>
                                                <td className="px-6 py-6 whitespace-nowrap text-[13px] font-black text-teal-700 uppercase tracking-tighter">{item.branch?.name || "-"}</td>
                                                <td className="px-6 py-6 whitespace-nowrap text-[13px] font-semibold text-gray-700">{item.planDay ?? "-"}</td>
                                                <td className="px-6 py-6 whitespace-nowrap text-[13px] font-semibold text-gray-700">{item.hasAppointment ? "Yes" : "No"}</td>
                                                <td className="px-6 py-6 whitespace-nowrap text-[13px] text-gray-700">
                                                    {appointment ? (
                                                        <div className="flex flex-col gap-1">
                                                            <span className="font-semibold">{appointment.date || "-"}</span>
                                                            <span className="text-xs text-gray-500">{`${appointment.startTime || ""}${appointment.endTime ? ` → ${appointment.endTime}` : ""}`}</span>
                                                        </div>
                                                    ) : (
                                                        "-"
                                                    )}
                                                </td>
                                                <td className="px-6 py-6 whitespace-nowrap text-[13px] font-semibold text-gray-700">{appointment ? `${doctor.name || ""}${doctor.surname ? ` ${doctor.surname}` : ""}`.trim() || "-" : "-"}</td>
                                                <td className="px-6 py-6 whitespace-nowrap text-[13px] text-gray-700">
                                                    <button
                                                        onClick={() => handleOpenConsultation(item)}
                                                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
                                                    >
                                                        Consultation
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="lg:hidden grid grid-cols-1 gap-4">
                        {data.length === 0 ? (
                            <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-xl shadow-teal-900/5">
                                <p className="text-sm text-gray-500 text-center">
                                    {loading ? "Fetching follow-up records..." : "No follow-up records found for this date."}
                                </p>
                            </div>
                        ) : (
                            data.map((item, index) => {
                                const appointment = item.appointment || null;
                                const doctor = appointment?.doctor || {};
                                return (
                                    <div key={item._id + index} className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-xl shadow-teal-900/5">
                                        <div className="flex items-center justify-between gap-4 mb-4">
                                            <div>
                                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Patient</p>
                                                <p className="mt-2 text-lg font-bold text-gray-900">{`${item.name || ""}${item.surname ? ` ${item.surname}` : ""}`.trim() || "-"}</p>
                                                {item.dayProgress !== undefined && item.dayProgress !== null && (
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[50px]">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full transition-all duration-500"
                                                                style={{
                                                                    width: `${Math.max(
                                                                        0,
                                                                        Math.min(Number(item.dayProgress) || 0, 100)
                                                                    )}%`,
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="text-[8px] font-bold text-teal-600">
                                                            {Math.round(Number(item.dayProgress) || 0)}%
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">#{index + 1}</p>
                                                <p className="mt-2 text-sm font-bold text-teal-600">{item.branch?.name || "-"}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
                                            <div>
                                                <p className="font-black uppercase tracking-[0.2em] text-gray-400">Mobile</p>
                                                <p className="mt-2">{normalizePhone(item.mobilePrefix, item.mobileNumber)}</p>
                                            </div>
                                            <div>
                                                <p className="font-black uppercase tracking-[0.2em] text-gray-400">Day</p>
                                                <p className="mt-2">{item.planDay ?? "-"}</p>
                                            </div>
                                            <div>
                                                <p className="font-black uppercase tracking-[0.2em] text-gray-400">Appointment</p>
                                                <p className="mt-2">{appointment ? `${appointment.date || "-"} · ${appointment.startTime || ""}${appointment.endTime ? ` → ${appointment.endTime}` : ""}` : "-"}</p>
                                            </div>
                                            <div>
                                                <p className="font-black uppercase tracking-[0.2em] text-gray-400">Doctor</p>
                                                <p className="mt-2">{appointment ? `${doctor.name || ""}${doctor.surname ? ` ${doctor.surname}` : ""}`.trim() || "-" : "-"}</p>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="font-black uppercase tracking-[0.2em] text-gray-400">Has Appointment</p>
                                                <p className="mt-2 font-semibold text-gray-700">{item.hasAppointment ? "Yes" : "No"}</p>
                                            </div>
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                            <button
                                                onClick={() => handleOpenConsultation(item)}
                                                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 text-center"
                                            >
                                                Consultation
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {isConsultationOpen && selectedPatient && (
                    <>
                        <motion.div
                            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsConsultationOpen(false)}
                        />
                        <motion.div
                            className="fixed right-0 top-0 h-full w-full lg:max-w-4xl bg-white shadow-2xl z-50 overflow-y-auto"
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        >
                            <ConsultationForm
                                patient={selectedPatient}
                                appointment={selectedPatient.appointment}
                                onClose={() => setIsConsultationOpen(false)}
                                onSaveSuccess={() => {
                                    setIsConsultationOpen(false);
                                    fetchFollowUps(date);
                                }}
                            />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </RoleGuard>
    );
};

export default FollowUpPage;
