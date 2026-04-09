"use client";
import React, { useEffect, useState } from "react";
import {
  getAllPrograms,
  getSuggestedProgram,
  suggestProgram,
  updateSuggestedProgram,
  deleteSuggestedProgram,
  getAllProducts,
  API_BASE,
} from "@/Api/AllApi";
import TimeButton from "@/utils/timebutton";
import Loader from "@/utils/loader";
import toast from "react-hot-toast";
import ThemedCheckbox from "@/components/ThemedCheckbox";

const ProgramSuggestionForm = ({ user, onCancel, onSave }) => {
  const [programs, setPrograms] = useState([]);
  const [selectedPrograms, setSelectedPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingSuggestion, setExistingSuggestion] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // 1. Get all programs
        const allProgs = await getAllPrograms();
        setPrograms(Array.isArray(allProgs) ? allProgs : []);

        // 2. Get current suggestions for this user
        try {
          const suggestion = await getSuggestedProgram(user._id);
          if (suggestion) {
            setExistingSuggestion(suggestion);
            setSelectedPrograms(suggestion.programs.map((p) => p._id || p));
          }
        } catch (err) {
          // If no suggestion found, it's fine
          setExistingSuggestion(null);
        }
      } catch (err) {
        toast.error("Failed to load program data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user._id]);

  const handleToggle = (programId) => {
    setSelectedPrograms((prev) => {
      if (prev.includes(programId)) {
        return prev.filter((id) => id !== programId);
      } else {
        return [...prev, programId];
      }
    });
  };

  const handleSave = async () => {
    if (selectedPrograms.length === 0 && !existingSuggestion) {
      toast.error("Please select at least one program");
      return;
    }

    try {
      setSaving(true);
      if (existingSuggestion) {
        // Update existing suggestion
        await updateSuggestedProgram(user._id, { programs: selectedPrograms });
        toast.success("Suggestions updated successfully!");
      } else {
        // Create new suggestion
        await suggestProgram({ userId: user._id, programs: selectedPrograms });
        toast.success("Programs suggested successfully!");
      }
      if (onSave) onSave();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save suggestions");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingSuggestion) return;
    if (!window.confirm("Are you sure you want to remove all suggestions?"))
      return;

    try {
      setSaving(true);
      await deleteSuggestedProgram(user._id);
      toast.success("Suggestions removed!");
      if (onSave) onSave();
    } catch (err) {
      toast.error("Failed to delete suggestions");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-64 flex items-center justify-center text-yellow-500"><Loader /></div>;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        <p className="text-sm text-gray-500 mb-4">
          Select health programs to suggest to <strong>{user.name}</strong>.
        </p>

        {programs.length === 0 ? (
          <div className="text-center py-10 text-gray-400 italic">
            No programs available.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {programs.map((program) => {
              return (
                <div
                  key={program._id}
                  onClick={() => handleToggle(program._id)}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-4 ${
                    selectedPrograms.includes(program._id)
                      ? "border-yellow-400 bg-yellow-50"
                      : "border-gray-100 bg-white hover:border-yellow-200"
                  }`}
                >
                  <ThemedCheckbox
                    checked={selectedPrograms.includes(program._id)}
                    onChange={() => handleToggle(program._id)}
                  />
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800">{program.name}</h4>
                    <p className="text-xs text-gray-500 line-clamp-1">
                      {program.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {program.products && program.products.length > 0 ? (
                        program.products.map((p, idx) => (
                          <div key={idx} className="flex items-center gap-1 bg-white p-0.5 rounded border border-gray-100 pr-2 shadow-sm">
                            <div className="w-5 h-5 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                              {p.productId?.images?.[0] ? (
                                <img
                                  src={`${API_BASE}${p.productId.images[0]}`}
                                  alt={p.productId.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[6px] text-gray-400">NA</div>
                              )}
                            </div>
                            <span className="text-[9px] text-gray-600 truncate max-w-[60px]">
                              {p.productId?.name}
                            </span>
                          </div>
                        ))
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                        {program.duration}
                      </span>
                      <span className="text-[10px] bg-green-100 px-2 py-0.5 rounded text-green-700 font-bold">
                        ₹{program.price}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-3 flex-shrink-0">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition"
          >
            Cancel
          </button>
          <TimeButton loading={saving} onClick={handleSave}>
            Save Suggestions
          </TimeButton>
        </div>

        {existingSuggestion && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="text-red-500 text-sm font-semibold hover:underline"
          >
            Remove All Suggestions
          </button>
        )}
      </div>
    </div>
  );
};

export default ProgramSuggestionForm;
