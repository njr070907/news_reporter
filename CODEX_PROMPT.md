# Codex 接手工作 Prompt

## 项目概述
你正在接手一个名为 **News Reporter** 的自动化新闻简报生成系统。该项目已经完成了核心功能开发，现在需要完成**本地 LLM 集成**的最后测试和优化工作。

## 项目状态
- **生产环境**: https://news-reporter-web-production.up.railway.app
- **GitHub 仓库**: https://github.com/njr070907/news_reporter
- **当前分支**: main（所有代码已同步）

## 已完成的功能
1. **新闻采集**: Google News + Bing News 双源，多关键词独立查询
2. **内容提取**: cheerio 解析正文 + og:image 配图
3. **LLM 生成**: 三段式分节模板（事件/背景/声音与影响）
4. **Web UI**: 登录、主题管理、报告查看、反馈追踪
5. **部署**: Railway + GitHub Actions 定时任务
6. **时间**: 北京时间（UTC+8）显示

## 当前任务：本地 LLM 集成
项目已安装 Ollama 并配置了本地模型：
- `qwen3.5:0.8b` (1.0 GB) - 中文支持良好
- `qwen3.5:4b` (3.4 GB) - 更强但响应慢
- `gpt-oss:20b` (13 GB) - 英文强但中文有问题

### 已完成的代码修改
1. `src/lib/llm.ts` - 支持 `LLM_PROVIDER=local` 使用 Ollama 原生 API
2. `.env.local` - 配置 `LLM_PROVIDER=local` 和 `LOCAL_LLM_MODEL=qwen3.5:0.8b`

### 需要完成的工作
1. **测试完整流程**: 用本地模型生成报告，验证功能正常
2. **性能优化**: 调整模型参数（温度、上下文长度），添加缓存
3. **添加 UI 选项**: 让用户在界面上选择本地/远程模型
4. **生产部署考虑**: 是否在生产环境使用本地模型

## 技术栈
- **前端**: Next.js 14, React, Tailwind CSS
- **后端**: Next.js API routes
- **数据库**: SQLite (本地) / PostgreSQL (生产)
- **LLM**: DeepSeek API (远程) / Ollama (本地)
- **部署**: Railway + GitHub Actions

## 关键文件
```
src/lib/llm.ts              # LLM 客户端（支持本地/远程）
src/lib/date.ts             # 北京时间（UTC+8）
src/lib/db.ts               # 数据库抽象
src/lib/schema.ts           # DDL（users, topics, reports, feedback）
src/app/api/cron/generate/route.ts  # 异步定时任务
.env.local                  # 本地 LLM 配置
CODEX_HANDOFF.md            # 完整交接文档
```

## 开发命令
```bash
# 启动 Ollama
ollama serve

# 启动开发服务器
npm run dev

# 测试本地模型
node -e "fetch('http://localhost:11434/api/generate',{method:'POST',headers:{'Content-Type':'application/json; charset=utf-8'},body:JSON.stringify({model:'qwen3.5:0.8b',prompt:'你好',stream:false})}).then(r=>r.json()).then(d=>console.log(d.response))"

# 运行测试
npm run lint
npm run build

# 部署（推送到 main 自动触发）
git push origin main
```

## 注意事项
1. **中文编码**: PowerShell 有 UTF-8 问题，使用 Node.js fetch 测试
2. **模型响应**: 本地模型可能较慢，需要优化参数
3. **思考模式**: 模型默认开启思考模式，会增加延迟
4. **生产环境**: 本地模型只适用于开发，生产环境仍需远程 API

## 期望输出
完成以下工作后，请提供：
1. 本地 LLM 集成的测试结果
2. 性能优化建议
3. UI 改进方案
4. 生产部署建议

请开始接手工作，首先测试本地 LLM 的完整流程。
