import { normalizeUserRole, ROLES, type User_Role } from '@/types/user';

const allRoles = Object.values(ROLES) as User_Role[];
const labStaffRoles = [ROLES.LAB_TECH, ROLES.LAB_HEAD] as User_Role[];

const blockedLoginRedirects = new Set(['/login', '/logout', '/unauthorized']);

const routeAccess: Array<{ pattern: RegExp; roles: User_Role[] }> = [
  { pattern: /^\/$/, roles: allRoles },
  { pattern: /^\/monitoring$/, roles: allRoles },

  { pattern: /^\/room$/, roles: [ROLES.ADMIN] },
  { pattern: /^\/schedule-import$/, roles: [ROLES.ADMIN] },
  { pattern: /^\/user\/[^/]+$/, roles: [ROLES.ADMIN] },

  { pattern: /^\/labtech-dashboard$/, roles: labStaffRoles },
  { pattern: /^\/labtech-mobile$/, roles: labStaffRoles },
  { pattern: /^\/labtech\/room$/, roles: labStaffRoles },
  { pattern: /^\/forms$/, roles: labStaffRoles },
  { pattern: /^\/inventory$/, roles: labStaffRoles },
  { pattern: /^\/inventory\/item\/[^/]+$/, roles: labStaffRoles },
  { pattern: /^\/labtech\/borrowing$/, roles: labStaffRoles },
  { pattern: /^\/tickets$/, roles: labStaffRoles },
  { pattern: /^\/notification$/, roles: labStaffRoles },
  { pattern: /^\/reports$/, roles: [ROLES.LAB_TECH] },

  { pattern: /^\/labhead-dashboard$/, roles: [ROLES.LAB_HEAD] },
  { pattern: /^\/labhead-scheduling$/, roles: [ROLES.LAB_HEAD] },
  { pattern: /^\/labtechview$/, roles: [ROLES.LAB_HEAD] },

  { pattern: /^\/student-session$/, roles: [ROLES.STUDENT] },
  { pattern: /^\/student-pc-view$/, roles: [ROLES.STUDENT] },
  { pattern: /^\/student-room-view$/, roles: [ROLES.STUDENT] },

  { pattern: /^\/faculty\/scheduling$/, roles: [ROLES.FACULTY] },
  { pattern: /^\/secretary\/scheduling$/, roles: [ROLES.SECRETARY] },
];

const normalizePathname = (path: string) => {
  const pathname = path.split(/[?#]/)[0] || '/';
  return pathname.replace(/\/+$/, '') || '/';
};

export const getDefaultRouteForRole = (role: User_Role | string | null, isMobile = false) => {
  const normalizedRole = normalizeUserRole(role);
  if (normalizedRole === ROLES.LAB_TECH && isMobile) return '/labtech-mobile';
  if (normalizedRole === ROLES.FACULTY) return '/faculty/scheduling';
  if (normalizedRole === ROLES.SECRETARY) return '/secretary/scheduling';
  if (normalizedRole === ROLES.STUDENT) return '/student-session';
  return '/';
};

export const isSafeInternalPath = (path?: string | null) =>
  Boolean(path && path.startsWith('/') && !path.startsWith('//'));

export const isPathAllowedForRole = (path: string, role: User_Role | string | null) => {
  const pathname = normalizePathname(path);
  const normalizedRole = normalizeUserRole(role);

  if (blockedLoginRedirects.has(pathname)) return false;
  if (!normalizedRole) return false;

  const match = routeAccess.find((route) => route.pattern.test(pathname));
  return Boolean(match?.roles.includes(normalizedRole));
};

export const getLoginRedirectTarget = (
  redirectPath: string | null,
  role: User_Role | string | null,
  isMobile = false,
) => {
  const defaultTarget = getDefaultRouteForRole(role, isMobile);

  if (!isSafeInternalPath(redirectPath)) return defaultTarget;
  if (!isPathAllowedForRole(redirectPath as string, role)) return defaultTarget;

  return redirectPath as string;
};
