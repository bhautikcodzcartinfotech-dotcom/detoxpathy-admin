"use client";
import React, { useState } from "react";
import { getExpiryBatches } from "@/utils/stockDisplay";
import ExpiryToggleButton from "./ExpiryToggleButton";
import ExpiryBatchesPanel from "./ExpiryBatchesPanel";

const ExpiryBatchesCell = ({ stock }) => {
  const [expanded, setExpanded] = useState(false);
  const batches = getExpiryBatches(stock);

  if (batches.length === 0) {
    return <span className="text-gray-400 text-sm">-</span>;
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <ExpiryToggleButton
        expanded={expanded}
        count={batches.length}
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(prev => !prev);
        }}
      />
      {expanded && (
        <div
          className="w-full min-w-[260px] text-left animate-in fade-in slide-in-from-top-1 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <ExpiryBatchesPanel batches={batches} />
        </div>
      )}
    </div>
  );
};

export default ExpiryBatchesCell;
