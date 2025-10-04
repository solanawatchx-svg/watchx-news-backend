import express from "express";
import fs from "fs";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";
import 'dotenv/config';

import { SerpApi } from 'serpapi';
const client = new SerpApi.GoogleSearch(process.env.SERP_API_KEY);

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const REFRESH_SECRET_KEY = process.env.REFRESH_SECRET_KEY || "dipesh6366";
const CACHE_FILE = "cache.json";

// Load cache from file if exists
let cache = [];
try {
  if (fs.existsSync(CACHE_FILE)) {
    const raw = fs.readFileSync(CACHE_FILE, "utf-8");
    cache = JSON.parse(raw);
  }
} catch (err) {
  console.error("Failed to read cache:", err);
  cache = [];
}

async function fetchSolanaNews() {
  return new Promise((resolve, reject) => {
    client.json(
      {
        q: 'Solana blockchain news',
        tbm: 'nws',
        num: 5,
      },
      (data) => {
        if (!data.news_results) return resolve([]);
        const today = new Date().toISOString().split('T')[0];
        const news = data.news_results.map((item) => ({
          title: item.title,
          content: item.snippet,
          source_url: item.link,
          event_date: today,
        }));
        resolve(news);
      }
    );
  });
}

// --- Refresh cache function ---
async function refreshCache() {
  console.log("🔄 Refreshing Solana news...");
  const news = await fetchSolanaNews();
  if (news.length > 0) {
    cache = news;
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
    console.log("✅ Cache refreshed with", news.length, "items.");
  } else {
    console.log("⚠️ Cache refresh failed, keeping old data.");
  }
}

// --- Auto-refresh every 3 hours ---
setInterval(refreshCache, 3 * 60 * 60 * 1000);

// --- CORS ---
app.use(cors({
  origin: [
    "https://solanawatchx.site",
    "https://www.solanawatchx.site"
  ],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// --- Endpoints ---
app.get("/solana-news", (req, res) => {
  if (cache.length === 0) {
    return res.status(400).json({ error: "Cache not ready, please refresh first." });
  }
  res.json(cache);
});

app.post("/refresh-solan-news", async (req, res) => {
  const { key } = req.body;
  if (key !== REFRESH_SECRET_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  await refreshCache();
  res.json({ message: "Cache refreshed!", data: cache });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Backend running at http://localhost:${PORT}`);
  refreshCache(); // refresh once on startup
});

