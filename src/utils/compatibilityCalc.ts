import { ZODIACS, CHINESE_ZODIAC } from '../data/socialAndFortune';

export interface PersonData {
  name: string;
  birthDate: string; // YYYY-MM-DD
  mbti: string;
  zodiac?: string;
  relationType: 'love' | 'friend' | 'work' | 'creative';
}

export interface CompatibilityResult {
  overallScore: number;
  relationType: 'love' | 'friend' | 'work' | 'creative';
  verdict: string;
  subtitle: string;
  dimensionLabels: {
    telepathy: string;
    spark: string;
    values: string;
    endurance: string;
  };
  dimensions: {
    telepathy: number;
    spark: number;
    values: number;
    endurance: number;
  };
  personA: {
    name: string;
    zodiac: string;
    zodiacElement: string;
    chineseAnimal: string;
    mbti: string;
  };
  personB: {
    name: string;
    zodiac: string;
    zodiacElement: string;
    chineseAnimal: string;
    mbti: string;
  };
  highlights: string[];
  growthTips: string[];
  destinyQuote: string;
}

export function getZodiacFromDate(dateStr: string): string {
  if (!dateStr) return '雙子座';
  const parts = dateStr.split('-');
  if (parts.length < 3) return '雙子座';
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  const dates = [20, 19, 21, 20, 21, 22, 23, 23, 23, 24, 22, 22];
  const signs = [
    '水瓶座', '雙魚座', '牡羊座', '金牛座',
    '雙子座', '巨蟹座', '獅子座', '處女座',
    '天秤座', '天蠍座', '射手座', '摩羯座',
  ];

  const index = day < dates[month - 1] ? (month + 10) % 12 : (month - 1);
  return signs[index] || '雙子座';
}

export function getChineseAnimalFromDate(dateStr: string): string {
  if (!dateStr) return '龍';
  const year = parseInt(dateStr.split('-')[0], 10);
  if (isNaN(year)) return '龍';
  const baseYear = 2020;
  const diff = (year - baseYear) % 12;
  const index = diff >= 0 ? diff : diff + 12;
  return CHINESE_ZODIAC[index];
}

