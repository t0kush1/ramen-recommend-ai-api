// src/openaiService.ts
import "dotenv/config";
import OpenAI from "openai";

/* =========================
   Azure OpenAI クライアント
   ========================= */
function required(name: string, v?: string) {
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const AZ_ENDPOINT   = required("AZURE_OPENAI_ENDPOINT", process.env.AZURE_OPENAI_ENDPOINT);
const AZ_API_KEY    = required("AZURE_OPENAI_API_KEY", process.env.AZURE_OPENAI_API_KEY);
const AZ_DEPLOYMENT = required("AZURE_OPENAI_DEPLOYMENT", process.env.AZURE_OPENAI_DEPLOYMENT);
const AZ_API_VERSION= required("AZURE_OPENAI_API_VERSION", process.env.AZURE_OPENAI_API_VERSION);

export const openai = new OpenAI({
  apiKey: AZ_API_KEY,
  baseURL: `${AZ_ENDPOINT}/openai/deployments/${AZ_DEPLOYMENT}`,
  defaultHeaders: { "api-key": AZ_API_KEY },
  defaultQuery: { "api-version": AZ_API_VERSION },
});

/* =========================
   型定義
   ========================= */
export type Shop = {
  id: string;
  name: string;
  address: string;
  url?: string;
  lat?: number;
  lng?: number;
  genre?: string;
  budget?: string;
};

export type UserCond = {
  districts: string[];
  ramenTypes: string[];
  minPrice: number;
  maxPrice: number;
};

/* =========================================================
   ホットペッパーAPIから取得した候補だけから選ばせる
   ========================================================= */
export async function recommendFromCandidates(
  shops: Shop[],
  userCond: UserCond,
  topN: number = 3
): Promise<string> {
  if (shops.length === 0) {
    return "候補データが空でした。外部APIから実在店舗候補を取得してから再実行してください。";
  }

  // LLMに渡す許可リスト（この中からのみ選択させる）
  const context = shops
    .slice(0, 60) // トークン節約のため上限設定
    .map((s, i) =>
      [
        `${i + 1}.`,
        s.name,
        s.address,
        s.genre ?? "",
        s.budget ?? "",
        s.url ?? "",
      ].join(" | ")
    )
    .join("\n");

  const system = [
    "あなたは厳密なレビュアーです。",
    "与えられた候補以外の店名・情報を出すことは禁止です。",
    "出典URLは必ずMarkdownリンク形式で記載すること（例: [ホットペッパー](https://example.com)）。",
    "URLが不明の場合は '不明' と記載し、リンクにはしないこと。", 
    "存在未確認の店舗名を創作することは禁止です。",
  ].join("");

  const user = [
    `条件: エリア=${userCond.districts.join("・")} / 種類=${userCond.ramenTypes.join("・")} / 価格=${userCond.minPrice}〜${userCond.maxPrice}円`,
    "",
    "候補一覧（この中からのみ選べ。候補にない店名を出すのは禁止）:",
    context,
    "",
    `出力指示: Markdownの表で最大${topN}件まで。列は「店名|住所|価格帯|出典URL|一言コメント」。`,
    "出典URLの列は、必ず [リンクテキスト](URL) という Markdown リンク形式で記載してください。",
    "候補内で条件に合致する店舗が無い場合は「該当なし」とだけ出力。",
  ].join("\n");

  const res = await openai.chat.completions.create({
    model: AZ_DEPLOYMENT,
    temperature: 0.2, // 低温で事実寄りにする
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  console.log("OpenAI レスポンス:", res);
  return res.choices[0]?.message?.content ?? "回答なし";
}
