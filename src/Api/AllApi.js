import axios from "axios";

export const API_BASE = "http://192.168.29.228:3002/api/v1";
// export const API_BASE = "http://69.62.73.194:4009/api/v1";
// export const API_BASE = "https://backend.fatendfit.com/api/v1";
// Host base used to resolve file URLs coming from multer (e.g., uploads/..)
export const API_HOST = API_BASE.replace(/\/?api\/?v1\/?$/, "").replace(
  /\/$/,
  ""
);

// Get auth headers from localStorage token
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
};

// Global interceptor: Redirect to login on auth errors
if (typeof window !== "undefined" && !axios.__AUTH_INTERCEPTOR_INSTALLED__) {
  axios.__AUTH_INTERCEPTOR_INSTALLED__ = true;
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error?.response?.status;
      const message = error?.response?.data?.message || "";
      const code =
        error?.response?.data?.code || error?.response?.data?.errorCode;

      const isAuthError =
        status === 401 ||
        status === 403 ||
        /token/i.test(String(message)) ||
        String(code).toUpperCase().includes("TOKEN");

      if (isAuthError) {
        try {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        } catch { }
        // Redirect to login
        window.location.replace("/login");
      }
      return Promise.reject(error);
    }
  );
}

// Admin login
export const loginAdmin = async (email, password) => {
  try {
    const response = await axios.post(`${API_BASE}/auth/admin/login`, {
      email,
      password,
    });
    return response.data.data;
  } catch (err) {
    console.log("Login error:", err.response?.data || err.message);
    throw err;
  }
};

// Admin login as subadmin (impersonate)
// Expected endpoint: POST /admin/sub-admin/:id/login-as
// This endpoint should accept admin's token and return subadmin's token
export const loginAsSubAdmin = async (subAdminId) => {
  try {
    const response = await axios.post(
      `${API_BASE}/admin/sub-admin/${subAdminId}/login-as`,
      {},
      { headers: getAuthHeaders() }
    );
    // Handle different response structures
    return response.data.data || response.data;
  } catch (err) {
    console.error("Login as subadmin error:", {
      status: err?.response?.status,
      message: err?.response?.data?.message || err.message,
      data: err?.response?.data,
    });
    throw err;
  }
};

// Validate token
// export const validateToken = async () => {
//   try {
//     const response = await axios.get(`${API_BASE}/auth/validate`, {
//       headers: getAuthHeaders(),
//     });
//     return response.data;
//   } catch (err) {
//     console.log("Token validation error:", err.response?.data || err.message);
//     throw err;
//   }
// };

export const generateUrl = async (formData) => {
  const response = await axios.post(
    `${API_BASE}/admin/other/generateUrl`,
    formData,
    { headers: getAuthHeaders() }
  );
  console.log("response---------generateUrl---------:", response.data);

  let fileUrl = response.data;

  return fileUrl;
};

/* -------------------- COMMAND APIs -------------------- */
export const getCommands = async () => {
  const res = await axios.get(`${API_BASE}/admin/command/get-command`, {
    headers: getAuthHeaders(),
  });
  return res.data.data;
};

export const createCommand = async (formData) => {
  const data = new FormData();
  data.append("type", formData.type);
  data.append("title", formData.title);

  if (formData.type === "text") {
    data.append("description", formData.description);
  }
  if (formData.type === "audio" && formData.audio) {
    data.append("audio", formData.audio);
  }

  const res = await axios.post(
    `${API_BASE}/admin/command/create-command`,
    data,
    {
      headers: { ...getAuthHeaders(), "Content-Type": "multipart/form-data" },
    }
  );

  return res.data.data;
};

export const deleteCommand = async (id) => {
  const res = await axios.delete(
    `${API_BASE}/admin/command/delete-command/${id}`,
    {
      headers: getAuthHeaders(),
    }
  );
  return res.data;
};

export const updateCommand = async (id, formData) => {
  const data = new FormData();
  if (formData.type) data.append("type", formData.type);
  if (formData.title) data.append("title", formData.title);
  if (formData.description) data.append("description", formData.description);
  if (formData.audio) data.append("audio", formData.audio);

  const res = await axios.put(
    `${API_BASE}/admin/command/update-command/${id}`,
    data,
    {
      headers: { ...getAuthHeaders(), "Content-Type": "multipart/form-data" },
    }
  );

  return res.data.data;
};