export function calculateCompatibility(personA: PersonData, personB: PersonData): CompatibilityResult {
  const relationType = personA.relationType || 'love';
  const zodiacA = personA.zodiac || getZodiacFromDate(personA.birthDate);
  const zodiacB = personB.zodiac || getZodiacFromDate(personB.birthDate);
  const animalA = getChineseAnimalFromDate(personA.birthDate);
  const animalB = getChineseAnimalFromDate(personB.birthDate);

  const zodInfoA = ZODIACS.find((z) => z.name === zodiacA) || ZODIACS[2];
  const zodInfoB = ZODIACS.find((z) => z.name === zodiacB) || ZODIACS[6];

  let elementScore = 80;
  if (zodInfoA.element === zodInfoB.element) {
    elementScore = 95;
  } else if (
    (zodInfoA.element === '火' && zodInfoB.element === '風') ||
    (zodInfoA.element === '風' && zodInfoB.element === '火')
  ) {
    elementScore = 94;
  } else if (
    (zodInfoA.element === '土' && zodInfoB.element === '水') ||
    (zodInfoA.element === '水' && zodInfoB.element === '土')
  ) {
    elementScore = 93;
  } else {
    elementScore = 79;
  }

  let mbtiScore = 82;
  const m1 = personA.mbti.toUpperCase();
  const m2 = personB.mbti.toUpperCase();

  const goldenPairs: [string, string][] = [
    ['INFJ', 'ENFP'], ['INFJ', 'ENTP'], ['INFP', 'ENFJ'], ['INFP', 'ENTJ'],
    ['INTJ', 'ENFP'], ['INTJ', 'ENTP'], ['INTP', 'ENTJ'], ['INTP', 'ESTJ'],
    ['ISFJ', 'ESFP'], ['ISFP', 'ESFJ'], ['ISTJ', 'ESTP'], ['ISTP', 'ESTJ'],
  ];

  const isGolden = goldenPairs.some(
    ([a, b]) => (m1 === a && m2 === b) || (m1 === b && m2 === a)
  );

  // For work/creative, complementary J/P or T/F gets a boost
  const isWorkComplement = relationType === 'work' && m1[2] !== m2[2] && m1[3] !== m2[3];
  const isCreativeSync = relationType === 'creative' && m1[1] === 'N' && m2[1] === 'N';

  if (isGolden) {
    mbtiScore = 98;
  } else if (isWorkComplement || isCreativeSync) {
    mbtiScore = 95;
  } else if (m1 === m2) {
    mbtiScore = 88;
  } else if (m1[1] === m2[1] && m1[2] === m2[2]) {
    mbtiScore = 91;
  } else {
    mbtiScore = 84;
  }

  const liuHePairs = [
    ['鼠', '牛'], ['虎', '豬'], ['兔', '狗'], ['龍', '雞'], ['蛇', '猴'], ['馬', '羊'],
  ];
  const isLiuHe = liuHePairs.some(
    ([a, b]) => (animalA === a && animalB === b) || (animalA === b && animalB === a)
  );
  const animalScore = isLiuHe ? 96 : 85;

  const hash = Math.abs(
    (personA.name + personB.name + relationType).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  );
  const salt = (hash % 7) - 2;

  const rawOverall = Math.round(elementScore * 0.4 + mbtiScore * 0.4 + animalScore * 0.2 + salt);
  const overallScore = Math.min(Math.max(rawOverall, 78), 99);

  const telepathy = Math.min(Math.max(Math.round(mbtiScore * 0.95 + (hash % 8)), 75), 98);
  const spark = Math.min(Math.max(Math.round(elementScore * 0.96 + ((hash * 3) % 7)), 76), 99);
  const values = Math.min(Math.max(Math.round(animalScore * 0.92 + ((hash * 5) % 8)), 78), 97);
  const endurance = Math.min(Math.max(Math.round(overallScore * 0.94 + ((hash * 2) % 6)), 80), 99);

  const relationCopy = {
    love: {
      dimensionLabels: {
        telepathy: '靈魂默契 (Telepathy)',
        spark: '情感火花 (Spark & Chemistry)',
        values: '價值共鳴 (Values & Goals)',
        endurance: '長久羈絆 (Endurance)',
      },
      verdicts: {
        high: ['天作之合 · 靈魂雙生', '極致的心理默契與自然的吸引力，彼此的存在就是最溫暖的定海神針。'],
        mid: ['金玉良緣 · 默契無言', '一個眼神就能讀懂彼此的心思，生活步調與情感溫度高度同頻。'],
        low: ['奇妙互補 · 萬有引力', '性格看似不同卻能激盪出迷人火花，在差異中看見更寬廣的生命視角。'],
      },
      highlights: [
        `【${zodInfoA.element}象＋${zodInfoB.element}象】愛情能量：具備 ${zodInfoA.traits[0]} 與 ${zodInfoB.traits[0]} 的浪漫互補張力。`,
        `【${m1} × ${m2}】親密互動：在日常決策與情感表達上互相吸引，很容易產生「被深層理解」的安心感。`,
        `深層情感信任：不需刻意討好或防備，能在對方懷裡放鬆做最真實的自己。`,
      ],
      tips: [
        '在各自忙碌時，記得保留每天 15 分鐘不看手機的「專注傾聽時光」。',
        '有情緒時直接說出需求，把「你怎麼這樣」換成「我有點需要你的抱抱」。',
        '定期製造小小驚喜或約會儀式感，能讓甜蜜感常保新鮮。',
      ],
      quotes: [
        '「在浩瀚的星海之中，我們恰好在同一個軌道相遇，彼此輝映。」',
        '「因為有你的存在，平凡的日常都染上了溫柔的草莓微光。」',
      ],
    },
    friend: {
      dimensionLabels: {
        telepathy: '頻率合拍度 (Vibe Sync)',
        spark: '歡樂指數 (Fun & Energy)',
        values: '三觀契合 (Shared Values)',
        endurance: '老友保鮮期 (Loyalty)',
      },
      verdicts: {
        high: ['一生知己 · 靈魂閨蜜/死黨', '就算好幾個月沒見面，一開口還是能瞬間接住對方的梗，無話不談。'],
        mid: ['最佳飯友 · 快樂製造機', '一起出門逛街旅行或吐槽日常永遠不會冷場，彼此是最舒壓的避風港。'],
        low: ['跨界損友 · 互補軍師', '性格截然不同卻意外合得來，總能在對方迷茫時給出最清醒的建議。'],
      },
      highlights: [
        `【${zodInfoA.element}象＋${zodInfoB.element}象】友情相性：一個負責炒熱氣氛，一個負責穩住大局，出遊絕不迷路。`,
        `【${m1} × ${m2}】聊天體質：對世界的好奇心相似，隨時能從深夜心事聊到早餐推薦。`,
        `零壓力陪伴：安靜滑手機也不覺得尷尬，這才是真朋友的最高境界。`,
      ],
      tips: [
        '偶爾相約去探索新餐廳或小旅行，累積更多只屬於你們的回憶清單。',
        '遇到人生重大選擇時，記得先尊重彼此的步調再給建議。',
        '別吝嗇讚美對方的小成就，互相應援會讓友誼更堅固。',
      ],
      quotes: [
        '「真正的好朋友，是不用每天聯繫，但只要你需要我都在。」',
        '「世界很吵雜，幸好有你陪我一起看同一場日落。」',
      ],
    },
    work: {
      dimensionLabels: {
        telepathy: '溝通效率 (Alignment)',
        spark: '行動爆發力 (Execution)',
        values: '目標共識 (Shared Vision)',
        endurance: '抗壓互補 (Resilience)',
      },
      verdicts: {
        high: ['王牌拍檔 · 黃金雙核', '一個敢想藍圖，一個擅長落地執行，合作起來戰無不勝的夢幻組合！'],
        mid: ['高效盟友 · 穩健推進', '分工明確且互相補位，遇到死線壓力時依然能保持冷靜解決難題。'],
        low: ['跨界智囊 · 思維碰撞', '工作風格雖然一快一慢，但正好能幫對方揪出盲點，把專案磨得更細緻。'],
      },
      highlights: [
        `【${zodInfoA.element}象＋${zodInfoB.element}象】協作節奏：兼顧 ${zodInfoA.traits[1]} 的視角與 ${zodInfoB.traits[1]} 的執行力。`,
        `【${m1} × ${m2}】職場互補：一個擅長宏觀策略，一個精通細節把關，大幅降低返工風險。`,
        `危機處理力：討論事情就事論事，不會把情緒帶進專業判斷。`,
      ],
      tips: [
        '專案啟動前先對齊「成功標準與時間表」，能省下大量來回確認的成本。',
        '善用彼此優勢分工，讓擅長對外溝通與擅長深度思考的人各司其職。',
        '專案順利上線後別忘了慶祝一頓美食，感謝彼此的神隊友付出。',
      ],
      quotes: [
        '「一個人走得快，但對的雙人拍檔能走得又遠又穩。」',
        '「當各自把背交給彼此時，再難的關卡也能輕鬆通關。」',
      ],
    },
    creative: {
      dimensionLabels: {
        telepathy: '腦洞共振 (Brainstorm)',
        spark: '靈感火花 (Muse Spark)',
        values: '美學品味 (Taste Sync)',
        endurance: '創作續航 (Creative Flow)',
      },
      verdicts: {
        high: ['神級繆斯 · 靈感雙子星', '隨便聊兩句就能擦出令人驚豔的企劃與點子，天馬行空又自成宇宙！'],
        mid: ['美學共振 · 靈感實驗室', '對色彩、音樂與故事的審美高度一致，總能一起做出充滿溫度的作品。'],
        low: ['奇思妙想 · 跨次元混搭', '截然不同的腦迴路碰撞出意想不到的化學反應，作品特別有反差魅力。'],
      },
      highlights: [
        `【${zodInfoA.element}象＋${zodInfoB.element}象】創意頻率：融合 ${zodInfoA.traits[2]} 與 ${zodInfoB.traits[2]}，靈感源源不絕。`,
        `【${m1} × ${m2}】創作火花：一個負責拋出瘋狂構想，一個負責修剪成閃耀成品。`,
        `無限腦洞接力：能理解彼此那些古怪卻可愛的小執著與審美堅持。`,
      ],
      tips: [
        '隨時準備一個共享靈感筆記本，把半夜突發奇想的片段都記下來。',
        '腦力激盪階段先「Yes, And...」接納所有瘋狂點子，最後再來收斂篩選。',
        '一起去看展覽、逛市集或看老電影，是最快補充創意養分的方式。',
      ],
      quotes: [
        '「所有偉大的靈感，都誕生於兩顆自由靈魂不經意的碰撞之中。」',
        '「我們一起把腦海裡的奇幻宇宙，變成真實觸碰得到的模樣。」',
      ],
    },
  };

  const cfg = relationCopy[relationType];
  const tier = overallScore >= 92 ? cfg.verdicts.high : overallScore >= 85 ? cfg.verdicts.mid : cfg.verdicts.low;

  return {
    overallScore,
    relationType,
    verdict: tier[0],
    subtitle: tier[1],
    dimensionLabels: cfg.dimensionLabels,
    dimensions: {
      telepathy,
      spark,
      values,
      endurance,
    },
    personA: {
      name: personA.name || '旅人 A',
      zodiac: zodiacA,
      zodiacElement: zodInfoA.element,
      chineseAnimal: animalA,
      mbti: personA.mbti,
    },
    personB: {
      name: personB.name || '旅人 B',
      zodiac: zodiacB,
      zodiacElement: zodInfoB.element,
      chineseAnimal: animalB,
      mbti: personB.mbti,
    },
    highlights: cfg.highlights,
    growthTips: cfg.tips,
    destinyQuote: cfg.quotes[hash % cfg.quotes.length],
  };
}
