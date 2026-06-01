#!/usr/bin/env node

/**
 * fetch-news.js - 获取 AI 新闻
 *
 * 数据源：
 * 1. Hugging Face Daily Papers (https://huggingface.co/api/daily_papers)
 * 2. GitHub Trending AI 仓库 (https://api.github.com)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '..', 'data', 'news.json');
const CACHE_FILE = path.join(__dirname, '..', 'data', 'news-cache.json');

function curlGet(url) {
  try {
    const output = execSync(`curl -sL --connect-timeout 10 --max-time 20 "${url}"`, {
      encoding: 'utf-8',
      timeout: 25000
    });
    if (!output || output.trim().length === 0) throw new Error('Empty response');
    return JSON.parse(output);
  } catch (err) {
    throw new Error(`curl: ${err.message}`);
  }
}

function categorizePaper(title, summary) {
  const text = `${title} ${summary}`.toLowerCase();
  const categories = {
    'LLM / 大语言模型': ['llm', 'large language model', 'gpt', 'transformer', 'language model', 'attention'],
    '多模态 AI': ['multimodal', 'vision-language', 'text-to-image', 'image generation', 'diffusion', 'vlm'],
    '强化学习': ['reinforcement learning', 'rl', 'reward', 'policy gradient', 'deep q'],
    '计算机视觉': ['computer vision', 'object detection', 'image segmentation', 'visual recognition', 'cnn'],
    'AI Agent': ['agent', 'tool use', 'autonomous', 'self-improve', 'agentic'],
    '模型训练与优化': ['training', 'fine-tun', 'distillat', 'quantization', 'pruning', 'efficiency'],
    'AI 安全与对齐': ['safety', 'alignment', 'bias', 'fairness', 'robustness', 'adversarial'],
    '语音/Audio AI': ['speech', 'audio', 'voice', 'tts', 'speaker', 'sound'],
    'AI 编程': ['code generation', 'program synthesis', 'code repair', 'debug', 'software engineering'],
    '数据处理与检索': ['retrieval', 'rag', 'embedding', 'vector database', 'search', 'data augment'],
  };
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(kw => text.includes(kw))) return category;
  }
  return '其他 AI 研究';
}

async function fetchHFPapers() {
  console.log('📰 从 Hugging Face Daily Papers 获取数据...');
  const data = await curlGet('https://huggingface.co/api/daily_papers');
  console.log(`✅ 获取到 ${data.length} 篇论文`);

  return data.map(paper => ({
    id: paper.id || paper.paperId || '',
    title: paper.title || '',
    summary: (paper.summary || paper.abstract || '').substring(0, 500),
    url: `https://huggingface.co/papers/${paper.id || ''}`,
    publishedAt: paper.publishedAt || '',
    authors: paper.authors?.map(a => a.name || a.user || '') || [],
    score: paper.upvotes || 0,
    source: 'Hugging Face Daily Papers',
    category: categorizePaper(paper.title || '', paper.summary || ''),
    type: 'paper'
  }));
}

async function fetchGitHubTrending() {
  console.log('⭐ 从 GitHub Trending 获取 AI 仓库数据...');
  try {
    const data = await curlGet(
      'https://api.github.com/search/repositories?q=topic:ai+topic:llm+topic:agent&sort=stars&order=desc&per_page=15'
    );
    const repos = data.items || [];
    console.log(`✅ 获取到 ${repos.length} 个热门仓库`);

    return repos.map(repo => ({
      id: String(repo.id),
      title: `${repo.name} - ${repo.description || ''}`.substring(0, 200),
      summary: repo.description || '',
      url: repo.html_url,
      publishedAt: repo.created_at,
      authors: [repo.owner?.login || ''],
      score: repo.stargazers_count || 0,
      language: repo.language || '',
      forks: repo.forks_count || 0,
      source: 'GitHub Trending',
      category: 'AI 开源项目',
      type: 'github'
    }));
  } catch (err) {
    console.warn('⚠️  GitHub Trending 获取失败:', err.message);
    return [];
  }
}

function saveData(articles) {
  const output = {
    lastUpdated: new Date().toISOString(),
    total: articles.length,
    articles
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`✅ 已保存 ${articles.length} 条新闻到 ${DATA_FILE}`);
}

async function main() {
  if (!fs.existsSync(path.dirname(DATA_FILE))) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  }

  const allArticles = [];

  try {
    const papers = await fetchHFPapers();
    allArticles.push(...papers);
  } catch (err) {
    console.warn('⚠️  HF Papers 获取失败:', err.message);
    if (fs.existsSync(CACHE_FILE)) {
      try {
        const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
        if (cached.articles?.length) {
          console.log(`📦 从缓存加载了 ${cached.articles.length} 条数据`);
          allArticles.push(...cached.articles.filter(a => a.source === 'Hugging Face Daily Papers'));
        }
      } catch (e) { /* ignore */ }
    }
  }

  const trending = await fetchGitHubTrending();
  allArticles.push(...trending);

  // 去重
  const seen = new Set();
  const unique = allArticles.filter(a => {
    const key = a.id || a.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  unique.sort((a, b) => (b.score || 0) - (a.score || 0));

  if (unique.length > 0) {
    saveData(unique);
  } else {
    console.warn('⚠️  无任何数据可用');
    if (!fs.existsSync(DATA_FILE)) {
      saveData([]);
    }
  }

  if (fs.existsSync(DATA_FILE)) {
    const current = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    fs.writeFileSync(CACHE_FILE, JSON.stringify(current, null, 2), 'utf-8');
  }
  console.log('💾 缓存已更新');
}

main().catch(err => {
  console.error('❌ 脚本执行失败:', err);
  process.exit(1);
});