/* -------------------- SUB ADMIN APIs -------------------- */
export const listSubAdmins = async () => {
  const res = await axios.get(`${API_BASE}/admin/sub-admin`, {
    headers: getAuthHeaders(),
  });
  return res.data.data;
};

export const createSubAdminApi = async (payload) => {
  const data = new FormData();
  data.append("username", payload.username);
  data.append("email", payload.email);
  data.append("password", payload.password);
  if (Array.isArray(payload.branch)) {
    payload.branch.forEach((b) => data.append("branch", b));
  }
  if (payload.image) {
    data.append("image", payload.image);
  }

  const res = await axios.post(`${API_BASE}/admin/sub-admin`, data, {
    headers: { ...getAuthHeaders(), "Content-Type": "multipart/form-data" },
  });
  return res.data.data;
};

export const updateSubAdminById = async (id, payload) => {
  const data = new FormData();
  if (payload.username) data.append("username", payload.username);
  if (payload.email) data.append("email", payload.email);
  if (payload.password) data.append("password", payload.password);
  if (Array.isArray(payload.branch)) {
    payload.branch.forEach((b) => data.append("branch", b));
  }
  if (typeof payload.isDeleted !== "undefined") {
    data.append("isDeleted", String(Boolean(payload.isDeleted)));
  }
  if (payload.image) data.append("image", payload.image);

  const res = await axios.put(`${API_BASE}/admin/sub-admin/${id}`, data, {
    headers: { ...getAuthHeaders(), "Content-Type": "multipart/form-data" },
  });
  return res.data.data;
};

/* -------------------- BRANCH APIs -------------------- */
export const getAllBranches = async () => {
  const res = await axios.get(`${API_BASE}/admin/branch/all`, {
    headers: getAuthHeaders(),
  });
  return res.data.data;
};

export const createBranchApi = async (payload) => {
  const res = await axios.post(
    `${API_BASE}/admin/branch/create`,
    {
      name: payload.name,
      address: payload.address,
      city: payload.city,
      state: payload.state,
      pincode: payload.pincode,
      email: payload.email,
      latitude: payload.latitude,
      longitude: payload.longitude,
      mobilePrefix: payload.mobilePrefix,
      mobileNumber: payload.mobileNumber,
      isMainBranch: payload.isMainBranch,
    },
    { headers: getAuthHeaders() }
  );
  return res.data.data;
};

export const updateBranchById = async (id, payload) => {
  const body = {};
  const keys = [
    "name",
    "address",
    "city",
    "state",
    "pincode",
    "email",
    "latitude",
    "longitude",
    "mobilePrefix",
    "mobileNumber",
    "isMainBranch",
  ];
  keys.forEach((k) => {
    if (typeof payload[k] !== "undefined") body[k] = payload[k];
  });
  const res = await axios.put(`${API_BASE}/admin/branch/update/${id}`, body, {
    headers: getAuthHeaders(),
  });
  return res.data.data;
};

export const deleteBranchById = async (id) => {
  const res = await axios.delete(`${API_BASE}/admin/branch/${id}`, {
    headers: getAuthHeaders(),
  });
  return res.data;
};

/* -------------------- USER APIs -------------------- */
export const getAllUsers = async () => {
  const res = await axios.get(`${API_BASE}/admin/user/get`, {
    headers: getAuthHeaders(),
  });
  return res.data.data;
};

export const getUsersByBranch = async (branchId) => {
  const res = await axios.get(`${API_BASE}/admin/branch/${branchId}`, {
    headers: getAuthHeaders(),
  });
  return res.data.data;
};

export const createUserApi = async (payload) => {
  const res = await axios.post(
    `${API_BASE}/admin/user/add`,
    {
      name: payload.name,
      mobilePrefix: payload.mobilePrefix,
      mobileNumber: payload.mobileNumber,
      branchId: payload.branchId,
      planId: payload.planId,
    },
    { headers: getAuthHeaders() }
  );
  return res.data.data;
};

