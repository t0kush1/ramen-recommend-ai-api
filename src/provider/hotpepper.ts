// src/providers/hotpepper.ts
import fetch from "node-fetch";

export type Shop = {
  id: string; name: string; address: string;
  url?: string; lat?: number; lng?: number; genre?: string; budget?: string;
};

export async function searchRamen(params: {
  districts: string[]; ramenTypes: string[]; minPrice?: number; maxPrice?: number;
}): Promise<Shop[]> {
  // 地区→最寄り駅/エリアコードにマッピングして複数回検索、マージ＆重複排除…
  console.log("検索パラメータ:", params);
  const ramenType = params.ramenTypes[0] || "";
  const district = params.districts[0] || "";
  const url = `https://webservice.recruit.co.jp/hotpepper/gourmet/v1/?key=${process.env.HOTPEPPER_API_KEY}&keyword=${encodeURIComponent(ramenType)}&address=${district}&large_area=Z011&genre=G013&format=json`;
  const res = await fetch(url);
  console.log("ホットペッパーレスポンス", res);
  const json = await res.json() as {
    results?: {
      shop?: any[];
    };
  };
  return (json.results?.shop ?? []).map((s: any) => ({
    id: s.id,
    name: s.name,
    address: s.address,
    url: s.urls?.pc,
    lat: parseFloat(s.lat),
    lng: parseFloat(s.lng),
    genre: s.genre?.name,
    budget: s.budget?.name,
  }));
}
