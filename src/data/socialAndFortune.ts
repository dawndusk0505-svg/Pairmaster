export interface SwipeProfile {
  id: string;
  name: string;
  age: number;
  zodiac: string;
  mbti: string;
  occupation: string;
  distanceKm: number;
  bio: string;
  interests: string[];
  avatarEmoji: string;
  matchScore: number;
  icebreaker: string;
  replies: {
    prompt: string;
    choices: { text: string; response: string }[];
  }[];
}

export const SWIPE_PROFILES: SwipeProfile[] = [
  {
    id: 'p1',
    name: '林依璇 (Ariel)',
    age: 24,
    zodiac: '雙魚座',
    mbti: 'ENFP',
    occupation: '咖啡烘焙師 & 插畫愛好者',
    distanceKm: 2.3,
    bio: '喜歡手沖耶加雪菲的柑橘香氣，週末經常出沒在獨立書店或河濱騎車。家裡有一隻脾氣傲嬌的三花貓 🐾',
    interests: ['手沖咖啡', '底片攝影', '日系露營', '三花貓'],
    avatarEmoji: '☕',
    matchScore: 95,
    icebreaker: '如果能擁有任意門，你現在最想穿越去哪裡喝一杯咖啡？',
    replies: [
      {
        prompt: '嗨依！看你也是喜歡手沖咖啡的人呢～平常都喝淺焙還是深焙呀？',
        choices: [
          { text: '偏愛淺焙！喜歡花果香氣和明亮的酸質 ☕', response: '知音！我也超愛衣索比亞古吉的草莓果醬感，改天一起去探新開的烘豆店！' },
          { text: '深焙派～喜歡黑巧克力跟堅果的厚實尾韻 🍫', response: '曼特寧也是很有魅力的！深焙配提拉米蘇根本是極致享受～' },
          { text: '其實我最常喝冰燕麥奶拿鐵，香濃順口！✨', response: '哈哈燕麥奶拿鐵是日常精神支柱無誤！我也常喝～' },
        ],
      },
    ],
  },
  {
    id: 'p2',
    name: '陳柏宇 (Leo)',
    age: 27,
    zodiac: '獅子座',
    mbti: 'ENTJ',
    occupation: '獨立遊戲開發工程師',
    distanceKm: 4.8,
    bio: '白天寫 Rust 和 Shader，晚上彈民謠吉他。尋找可以一起打雙人成行或看獨立電影的靈魂夥伴 🎮',
    interests: ['獨立遊戲', '民謠吉他', '精釀啤酒', '攀岩抱石'],
    avatarEmoji: '🎸',
    matchScore: 89,
    icebreaker: '雙人成行（It Takes Two）和胡鬧廚房，你選哪一個考驗友誼？',
    replies: [
      {
        prompt: '嗨！看你的個人介紹感覺很有共鳴～週末通常喜歡室內放空還是戶外冒險？',
        choices: [
          { text: '喜歡下午找間安靜咖啡館看書，晚上去散散步 🌿', response: '這樣的步調超棒，比起吵雜的地方，我也更喜歡舒服自在的節奏！' },
          { text: '絕對是去戶外！抱石、露營或是去海邊看夕陽 🧗‍♂️', response: '太酷了！我上週才剛去南港抱石館，下次有機會可以一起揪團！' },
          { text: '窩在家打電動或研究新食譜，最放鬆 🍳', response: '宅家研究料理＋破關也是超充實的週末！你最近拿手菜是什麼？' },
        ],
      },
    ],
  },
  {
    id: 'p3',
    name: '張舒婷 (Chloe)',
    age: 26,
    zodiac: '天秤座',
    mbti: 'INFJ',
    occupation: '景觀建築設計師',
    distanceKm: 1.5,
    bio: '對於自然光影與植物空間毫無抵抗力。喜歡收集各地的小陶器與黑膠唱片。生活座右銘是：溫柔而堅定。',
    interests: ['綠植景觀', '黑膠唱片', '陶藝手作', '現代展覽'],
    avatarEmoji: '🌿',
    matchScore: 92,
    icebreaker: '選一張黑膠：70年代爵士樂，還是下雨天的落日飛車？',
    replies: [
      {
        prompt: '你好呀～很高興配對到你！你今天的心情是什麼顏色的呢？',
        choices: [
          { text: '像晴空般的鼠尾草綠，平靜又充滿期待 🍃', response: '很有詩意的形容呢！鼠尾草綠是我設計時最常用的大地色系，讓人很放鬆。' },
          { text: '溫暖的暖陽琥珀色，剛剛喝了美味的熱茶 ☀️', response: '好溫暖的氛圍！最近微涼的天氣正需要這種琥珀色的溫度～' },
          { text: '神秘的暮色深藍，正在靜靜享受夜晚 ✨', response: '我也常常在深夜靈感爆發，深藍色有種能讓人沉澱下來的魔力。' },
        ],
      },
    ],
  },
  {
    id: 'p4',
    name: '周子揚 (Ethan)',
    age: 28,
    zodiac: '射手座',
    mbti: 'ENFP',
    occupation: '旅行攝影作家',
    distanceKm: 6.2,
    bio: '走過 32 個國家，相機裡裝著不同時區的晚霞。信奉自由與善良，下個目標是冰島極光自駕 📸',
    interests: ['公路旅行', '星空攝影', '衝浪潛水', '異國料理'],
    avatarEmoji: '📸',
    matchScore: 94,
    icebreaker: '如果要打包一個背包就出發，你最不能捨棄的隨身物品是什麼？',
    replies: [
      {
        prompt: '哈囉！你也是喜歡旅行的人嗎？下一次休假想去哪裡吹吹風？',
        choices: [
          { text: '好想去花蓮或台東的海邊看日出發呆 🌊', response: '東海岸的浪聲真的是最好的療癒劑！我知道一處七星潭的秘密沙灘，超漂亮！' },
          { text: '去日本京都逛古著店跟百年庭園 ⛩️', response: '京都的鴨川傍晚超舒服，買杯咖啡坐在草地上吹風，完全不想回飯店～' },
          { text: '飛往歐洲小鎮漫無目的地走路 ✈️', response: '迷失在小巷石子路裡，轉角遇到手作麵包店的感覺，真的是旅行最美妙的時刻！' },
        ],
      },
    ],
  },
  {
    id: 'p5',
    name: '許晴朗 (Momo)',
    age: 23,
    zodiac: '巨蟹座',
    mbti: 'ISFP',
    occupation: '法式甜點主廚',
    distanceKm: 3.1,
    bio: '每天和奶油、香草莢與草莓打交道 🍓 相信好吃的甜點可以治癒世界上 80% 的小煩惱！',
    interests: ['手作烘焙', '市集散步', '可愛盲盒', '烹飪節目'],
    avatarEmoji: '🍰',
    matchScore: 96,
    icebreaker: '如果為你特製一款專屬蛋糕，你會選草莓生乳、抹茶栗子還是伯爵焦糖？',
    replies: [
      {
        prompt: '哈囉～剛出爐了檸檬瑪德蓮！你平常吃甜點喜歡酸甜果香還是濃郁茶香？',
        choices: [
          { text: '草莓或檸檬那種酸甜清爽的滋味 🍓', response: '草莓卡士達塔我也超推薦！下週剛好有試吃會呢～' },
          { text: '焙茶、抹茶或伯爵紅茶的茶香系 🍵', response: '茶香甜而不膩最有深度！我最拿手的就是小山園抹茶千層！' },
          { text: '只要是剛出爐熱呼呼的都好喜歡 ✨', response: '哈哈剛出爐的香氣真的無敵，你絕對是個懂吃的美食家！' },
        ],
      },
    ],
  },
  {
    id: 'p6',
    name: '葉承軒 (Noah)',
    age: 29,
    zodiac: '水瓶座',
    mbti: 'INTP',
    occupation: '天文館策展研究員',
    distanceKm: 5.4,
    bio: '腦袋裡裝著星系演化和冷知識的小宅，喜歡在深夜天台看木星衛星，尋找能一起聊宇宙到凌晨的人 🪐',
    interests: ['觀星望遠鏡', '科幻小說', '爵士樂', '桌遊策略'],
    avatarEmoji: '🔭',
    matchScore: 91,
    icebreaker: '你相信浩瀚宇宙的另一端，也有個正準備去買珍珠奶茶的你嗎？',
    replies: [
      {
        prompt: '你好！剛剛正在整理流星雨觀測時間表，你有看過真正的流星嗎？',
        choices: [
          { text: '有呀！在無光害的山上看過整條銀河 ✨', response: '太浪漫了吧！銀河在無雲夜空下的震撼感，看幾次都不會膩。' },
          { text: '還沒親眼見過，一直好想找機會追一次英仙座流星雨 🌠', response: '八月的英仙座流星雨最適合新手！下次帶上熱可可跟躺椅一起去吧！' },
          { text: '比較喜歡去天文館躺著看球幕星空電影 🎬', response: '球幕劇場超治癒的，而且冷氣很舒服（笑），隨時歡迎來找我導覽！' },
        ],
      },
    ],
  },
];