export const updateUserById = async (id, payload) => {
  // Build only defined fields to avoid sending undefined values
  const body = {};
  if (typeof payload.name !== "undefined") body.name = payload.name;
  if (typeof payload.mobilePrefix !== "undefined")
    body.mobilePrefix = payload.mobilePrefix;
  if (typeof payload.mobileNumber !== "undefined")
    body.mobileNumber = payload.mobileNumber;
  if (typeof payload.branchId !== "undefined") body.branchId = payload.branchId;
  if (typeof payload.planId !== "undefined") body.planId = payload.planId;
  if (typeof payload.isDeleted !== "undefined")
    body.isDeleted = payload.isDeleted;

  const res = await axios.put(`${API_BASE}/admin/user/update/${id}`, body, {
    headers: getAuthHeaders(),
  });
  return res.data.data;
};

export const getAllPlans = async () => {
  const res = await axios.get(`${API_BASE}/admin/plan/all`, {
    headers: getAuthHeaders(),
  });
  return res.data.data; // array of plans
};

export const createPlanApi = async (payload) => {
  const body = {
    name: payload.name,
    description: payload.description,
    days: Number(payload.days),
  };
  const res = await axios.post(`${API_BASE}/admin/plan/create`, body, {
    headers: getAuthHeaders(),
  });
  return res.data.data;
};

export const updatePlanById = async (id, payload) => {
  const body = {};
  if (typeof payload.name !== "undefined") body.name = payload.name;
  if (typeof payload.description !== "undefined")
    body.description = payload.description;
  if (typeof payload.days !== "undefined") body.days = Number(payload.days);
  const res = await axios.put(`${API_BASE}/admin/plan/update/${id}`, body, {
    headers: getAuthHeaders(),
  });
  return res.data.data;
};

export const deletePlanById = async (id) => {
  const res = await axios.delete(`${API_BASE}/admin/plan/${id}`, {
    headers: getAuthHeaders(),
  });
  return res.data;
};

/* -------------------- AUTH: FORGOT/RESET PASSWORD -------------------- */
export const forgotPassword = async (email) => {
  const res = await axios.post(`${API_BASE}/auth/admin/forgot-password`, {
    email,
  });
  return res.data;
};

export const resetPassword = async ({ token, email, password }) => {
  const res = await axios.post(`${API_BASE}/auth/admin/reset-password`, {
    token,
    email,
    password,
  });
  return res.data;
};

/* -------------------- PROFILE APIs -------------------- */
export const getAdminAndSubadminProfile = async () => {
  const res = await axios.get(`${API_BASE}/admin/get-profile`, {
    headers: getAuthHeaders(),
  });
  return res.data.data;
};

export const updateAdminProfile = async (payload) => {
  const res = await axios.put(`${API_BASE}/admin/update`, payload, {
    headers: getAuthHeaders(),
  });
  return res.data.data;
};

export const getUserOverview = async (userId) => {
  const res = await axios.get(`${API_BASE}/admin/user-overview/${userId}`, {
    headers: getAuthHeaders(),
  });
  return res.data.data;
};

export const getUserVideoAnswers = async (userId) => {
  const res = await axios.get(`${API_BASE}/admin/userAns/getUserAnswers`, {
    headers: getAuthHeaders(),
    params: { userId },
    data: { userId }
  });
  return res.data.data;
};

/* -------------------- VIDEO APIs -------------------- */
export const listVideos = async (params = {}) => {
  const res = await axios.get(`${API_BASE}/admin/video/all`, {
    params,
    headers: getAuthHeaders(),
  });
  return res.data.data;
};

// Question Management APIs
export const createQuestionByVideoId = async (payload) => {
  const res = await axios.post(
    `${API_BASE}/admin/question/create-by-video`,
    payload,
    {
      headers: getAuthHeaders(),
    }
  );
  return res.data.data;
};

export const createQuestionDaily = async (payload) => {
  const res = await axios.post(
    `${API_BASE}/admin/question/create-daily`,
    payload,
    {
      headers: getAuthHeaders(),
    }
  );
  return res.data.data;
};

