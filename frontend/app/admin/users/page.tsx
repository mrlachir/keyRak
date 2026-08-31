import { UserManagementTable } from "@/components/admin/user-management-table";
import { getAdminUsers, getMyProfile } from "@/lib/management";

export const dynamic = "force-dynamic";
export const metadata = { title: "Registered users" };

export default async function AdminUsersPage() {
  const [users, profile] = await Promise.all([getAdminUsers(), getMyProfile()]);
  return <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8"><p className="eyebrow">Marketplace community</p><h1 className="mt-3 font-serif text-4xl font-semibold text-ink sm:text-5xl">Your guests and team.</h1><p className="mt-4 max-w-xl text-sm leading-6 text-sand-700">View account details, review private documents, and manage access. Select a user to get started.</p><div className="mt-9"><UserManagementTable users={users} currentUserId={profile.id} /></div></div>;
}
