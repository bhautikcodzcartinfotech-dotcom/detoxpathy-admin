"use client";
import React from "react";

export default function TimeButton({
  loading = false,
  onClick = () => { },
  disabled = false,
  className = "",
  children,
  type = "submit"
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={loading}
      className={`inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold tracking-wide shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${loading ? "bg-[#134D41] opacity-90" : "bg-[#134D41] hover:bg-[#0d362e]"
        } text-white ${className}`}
    >
      {loading ? (
        <>
          <svg
            className="h-5 w-5 animate-spin text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            ></path>
          </svg>
          <span>Processing...</span>
        </>
      ) : (
        <span>{children}</span>
      )}
    </button>
  );
}