export const getAllQuestions = async (params = {}) => {
  const res = await axios.get(`${API_BASE}/admin/question/get-all`, {
    params,
    headers: getAuthHeaders(),
  });
  return res.data.data;
};

// Removed old API calls - now using getAllQuestions instead

export const updateQuestion = async (questionId, payload) => {
  const res = await axios.put(
    `${API_BASE}/admin/question/update/${questionId}`,
    payload,
    {
      headers: getAuthHeaders(),
    }
  );
  return res.data.data;
};

export const deleteQuestion = async (questionId) => {
  const res = await axios.delete(`${API_BASE}/admin/question/${questionId}`, {
    headers: getAuthHeaders(),
  });
  return res.data.data;
};

export const createVideoApi = async (payload) => {
  console.log("------------------payload----------------", payload.videoSecond);

  const data = new FormData();

  // Multi-language titles
  if (payload.title_english)
    data.append("title_english", payload.title_english);
  if (payload.title_gujarati)
    data.append("title_gujarati", payload.title_gujarati);
  if (payload.title_hindi) data.append("title_hindi", payload.title_hindi);

  // Video type and files/URLs
  if (typeof payload.videoType !== "undefined")
    data.append("videoType", String(payload.videoType));

  if (payload.videoType === 1) {
    // File uploads for each language
    if (payload.video_english)
      data.append("video_english", payload.video_english);
    if (payload.video_gujarati)
      data.append("video_gujarati", payload.video_gujarati);
    if (payload.video_hindi) data.append("video_hindi", payload.video_hindi);
  } else if (payload.videoType === 2) {
    // URLs for each language
    if (payload.video_english_url)
      data.append("video_english_url", payload.video_english_url);
    if (payload.video_gujarati_url)
      data.append("video_gujarati_url", payload.video_gujarati_url);
    if (payload.video_hindi_url)
      data.append("video_hindi_url", payload.video_hindi_url);
  }

  if (typeof payload.videoSecond !== "undefined")
    data.append("videoSecond", String(payload.videoSecond));

  // Thumbnail type and files/URLs
  if (typeof payload.thumbnailType !== "undefined")
    data.append("thumbnailType", String(payload.thumbnailType));

  if (payload.thumbnailType === 1) {
    // File uploads for each language
    if (payload.thumbnail_english)
      data.append("thumbnail_english", payload.thumbnail_english);
    if (payload.thumbnail_gujarati)
      data.append("thumbnail_gujarati", payload.thumbnail_gujarati);
    if (payload.thumbnail_hindi)
      data.append("thumbnail_hindi", payload.thumbnail_hindi);
  } else if (payload.thumbnailType === 2) {
    // URLs for each language
    if (payload.thumbnail_english_url)
      data.append("thumbnail_english_url", payload.thumbnail_english_url);
    if (payload.thumbnail_gujarati_url)
      data.append("thumbnail_gujarati_url", payload.thumbnail_gujarati_url);
    if (payload.thumbnail_hindi_url)
      data.append("thumbnail_hindi_url", payload.thumbnail_hindi_url);
  }

  // Multi-language descriptions
  if (payload.description_english)
    data.append("description_english", payload.description_english);
  if (payload.description_gujarati)
    data.append("description_gujarati", payload.description_gujarati);
  if (payload.description_hindi)
    data.append("description_hindi", payload.description_hindi);

  // Other fields
  if (typeof payload.type !== "undefined")
    data.append("type", String(payload.type));
  if (payload.type === 1 && typeof payload.day !== "undefined")
    data.append("day", String(payload.day));
  if (payload.type === 4) {
    if (Array.isArray(payload.category)) {
      payload.category.forEach((c) => data.append("category", c));
    } else if (payload.category) {
      data.append("category", payload.category);
    }
  }

  const res = await axios.post(`${API_BASE}/admin/video/create`, data, {
    headers: { ...getAuthHeaders(), "Content-Type": "multipart/form-data" },
  });
  return res.data.data;
};

