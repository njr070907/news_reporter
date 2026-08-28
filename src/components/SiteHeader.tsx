import { getCurrentUser } from "@/lib/auth";
import SiteHeaderInner from "./SiteHeaderInner";

export default async function SiteHeader() {
  const user = await getCurrentUser();
  return <SiteHeaderInner user={user ? { email: user.email } : null} />;
}
