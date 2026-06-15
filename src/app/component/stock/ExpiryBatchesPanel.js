"use client";
import React from "react";
import { formatExpiryDate, isExpiryPast } from "@/utils/stockDisplay";

const ExpiryBatchesPanel = ({ title, batches, variant = "default" }) => {
  if (!batches?.length) return null;

  const titleClass = variant === "new"
    ? "text-blue-600"
    : "text-gray-500";

  return (
    <div className="space-y-2">
      {title && (
        <p className={`text-[10px] font-black uppercase tracking-widest ${titleClass}`}>
          {title}
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
        {batches.map((batch, idx) => {
          const expired = isExpiryPast(batch.expiry);
          const cardClass = variant === "new"
            ? "border-blue-100 bg-blue-50/60"
            : expired
              ? "border-red-100 bg-red-50/60"
              : "border-emerald-100 bg-emerald-50/60";

          return (
            <div
              key={`${batch.expiry}-${idx}`}
              className={`rounded-xl border px-3 py-2.5 shadow-sm ${cardClass}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-gray-800">
                  {formatExpiryDate(batch.expiry)}
                </span>
                {expired ? (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-red-600 bg-white/80 px-2 py-0.5 rounded-full">
                    Expired
                  </span>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-white/80 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-gray-700">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {Number(batch.available) || 0} Available
                </span>
                {Number(batch.breakage) > 0 && (
                  <span className="inline-flex items-center gap-1 text-amber-700">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    {batch.breakage} Breakage
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExpiryBatchesPanel;
