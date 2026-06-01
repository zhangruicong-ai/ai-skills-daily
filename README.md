# AI Skills Daily ✦

每天更新的 AI 技能与资讯聚合站。追踪 [skills.sh](https://skills.sh) 上最热门的 Agent Skills，聚合 Hugging Face Daily Papers 和 GitHub Trending 上的 AI 项目动态。

**[🌐 在线预览](https://your-username.github.io/ai-skills-daily)**

## 功能

- 🔥 **趋势技能榜** — skills.sh 上最热门的 AI Agent Skills 排行榜
- 📰 **AI 新闻速递** — Hugging Face 每日论文 + GitHub 热门 AI 项目
- 🔍 **搜索与过滤** — 按名称搜索、按类别筛选技能
- 🌓 **深色/浅色主题** — 一键切换
- ⚡ **每日自动更新** — GitHub Actions 定时拉取最新数据

## 本地开发

```bash
# 安装依赖
npm install

# 拉取最新数据
npm run update

# 打开 index.html 即可预览
```

## 数据源

| 数据 | 来源 | 频率 |
|------|------|------|
| Skills 排行榜 | [skills.sh](https://skills.sh) | 每日 |
| AI 论文 | [Hugging Face Daily Papers](https://huggingface.co/papers) | 每日 |
| AI 开源项目 | [GitHub Trending](https://github.com) | 每日 |

## 部署

### GitHub Pages 自动部署

1. Fork 或 Push 此仓库到 GitHub
2. 进入仓库 Settings → Pages，选择 "GitHub Actions" 作为 Source
3. Workflow 会自动在每天 UTC 2:00 运行，拉取最新数据并部署

也可以手动触发更新：在 Actions → Daily Update → Run workflow。

### 纯静态部署（Vercel / Netlify 等）

运行 `npm run update` 生成数据文件后，直接把整个项目目录部署即可。

## 技术栈

- **前端**: 纯 HTML5 + CSS3 + Vanilla JS（零依赖）
- **后端**: Node.js 脚本（cheerio, rss-parser）
- **CI/CD**: GitHub Actions
- **设计**: [frontend-design](https://skills.sh/anthropics/skills/frontend-design) skill

## License

MIT
