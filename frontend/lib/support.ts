import "server-only";

/** Optional public contact details. Never invent destinations when deployment config is absent. */
export function supportDetails() {
  const email = process.env.SUPPORT_EMAIL?.trim() ?? "";
  const phone = process.env.SUPPORT_PHONE?.trim() ?? "";
  return {
    email: /^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(email) ? email : null,
    phone: /^\+?[\d ()-]{6,25}$/.test(phone) ? phone : null,
  };
}
