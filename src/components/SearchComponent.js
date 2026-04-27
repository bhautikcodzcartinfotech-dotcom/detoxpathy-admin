"use client";
import React, { useState, useEffect } from "react";
import Dropdown from "@/utils/dropdown";

const SearchComponent = ({
  onSearch,
  onFilterChange,
  loading = false,
  compact = false,
  className = "",
  searchPlaceholder = "Search...",
  filterOptions = [],
  filterValue = "",
  filterLabel = "Filter",
  // Additional filters
  planOptions = [],
  selectedPlan = "",
  onPlanChange = () => {},
  selectedDate = "",
  onDateChange = null,
  planHistoryFilter = null,
  onPlanHistoryFilterChange = () => {},
  // Language filter
  languageOptions = [],
  selectedLanguage = "",
  onLanguageChange = () => {},
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  // Auto search as user types with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onSearch(searchTerm.trim());
    }, 300); // 300ms delay for better performance

    return () => clearTimeout(timeoutId);
  }, [searchTerm, onSearch]);

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
  };

  return (
    <div
      className={`bg-white rounded-2xl shadow-lg border border-gray-200 ${
        compact ? "p-2 mb-4" : "p-6 mb-6"
      } ${className}`}
    >
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Bar */}
        <div className="flex-1">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Search
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
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
            <input
              type="text"
              value={searchTerm}
              onChange={handleInputChange}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-200 focus:border-yellow-500 transition-all duration-300 shadow-sm bg-gray-50 focus:bg-white"
            />
            {loading && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </div>

        {/* Filter Dropdown */}
        {filterOptions.length > 0 && (
          <div className="sm:w-48">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {filterLabel}
            </label>
            <Dropdown
              options={filterOptions}
              value={filterValue}
              onChange={onFilterChange}
              placeholder={`Select ${filterLabel.toLowerCase()}`}
            />
          </div>
        )}
      </div>

      {/* Additional Filters Grid */}
      {(planOptions.length > 0 || (planHistoryFilter !== null && planHistoryFilter !== undefined) || languageOptions.length > 0 || onDateChange) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200">
          {/* Plan Filter */}
          {planOptions.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Filter by Plan
              </label>
              <Dropdown
                options={[{ label: "All Plans", value: "" }, ...planOptions]}
                value={selectedPlan}
                onChange={onPlanChange}
              />
            </div>
          )}

          {/* Plan History Filter */}
          {planHistoryFilter !== null && planHistoryFilter !== undefined && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Plan History
              </label>
              <Dropdown
                options={[
                  { label: "All Users", value: "" },
                  { label: "Only One Plan", value: "one" },
                  { label: "Upgraded Plan", value: "upgraded" },
                ]}
                value={planHistoryFilter}
                onChange={onPlanHistoryFilterChange}
              />
            </div>
          )}

          {/* Language Filter */}
          {languageOptions.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Filter by Language
              </label>
              <Dropdown
                options={[{ label: "All Languages", value: "" }, ...languageOptions]}
                value={selectedLanguage}
                onChange={onLanguageChange}
              />
            </div>
          )}

          {/* Date Filter */}
          {onDateChange && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Filter by Date
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => onDateChange(e.target.value)}
                  className="flex-1 border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition text-sm"
                />
                {selectedDate && (
                  <button
                    onClick={() => onDateChange("")}
                    className="px-4 py-3 bg-gray-200 hover:bg-gray-300 rounded-xl text-sm font-semibold text-gray-700 transition whitespace-nowrap"
                  >
                    Clear Date
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search Results Indicator */}
      {searchTerm && (
        <div className="mt-4 p-3 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border border-yellow-200">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-700">
              <span className="font-medium">Searching for:</span>{" "}
              <span className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded-md font-medium">
                "{searchTerm}"
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchComponent;
