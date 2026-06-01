#!/usr/bin/env node

/**
 * fetch-skills.js - 从 skills.sh 获取最新技能排行榜数据
 *
 * 策略：
 * 1. 尝试调用 skills.sh 的内部 API 获取数据
 * 2. 如果失败，尝试解析 HTML 页面
 * 3. 如果都失败，使用本地缓存数据
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '..', 'data', 'skills.json');
const CACHE_FILE = path.join(__dirname, '..', 'data', 'skills-cache.json');

// 基于之前 WebFetch 结果的初始数据（作为后备）
const INITIAL_SKILLS = [
  { name: 'frontend-design', repo: 'anthropics/skills', installs: 485800, category: 'design', description: 'Distinctive, production-grade frontend interfaces' },
  { name: 'web-design-guidelines', repo: 'vercel-labs/agent-skills', installs: 357400, category: 'design', description: 'Web design guidelines and best practices' },
  { name: 'vercel-react-best-practices', repo: 'vercel-labs/agent-skills', installs: 441800, category: 'frontend', description: 'React best practices from Vercel Engineering' },
  { name: 'remotion-best-practices', repo: 'remotion-dev/skills', installs: 342000, category: 'frontend', description: 'Programmatic video creation with Remotion' },
  { name: 'ui-ux-pro-max', repo: 'nextlevelbuilder/ui-ux-pro-max-skill', installs: 193800, category: 'design', description: 'Pro-level UI/UX design patterns' },
  { name: 'sleek-design-mobile-apps', repo: 'sleekdotdesign/agent-skills', installs: 182300, category: 'design', description: 'Sleek mobile app design system' },
  { name: 'shadcn', repo: 'shadcn/ui', installs: 169200, category: 'frontend', description: 'Beautiful UI components by shadcn' },
  { name: 'impeccable', repo: 'pbakaus/impeccable', installs: 141700, category: 'design', description: 'Impeccable design principles and anti-patterns' },
  { name: 'extract-design-system', repo: 'arvindrk/extract-design-system', installs: 118700, category: 'design', description: 'Extract design system from existing code' },
  { name: 'vercel-composition-patterns', repo: 'vercel-labs/agent-skills', installs: 194900, category: 'frontend', description: 'React composition patterns' },
  { name: 'vercel-react-native-skills', repo: 'vercel-labs/agent-skills', installs: 131300, category: 'mobile', description: 'React Native development skills' },
  { name: 'design-taste-frontend', repo: 'leonxlnx/taste-skill', installs: 97100, category: 'design', description: 'Design taste for frontend development' },
  { name: 'high-end-visual-design', repo: 'leonxlnx/taste-skill', installs: 83000, category: 'design', description: 'High-end visual design system' },
  { name: 'polish', repo: 'pbakaus/impeccable', installs: 85800, category: 'design', description: 'UI polish and refinement pass' },
  { name: 'critique', repo: 'pbakaus/impeccable', installs: 83200, category: 'design', description: 'UI critique and improvement analysis' },
  { name: 'audit', repo: 'pbakaus/impeccable', installs: 82400, category: 'design', description: 'UI audit and quality assessment' },
  { name: 'animate', repo: 'pbakaus/impeccable', installs: 82300, category: 'design', description: 'Web animation patterns and best practices' },
  { name: 'next-best-practices', repo: 'vercel-labs/next-skills', installs: 97500, category: 'frontend', description: 'Next.js best practices and patterns' },
  { name: 'redesign-existing-projects', repo: 'leonxlnx/taste-skill', installs: 81200, category: 'design', description: 'Redesign and modernize existing projects' },
  { name: 'minimalist-ui', repo: 'leonxlnx/taste-skill', installs: 76100, category: 'design', description: 'Minimalist UI design system' },
  { name: 'industrial-brutalist-ui', repo: 'leonxlnx/taste-skill', installs: 70700, category: 'design', description: 'Industrial brutalist UI design' },
  { name: 'stitch-design-taste', repo: 'leonxlnx/taste-skill', installs: 70400, category: 'design', description: 'Stitch design taste patterns' },
  { name: 'emil-design-eng', repo: 'emilkowalski/skill', installs: 75300, category: 'design', description: 'Design engineering by Emil Kowalski' },
  { name: 'delight', repo: 'pbakaus/impeccable', installs: 80400, category: 'design', description: 'UI delight and micro-interactions' },
  { name: 'distill', repo: 'pbakaus/impeccable', installs: 80000, category: 'design', description: 'UI distillation and simplification' },
  { name: 'bolder', repo: 'pbakaus/impeccable', installs: 80600, category: 'design', description: 'Bolder UI design decisions' },
  { name: 'quieter', repo: 'pbakaus/impeccable', installs: 79200, category: 'design', description: 'Subtle and quiet UI design' },
];

async function fetchSkills() {
  console.log('🔍 正在从 skills.sh 获取最新技能数据...');

  let html;
  try {
    const resp = await fetch('https://skills.sh/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AI-Skills-Daily/1.0)' }
    });
    html = await resp.text();
    console.log(`✅ 成功获取页面 (${html.length} bytes)`);
  } catch (err) {
    console.warn('⚠️  无法获取 skills.sh 页面:', err.message);
    return null;
  }

  // 尝试从页面中提取技能数据
  // 策略 1: 寻找 JSON 格式的数据
  const jsonMatch = html.match(/\[{"name":\s*"[^"]+",\s*"totalInstalls":\s*\d+[^}]+}\]/);
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[0]);
      console.log(`✅ 从 JSON 数据中提取了 ${data.length} 个技能`);
      return transformSkills(data);
    } catch (e) {
      console.warn('⚠️  JSON 解析失败:', e.message);
    }
  }

  // 策略 2: 寻找内嵌的 Next.js 数据
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]);
      console.log('✅ 找到 Next.js 数据');
      // 递归搜索技能相关数据
      function findSkills(obj, depth = 0) {
        if (depth > 10) return null;
        if (Array.isArray(obj)) {
          if (obj.length > 0 && obj[0]?.name && obj[0]?.totalInstalls !== undefined) {
            return obj;
          }
          for (const item of obj) {
            const result = findSkills(item, depth + 1);
            if (result) return result;
          }
        } else if (obj && typeof obj === 'object') {
          for (const key of Object.keys(obj)) {
            const result = findSkills(obj[key], depth + 1);
            if (result) return result;
          }
        }
        return null;
      }
      const skillsData = findSkills(nextData);
      if (skillsData) {
        console.log(`✅ 从 Next.js 数据中提取了 ${skillsData.length} 个技能`);
        return transformSkills(skillsData);
      }
    } catch (e) {
      console.warn('⚠️  Next.js 数据解析失败:', e.message);
    }
  }

  console.log('⚠️  无法从页面中提取结构化数据，使用初始数据');
  return null;
}

function transformSkills(data) {
  return data.map(item => ({
    name: item.name || item.skill || '',
    repo: item.repo || item.repository || item.source || '',
    installs: item.totalInstalls || item.installs || item.installCount || 0,
    category: item.category || getCategory(item.name || ''),
    description: item.description || item.tagline || '',
    updatedAt: new Date().toISOString()
  }));
}

function getCategory(name) {
  const design = ['design', 'ui', 'ux', 'frontend-design', 'visual', 'polish', 'taste', 'brutalist', 'minimalist', 'redesign', 'stitch', 'delight', 'distill', 'bolder', 'quieter', 'critique', 'audit', 'animate', 'impeccable'];
  const frontend = ['react', 'next', 'vercel', 'shadcn', 'composition', 'remotion', 'frontend', 'web-design'];
  const mobile = ['react-native', 'mobile'];

  const lower = name.toLowerCase();
  if (mobile.some(k => lower.includes(k))) return 'mobile';
  if (design.some(k => lower.includes(k))) return 'design';
  if (frontend.some(k => lower.includes(k))) return 'frontend';
  return 'other';
}

function saveData(skills) {
  const output = {
    lastUpdated: new Date().toISOString(),
    total: skills.length,
    skills: skills.sort((a, b) => b.installs - a.installs)
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`✅ 已保存 ${skills.length} 个技能数据到 ${DATA_FILE}`);
}

// 主流程
async function main() {
  if (!fs.existsSync(path.dirname(DATA_FILE))) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  }

  const freshSkills = await fetchSkills();

  if (freshSkills && freshSkills.length > 0) {
    saveData(freshSkills);
  } else {
    // 尝试读取缓存
    if (fs.existsSync(CACHE_FILE)) {
      const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
      console.log(`📦 使用缓存数据 (${cached.skills?.length || 0} 个技能)`);
      saveData(cached.skills || []);
    } else {
      console.log('📦 使用初始数据集');
      saveData(INITIAL_SKILLS.map(s => ({
        ...s,
        updatedAt: new Date().toISOString()
      })));
    }
  }

  // 同时也保存一份缓存
  const currentData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  fs.writeFileSync(CACHE_FILE, JSON.stringify(currentData, null, 2), 'utf-8');
  console.log('💾 缓存已更新');
}

main().catch(err => {
  console.error('❌ 脚本执行失败:', err);
  process.exit(1);
});
