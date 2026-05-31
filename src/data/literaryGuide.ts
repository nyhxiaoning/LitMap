/**
 * 世界文学导览数据 — 左侧栏概览模式
 */
export interface LiteraryRegion {
  name: string;           // 区域名（如"西欧"）
  countries: string;      // 包含国家
  features: string;       // 文学特点
  works: string;          // 代表作
  quote: string;          // 摘抄
  mapRegion?: string;     // 对应 MapView 中的欧洲次区域名
}

export interface LiteraryContinent {
  name: string;
  subtitle: string;
  regions: LiteraryRegion[];
}

const literaryGuide: LiteraryContinent[] = [
  {
    name: "欧洲",
    subtitle: "思想与理性的殿堂",
    regions: [
      {
        name: "英国",
        countries: "不列颠",
        features: "绅士克制、现实批判、田园诗意、个体孤独",
        works: "莎士比亚《哈姆雷特》、狄更斯《远大前程》、伍尔夫《到灯塔去》",
        quote: "“生存还是毁灭，这是一个值得考虑的问题。”——莎士比亚《哈姆雷特》",
        mapRegion: "不列颠",
      },
      {
        name: "法国",
        countries: "法国",
        features: "启蒙理性、浪漫激情、存在荒诞、社会思辨",
        works: "雨果《悲惨世界》、巴尔扎克《人间喜剧》、加缪《局外人》",
        quote: "“人被判定为自由。”——萨特《存在与虚无》",
      },
      {
        name: "德国",
        countries: "德国",
        features: "哲学深邃、厚重思辨、精神挣扎、反思批判",
        works: "歌德《浮士德》、卡夫卡《变形记》、黑塞《荒原狼》",
        quote: "“理论是灰色的，而生命之树常青。”——歌德《浮士德》",
      },
      {
        name: "俄罗斯",
        countries: "东欧",
        features: "苦难底色、灵魂拷问、悲悯救赎、史诗气质",
        works: "陀思妥耶夫斯基《罪与罚》、托尔斯泰《战争与和平》、契诃夫《套中人》",
        quote: "“苦难是净化灵魂的磨练。”——陀思妥耶夫斯基《罪与罚》",
        mapRegion: "东欧",
      },
      {
        name: "南欧",
        countries: "意大利 / 西班牙 / 葡萄牙",
        features: "人文觉醒、浪漫狂放、现实讽刺、民俗史诗",
        works: "但丁《神曲》、塞万提斯《堂吉诃德》、薄伽丘《十日谈》",
        quote: "“走自己的路，让别人说去吧。”——但丁《神曲》",
        mapRegion: "南欧",
      },
      {
        name: "北欧",
        countries: "挪威/瑞典/丹麦/芬兰/冰岛",
        features: "冷峻克制、极简美学、自然崇拜、孤独书写",
        works: "安徒生童话、易卜生《玩偶之家》、斯特林堡《朱丽小姐》",
        quote: "“生活就是一面镜子，你笑，它也笑；你哭，它也哭。”——安徒生",
        mapRegion: "北欧",
      },
    ],
  },
  {
    name: "亚洲",
    subtitle: "东方智慧与诗意的长河",
    regions: [
      {
        name: "日本",
        countries: "日本",
        features: "物哀幽玄、纤细敏感、无常之美、日常禅意",
        works: "紫式部《源氏物语》、川端康成《雪国》、村上春树《挪威的森林》",
        quote: "“祇园精舍的钟磬，敲出世间无常的响声。”——《平家物语》",
      },
      {
        name: "韩国",
        countries: "韩国",
        features: "哀而不伤、历史创伤、阶层困境、女性觉醒",
        works: "韩江《素食者》、赵南柱《82年生的金智英》、金爱烂《你的夏天还好吗》",
        quote: "“妈妈，我渴望生活。”——朴婉绪《裸树》",
      },
      {
        name: "印度与南亚",
        countries: "印度/巴基斯坦",
        features: "泛神轮回、梵我合一、史诗宏大、宗教哲思",
        works: "泰戈尔《飞鸟集》、《摩诃婆罗多》、阿兰达蒂·洛伊《微物之神》",
        quote: "“生如夏花之绚烂，死如秋叶之静美。”——泰戈尔《飞鸟集》",
      },
      {
        name: "西亚与中亚",
        countries: "阿拉伯/伊朗/土耳其/以色列",
        features: "沙漠气质、宗教隐喻、诗国传统、心灵漂泊",
        works: "纪伯伦《先知》、哈菲兹抒情诗、《一千零一夜》、帕慕克《我的名字叫红》",
        quote: "“心若没有栖息的地方，到哪里都是流浪。”——萨迪《蔷薇园》",
      },
      {
        name: "东南亚",
        countries: "越南/印尼/菲律宾/马来西亚",
        features: "殖民创伤、战争记忆、乡土眷恋、多元融合",
        works: "阮攸《金云翘传》、普拉姆迪娅《所有民族的孩子》、黎紫书《流俗地》",
        quote: "“战争的伤痛，刻在每一寸土地上。”——保宁《战争哀歌》",
      },
    ],
  },
  {
    name: "美洲",
    subtitle: "新大陆的多元呐喊",
    regions: [
      {
        name: "美国",
        countries: "美国",
        features: "美国梦、个人主义、多元族群、荒野精神",
        works: "惠特曼《草叶集》、海明威《老人与海》、托妮·莫里森《宠儿》",
        quote: "“我歌唱自我，我赞美自我。”——惠特曼《草叶集》",
      },
      {
        name: "加拿大",
        countries: "加拿大",
        features: "荒原孤独、多元移民、边缘视角、沉默美学",
        works: "玛格丽特·阿特伍德《使女的故事》、爱丽丝·门罗《快乐影子之舞》",
        quote: "“在这片土地上，沉默是一种力量。”——玛格丽特·阿特伍德",
      },
      {
        name: "拉丁美洲",
        countries: "墨西哥/阿根廷/智利/哥伦比亚",
        features: "魔幻现实、殖民创伤、狂欢精神、孤独宿命",
        works: "马尔克斯《百年孤独》、博尔赫斯《小径分岔的花园》、聂鲁达《二十首情诗》",
        quote: "“生命中真正重要的不是你遭遇了什么，而是你记住了哪些事。”——马尔克斯《百年孤独》",
      },
    ],
  },
  {
    name: "非洲",
    subtitle: "黑色大陆的生命韧性",
    regions: [
      {
        name: "非洲",
        countries: "尼日利亚/南非/加纳",
        features: "部落记忆、殖民批判、口头传统、生命坚韧",
        works: "阿契贝《瓦解》、库切《耻》、恩古吉《孩子，你别哭》",
        quote: "“一个老人的去世，就是一座图书馆的毁灭。”——非洲谚语",
        mapRegion: "非洲",
      },
    ],
  },
  {
    name: "大洋洲",
    subtitle: "孤岛与荒原的孤独回响",
    regions: [
      {
        name: "大洋洲",
        countries: "澳大利亚/新西兰",
        features: "荒原孤独、殖民反思、原住民神话、自然书写",
        works: "帕特里克·怀特《人之树》、考琳·麦卡洛《荆棘鸟》、威蒂·伊希马埃拉《鲸骑士》",
        quote: "“在这片红色的土地上，孤独是永恒的主题。”——帕特里克·怀特",
        mapRegion: "大洋洲",
      },
    ],
  },
];

export default literaryGuide;