export interface ZodiacInfo {
  name: string;
  symbol: string;
  element: '火' | '土' | '風' | '水';
  dates: string;
  traits: string[];
}

export const ZODIACS: ZodiacInfo[] = [
  { name: '牡羊座', symbol: '♈', element: '火', dates: '3/21 - 4/19', traits: ['熱情勇敢', '率真坦蕩', '行動派'] },
  { name: '金牛座', symbol: '♉', element: '土', dates: '4/20 - 5/20', traits: ['踏實穩重', '專一長情', '生活美學家'] },
  { name: '雙子座', symbol: '♊', element: '風', dates: '5/21 - 6/21', traits: ['思維靈動', '幽默好奇', '雙重魅力'] },
  { name: '巨蟹座', symbol: '♋', element: '水', dates: '6/22 - 7/22', traits: ['細膩溫柔', '極致同理', '溫暖港灣'] },
  { name: '獅子座', symbol: '♌', element: '火', dates: '7/23 - 8/22', traits: ['自信光芒', '慷慨大氣', '霸氣守護'] },
  { name: '處女座', symbol: '♍', element: '土', dates: '8/23 - 9/22', traits: ['極致追求', '體貼入微', '可靠夥伴'] },
  { name: '天秤座', symbol: '♎', element: '風', dates: '9/23 - 10/23', traits: ['優雅和諧', '審美品味', '善解人意'] },
  { name: '天蠍座', symbol: '♏', element: '水', dates: '10/24 - 11/22', traits: ['深邃專注', '靈魂直覺', '極致忠誠'] },
  { name: '射手座', symbol: '♐', element: '火', dates: '11/23 - 12/21', traits: ['崇尚自由', '樂觀哲學', '熱愛探索'] },
  { name: '摩羯座', symbol: '♑', element: '土', dates: '12/22 - 1/19', traits: ['堅韌沉穩', '責任守護', '細水長流'] },
  { name: '水瓶座', symbol: '♒', element: '風', dates: '1/20 - 2/18', traits: ['獨特獨立', '靈魂自由', '前瞻視角'] },
  { name: '雙魚座', symbol: '♓', element: '水', dates: '2/19 - 3/20', traits: ['浪漫共情', '豐富想像', '純粹溫暖'] },
];

