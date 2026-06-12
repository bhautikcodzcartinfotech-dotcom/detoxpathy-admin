"use client";
import React from "react";

const ConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "warning", // warning, danger, success
}) => {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case "danger":
        return {
          icon: (
            <svg
              className="w-12 h-12 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          ),
          confirmButton: "bg-amber-500 hover:bg-amber-600 text-white",
          iconBg: "bg-amber-100",
        };
      case "success":
        return {
          icon: (
            <svg
              className="w-12 h-12 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ),
          confirmButton: "bg-yellow-500 hover:bg-yellow-600 text-white",
          iconBg: "bg-yellow-100",
        };
      default: // warning
        return {
          icon: (
            <svg
              className="w-12 h-12 text-yellow-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          ),
          confirmButton: "bg-yellow-500 hover:bg-yellow-600 text-white",
          iconBg: "bg-yellow-100",
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-white/20 animate-in fade-in duration-150">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-150 scale-100 border border-white/20">
        <div className="p-8">
          {/* Icon */}
          <div
            className={`w-16 h-16 ${styles.iconBg} rounded-full flex items-center justify-center mx-auto mb-6`}
          >
            {styles.icon}
          </div>

          {/* Title */}
          <h3 className="text-2xl font-bold text-gray-800 text-center mb-4">
            {title}
          </h3>

          {/* Message */}
          <p className="text-gray-600 text-center mb-8 leading-relaxed">
            {message}
          </p>

          {/* Buttons */}
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all duration-200 transform hover:scale-105"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 px-6 py-3 ${styles.confirmButton} font-semibold rounded-xl transition-all duration-200 transform hover:scale-105`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;
