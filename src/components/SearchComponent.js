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
  // Gender and City filters
  selectedGender = "",
  onGenderChange = () => {},
  selectedCity = "",
  onCityChange = () => {},
  selectedState = "",
  onStateChange = () => {},
  selectedCountry = "",
  onCountryChange = () => {},

  // Referrer filter
  referrerOptions = [],
  selectedReferrer = "",
  onReferrerChange = () => {},
  // Age range filter
  selectedAgeRange = "",
  onAgeRangeChange = () => {},
  skipBodyMeasurement = "",
  onSkipBodyMeasurementChange = () => {},


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
              className="w-full pl-10 pr-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-[#134D41]/5 focus:border-[#134D41] transition-all duration-300 shadow-sm bg-gray-50 focus:bg-white"
            />
            {loading && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <div className="w-4 h-4 border-2 border-[#134D41] border-t-transparent rounded-full animate-spin"></div>
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

          {/* Gender Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Filter by Gender
            </label>
            <Dropdown
              options={[
                { label: "All Genders", value: "" },
                { label: "Male", value: "Male" },
                { label: "Female", value: "Female" },
                { label: "Other", value: "Other" },
              ]}
              value={selectedGender}
              onChange={onGenderChange}
            />
          </div>

          {/* City Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Filter by City
            </label>
            <input
              type="text"
              value={selectedCity}
              onChange={(e) => onCityChange(e.target.value)}
              placeholder="Enter city..."
              className="w-full border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-4 focus:ring-[#134D41]/5 focus:border-[#134D41] transition text-sm shadow-sm bg-gray-50 focus:bg-white"
            />
          </div>

          {/* State Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Filter by State
            </label>
            <input
              type="text"
              value={selectedState}
              onChange={(e) => onStateChange(e.target.value)}
              placeholder="Enter state..."
              className="w-full border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-4 focus:ring-[#134D41]/5 focus:border-[#134D41] transition text-sm shadow-sm bg-gray-50 focus:bg-white"
            />
          </div>

          {/* Country Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Filter by Country
            </label>
            <input
              type="text"
              value={selectedCountry}
              onChange={(e) => onCountryChange(e.target.value)}
              placeholder="Enter country..."
              className="w-full border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-4 focus:ring-[#134D41]/5 focus:border-[#134D41] transition text-sm shadow-sm bg-gray-50 focus:bg-white"
            />
          </div>


          {/* Referrer Filter */}
          {referrerOptions.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Filter by Referrer
              </label>
              <Dropdown
                options={[{ label: "All Referrers", value: "" }, ...referrerOptions]}
                value={selectedReferrer}
                onChange={onReferrerChange}
                showSearch={true}
                placeholder="Search referrer..."
              />
            </div>
          )}

          {/* Age Range Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Age Range
            </label>
            <Dropdown
              options={[
                { label: "All Ages", value: "" },
                { label: "0 - 18", value: "0-18" },
                { label: "18 - 30", value: "18-30" },
                { label: "30 - 50", value: "30-50" },
                { label: "50+", value: "50+" },
              ]}
              value={selectedAgeRange}
              onChange={onAgeRangeChange}
              placeholder="Select age range"
            />
          </div>

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
                  className="flex-1 border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-4 focus:ring-[#134D41]/5 focus:border-[#134D41] transition text-sm shadow-sm bg-gray-50 focus:bg-white"
                />
                {selectedDate && (
                  <button
                    onClick={() => onDateChange("")}
                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-semibold text-gray-700 transition whitespace-nowrap"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Skip Body Measurement Dropdown */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Body Measurement
            </label>
            <Dropdown
              options={[
                { label: "All Users", value: "" },
                { label: "Skip Body Measurement", value: "skip" },
                { label: "Provided", value: "provided" },
              ]}
              value={skipBodyMeasurement}
              onChange={onSkipBodyMeasurementChange}
              placeholder="Filter by measurement"
            />
          </div>


        </div>
      )}

      {/* Search Results Indicator */}
      {searchTerm && (
        <div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#134D41] rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-700">
              <span className="font-medium">Searching for:</span>{" "}
              <span className="px-2 py-1 bg-white text-[#134D41] border border-emerald-100 rounded-md font-bold">
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