export const MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
];

export interface MbtiTypeDetail {
  code: string;
  title: string;
  nickname: string;
  group: '分析家' | '外交官' | '守護者' | '探險家';
  summary: string;
}

export const MBTI_TYPE_INFO: Record<string, MbtiTypeDetail> = {
  INTJ: { code: 'INTJ', title: '建築師', nickname: '冷靜策劃家', group: '分析家', summary: '獨立有遠見，擅長長遠佈局與系統化思考' },
  INTP: { code: 'INTP', title: '邏輯學家', nickname: '點子腦洞王', group: '分析家', summary: '好奇心爆棚，喜歡拆解萬物背後的原理' },
  ENTJ: { code: 'ENTJ', title: '指揮官', nickname: '果斷領航員', group: '分析家', summary: '天生領導者，目標明確、行動力同氣場兼備' },
  ENTP: { code: 'ENTP', title: '辯論家', nickname: '機智點子手', group: '分析家', summary: '反應極快又幽默，總愛挑戰常規玩出新花樣' },
  INFJ: { code: 'INFJ', title: '提倡者', nickname: '溫柔引路人', group: '外交官', summary: '安靜而深刻，擅長洞悉人心並默默守護理想' },
  INFP: { code: 'INFP', title: '調停者', nickname: '浪漫詩意派', group: '外交官', summary: '內心世界豐富，重感情、追求真誠與靈魂共鳴' },
  ENFJ: { code: 'ENFJ', title: '主人公', nickname: '暖心號召者', group: '外交官', summary: '熱情有同理心，擅長凝聚身邊朋友一齊發光' },
  ENFP: { code: 'ENFP', title: '競選者', nickname: '快樂小太陽', group: '外交官', summary: '活力滿滿、創意無限，到邊都帶嚟歡樂氣氛' },
  ISTJ: { code: 'ISTJ', title: '物流師', nickname: '靠譜定海針', group: '守護者', summary: '講求承諾與細節，係身邊最踏實可信嘅後盾' },
  ISFJ: { code: 'ISFJ', title: '守衛者', nickname: '貼心照顧者', group: '守護者', summary: '細膩記得你嘅喜好，用實際行動溫柔守護身邊人' },
  ESTJ: { code: 'ESTJ', title: '總經理', nickname: '效率執行官', group: '守護者', summary: '條理分明又務實，最擅長將混亂局面迅速搞掂' },
  ESFJ: { code: 'ESFJ', title: '執政官', nickname: '社交暖寶寶', group: '守護者', summary: '親切好客又周到，好鍾意照顧大夥兒感受' },
  ISTP: { code: 'ISTP', title: '鑑賞家', nickname: '冷靜技術流', group: '探險家', summary: '淡定自在、動手能力極強，危機時最冷靜可靠' },
  ISFP: { code: 'ISFP', title: '探險家', nickname: '甜系美學家', group: '探險家', summary: '隨和有品味，活在當下並擅長發現日常小確幸' },
  ESTP: { code: 'ESTP', title: '企業家', nickname: '熱血行動派', group: '探險家', summary: '膽大心細、鍾意即刻試新嘢，自帶刺激能量場' },
  ESFP: { code: 'ESFP', title: '表演者', nickname: '派對氣氛王', group: '探險家', summary: '樂觀開朗、極具感染力，同佢一齊永遠唔會悶' },
};

