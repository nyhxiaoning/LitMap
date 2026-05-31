/**
 * Shared region utilities used by MapView and LeftPanel.
 * Single source of truth for European sub-region mapping and city normalization.
 */

// ---- European sub-region classification ----
// Maps country name → European sub-region name
export const EUROPE_REGIONS: Record<string, string> = {
  "法国": "西欧", "德国": "西欧", "奥地利": "西欧", "瑞士": "西欧",
  "荷兰": "西欧", "比利时": "西欧", "列支敦士登": "西欧",
  "意大利": "南欧", "西班牙": "南欧", "葡萄牙": "南欧", "希腊": "南欧",
  "土耳其": "南欧", "阿尔巴尼亚": "南欧", "波黑": "南欧",
  "波兰": "中欧",
  "俄罗斯": "东欧", "乌克兰": "东欧", "白俄罗斯": "东欧",
  "挪威": "北欧", "瑞典": "北欧", "丹麦": "北欧", "芬兰": "北欧",
  "冰岛": "北欧", "立陶宛": "北欧",
  "英国": "不列颠", "爱尔兰": "不列颠",
};

/** Look up which European sub-region a country belongs to */
export function europeRegion(country: string): string | null {
  return EUROPE_REGIONS[country] || null;
}

// ---- City name normalization ----
/** Strip parenthetical notes and slashes to get the base city name */
export function baseCity(city: string): string {
  return city.replace(/[（(][^)）]*[)）]/g, "").replace(/\/.*$/, "").trim();
}

// ---- Region → countries reverse mapping ----
export function buildRegionCountries(): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const [country, region] of Object.entries(EUROPE_REGIONS)) {
    if (!m.has(region)) m.set(region, []);
    m.get(region)!.push(country);
  }
  // Non-European continents
  m.set("非洲", ["尼日利亚", "南非", "加纳"]);
  m.set("大洋洲", ["澳大利亚", "新西兰"]);
  // Literary guide regions (multi-country regions without direct country name)
  m.set("拉丁美洲", ["墨西哥", "阿根廷", "智利", "哥伦比亚", "古巴"]);
  m.set("东南亚", ["越南", "印度尼西亚", "缅甸", "马来西亚"]);
  m.set("西亚与中亚", ["伊朗", "土耳其", "吉尔吉斯斯坦", "哈萨克斯坦", "黎巴嫩"]);
  m.set("印度与南亚", ["印度", "巴基斯坦"]);
  // Japan, Korea, China, etc. are single-country regions — handled by direct country match
  return m;
}

/** Cached reverse mapping: region name → list of countries */
export const REGION_COUNTRIES = buildRegionCountries();

/** Set of region names (both European sub-regions and non-European continents) */
export const REGION_NAMES = new Set(REGION_COUNTRIES.keys());
