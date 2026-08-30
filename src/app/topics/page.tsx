import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listTopics } from "@/lib/db";
import TopicsClient from "./TopicsClient";

export interface TopicItem {
  id: string;
  name: string;
  keywordsZh: string[];
  keywordsEn: string[];
  active: boolean;
}

export default async function TopicsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const topics: TopicItem[] = (await listTopics(user.id)).map((t) => ({
    id: t.id,
    name: t.name,
    keywordsZh: JSON.parse(t.keywords_zh) as string[],
    keywordsEn: JSON.parse(t.keywords_en) as string[],
    active: t.active === 1,
  }));
  return (
    <div className="page-enter mx-auto max-w-4xl px-6 py-12 md:py-16">
      <TopicsClient initialTopics={topics} />
    </div>
  );
}
