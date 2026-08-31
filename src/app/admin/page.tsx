import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import AdminClient from "./AdminClient";

export default async function AdminPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/topics");
  return <AdminClient email={admin.email} />;
}
