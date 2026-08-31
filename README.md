This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Local daily delivery

The recommended production flow is to generate daily briefings on the local machine with Ollama, then upload the finished reports to Railway. Users read the pre-generated report immediately; they never connect to Ollama directly.

Set these variables in the local `.env.local`:

```bash
LLM_PROVIDER=local
LOCAL_LLM_MODEL=qwen3.5:0.8b
LOCAL_SYNC_BASE_URL=https://news-reporter-web-production.up.railway.app
LOCAL_SYNC_SECRET=<same secret configured on Railway>
```

`qwen3.5:4b` can be used when higher writing quality is more important than generation speed; on a CPU-only machine it may take much longer per topic.

Set these variables on Railway:

```bash
REPORTS_PREGENERATED_ONLY=true
LOCAL_SYNC_SECRET=<a random 32-byte secret>
```

管理员登录网站后可在 `/admin` 选择北京时间、Windows 登录触发和管理员网站登录触发。网站登录本身不会直接访问本地模型；本地代理会安全地轮询设置。

Run a safe check first, which collects and generates but does not upload:

```bash
npm run report:local -- --dry-run
```

When the result looks good, run:

```bash
npm run report:local
```

Run `npm run report:local:agent` in Windows Task Scheduler with an **At log on** trigger. The agent starts with Windows, checks the administrator's saved schedule every five minutes, and only generates topics whose current-day report is missing. The old GitHub Actions schedule is now manual-only to avoid generating the same reports twice; the workflow remains available for emergency fallback.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
