// components/ui/ActionButton.jsx
"use client";

import { FiEdit, FiTrash2, FiClock, FiInfo, FiPlusCircle, FiEye, FiLogIn, FiCalendar, FiChevronUp, FiChevronDown } from "react-icons/fi";

export const ActionButton = ({ type = "edit", onClick, disabled = false, title = "" }) => {
  const Icon = {
    edit: FiEdit,
    delete: FiTrash2,
    history: FiClock,
    info: FiInfo,
    suggest: FiPlusCircle,
    view: FiEye,
    login: FiLogIn,
    calendar: FiCalendar,
    chevronUp: FiChevronUp,
    chevronDown: FiChevronDown
  }[type] || FiEdit;

  const styles = {
    edit: "bg-amber-50 text-amber-600 hover:bg-[#134D41] hover:text-white shadow-amber-900/5 hover:shadow-teal-900/20",
    delete: "bg-red-50 text-red-600 hover:bg-red-600 hover:text-white shadow-red-900/5 hover:shadow-red-900/20",
    history: "bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white shadow-blue-900/5 hover:shadow-blue-900/20",
    info: "bg-teal-50 text-teal-600 hover:bg-[#134D41] hover:text-white shadow-teal-900/5 hover:shadow-teal-900/20",
    suggest: "bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white shadow-purple-900/5 hover:shadow-purple-900/20",
    view: "bg-gray-50 text-gray-600 hover:bg-gray-900 hover:text-white shadow-gray-900/5 hover:shadow-gray-900/20",
    login: "bg-green-50 text-green-600 hover:bg-green-600 hover:text-white shadow-green-900/5 hover:shadow-green-900/20",
    calendar: "bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white shadow-indigo-900/5 hover:shadow-indigo-900/20",
    chevronUp: "bg-gray-50 text-gray-600 hover:bg-gray-200 shadow-sm",
    chevronDown: "bg-gray-50 text-gray-600 hover:bg-gray-200 shadow-sm"
  }[type] || "bg-gray-50 text-gray-600";

  return (
    <button
      onClick={disabled ? undefined : (e) => {
        e.stopPropagation();
        onClick();
      }}
      title={title}
      className={`
        w-9 h-9 flex items-center justify-center rounded-2xl
        transition-all duration-300 shadow-sm hover:shadow-xl
        transform hover:-translate-y-1 active:translate-y-0
        ${disabled ? "opacity-40 cursor-not-allowed grayscale" : styles}
      `}
    >
      <Icon size={16} strokeWidth={2.5} />
    </button>
  );
};
