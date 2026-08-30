import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listTopics, listReportsForUser, countByKind } from "@/lib/db";
import ProfileClient from "./ProfileClient";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const topics = await listTopics(user.id);
  const reports = await listReportsForUser(user.id);
  const likes = await countByKind(user.id, "section_thumb_up");
  const clicks = await countByKind(user.id, "source_click");

  return (
    <ProfileClient
      user={{ name: user.name, email: user.email }}
      stats={{
        briefings: reports.length,
        storiesRead: clicks,
        saved: 0,
        topics: topics.length,
        likes,
      }}
    />
  );
}