export const updateVideoById = async (id, payload) => {
  const data = new FormData();

  // Multi-language titles
  if (typeof payload.title_english !== "undefined")
    data.append("title_english", payload.title_english);
  if (typeof payload.title_gujarati !== "undefined")
    data.append("title_gujarati", payload.title_gujarati);
  if (typeof payload.title_hindi !== "undefined")
    data.append("title_hindi", payload.title_hindi);

  // Video type and files/URLs
  if (typeof payload.videoType !== "undefined")
    data.append("videoType", String(payload.videoType));

  if (payload.videoType === 1) {
    // File uploads for each language
    if (payload.video_english)
      data.append("video_english", payload.video_english);
    if (payload.video_gujarati)
      data.append("video_gujarati", payload.video_gujarati);
    if (payload.video_hindi) data.append("video_hindi", payload.video_hindi);
  } else if (payload.videoType === 2) {
    // URLs for each language
    if (payload.video_english_url)
      data.append("video_english_url", payload.video_english_url);
    if (payload.video_gujarati_url)
      data.append("video_gujarati_url", payload.video_gujarati_url);
    if (payload.video_hindi_url)
      data.append("video_hindi_url", payload.video_hindi_url);
  }

  if (typeof payload.videoSecond !== "undefined")
    data.append("videoSecond", String(payload.videoSecond));

  // Thumbnail type and files/URLs
  if (typeof payload.thumbnailType !== "undefined")
    data.append("thumbnailType", String(payload.thumbnailType));

  if (payload.thumbnailType === 1) {
    // File uploads for each language
    if (payload.thumbnail_english)
      data.append("thumbnail_english", payload.thumbnail_english);
    if (payload.thumbnail_gujarati)
      data.append("thumbnail_gujarati", payload.thumbnail_gujarati);
    if (payload.thumbnail_hindi)
      data.append("thumbnail_hindi", payload.thumbnail_hindi);
  } else if (payload.thumbnailType === 2) {
    // URLs for each language
    if (payload.thumbnail_english_url)
      data.append("thumbnail_english_url", payload.thumbnail_english_url);
    if (payload.thumbnail_gujarati_url)
      data.append("thumbnail_gujarati_url", payload.thumbnail_gujarati_url);
    if (payload.thumbnail_hindi_url)
      data.append("thumbnail_hindi_url", payload.thumbnail_hindi_url);
  }

  // Multi-language descriptions
  if (typeof payload.description_english !== "undefined")
    data.append("description_english", payload.description_english);
  if (typeof payload.description_gujarati !== "undefined")
    data.append("description_gujarati", payload.description_gujarati);
  if (typeof payload.description_hindi !== "undefined")
    data.append("description_hindi", payload.description_hindi);

  // Other fields
  if (typeof payload.type !== "undefined")
    data.append("type", String(payload.type));
  if (payload.type === 1 && typeof payload.day !== "undefined")
    data.append("day", String(payload.day));
  if (payload.type === 4) {
    if (Array.isArray(payload.category)) {
      payload.category.forEach((c) => data.append("category", c));
    } else if (payload.category) {
      data.append("category", payload.category);
    }
  }

  const res = await axios.put(`${API_BASE}/admin/video/update/${id}`, data, {
    headers: { ...getAuthHeaders(), "Content-Type": "multipart/form-data" },
  });
  return res.data.data;
};

export const deleteVideoById = async (id) => {
  const res = await axios.delete(`${API_BASE}/admin/video/${id}`, {
    headers: getAuthHeaders(),
  });
  return res.data;
};

/* -------------------- DASHBOARD APIs -------------------- */
// Get logs with filters
export const getLogs = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.action) queryParams.append("action", params.action);
    if (params.userId) queryParams.append("userId", params.userId);
    if (params.branchId) queryParams.append("branchId", params.branchId);
    if (params.startDate) queryParams.append("startDate", params.startDate);
    if (params.endDate) queryParams.append("endDate", params.endDate);
    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);

    const response = await axios.get(
      `${API_BASE}/admin/logs?${queryParams.toString()}`,
      { headers: getAuthHeaders() }
    );
    return response.data.data;
  } catch (err) {
    console.log("Get logs error:", err.response?.data || err.message);
    throw err;
  }
};

