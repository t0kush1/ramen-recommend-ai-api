import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import { recommendFromCandidates, type Shop } from "./openaiService.js";
import "dotenv/config";
import { searchRamen } from "./provider/hotpepper.js";

const app = express();
const PORT = 5000;

// ミドルウェア設定
app.use(cors({
    origin: ["http://localhost:3000"],// フロントURL
    methods: ["GET", "POST"],
}));
app.use(express.json());

// 疎通確認用エンドポイント
app.get("/", (_req: Request, res: Response) => {
    res.send("✅ TypeScript Express サーバー起動中!");
});

// レコメンドAPIエンドポイント
app.post("/recommend", async (req: Request, res: Response) => {
  console.log("リクエスト確認:", req.body); 
  const { districts, ramenTypes, minPrice, maxPrice } = req.body;

  const userCond = {
    districts,
    ramenTypes,
    minPrice,
    maxPrice,
  }

  const shops = await searchRamen({
    districts,
    ramenTypes,
    minPrice,
    maxPrice,
  });

  try {
    const aiResponse = await recommendFromCandidates(shops, userCond, 3);
    res.json({ message: aiResponse });
    console.log("AI応答:", aiResponse);
  } catch (error) {
    console.error("OpenAI Error:", error);
    res.status(500).json({ message: "AI応答の取得に失敗しました。" });
  }
});

// サーバー起動
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
