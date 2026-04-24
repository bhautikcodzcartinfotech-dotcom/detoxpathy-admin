"use client";
import { useState, useRef, useEffect } from "react";
import ThemedCheckbox from "@/components/ThemedCheckbox";

const Dropdown = ({
  label,
  options,
  value,
  onChange,
  disabled = false,
  showCheckbox = false,
  showSearch = false,
  disabledValues = [], // Array of values that should be disabled
  labelClassName = "text-gray-700",
  placeholder = "",
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset search when closed
  useEffect(() => {
    if (!open) setSearchTerm("");
  }, [open]);

  const selected = options.find((opt) => opt.value === value);

  const filteredOptions = showSearch
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {label && (
        <label className={`block mb-1 font-semibold ${labelClassName}`}>
          {label}
        </label>
      )}
      <div
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
        className={`w-full border border-yellow-400 rounded-xl p-3 flex justify-between items-center bg-white focus-within:ring-2 focus-within:ring-yellow-400 transition ${
          disabled
            ? "opacity-60 cursor-not-allowed bg-gray-100"
            : "cursor-pointer"
        }`}
      >
        <span className={`truncate mr-2 ${value ? "text-gray-900" : "text-gray-400"}`}>
          {selected ? selected.label : (placeholder || `Select ${label || "Option"}`)}
        </span>
        <svg
          className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : "rotate-0"
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>

      {open && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-yellow-400 rounded-xl shadow-lg overflow-hidden animate-fade-in flex flex-col max-h-64">
          {showSearch && (
            <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 text-sm border border-yellow-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-gray-50"
                  autoFocus
                />
                <svg
                  className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
          )}
          <ul className="overflow-y-auto flex-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const isOptionDisabled = disabledValues.includes(opt.value);
                return (
                  <li
                    key={idx}
                    onClick={() => {
                      if (isOptionDisabled) return;
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`p-3 transition flex items-center justify-between ${
                      isOptionDisabled
                        ? "opacity-50 cursor-not-allowed bg-gray-50"
                        : "hover:bg-yellow-100 cursor-pointer"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      {showCheckbox && (
                        <ThemedCheckbox
                          checked={value === opt.value}
                          onChange={() => {}}
                          ariaLabel={`${label || "Option"} ${opt.label}`}
                          disabled={isOptionDisabled}
                        />
                      )}
                      <span className={`text-sm ${isOptionDisabled ? "text-gray-400" : "text-gray-700"}`}>
                        {opt.label}
                      </span>
                    </span>
                    {!showCheckbox && value === opt.value && (
                      <svg
                        className="w-4 h-4 text-yellow-500 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </li>
                );
              })
            ) : (
              <li className="p-4 text-center text-gray-500 text-sm italic">
                No results found
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Dropdown;