// Track panel open
export const trackPanelOpen = async () => {
  try {
    const response = await axios.post(
      `${API_BASE}/admin/logs/panel/open`,
      {},
      { headers: getAuthHeaders() }
    );
    return response.data.data;
  } catch (err) {
    console.log("Track panel open error:", err.response?.data || err.message);
    throw err;
  }
};

// Track panel close
export const trackPanelClose = async () => {
  try {
    const response = await axios.post(
      `${API_BASE}/admin/logs/panel/close`,
      {},
      { headers: getAuthHeaders() }
    );
    return response.data.data;
  } catch (err) {
    console.log("Track panel close error:", err.response?.data || err.message);
    throw err;
  }
};

export const getDashboardStats = async (startDate = null, endDate = null) => {
  let url = `${API_BASE}/admin/dashboard/stats`;

  // Add any provided date params (start, end, or both)
  const params = [];
  if (startDate) params.push(`startDate=${startDate}`);
  if (endDate) params.push(`endDate=${endDate}`);
  if (params.length) url += `?${params.join("&")}`;

  const res = await axios.get(url, {
    headers: getAuthHeaders(),
  });
  return res.data.data;
};

/* -------------------- CATEGORY APIs -------------------- */
export const getAllCategoriesApi = async () => {
  const res = await axios.get(`${API_BASE}/admin/category/`, {
    headers: getAuthHeaders(),
  });
  return res.data.data;
};

export const createCategoryApi = async (payload) => {
  const res = await axios.post(
    `${API_BASE}/admin/category/create`,
    { categoryTitle: payload.categoryTitle },
    { headers: getAuthHeaders() }
  );
  return res.data.data;
};

export const updateCategoryById = async (id, payload) => {
  const res = await axios.put(
    `${API_BASE}/admin/category/update/${id}`,
    { categoryTitle: payload.categoryTitle },
    { headers: getAuthHeaders() }
  );
  return res.data.data;
};

export const deleteCategoryById = async (id) => {
  const res = await axios.delete(`${API_BASE}/admin/category/${id}`, {
    headers: getAuthHeaders(),
  });
  return res.data;
};

/* -------------------- USER PLAN MANAGEMENT APIs -------------------- */
export const holdUserPlan = async (userId) => {
  const res = await axios.post(
    `${API_BASE}/admin/user/${userId}/plan/hold`,
    {},
    { headers: getAuthHeaders() }
  );
  return res.data;
};

export const resumeUserPlan = async (userId) => {
  const res = await axios.post(
    `${API_BASE}/admin/user/${userId}/plan/resume`,
    {},
    { headers: getAuthHeaders() }
  );
  return res.data;
};

export const getUserPlanStatus = async (userId) => {
  const res = await axios.get(`${API_BASE}/admin/user/${userId}/plan/status`, {
    headers: getAuthHeaders(),
  });
  return res.data;
};

// Settings API
export const getSetting = async () => {
  const res = await axios.get(`${API_BASE}/admin/setting/get`, {
    headers: getAuthHeaders(),
  });
  return res.data;
};

export const updateSettingById = async (id, data) => {
  const res = await axios.put(`${API_BASE}/admin/setting/update/${id}`, data, {
    headers: getAuthHeaders(),
  });
  return res.data;
};

/* -------------------- PRODUCT APIs -------------------- */
export const addProduct = async (payload) => {
  const res = await axios.post(`${API_BASE}/admin/product/add`, payload, {
    headers: getAuthHeaders(),
  });
  return res.data.data;
};

export const getProduct = async (id) => {
  const res = await axios.get(`${API_BASE}/user/product/get/${id}`, {
    headers: getAuthHeaders(),
  });
  return res.data.data;
};

export const getAllProducts = async (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.start) queryParams.append('start', params.start);
  if (params.limit) queryParams.append('limit', params.limit);

  const res = await axios.get(`${API_BASE}/admin/product/all?${queryParams.toString()}`, {
    headers: getAuthHeaders(),
  });
  return res.data.data;
};

