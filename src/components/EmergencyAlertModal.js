"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, X, ExternalLink, Siren } from "lucide-react";

const EmergencyAlertModal = ({ isOpen, onClose, data, onViewUser }) => {
  if (!isOpen || !data) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop with intense pulse */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-red-900/60 backdrop-blur-md"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          className="relative bg-white rounded-3xl shadow-[0_0_80px_rgba(220,38,38,0.6)] max-w-lg w-full overflow-hidden border-4 border-red-600"
        >
          {/* Top Danger Bar */}
          <div className="bg-red-600 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ 
                  backgroundColor: ["#ffffff", "#ef4444", "#ffffff"],
                }}
                transition={{ repeat: Infinity, duration: 0.5 }}
                className="p-1.5 rounded-full"
              >
                <AlertCircle className="w-6 h-6 text-red-600" />
              </motion.div>
              <h2 className="text-white font-black text-xl tracking-wider uppercase">
                Emergency Alert
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-8">
            <div className="flex flex-col items-center text-center">
              {/* Police Siren Animation */}
              <div className="relative mb-8">
                {/* Rotating Light Beam */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  className="absolute -inset-8 bg-gradient-to-r from-red-600/40 via-transparent to-red-600/40 rounded-full blur-xl"
                />
                
                {/* Pulsing Circles */}
                <motion.div
                  animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="absolute inset-0 bg-red-500 rounded-full"
                />
                
                <div className="relative bg-red-100 p-8 rounded-full border-4 border-red-200 shadow-inner">
                  <motion.div
                    animate={{ 
                      rotate: [-10, 10, -10],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ repeat: Infinity, duration: 0.3 }}
                  >
                    <Siren className="w-16 h-16 text-red-600" />
                  </motion.div>
                </div>
              </div>

              {/* Message */}
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Action Required
              </h3>
              <p className="text-lg text-gray-700 leading-relaxed mb-8">
                {data.message}
              </p>

              {/* User Details (if available) */}
              {data.userName && (
                <div className="bg-gray-50 rounded-2xl p-4 w-full mb-8 border border-gray-200">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">
                    User Involved
                  </span>
                  <span className="text-xl font-bold text-red-600">
                    {data.userName}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4 w-full">
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition-all"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => onViewUser(data.userId)}
                  className="flex-1 px-6 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl shadow-lg shadow-red-200 flex items-center justify-center gap-2 group transition-all transform hover:scale-105"
                >
                  <ExternalLink className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  View User Profile
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Alert Stripe */}
          <div className="bg-red-50 h-2 w-full flex">
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
              className="w-1/3 h-full bg-red-600"
            />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default EmergencyAlertModal;
