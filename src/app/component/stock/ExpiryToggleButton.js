"use client";
import React from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

const ExpiryToggleButton = ({ expanded, count, onClick, className = "" }) => {
  if (!count) {
    return <span className="text-gray-400 text-sm">-</span>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all shadow-sm hover:shadow-md active:scale-95 ${
        expanded
          ? "bg-amber-100 border-amber-300 text-amber-900"
          : "bg-white border-amber-200 text-amber-800 hover:bg-amber-50"
      } ${className}`}
      title={expanded ? "Hide expiry details" : "Show expiry details"}
    >
      {expanded ? (
        <FiChevronUp className="w-4 h-4 shrink-0" />
      ) : (
        <FiChevronDown className="w-4 h-4 shrink-0" />
      )}
      <span>{count} Lot{count !== 1 ? "s" : ""}</span>
    </button>
  );
};

export default ExpiryToggleButton;