/* -------------------- BRANCH TIME APIs -------------------- */
export const getBranchTime = async (branchId) => {
  const res = await axios.get(`${API_BASE}/admin/branchTime/${branchId}`, {
    headers: getAuthHeaders(),
  });
  return res.data.data;
};

export const getAppointmentsByBranch = async (branchId, params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.date) queryParams.append('date', params.date);
  if (params.status) queryParams.append('status', params.status);
  if (params.type) queryParams.append('type', params.type);

  let url = `${API_BASE}/admin/appointment/get/${branchId}`;
  if (queryParams.toString()) {
    url += `?${queryParams.toString()}`;
  }

  const res = await axios.get(url, {
    headers: getAuthHeaders(),
  });
  return res.data.data;
};

export const deleteAppointment = async (appointmentId) => {
  const res = await axios.delete(`${API_BASE}/admin/appointment/delete/${appointmentId}`, {
    headers: getAuthHeaders(),
  });
  return res.data;
};

export const createBranchTime = async (payload) => {
  const res = await axios.post(`${API_BASE}/admin/branchTime/create`, payload, {
    headers: getAuthHeaders(),
  });
  return res.data.data;
};

export const updateBranchTime = async (branchId, payload) => {
  const res = await axios.put(`${API_BASE}/admin/branchTime/${branchId}`, payload, {
    headers: getAuthHeaders(),
  });
  return res.data.data;
};



export const updateProduct = async (id, payload) => {
  const res = await axios.put(`${API_BASE}/admin/product/update/${id}`, payload, {
    headers: getAuthHeaders(),
  });
  return res.data.data;
};

export const deleteProduct = async (id) => {
  const res = await axios.delete(`${API_BASE}/admin/product/delete/${id}`, {
    headers: getAuthHeaders(),
  });
  return res.data;
};

/* -------------------- PROGRAM APIs -------------------- */
export const getAllPrograms = async () => {
  const res = await axios.get(`${API_BASE}/admin/program/getAll`, {
    headers: getAuthHeaders(),
  });
  return res.data.data;
};

export const getProgramById = async (id) => {
  const res = await axios.get(`${API_BASE}/admin/program/get/${id}`, {
    headers: getAuthHeaders(),
  });
  return res.data.data;
};

export const createProgram = async (payload) => {
  const res = await axios.post(`${API_BASE}/admin/program/create`, payload, {
    headers: getAuthHeaders(),
  });
  return res.data;
};

export const updateProgram = async (id, payload) => {
  const res = await axios.put(`${API_BASE}/admin/program/update/${id}`, payload, {
    headers: getAuthHeaders(),
  });
  return res.data;
};

export const deleteProgram = async (id) => {
  const res = await axios.delete(`${API_BASE}/admin/program/delete/${id}`, {
    headers: getAuthHeaders(),
  });
  return res.data;
};

/* -------------------- PROGRAM SUGGESTION APIs -------------------- */
export const suggestProgram = async (payload) => {
  const res = await axios.post(`${API_BASE}/admin/programSuggestion/suggest`, payload, {
    headers: getAuthHeaders(),
  });
  return res.data;
};

export const getSuggestedProgram = async (userId) => {
  const res = await axios.get(`${API_BASE}/admin/programSuggestion/get/${userId}`, {
    headers: getAuthHeaders(),
  });
  return res.data.data;
};

export const updateSuggestedProgram = async (userId, payload) => {
  const res = await axios.put(`${API_BASE}/admin/programSuggestion/update/${userId}`, payload, {
    headers: getAuthHeaders(),
  });
  return res.data;
};

export const deleteSuggestedProgram = async (userId) => {
  const res = await axios.delete(`${API_BASE}/admin/programSuggestion/delete/${userId}`, {
    headers: getAuthHeaders(),
  });
  return res.data;
};

/* -------------------- ORDER APIs -------------------- */
export const getAllOrders = async (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.start) queryParams.append("start", params.start);
  if (params.limit) queryParams.append("limit", params.limit);
  if (params.orderType) queryParams.append("orderType", params.orderType);

  const res = await axios.get(`${API_BASE}/admin/order/userOrders?${queryParams.toString()}`, {
    headers: getAuthHeaders(),
  });
  return res.data.data;
};