"use client";
import React, { useState } from "react";
import Loader from "@/utils/loader";
import NotFoundCard from "@/components/NotFoundCard";
import { ActionButton } from "@/utils/actionbutton";
import { useAuth } from "@/contexts/AuthContext";

import { API_BASE } from "@/Api/AllApi";

export const toAbsolute = (path = "") => {
  try {
    if (!path) return "";

    // If it's already a full URL, return as is
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }

    const base = API_BASE;
    const cleanPath = path.replace(/^\/?/, "");
    const fullUrl = `${base}/${cleanPath}`;

    console.log("toAbsolute conversion:", { path, cleanPath, fullUrl });
    return fullUrl;
  } catch (error) {
    console.error("toAbsolute error:", error);
    return path;
  }
};

const VideoTable = ({ items, loading, onEdit, onDelete }) => {
  const { role } = useAuth();
  const [expandedCards, setExpandedCards] = useState({});
  const toggleCard = (cardId) => {
    setExpandedCards((prev) => ({
      ...prev,
      [cardId]: !prev[cardId],
    }));
  };

  const handleDeleteClick = (itemId, itemName) => {
    onDelete(itemId);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader />
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="overflow-x-auto shadow-md rounded-2xl border border-gray-200 bg-white">
        <NotFoundCard
          title="No Videos"
          subtitle="Upload a video to get started."
        />
      </div>
    );
  }

  // Helper function to get text in specific language
  const getTextInLanguage = (multiLangObj, language = "english") => {
    if (!multiLangObj) {
      return "";
    }

    // If it's already a string (old format), return it
    if (typeof multiLangObj === "string") {
      return multiLangObj;
    }

    // If it's an object (new multi-language format), get the specific language
    if (typeof multiLangObj === "object") {
      return multiLangObj[language] || multiLangObj.english || "";
    }

    return "";
  };

  return (
    <div className="space-y-6">
      {/* Video Cards - Each video shows all 3 languages */}
      {items.length > 0 ? (
        items.map((video) => (
          <div
            key={video._id}
            className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300"
          >
            {/* Video Header */}
            <div className="bg-gradient-to-r from-yellow-400 to-amber-300 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-yellow-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">
                      {getTextInLanguage(
                        video.titleMultiLang || video.title,
                        "english"
                      ) || "Video Details"}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>
                        Type:{" "}
                        {{
                          1: "Day wise",
                          2: "Session Categories",
                          3: "Testimonial",
                          4: "Categorywise Testimonial",
                          5: "Resume Plan",
                          6: "Detox Session",
                          7: "Free Video",
                          8: "Instruction",
                          9: "Hold Video",
                          10: "Agora Session",
                        }[video.type] || (video.videoType === 3 ? "Agora Session" : video.type)}
                      </span>
                      {video.videoType === 3 && (
                        <>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700`}>
                            Active
                          </span>
                          {video.agoraChannelName && (
                            <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-semibold">
                              Channel: {video.agoraChannelName}
                            </span>
                          )}
                        </>
                      )}
                      {video.videoType !== 3 && video.type !== 10 && (
                        <>
                          <span>Day: {video.day ?? "N/A"}</span>
                          <span>Duration: {video.videoSec || 0}s</span>
                          <span>Size: {video.videoSize || 0} MB</span>
                        </>
                      )}
                      {video.category && (
                        <span>Category: {video.category.categoryTitle}</span>
                      )}
                      {video.plan && (
                        <span>Plan: {video.plan.name}</span>
                      )}
                      {video.videoType !== 3 && video.type !== 10 && (
                        <span>Required Answers: {video.requiredCorrectAnswer || 0}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {video.videoType === 3 && (
                    <a
                      href={`/video-call?videoId=${video._id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold text-xs uppercase tracking-wider px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm hover:shadow transition-all duration-300 transform hover:-translate-y-0.5"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Join Call
                    </a>
                  )}
                  <ActionButton type="edit" onClick={() => onEdit(video)} />
                  <ActionButton
                    type="delete"
                    onClick={() =>
                      handleDeleteClick(
                        video._id,
                        video.title_english || video.title || "Video"
                      )
                    }
                  />
                  <button
                    onClick={() => toggleCard(video._id)}
                    className={`bg-gradient-to-tr from-gray-100 to-gray-50 hover:from-yellow-50 hover:to-yellow-50 
                             text-yellow-600 rounded-full w-10 h-10 inline-flex items-center justify-center 
                             shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}
                    title={
                      expandedCards[video._id] ? "Hide Details" : "Show Details"
                    }
                  >
                    <svg
                      className={`w-5 h-5 transition-transform duration-300 ${expandedCards[video._id] ? "rotate-180" : ""
                        }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Multi-Language Content - Horizontal Layout */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedCards[video._id]
                ? "max-h-[2000px] opacity-100"
                : "max-h-0 opacity-0"
                }`}
            >
              <div className="p-6 space-y-6">
                {/* English Row */}
                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-4 border border-yellow-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-white">E</span>
                    </div>
                    <h4 className="text-sm font-semibold text-gray-700">
                      English
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Thumbnail */}
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-2">
                        Thumbnail
                      </p>
                      {getTextInLanguage(
                        video.thumbnailMultiLang || video.thumbnail,
                        "english"
                      ) ? (
                        <img
                          src={toAbsolute(
                            getTextInLanguage(
                              video.thumbnailMultiLang || video.thumbnail,
                              "english"
                            )
                          )}
                          alt="English thumbnail"
                          className="w-full h-40 object-cover rounded-xl border border-yellow-200"
                        />
                      ) : (
                        <div className="w-full h-40 bg-gray-200 rounded-xl flex items-center justify-center border border-yellow-200">
                          <span className="text-gray-400 text-xs">
                            No Thumbnail
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Video / Agora Session */}
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-2">
                        {video.videoType === 3 ? "Agora Session" : "Video"}
                      </p>
                      {video.videoType === 3 ? (
                        <div className="flex flex-col justify-center items-center bg-gray-50 p-3 h-auto min-h-40 rounded-xl border border-dashed border-gray-200 text-center gap-2">
                          <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center mb-1">
                            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                          </div>
                          <span className="text-[11px] font-bold text-gray-700 font-sans">Agora Session</span>
                          <span className="text-[9px] text-gray-500 font-sans">Channel: {video.agoraChannelName || "N/A"}</span>
                          <span className="text-[8px] text-gray-400 font-sans break-all max-w-[150px] truncate" title={video.agoraToken}>Token: {video.agoraToken ? `${video.agoraToken.substring(0, 15)}...` : "N/A"}</span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider font-sans bg-emerald-50 text-emerald-600 border border-emerald-100">
                            Active
                          </span>
                        </div>
                      ) : (
                        getTextInLanguage(
                          video.videoMultiLang || video.video,
                          "english"
                        ) ? (
                          <video
                            src={toAbsolute(
                              getTextInLanguage(
                                video.videoMultiLang || video.video,
                                "english"
                              )
                            )}
                            controls
                            controlsList={role === "subadmin" ? "nodownload" : undefined}
                            onContextMenu={role === "subadmin" ? (e) => e.preventDefault() : undefined}
                            className="w-full h-40 rounded-xl border border-yellow-200 object-cover"
                          />
                        ) : (
                          <div className="w-full h-20 bg-gray-200 rounded flex items-center justify-center border border-yellow-200">
                            <span className="text-gray-400 text-xs">
                              No Video
                            </span>
                          </div>
                        )
                      )}
                    </div>

                    {/* Title */}
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-2">
                        Title
                      </p>
                      <p className="text-sm font-semibold text-gray-800 bg-white h-40 text-center p-2 rounded-md border border-yellow-200">
                        {getTextInLanguage(
                          video.titleMultiLang || video.title,
                          "english"
                        )}
                      </p>
                    </div>

                    {/* Description */}
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-2">
                        Description
                      </p>
                      <p className="text-sm text-gray-700 bg-white p-2 h-40 text-center rounded-md border border-amber-200 overflow-y-auto">
                        {getTextInLanguage(
                          video.descriptionMultiLang || video.description,
                          "english"
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Gujarati Row */}
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-white">G</span>
                    </div>
                    <h4 className="text-sm font-semibold text-gray-700">
                      Gujarati
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Thumbnail */}
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-2">
                        Thumbnail
                      </p>
                      {getTextInLanguage(
                        video.thumbnailMultiLang || video.thumbnail,
                        "gujarati"
                      ) ? (
                        <img
                          src={toAbsolute(
                            getTextInLanguage(
                              video.thumbnailMultiLang || video.thumbnail,
                              "gujarati"
                            )
                          )}
                          alt="Gujarati thumbnail"
                          className="w-full h-40 object-cover rounded-xl border border-amber-200"
                        />
                      ) : (
                        <div className="w-full h-20 bg-gray-200 rounded flex items-center justify-center border border-amber-200">
                          <span className="text-gray-400 text-xs">
                            No Image
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Video / Agora Session */}
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-2">
                        {video.videoType === 3 ? "Agora Session" : "Video"}
                      </p>
                      {video.videoType === 3 ? (
                        <div className="flex flex-col justify-center items-center bg-gray-50 p-3 h-auto min-h-40 rounded-xl border border-dashed border-gray-200 text-center gap-2">
                          <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center mb-1">
                            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                          </div>
                          <span className="text-[11px] font-bold text-gray-700 font-sans">Agora Session</span>
                          <span className="text-[9px] text-gray-500 font-sans">Channel: {video.agoraChannelName || "N/A"}</span>
                          <span className="text-[8px] text-gray-400 font-sans break-all max-w-[150px] truncate" title={video.agoraToken}>Token: {video.agoraToken ? `${video.agoraToken.substring(0, 15)}...` : "N/A"}</span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider font-sans bg-emerald-50 text-emerald-600 border border-emerald-100">
                            Active
                          </span>
                        </div>
                      ) : (
                        getTextInLanguage(
                          video.videoMultiLang || video.video,
                          "gujarati"
                        ) ? (
                          <video
                            src={toAbsolute(
                              getTextInLanguage(
                                video.videoMultiLang || video.video,
                                "gujarati"
                              )
                            )}
                            controls
                            controlsList={role === "subadmin" ? "nodownload" : undefined}
                            onContextMenu={role === "subadmin" ? (e) => e.preventDefault() : undefined}
                            className="w-full h-40 rounded-xl border border-amber-200 object-cover"
                          />
                        ) : (
                          <div className="w-full h-20 bg-gray-200 rounded flex items-center justify-center border border-amber-200">
                            <span className="text-gray-400 text-xs">
                              No Video
                            </span>
                          </div>
                        )
                      )}
                    </div>

                    {/* Title */}
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-2">
                        Title
                      </p>
                      <p className="text-sm font-semibold  h-40 text-center text-gray-800 bg-white p-2 rounded-md border border-amber-200">
                        {getTextInLanguage(
                          video.titleMultiLang || video.title,
                          "gujarati"
                        )}
                      </p>
                    </div>

                    {/* Description */}
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-2">
                        Description
                      </p>
                      <p className="text-sm text-gray-700 bg-white p-2  h-40 text-center rounded-md border border-amber-200 overflow-y-auto">
                        {getTextInLanguage(
                          video.descriptionMultiLang || video.description,
                          "gujarati"
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Hindi Row */}
                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-4 border border-yellow-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-yellow-600 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-white">H</span>
                    </div>
                    <h4 className="text-sm font-semibold text-gray-700">
                      Hindi
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Thumbnail */}
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-2">
                        Thumbnail
                      </p>
                      {getTextInLanguage(
                        video.thumbnailMultiLang || video.thumbnail,
                        "hindi"
                      ) ? (
                        <img
                          src={toAbsolute(
                            getTextInLanguage(
                              video.thumbnailMultiLang || video.thumbnail,
                              "hindi"
                            )
                          )}
                          alt="Hindi thumbnail"
                          className="w-full h-40 object-cover rounded-xl border border-yellow-200"
                        />
                      ) : (
                        <div className="w-full h-20 bg-gray-200 rounded flex items-center justify-center border border-yellow-200">
                          <span className="text-gray-400 text-xs">
                            No Image
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Video / Agora Session */}
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-2">
                        {video.videoType === 3 ? "Agora Session" : "Video"}
                      </p>
                      {video.videoType === 3 ? (
                        <div className="flex flex-col justify-center items-center bg-gray-50 p-3 h-auto min-h-40 rounded-xl border border-dashed border-gray-200 text-center gap-2">
                          <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center mb-1">
                            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                          </div>
                          <span className="text-[11px] font-bold text-gray-700 font-sans">Agora Session</span>
                          <span className="text-[9px] text-gray-500 font-sans">Channel: {video.agoraChannelName || "N/A"}</span>
                          <span className="text-[8px] text-gray-400 font-sans break-all max-w-[150px] truncate" title={video.agoraToken}>Token: {video.agoraToken ? `${video.agoraToken.substring(0, 15)}...` : "N/A"}</span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider font-sans bg-emerald-50 text-emerald-600 border border-emerald-100">
                            Active
                          </span>
                        </div>
                      ) : (
                        getTextInLanguage(
                          video.videoMultiLang || video.video,
                          "hindi"
                        ) ? (
                          <video
                            src={toAbsolute(
                              getTextInLanguage(
                                video.videoMultiLang || video.video,
                                "hindi"
                              )
                            )}
                            controls
                            controlsList={role === "subadmin" ? "nodownload" : undefined}
                            onContextMenu={role === "subadmin" ? (e) => e.preventDefault() : undefined}
                            className="w-full h-40 rounded-xl border border-yellow-200 object-cover"
                          />
                        ) : (
                          <div className="w-full h-20 bg-gray-200 rounded flex items-center justify-center border border-yellow-200">
                            <span className="text-gray-400 text-xs">
                              No Video
                            </span>
                          </div>
                        )
                      )}
                    </div>

                    {/* Title */}
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-2">
                        Title
                      </p>
                      <p className="text-sm font-semibold text-gray-800 bg-white  h-40 text-center p-2 rounded-md border border-yellow-200">
                        {getTextInLanguage(
                          video.titleMultiLang || video.title,
                          "hindi"
                        )}
                      </p>
                    </div>

                    {/* Description */}
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-2">
                        Description
                      </p>
                      <p className="text-sm text-gray-700 bg-white p-2 rounded-md border  h-40 text-center border-yellow-200 h-20 overflow-y-auto">
                        {getTextInLanguage(
                          video.descriptionMultiLang || video.description,
                          "hindi"
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8 text-center">
          <NotFoundCard
            title="No Videos"
            subtitle="Upload a video to get started."
          />
        </div>
      )}
    </div>
  );
};

export default VideoTable;
