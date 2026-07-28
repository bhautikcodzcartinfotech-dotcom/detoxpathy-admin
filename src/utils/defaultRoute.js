const PERMISSION_ROUTES = [
  { permission: "show dashboard page", route: "/dashboard" },
  { permission: "show videos page", route: "/component/video" },
  { permission: "show categories page", route: "/component/category" },
  { permission: "show users page", route: "/component/users" },
  { permission: "show order page", route: "/component/order" },
  { permission: "show branch time page", route: "/component/branch-time" },
  { permission: "show appointments page", route: "/component/appointment" },
  { permission: "show follow-up page", route: "/component/follow-up" },
  { permission: "show staff page", route: "/component/staff" },
  { permission: "show stock page", route: "/component/stock" },
  { permission: "show supplier page", route: "/component/party" },
  { permission: "manage purchase entry", route: "/component/inventory/purchase-entry" },
  { permission: "manage expense entry", route: "/component/inventory/expense-entry" },
  { permission: "manage stock transfer", route: "/component/inventory/stock-transfer" },
  { permission: "show accounting page", route: "/component/accounting" },
  { permission: "show gst reports page", route: "/component/gst-reports" },
  { permission: "show cashbook page", route: "/component/cashbook" },
  { permission: "show supports page", route: "/component/userchat" },
  { permission: "show emergency page", route: "/component/emergency" },
  { permission: "show reports page", route: "/component/reports" },
  { permission: "show contact categories", route: "/component/contact-category" },
  { permission: "show contact page", route: "/component/contact" },
  { permission: "show messages page", route: "/component/message" },
  { permission: "show notes page", route: "/component/complaints" },
  { permission: "show feedback page", route: "/component/feedback" },
  { permission: "show Logs page", route: "/component/logs" },
  { permission: "show medical condition page", route: "/component/medical-condition" },
];

export function getDefaultRoute(role, permissions = [], { exclude = [] } = {}) {
  if (role === "Admin") {
    if (!exclude.includes("/dashboard")) return "/dashboard";
    return "/component/branch";
  }

  const can = (permission) => permissions?.includes(permission);

  for (const { permission, route } of PERMISSION_ROUTES) {
    if (exclude.includes(route)) continue;
    if (can(permission)) return route;
  }

  if (!exclude.includes("/component/meeting")) return "/component/meeting";
  return "/component/meeting";
}