export interface MbtiAxisQuestion {
  axis: string;
  title: string;
  question: string;
  optionA: { letter: string; label: string; desc: string };
  optionB: { letter: string; label: string; desc: string };
}

export const MBTI_QUIZ_AXES: MbtiAxisQuestion[] = [
  {
    axis: 'E / I · 能量來源',
    title: '忙完一整個禮拜，週末點樣叉電最開心？',
    question: '當你感到累嘅時候，邊種方式令你回血最快？',
    optionA: {
      letter: 'E',
      label: '約朋友出嚟食飯吹水、行街熱鬧吓',
      desc: '外向 (Extraverted)：同人互動愈傾愈精神',
    },
    optionB: {
      letter: 'I',
      label: '留喺屋企睇劇聽歌、自己靜靜享受私人時間',
      desc: '內向 (Introverted)：獨處安靜先係真正叉電',
    },
  },
  {
    axis: 'S / N · 認知世界',
    title: '去到一間未去過嘅特色 Café，你第一時間留意咩？',
    question: '平時接收資訊或者諗嘢，你比較偏向邊種感覺？',
    optionA: {
      letter: 'S',
      label: '留意餐牌價錢、甜品賣相、座位舒唔舒服',
      desc: '實感 (Sensing)：著重眼前細節、實際經驗與當下',
    },
    optionB: {
      letter: 'N',
      label: '幻想老闆背後嘅故事、店內氛圍同埋靈感延伸',
      desc: '直覺 (Intuitive)：鍾意聯想未來、意義同可能性',
    },
  },
  {
    axis: 'T / F · 做決定方式',
    title: '朋友遇到難題搵你訴苦，你通常會點回應？',
    question: '做重要決定或者幫人分析事情時，你多數靠咩主導？',
    optionA: {
      letter: 'T',
      label: '客觀幫佢分析利弊，快手提供實際解決方案',
      desc: '思考 (Thinking)：重視邏輯公平、對事不對人',
    },
    optionB: {
      letter: 'F',
      label: '先抱抱安慰佢嘅心情，企喺佢立場一齊感受',
      desc: '情感 (Feeling)：重視人情溫度、共情與價值觀',
    },
  },
  {
    axis: 'J / P · 生活節奏',
    title: '計劃去一場期待已久嘅旅行，你屬於邊一派？',
    question: '面對日常生活、工作或者約會安排，你習慣點做？',
    optionA: {
      letter: 'J',
      label: '出發前 Plan 好每日行程時間表，按部就班最安心',
      desc: '判斷 (Judging)：喜歡有條理、確定性同提前規劃',
    },
    optionB: {
      letter: 'P',
      label: '定個大概方向就出發，去到邊玩到邊更有驚喜',
      desc: '感知 (Perceiving)：喜歡彈性隨性、保持開放變化',
    },
  },
];

