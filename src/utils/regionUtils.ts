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
  m.set("非洲", ["尼日利亚", "南非", "加纳", "肯尼亚", "塞内加尔", "苏丹", "埃及", "津巴布韦", "摩洛哥"]);
  m.set("大洋洲", ["澳大利亚", "新西兰"]);
  // Literary guide regions (multi-country regions without direct country name)
  m.set("拉丁美洲", ["墨西哥", "阿根廷", "智利", "哥伦比亚", "古巴", "危地马拉", "巴西", "牙买加", "特立尼达和多巴哥", "多米尼加", "海地", "圣卢西亚"]);
  m.set("东南亚", ["越南", "印度尼西亚", "缅甸", "马来西亚"]);
  m.set("西亚与中亚", ["伊朗", "土耳其", "吉尔吉斯斯坦", "哈萨克斯坦", "黎巴嫩"]);
  m.set("印度与南亚", ["印度", "巴基斯坦"]);
  m.set("欧洲", [
    "法国", "德国", "奥地利", "瑞士", "荷兰", "比利时", "意大利", "西班牙", "葡萄牙", "希腊",
    "土耳其", "阿尔巴尼亚", "波黑", "波兰", "俄罗斯", "乌克兰", "白俄罗斯", "挪威", "瑞典",
    "丹麦", "芬兰", "冰岛", "立陶宛", "英国", "爱尔兰", "英国与爱尔兰",
  ]);
  m.set("亚洲", [
    "中国", "日本", "韩国", "越南", "印度尼西亚", "缅甸", "马来西亚", "伊朗", "印度", "巴基斯坦",
    "吉尔吉斯斯坦", "哈萨克斯坦", "黎巴嫩",
  ]);
  m.set("北美洲", ["美国", "加拿大"]);
  m.set("拉丁美洲", ["墨西哥", "阿根廷", "智利", "哥伦比亚", "古巴", "危地马拉", "巴西", "牙买加", "特立尼达和多巴哥", "多米尼加", "海地", "圣卢西亚", "拉丁美洲下篇"]);
  // Japan, Korea, China, etc. are single-country regions — handled by direct country match
  return m;
}

/** Cached reverse mapping: region name → list of countries */
export const REGION_COUNTRIES = buildRegionCountries();

/** Set of region names (both European sub-regions and non-European continents) */
export const REGION_NAMES = new Set(REGION_COUNTRIES.keys());

/** Returns the continent label used by book cards and map filters. */
export function getContinent(country: string): string {
  for (const [continent, countries] of [
    ["欧洲", REGION_COUNTRIES.get("欧洲") || []],
    ["亚洲", REGION_COUNTRIES.get("亚洲") || []],
    ["非洲", REGION_COUNTRIES.get("非洲") || []],
    ["北美洲", REGION_COUNTRIES.get("北美洲") || []],
    ["拉丁美洲", REGION_COUNTRIES.get("拉丁美洲") || []],
    ["大洋洲", REGION_COUNTRIES.get("大洋洲") || []],
  ] as const) {
    if (countries.includes(country)) return continent;
  }
  return "其他地区";
}
