/**
 * Fetch SPECIFIC landmark photos from Wikipedia for each book.
 *
 * Strategy (in priority order):
 * 1. Known literary landmark → exact Wikipedia page
 * 2. Extract specific landmark from city field → search Wikipedia for that
 * 3. Fallback: city-level Wikipedia page
 *
 * Usage: npx tsx scripts/fetch-realviews.ts [--limit N]
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BOOKS_PATH = path.resolve(__dirname, "../src/data/books.ts");
const CACHE_PATH = path.resolve(__dirname, "../data/realview-cache.json");

const DELAY_MS = 800;

// ---- SPECIFIC literary landmark → exact Wikipedia page title ----
// These override any generic city match.
const LITERARY_LANDMARKS: Record<string, string> = {
  // UK
  "贝克街221B": "221B_Baker_Street",
  "贝克街": "221B_Baker_Street",
  "霍格沃茨": "Alnwick_Castle",
  "阿尼克城堡": "Alnwick_Castle",
  "查令十字街84号": "84,_Charing_Cross_Road",
  // France
  "巴黎圣母院": "Notre-Dame_de_Paris",
  "卢浮宫": "Louvre",
  "凡尔赛宫": "Palace_of_Versailles",
  "凯旋门": "Arc_de_Triomphe",
  "埃菲尔铁塔": "Eiffel_Tower",
  "蒙马特": "Montmartre",
  "圣米歇尔山": "Mont-Saint-Michel",
  "巴黎歌剧院": "Palais_Garnier",
  "先贤祠": "Panthéon",
  "左岸": "Rive_Gauche",
  "拉丁区": "Latin_Quarter,_Paris",
  // Italy
  "叹息桥": "Bridge_of_Sighs",
  "圣马可广场": "Piazza_San_Marco",
  "斗兽场": "Colosseum",
  "罗马广场": "Roman_Forum",
  "万神殿": "Pantheon,_Rome",
  "西斯廷教堂": "Sistine_Chapel",
  "比萨斜塔": "Leaning_Tower_of_Pisa",
  "乌菲兹美术馆": "Uffizi",
  "老桥": "Ponte_Vecchio",
  "贡多拉": "Gondola",
  "安康圣母": "Santa_Maria_della_Salute",
  // Greece
  "雅典卫城": "Acropolis_of_Athens",
  "帕特农": "Parthenon",
  "普尼克斯": "Pnyx",
  "普尼克斯广场": "Pnyx",
  "德尔斐": "Delphi",
  "奥林匹亚": "Olympia,_Greece",
  "克诺索斯": "Knossos",
  "迈锡尼": "Mycenae",
  "比雷埃夫斯": "Piraeus",
  "比雷埃夫斯港": "Piraeus",
  // Spain
  "圣家堂": "Sagrada_Família",
  "阿尔罕布拉": "Alhambra",
  "阿尔罕布拉宫": "Alhambra",
  "风车村": "Consuegra",
  // Germany
  "勃兰登堡门": "Brandenburg_Gate",
  "新天鹅堡": "Neuschwanstein_Castle",
  "科隆大教堂": "Cologne_Cathedral",
  // Austria
  "美泉宫": "Schönbrunn_Palace",
  "霍夫堡": "Hofburg",
  // China
  "断桥": "Broken_Bridge,_Hangzhou",
  "雷峰塔": "Leifeng_Pagoda",
  "西湖": "West_Lake",
  "故宫": "Forbidden_City",
  "长城": "Great_Wall_of_China",
  "颐和园": "Summer_Palace",
  "天坛": "Temple_of_Heaven",
  "兵马俑": "Terracotta_Army",
  "莫高窟": "Mogao_Caves",
  "布达拉宫": "Potala_Palace",
  "泰山": "Mount_Tai",
  "黄山": "Huangshan",
  "岳阳楼": "Yueyang_Tower",
  "醉翁亭": "Old_Toper's_Pavilion",
  "水泊梁山": "Mount_Liang",
  "洞庭湖": "Dongting_Lake",
  "秦淮河": "Qinhuai_River",
  "夫子庙": "Nanjing_Fuzimiao",
  "滕王阁": "Pavilion_of_Prince_Teng",
  "黄鹤楼": "Yellow_Crane_Tower",
  "大雁塔": "Giant_Wild_Goose_Pagoda",
  "小雁塔": "Small_Wild_Goose_Pagoda",
  "寒山寺": "Hanshan_Temple",
  "虎丘": "Tiger_Hill",
  "拙政园": "Humble_Administrator's_Garden",
  "狮子林": "Lion_Grove_Garden",
  "留园": "Lingering_Garden",
  "乌镇": "Wuzhen",
  "周庄": "Zhouzhuang",
  "平遥": "Pingyao",
  "丽江": "Lijiang",
  "凤凰古城": "Fenghuang_County",
  "张家界": "Zhangjiajie",
  "九寨沟": "Jiuzhaigou",
  "呼伦贝尔": "Hulunbuir",
  "大兴安岭": "Greater_Khingan",
  "满洲里": "Manzhouli",
  "外滩": "The_Bund",
  "东方明珠": "Oriental_Pearl_Tower",
  "鼓浪屿": "Gulangyu",
  "土楼": "Fujian_Tulou",
  "布达拉": "Potala_Palace",
  // Japan
  "金阁寺": "Kinkaku-ji",
  "清水寺": "Kiyomizu-dera",
  "伏见稻荷": "Fushimi_Inari-taisha",
  "龙安寺": "Ryōan-ji",
  "银阁寺": "Ginkaku-ji",
  "富士山": "Mount_Fuji",
  "镰仓大佛": "Kōtoku-in",
  "东京塔": "Tokyo_Tower",
  "浅草寺": "Sensō-ji",
  "涩谷": "Shibuya",
  "新宿": "Shinjuku",
  "大阪城": "Osaka_Castle",
  "道顿堀": "Dōtonbori",
  // India
  "泰姬陵": "Taj_Mahal",
  "恒河": "Ganges",
  // Middle East
  "佩特拉": "Petra",
  "死海": "Dead_Sea",
  "哭墙": "Western_Wall",
  "圣墓教堂": "Church_of_the_Holy_Sepulchre",
  "巴比伦": "Babylon",
  "波斯波利斯": "Persepolis",
  // Americas
  "自由女神": "Statue_of_Liberty",
  "帝国大厦": "Empire_State_Building",
  "中央公园": "Central_Park",
  "布鲁克林大桥": "Brooklyn_Bridge",
  "金门大桥": "Golden_Gate_Bridge",
  "好莱坞": "Hollywood_Sign",
  "大峡谷": "Grand_Canyon",
  "黄石": "Yellowstone_National_Park",
  "马丘比丘": "Machu_Picchu",
  "奇琴伊察": "Chichen_Itza",
  "伊瓜苏": "Iguazu_Falls",
  // Southeast Asia
  "吴哥窟": "Angkor_Wat",
  // Africa
  "金字塔": "Great_Pyramid_of_Giza",
  "狮身人面像": "Great_Sphinx_of_Giza",
  "乞力马扎罗": "Mount_Kilimanjaro",
  // Russia
  "红场": "Red_Square",
  "冬宫": "Winter_Palace",
  "克里姆林宫": "Moscow_Kremlin",
  "圣瓦西里": "Saint_Basil's_Cathedral",
  "贝加尔湖": "Lake_Baikal",
  // Turkey
  "圣索菲亚": "Hagia_Sophia",
  "蓝色清真寺": "Sultan_Ahmed_Mosque",
  "博斯普鲁斯": "Bosporus",
  "托普卡帕": "Topkapı_Palace",
  "以弗所": "Ephesus",
  // Australia
  "悉尼歌剧院": "Sydney_Opera_House",
  "大堡礁": "Great_Barrier_Reef",
  "乌鲁鲁": "Uluru",
};

// ---- City → English Wikipedia page title (fallback) ----
const CITY_WIKI: Record<string, string> = {
  "雅典": "Athens", "罗马": "Rome", "巴黎": "Paris", "伦敦": "London",
  "威尼斯": "Venice", "佛罗伦萨": "Florence", "维也纳": "Vienna",
  "布拉格": "Prague", "柏林": "Berlin", "马德里": "Madrid",
  "巴塞罗那": "Barcelona", "里斯本": "Lisbon", "都柏林": "Dublin",
  "爱丁堡": "Edinburgh", "莫斯科": "Moscow", "圣彼得堡": "Saint_Petersburg",
  "伊斯坦布尔": "Istanbul", "开罗": "Cairo", "京都": "Kyoto",
  "东京": "Tokyo", "北京": "Beijing", "上海": "Shanghai",
  "纽约": "New_York_City", "布宜诺斯艾利斯": "Buenos_Aires",
  "悉尼": "Sydney", "阿姆斯特丹": "Amsterdam", "布鲁塞尔": "Brussels",
  "哥本哈根": "Copenhagen", "斯德哥尔摩": "Stockholm", "奥斯陆": "Oslo",
  "赫尔辛基": "Helsinki", "华沙": "Warsaw", "布达佩斯": "Budapest",
  "那不勒斯": "Naples", "米兰": "Milan", "都灵": "Turin",
  "日内瓦": "Geneva", "苏黎世": "Zurich", "慕尼黑": "Munich",
  "汉堡": "Hamburg", "科隆": "Cologne", "法兰克福": "Frankfurt",
  "塞维利亚": "Seville", "格拉纳达": "Granada", "托莱多": "Toledo,_Spain",
  "波尔图": "Porto", "莫斯科": "Moscow", "圣彼得堡": "Saint_Petersburg",
  "墨西哥城": "Mexico_City", "里约热内卢": "Rio_de_Janeiro",
  "圣地亚哥": "Santiago", "利马": "Lima", "波哥大": "Bogotá",
  "哈瓦那": "Havana", "多伦多": "Toronto", "蒙特利尔": "Montreal",
  "芝加哥": "Chicago", "旧金山": "San_Francisco", "洛杉矶": "Los_Angeles",
  "西雅图": "Seattle", "新奥尔良": "New_Orleans",
  "波士顿": "Boston", "华盛顿": "Washington,_D.C.",
  "马赛": "Marseille", "里昂": "Lyon", "波尔多": "Bordeaux",
  "尼斯": "Nice", "斯特拉斯堡": "Strasbourg", "阿维尼翁": "Avignon",
  "凡尔赛": "Palace_of_Versailles",
  "坎特伯雷": "Canterbury", "牛津": "Oxford", "剑桥": "Cambridge",
  "利物浦": "Liverpool", "曼彻斯特": "Manchester", "约克": "York",
  "巴斯": "Bath,_Somerset", "考文垂": "Coventry",
  "杭州": "Hangzhou", "苏州": "Suzhou", "南京": "Nanjing",
  "西安": "Xi'an", "成都": "Chengdu", "重庆": "Chongqing",
  "广州": "Guangzhou", "武汉": "Wuhan", "天津": "Tianjin",
  "深圳": "Shenzhen", "厦门": "Xiamen", "青岛": "Qingdao",
  "哈尔滨": "Harbin", "昆明": "Kunming", "桂林": "Guilin",
  "大理": "Dali_City", "敦煌": "Dunhuang", "拉萨": "Lhasa",
  "绍兴": "Shaoxing", "扬州": "Yangzhou", "开封": "Kaifeng",
  "洛阳": "Luoyang", "延安": "Yan'an",
  "沈阳": "Shenyang", "大连": "Dalian", "郑州": "Zhengzhou",
  "济南": "Jinan", "长沙": "Changsha", "福州": "Fuzhou",
  "海口": "Haikou", "三亚": "Sanya", "南宁": "Nanning",
  "贵阳": "Guiyang", "兰州": "Lanzhou", "乌鲁木齐": "Ürümqi",
  "南昌": "Nanchang", "合肥": "Hefei", "太原": "Taiyuan",
  "呼和浩特": "Hohhot", "银川": "Yinchuan", "西宁": "Xining",
  "大阪": "Osaka", "横滨": "Yokohama", "广岛": "Hiroshima",
  "长崎": "Nagasaki", "奈良": "Nara_(city)", "镰仓": "Kamakura",
  "札幌": "Sapporo", "福冈": "Fukuoka", "神户": "Kobe", "名古屋": "Nagoya",
  "北海道": "Hokkaido", "仙台": "Sendai",
  "首尔": "Seoul", "釜山": "Busan",
  "台北": "Taipei", "澳门": "Macau", "香港": "Hong_Kong",
  "曼谷": "Bangkok", "新加坡": "Singapore", "吉隆坡": "Kuala_Lumpur",
  "雅加达": "Jakarta", "马尼拉": "Manila", "河内": "Hanoi",
  "胡志明市": "Ho_Chi_Minh_City", "金边": "Phnom_Penh",
  "仰光": "Yangon", "万象": "Vientiane",
  "孟买": "Mumbai", "德里": "Delhi", "加尔各答": "Kolkata",
  "德黑兰": "Tehran", "耶路撒冷": "Jerusalem",
  "大马士革": "Damascus", "巴格达": "Baghdad", "贝鲁特": "Beirut",
  "迪拜": "Dubai", "多哈": "Doha",
  "开普敦": "Cape_Town", "约翰内斯堡": "Johannesburg",
  "内罗毕": "Nairobi", "拉各斯": "Lagos", "阿克拉": "Accra",
  "卡萨布兰卡": "Casablanca", "马拉喀什": "Marrakech",
  "墨尔本": "Melbourne", "奥克兰": "Auckland",
  "撒马尔罕": "Samarkand", "布哈拉": "Bukhara",
  "乌兰巴托": "Ulaanbaatar", "基辅": "Kyiv",
  "萨拉热窝": "Sarajevo", "贝尔格莱德": "Belgrade",
  "索菲亚": "Sofia", "布加勒斯特": "Bucharest",
  "维尔纽斯": "Vilnius", "里加": "Riga", "塔林": "Tallinn",
  "巴勒莫": "Palermo", "热那亚": "Genoa", "博洛尼亚": "Bologna",
  "维罗纳": "Verona", "比萨": "Pisa", "庞贝": "Pompeii",
  "塞纳河": "Seine", "诺曼底": "Normandy", "普罗旺斯": "Provence",
  "布列塔尼": "Brittany", "勃艮第": "Burgundy",
  "阿尔萨斯": "Alsace", "蔚蓝海岸": "French_Riviera",
  "卢瓦尔": "Loire_Valley", "多尔多涅": "Dordogne",
  "巨石阵": "Stonehenge", "温莎": "Windsor_Castle",
  "黑森林": "Black_Forest", "莱茵河": "Rhine",
  "巴伐利亚": "Bavaria", "德累斯顿": "Dresden",
  "莱比锡": "Leipzig", "魏玛": "Weimar", "海德堡": "Heidelberg",
  "纽伦堡": "Nuremberg", "波恩": "Bonn",
  "萨尔茨堡": "Salzburg", "因斯布鲁克": "Innsbruck",
  "科尔多瓦": "Córdoba,_Spain", "毕尔巴鄂": "Bilbao",
  "瓦伦西亚": "Valencia", "安达卢西亚": "Andalusia",
  "拉曼查": "La_Mancha", "潘普洛纳": "Pamplona",
  "辛特拉": "Sintra", "科英布拉": "Coimbra",
  "鹿特丹": "Rotterdam", "海牙": "The_Hague", "代尔夫特": "Delft",
  "安特卫普": "Antwerp", "布鲁日": "Bruges", "根特": "Ghent",
  "马尔默": "Malmö", "卑尔根": "Bergen", "哥德堡": "Gothenburg",
  "克拉科夫": "Kraków", "格但斯克": "Gdańsk",
  "设拉子": "Shiraz", "伊斯法罕": "Isfahan",
  "卡帕多奇亚": "Cappadocia",
  "瓦拉纳西": "Varanasi",
  "暹粒": "Siem_Reap", "巴厘岛": "Bali",
  "西伯利亚": "Siberia", "贝加尔湖": "Lake_Baikal",
  "苏格兰高地": "Scottish_Highlands",
  "湖区": "Lake_District", "阿尔卑斯": "Alps",
  "波罗的海": "Baltic_Sea", "爱琴海": "Aegean_Sea",
  "加勒比": "Caribbean", "亚马逊": "Amazon_rainforest",
  "巴塔哥尼亚": "Patagonia", "撒哈拉": "Sahara",
  "尼罗河": "Nile", "密西西比河": "Mississippi_River",
  "恒河": "Ganges", "长江": "Yangtze", "黄河": "Yellow_River",
  "塔斯马尼亚": "Tasmania", "阿拉斯加": "Alaska",
  "梵蒂冈": "Vatican_City",
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ---- Cache ----
interface CacheEntry { url: string; name: string; }
const cache: Record<string, CacheEntry> = fs.existsSync(CACHE_PATH)
  ? JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8"))
  : {};

function saveCache() {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), "utf-8");
}

function cleanCity(city: string): string {
  return city.replace(/[（(][^)）]*[)）]/g, "").replace(/\/.*$/, "").trim();
}

/** Extract the most specific landmark name from a city field */
function extractSpecificLandmark(city: string): string | null {
  // Check parenthetical notes first — these are usually the most specific
  const pm = city.match(/[（(]([^)）]+)[)）]/);
  if (pm) {
    // Check if the parenthetical is a known literary landmark
    for (const key of Object.keys(LITERARY_LANDMARKS)) {
      if (pm[1].includes(key)) return key;
    }
    return pm[1];
  }
  // Check the full city string for known landmarks
  for (const key of Object.keys(LITERARY_LANDMARKS)) {
    if (city.includes(key)) return key;
  }
  return null;
}