export interface MbtiDetailedQuestion {
  id: string;
  axis: 'EI' | 'SN' | 'TF' | 'JP';
  scenario: string;
  optionA: { letter: 'E' | 'S' | 'T' | 'J'; text: string };
  optionB: { letter: 'I' | 'N' | 'F' | 'P'; text: string };
}

export const MBTI_DETAILED_QUESTIONS: MbtiDetailedQuestion[] = [
  // Round 1
  {
    id: 'ei1',
    axis: 'EI',
    scenario: '忙完一整個星期返工／返學，星期五夜晚你最想點過？',
    optionA: { letter: 'E', text: '約班朋友出嚟食飯吹水熱鬧吓，越傾越精神' },
    optionB: { letter: 'I', text: '返屋企舒舒服服獨處放空，唔使應酬最回血' },
  },
  {
    id: 'sn1',
    axis: 'SN',
    scenario: '當你學一個全新技能或睇說明書時，你通常習慣點樣入手？',
    optionA: { letter: 'S', text: '由具體步驟、實例示範開始，一步步跟住做最穩陣' },
    optionB: { letter: 'N', text: '先了解背後整體概念同原則，再自己摸索變化' },
  },
  {
    id: 'tf1',
    axis: 'TF',
    scenario: '朋友失戀或者遇到挫折搵你傾訴，你第一反應多數係？',
    optionA: { letter: 'T', text: '幫佢客觀拆解問題原因，分析之後點樣解決最好' },
    optionB: { letter: 'F', text: '先安撫同陪伴佢嘅情緒，等佢覺得被理解同被愛' },
  },
  {
    id: 'jp1',
    axis: 'JP',
    scenario: '準備去一趟五日四夜旅行，出發前你嘅準備狀態係點？',
    optionA: { letter: 'J', text: '一早排好每日景點、交通同餐廳清單，心中有數' },
    optionB: { letter: 'P', text: '訂好機票酒店就夠，到時睇心情同天氣再即興決定' },
  },

  // Round 2
  {
    id: 'ei2',
    axis: 'EI',
    scenario: '喺一個半生不熟嘅派對或聚會入面，你通常扮演咩角色？',
    optionA: { letter: 'E', text: '容易打開話匣子，主動認識新朋友或者搞熱氣氛' },
    optionB: { letter: 'I', text: '多數企喺熟悉嘅朋友隔離，靜靜觀察或一對一深聊' },
  },
  {
    id: 'sn2',
    axis: 'SN',
    scenario: '同人回憶起舊年一齊去過嘅某個地方，你腦海最先浮現咩？',
    optionA: { letter: 'S', text: '當時食過咩好味、街景細節同發生過嘅真實畫面' },
    optionB: { letter: 'N', text: '嗰陣時嘅整體氛圍、心情轉變或者得到嘅人生啟發' },
  },
  {
    id: 'tf2',
    axis: 'TF',
    scenario: '喺小組合作討論出現分歧時，你做決定主要睇重咩？',
    optionA: { letter: 'T', text: '邊個方案最合邏輯、效率最高、最公平客觀' },
    optionB: { letter: 'F', text: '大家嘅感受同合作和諧度，唔想令任何人受傷' },
  },
  {
    id: 'jp2',
    axis: 'JP',
    scenario: '面對一個兩星期後到期嘅重要任務或功課，你多數點處理？',
    optionA: { letter: 'J', text: '早早拆細進度提早完成，臨尾先趕會令我好焦慮' },
    optionB: { letter: 'P', text: 'Deadline 前幾日靈感同爆發力先至最強，壓線完成' },
  },

  // Round 3
  {
    id: 'ei3',
    axis: 'EI',
    scenario: '當你諗到一個好正嘅新點子或者心事，你習慣點處理？',
    optionA: { letter: 'E', text: '講出嚟同人討論邊傾邊整理，愈講思路愈清晰' },
    optionB: { letter: 'I', text: '喺心入面反覆消化諗清楚，成熟咗先至同人分享' },
  },
  {
    id: 'sn3',
    axis: 'SN',
    scenario: '平時傾偈，你比較容易被邊一種話題吸引？',
    optionA: { letter: 'S', text: '實用貼地嘅生活經驗、美食推介、真實發生嘅趣事' },
    optionB: { letter: 'N', text: '天馬行空嘅假設、未來趨勢、心理分析或哲學意義' },
  },
  {
    id: 'tf3',
    axis: 'TF',
    scenario: '收到一份尖銳但幾有道理嘅批評意見，你內心感受通常係？',
    optionA: { letter: 'T', text: '就算語氣麻麻，只要啱聽有建設性我就會接受改進' },
    optionB: { letter: 'F', text: '好容易在意對方嘅語氣態度，個心會唔舒服好耐' },
  },
  {
    id: 'jp3',
    axis: 'JP',
    scenario: '你嘅書檯、電腦桌面或者手機 App 分類通常係點樣？',
    optionA: { letter: 'J', text: '習慣分門別類擺得整整齊齊，每樣嘢都有固定位置' },
    optionB: { letter: 'P', text: '睇落有少少隨性凌亂，但其實「亂中有序」我自己搵到' },
  },

  // Round 4
  {
    id: 'ei4',
    axis: 'EI',
    scenario: '連續幾日都完全冇同人講嘢或出街，你會有咩感覺？',
    optionA: { letter: 'E', text: '開始覺得好悶好憋屈，好想快啲搵人出嚟見面傾計' },
    optionB: { letter: 'I', text: '覺得好自在好平靜，完全唔覺悶甚至仲想繼續宅' },
  },
  {
    id: 'sn4',
    axis: 'SN',
    scenario: '如果由零開始佈置一間屬於自己嘅房間，你最注重邊樣？',
    optionA: { letter: 'S', text: '傢俬尺寸實用性、燈光夠唔夠光、質感舒唔舒服' },
    optionB: { letter: 'N', text: '整體夢幻主題風格、配色帶出嘅獨特靈魂與故事感' },
  },
  {
    id: 'tf4',
    axis: 'TF',
    scenario: '朋友問你件新衫好唔好睇（但老實講真係麻麻地），你會點答？',
    optionA: { letter: 'T', text: '照直溫和講「呢件剪裁唔太襯你，試下另一件好啲」' },
    optionB: { letter: 'F', text: '先讚下顏色或細節唔錯，顧全佢開心心情唔想潑冷水' },
  },
  {
    id: 'jp4',
    axis: 'JP',
    scenario: '原本約好嘅週末活動喺前一晚突然要改期／變陣，你第一感受係？',
    optionA: { letter: 'J', text: '少少打亂晒我嘅時間表同預期，會有啲唔習慣同煩躁' },
    optionB: { letter: 'P', text: '無所謂呀！剛好可以即興換個新玩法或者順便休息' },
  },
];

