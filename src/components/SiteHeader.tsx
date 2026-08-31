import { getCurrentUser, isAdminUser } from "@/lib/auth";
import SiteHeaderInner from "./SiteHeaderInner";

export default async function SiteHeader() {
  const user = await getCurrentUser();
  return (
    <SiteHeaderInner
      user={user ? { email: user.email, name: user.name, isAdmin: await isAdminUser(user) } : null}
    />
  );
}