async function getWikipediaImage(
  wikiTitle: string
): Promise<CacheEntry | null> {
  if (cache[wikiTitle]) return cache[wikiTitle];
  try {
    const apiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`;
    const resp = await fetch(apiUrl, {
      headers: { "User-Agent": "TimeMap/1.0" },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const imgUrl = data.originalimage?.source || data.thumbnail?.source;
    if (imgUrl) {
      const entry = { url: imgUrl, name: data.title };
      cache[wikiTitle] = entry;
      saveCache();
      return entry;
    }
  } catch { /* skip */ }
  return null;
}

async function searchWikipediaImage(
  query: string
): Promise<CacheEntry | null> {
  if (cache[query]) return cache[query];
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=3&namespace=0&format=json&origin=*`;
    const resp = await fetch(searchUrl, {
      headers: { "User-Agent": "TimeMap/1.0" },
    });
    const data = await resp.json();
    const titles: string[] = data[1] || [];
    for (const title of titles) {
      if (/List_of|disambiguation/i.test(title)) continue;
      const result = await getWikipediaImage(title);
      if (result) {
        cache[query] = result;
        saveCache();
        return result;
      }
      await sleep(250);
    }
  } catch { /* skip */ }
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1]) : Infinity;
  const forceIdx = args.indexOf("--force");
  const force = forceIdx >= 0;

  const content = fs.readFileSync(BOOKS_PATH, "utf-8");
  const lines = content.split("\n");

  const bookStarts: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*rank:\s*\d+,$/.test(lines[i])) {
      bookStarts.push(i);
    }
  }

  console.log(`Total books: ${bookStarts.length}\n`);

  let updated = 0;
  let processed = 0;

  for (const startLine of bookStarts) {
    if (processed >= limit) break;

    // Check if already has realViewUrl (skip unless --force)
    let hasUrl = false;
    for (let j = startLine; j < Math.min(startLine + 20, lines.length); j++) {
      if (/realViewUrl:\s*`[^`]+`/.test(lines[j])) { hasUrl = true; break; }
      if (/^\s*\},$/.test(lines[j])) break;
    }
    if (hasUrl && !force) { processed++; continue; }

    // Extract fields
    const block = lines.slice(startLine, startLine + 20).join("\n");
    const titleM = block.match(/title:\s*`([^`]*)`/);
    const cityM = block.match(/city:\s*`([^`]*)`/);
    const countryM = block.match(/country:\s*`([^`]*)`/);
    if (!titleM || !cityM) continue;

    const city = cityM[1];
    const country = countryM?.[1] || "";
    const base = cleanCity(city);
    processed++;

    let result: CacheEntry | null = null;

    // ---- Strategy 1: Known literary landmark ----
    const landmark = extractSpecificLandmark(city);
    if (landmark && LITERARY_LANDMARKS[landmark]) {
      const wikiTitle = LITERARY_LANDMARKS[landmark];
      console.log(`[${processed}] ${titleM[1]} — 🎯 "${landmark}" → "${wikiTitle}"`);
      result = await getWikipediaImage(wikiTitle);
      await sleep(DELAY_MS);
    }

    // ---- Strategy 2: Search for the specific landmark by name ----
    if (!result && landmark) {
      console.log(`[${processed}] ${titleM[1]} — 🔍 landmark "${landmark}"`);
      result = await searchWikipediaImage(`${landmark} ${country}`);
      await sleep(DELAY_MS);
    }

    // ---- Strategy 3: Search with the full base city name ----
    if (!result && base.length > 0 && base.length <= 15) {
      const wikiCity = CITY_WIKI[base];
      if (wikiCity) {
        console.log(`[${processed}] ${titleM[1]} — 🏙 city "${base}" → "${wikiCity}"`);
        result = await getWikipediaImage(wikiCity);
        await sleep(DELAY_MS);
      }
    }

    // ---- Strategy 4: Wikipedia search for base city ----
    if (!result) {
      console.log(`[${processed}] ${titleM[1]} — 🔎 search "${base} ${country}"`);
      result = await searchWikipediaImage(`${base} ${country}`);
      await sleep(DELAY_MS);
    }

    if (result) {
      const nameLineIdx = lines.findIndex(
        (l, idx) => idx >= startLine && /realViewName:\s*`/.test(l)
      );
      if (nameLineIdx >= 0) {
        lines[nameLineIdx] = lines[nameLineIdx].replace(
          /realViewName:\s*`[^`]*`/,
          `realViewName: \`${landmark || base}\``
        );
      }
      const urlLineIdx = lines.findIndex(
        (l, idx) => idx >= startLine && /realViewUrl:\s*`/.test(l)
      );
      if (urlLineIdx >= 0) {
        lines[urlLineIdx] = lines[urlLineIdx].replace(
          /realViewUrl:\s*`[^`]*`/,
          `realViewUrl: \`${result.url}\``
        );
      }
      updated++;
      console.log(`  ✓ ${result.url.slice(0, 90)}...`);
    } else {
      console.log(`  ✗ no image found`);
    }
  }

  if (updated > 0) {
    fs.writeFileSync(BOOKS_PATH, lines.join("\n"), "utf-8");
    console.log(`\nDone! Updated ${updated}/${processed} books.`);
    console.log(`Cache: ${Object.keys(cache).length} entries.`);
  } else {
    console.log(`\nNo books updated.`);
  }
}

main().catch(console.error);