export const CHINESE_ZODIAC = ['鼠', '牛', '虎', '兔', '龍', '蛇', '馬', '羊', '猴', '雞', '狗', '豬'];

export interface LuckyPairFortune {
  luckyColorPair: [string, string];
  luckyColorHex: [string, string];
  luckyFoodPair: [string, string];
  luckyActivity: string;
  goldenHour: string;
  soulmateKeywords: string[];
  pairingWisdom: string;
}

export const DAILY_FORTUNES: LuckyPairFortune[] = [
  {
    luckyColorPair: ['櫻花淡粉', '霧霜燕麥白'],
    luckyColorHex: ['#F9A8D4', '#F5EFE6'],
    luckyFoodPair: ['手沖深焙咖啡', '香草可麗露'],
    luckyActivity: '傍晚漫步於微風綠蔭步道，分享彼此最近喜歡的一首歌',
    goldenHour: '16:00 - 18:30 (暮光時分)',
    soulmateKeywords: ['雙向奔赴', '默契無言', '溫柔傾聽'],
    pairingWisdom: '最好的相遇不是刻意強求，而是各自精彩時的恰逢其時。',
  },
  {
    luckyColorPair: ['鼠尾草綠', '暖杏米黃'],
    luckyColorHex: ['#86EFAC', '#FDE68A'],
    luckyFoodPair: ['清甜抹茶拿鐵', '栗子生乳蒙布朗'],
    luckyActivity: '造訪安靜的植物景觀花園或手作體驗，感受同頻共振的專注美感',
    goldenHour: '10:30 - 12:00 (上午晨光)',
    soulmateKeywords: ['同頻共振', '精神共鳴', '踏實安定'],
    pairingWisdom: '能夠接住彼此安靜沈默的兩個人，靈魂早已深層相通。',
  },
  {
    luckyColorPair: ['星夜柔藍', '香檳流金'],
    luckyColorHex: ['#60A5FA', '#FCD34D'],
    luckyFoodPair: ['炙燒鮭魚壽司', '日式柚子氣泡飲'],
    luckyActivity: '在露台或高處遠眺城市夜景，深入聊聊對未來的藍圖與夢想',
    goldenHour: '19:30 - 21:30 (星空初現)',
    soulmateKeywords: ['同心同行', '互相激發', '彼此照亮'],
    pairingWisdom: '愛不是相互凝視，而是兩個人看向同一個方向。',
  },
  {
    luckyColorPair: ['落日珊瑚橘', '香芋淡紫'],
    luckyColorHex: ['#FDA4AF', '#C4B5FD'],
    luckyFoodPair: ['炭烤窯烤披薩', '氣泡白葡萄飲'],
    luckyActivity: '一起動手完成一道料理或解開一個益智難題，笑聲就是最好的催化劑',
    goldenHour: '14:00 - 16:00 (溫暖午後)',
    soulmateKeywords: ['歡聲笑語', '並肩作戰', '輕鬆自在'],
    pairingWisdom: '最舒服的關係，是可以在彼此面前毫無保留地做真實的孩子。',
  },
];
