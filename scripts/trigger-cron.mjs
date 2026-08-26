const target = process.env.WEB_URL ?? process.env.APP_URL;
const secret = process.env.CRON_SECRET;

if (!target || !secret) {
  console.error("缺少 WEB_URL 或 CRON_SECRET 环境变量");
  process.exit(1);
}

const res = await fetch(`${target.replace(/\/+$/, "")}/api/cron/generate`, {
  headers: { Authorization: `Bearer ${secret}` },
});

console.log("status:", res.status);
console.log(await res.text());
if (!res.ok) process.exit(1);
