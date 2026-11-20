import { CANDY_SPIRIT_ITEMS, ThemeItem } from './matchThemes';

export type GameModeKey = 'flip' | 'link' | 'merge' | 'cpstack' | 'conveyor' | 'tower' | 'duel';

export const VALID_GAME_MODES: readonly GameModeKey[] = [
  'flip',
  'link',
  'merge',
  'cpstack',
  'conveyor',
  'tower',
  'duel',
] as const;

export const GAME_MODE_LABELS: Record<GameModeKey, string> = {
  flip: '翻牌記憶',
  link: '連連看',
  merge: '合成大精靈',
  cpstack: 'CP 疊疊消',
  conveyor: '甜品輸送帶',
  tower: '百層爬塔',
  duel: '好友 PK 賽',
};

const CPSTACK_DIFFICULTY_LABELS: Record<string, string> = {
  relaxed: '甜蜜 6 組 CP',
  standard: '熱戀 9 組 CP',
  master: '全王國 11 組 CP',
};

const GENERIC_DIFFICULTY_LABELS: Record<string, string> = {
  easy: '輕鬆 4×3',
  medium: '標準 4×4',
  hard: '進階 6×4',
  expert: '大師 6×6',
  relaxed: '輕鬆 6×4',
  standard: '標準 8×6',
  master: '大師 10×6',
  daily: '每日挑戰',
  normal: '標準模式',
  blitz: '45秒極速',
  endless: '無盡爬塔',
  duel: '60秒對戰',
};

export function formatDifficultyLabel(gameMode: GameModeKey | string, difficultyId: string): string {
  if (gameMode === 'cpstack' && CPSTACK_DIFFICULTY_LABELS[difficultyId]) {
    return CPSTACK_DIFFICULTY_LABELS[difficultyId];
  }
  if (gameMode === 'merge' && difficultyId === 'standard') {
    return '標準合成罐';
  }
  return GENERIC_DIFFICULTY_LABELS[difficultyId] || difficultyId;
}

export interface ArcadeGameMeta {
  id: GameModeKey;
  title: string;
  shortTitle: string;
  badge: string;
  tagline: string;
  accentGradient: string;
  iconEmoji: string;
  isNew?: boolean;
}

export const ARCADE_GAMES_META: ArcadeGameMeta[] = [
  {
    id: 'flip',
    title: '翻牌記憶大戰',
    shortTitle: '翻牌記憶',
    badge: '經典人氣',
    tagline: '每日同盤挑戰 · 冰凍魔導護盾翻倍連擊',
    accentGradient: 'from-pink-500 to-rose-400',
    iconEmoji: '🃏',
  },
  {
    id: 'link',
    title: '糖果連連看',
    shortTitle: '連連看',
    badge: '極速消除',
    tagline: '最多兩轉彎極速連線 · 挑戰 10×6 大師盤',
    accentGradient: 'from-rose-500 to-amber-400',
    iconEmoji: '🔗',
  },
  {
    id: 'merge',
    title: '糖果盲盒罐：合成大精靈',
    shortTitle: '合成大精靈',
    badge: 'NEW · 物理掉落',
    tagline: '兩隻相同精靈撞埋即刻進化 · 目標合成 SSR 星願蠑螈！',
    accentGradient: 'from-violet-500 to-fuchsia-500',
    iconEmoji: '🫧',
    isNew: true,
  },
  {
    id: 'cpstack',
    title: '命定 CP 疊疊消',
    shortTitle: 'CP 疊疊消',
    badge: 'NEW · 層疊配對',
    tagline: '精靈配對專屬魔法用具／水果 · 解開壓頂卡牌消出甜蜜 CP！',
    accentGradient: 'from-amber-500 to-pink-500',
    iconEmoji: '🪄',
    isNew: true,
  },
  {
    id: 'conveyor',
    title: '奇蹟甜品屋：極速出餐',
    shortTitle: '甜品輸送帶',
    badge: 'NEW · 45秒狂熱',
    tagline: '輸送帶訂單不停湧入 · 湊滿 5 連擊開啟 🔥 FEVER ×3 狂飆模式！',
    accentGradient: 'from-emerald-500 to-teal-400',
    iconEmoji: '🧁',
    isNew: true,
  },
  {
    id: 'tower',
    title: '糖果高塔大冒險',
    shortTitle: '百層爬塔',
    badge: 'NEW · 祝福爬塔',
    tagline: '迷霧層、CP 層與 Boss 洗牌層連環挑戰 · 過關任選王國祝福！',
    accentGradient: 'from-indigo-500 to-purple-500',
    iconEmoji: '🏰',
    isNew: true,
  },
  {
    id: 'duel',
    title: '同盤好友 PK 挑戰賽',
    shortTitle: '好友 PK 賽',
    badge: 'NEW · 戰書對戰',
    tagline: '生成同種子 60 秒限時盤面 · 複製 PK 戰書連結約閨蜜／情侶一齊搶分！',
    accentGradient: 'from-sky-500 to-pink-500',
    iconEmoji: '⚔️',
    isNew: true,
  },
];

export interface SpiritPropPairing {
  id: string;
  spiritId: string;
  propId: string;
  groupName: string;
  title: string;
  story: string;
  badgeColor: string;
}

export const SPIRIT_PROP_PAIRINGS: SpiritPropPairing[] = [
  {
    id: 'cp1',
    spiritId: 'cs6',
    propId: 'sp1',
    groupName: '星空魔法組',
    title: '星願見習魔女',
    story: '香芋星喵每晚都會舉起星願魔法杖，將夜空星屑拌入糖霜裡。',
    badgeColor: 'from-purple-500 to-amber-400',
  },
  {
    id: 'cp2',
    spiritId: 'cs15',
    propId: 'sp2',
    groupName: '黑糖甜飲組',
    title: '手搖甜品店主',
    story: '焦糖布丁柴最愛喺下午茶時段搖出雙倍厚奶蓋黑糖珍奶。',
    badgeColor: 'from-amber-500 to-orange-600',
  },
  {
    id: 'cp3',
    spiritId: 'cs31',
    propId: 'sp3',
    groupName: '夜星占卜組',
    title: '月夜星象師',
    story: '伯爵茶貓頭鷹望住魔法水晶球，能預言今日邊隻精靈會爆分！',
    badgeColor: 'from-indigo-500 to-violet-500',
  },
  {
    id: 'cp4',
    spiritId: 'cs18',
    propId: 'sp4',
    groupName: '紅絲絨香氛組',
    title: '調香室小精靈',
    story: '紅絲絨刺蝟把覆盆子與玫瑰花瓣釀成夢幻香水瓶，行過都香噴噴。',
    badgeColor: 'from-rose-500 to-pink-400',
  },
  {
    id: 'cp5',
    spiritId: 'cs8',
    propId: 'sp5',
    groupName: '雲端漫遊組',
    title: '雲端領航員',
    story: '棉花雲羊最鍾意坐上彩虹熱氣球，喺粉紅雲海上面午睡發夢。',
    badgeColor: 'from-sky-400 to-pink-400',
  },
  {
    id: 'cp6',
    spiritId: 'cs22',
    propId: 'sp6',
    groupName: '玫瑰旋律組',
    title: '花園首席樂手',
    story: '只要打開雲朵音樂盒，玫瑰馬卡龍鹿就會隨著華爾滋起舞。',
    badgeColor: 'from-pink-400 to-indigo-400',
  },
  {
    id: 'cp7',
    spiritId: 'cs9',
    propId: 'sp7',
    groupName: '盛夏瓜果組',
    title: '盛夏冰菓大王',
    story: '哈密瓜龍同西瓜切角精靈係夏天最佳冰鎮拍檔，一齊出現即刻降溫！',
    badgeColor: 'from-teal-500 to-rose-500',
  },
  {
    id: 'cp8',
    spiritId: 'cs13',
    propId: 'sp8',
    groupName: '抹茶和風組',
    title: '京都茶道大師',
    story: '抹茶紅豆龜慢悠悠用皇家抹茶茶壺沏好一壺暖茶，治癒每個午後。',
    badgeColor: 'from-emerald-600 to-teal-500',
  },
  {
    id: 'cp9',
    spiritId: 'cs11',
    propId: 'sp9',
    groupName: '紅粉信使組',
    title: '王國心動信使',
    story: '櫻桃甜狐每日都會巡視幸運糖果郵筒，準時派送每一封心動情書。',
    badgeColor: 'from-orange-400 to-rose-500',
  },
  {
    id: 'cp10',
    spiritId: 'cs25',
    propId: 'sp10',
    groupName: '氣泡電玩組',
    title: '像素彈珠冠軍',
    story: '蘇打水母觸手一齊按復古像素掌機，手速快到連連打破高分紀錄！',
    badgeColor: 'from-sky-400 to-teal-500',
  },
  {
    id: 'cp11',
    spiritId: 'cs7',
    propId: 'sp11',
    groupName: '草莓寫真組',
    title: '粉紅街拍攝影師',
    story: '草莓軟糖熊拎住草莓牛奶相機，專門捕捉王國每個甜甜笑容。',
    badgeColor: 'from-rose-400 to-pink-500',
  },
];

export interface SpiritLoreMeta {
  rarity: 'SSR' | 'SR' | 'R';
  title: string;
  quote: string;
}

export const SPIRIT_LORE_MAP: Record<string, SpiritLoreMeta> = {
  cs1: { rarity: 'SR', title: '海報元氣領隊', quote: '「軟綿綿彈彈波，任何煩惱撞落嚟都會彈走！」' },
  cs2: { rarity: 'SSR', title: '王國心動大使', quote: '「蜜桃香氣加滿分少女心，今日同你翻出最甜結局～」' },
  cs3: { rarity: 'SR', title: '維C 陽光小將', quote: '「朝氣滿滿咁出發，記住保持微笑呀！」' },
  cs4: { rarity: 'R', title: '薄荷冰涼蛙', quote: '「呱呱！加多球薄荷雪糕配消暑涼風最寫意。」' },
  cs5: { rarity: 'R', title: '焦糖布丁鳥', quote: '「圓滾滾唔係肥，只係裝滿咗卡士達醬！」' },
  cs6: { rarity: 'SR', title: '星空魔女喵', quote: '「喵～望一望天上紫星，幸運就會嚟敲門。」' },
  cs7: { rarity: 'SR', title: '軟糖街拍熊', quote: '「笑一個！我要影低你今日拎三星嘅瞬間！」' },
  cs8: { rarity: 'R', title: '棉花糖雲羊', quote: '「軟咩咩～借我條羊毛被畀你午睡十分鐘好唔好？」' },
  cs9: { rarity: 'SR', title: '蜜瓜小恐龍', quote: '「雖然係恐龍仔，但最驚無得食冰鎮哈密瓜！」' },
  cs10: { rarity: 'R', title: '葡萄冰極鵝', quote: '「企鵝滑冰速度其實快過你想嘅好多倍！」' },
  cs11: { rarity: 'SR', title: '櫻桃告白狐', quote: '「你封情書我已經幫你收好喺糖果郵筒啦～」' },
  cs12: { rarity: 'R', title: '海鹽奶蓋豹', quote: '「芝士奶蓋厚到要舔嘴唇，生活都要咁甜先得。」' },
  cs13: { rarity: 'SR', title: '宇治慢活龜', quote: '「唔使急，一啖紅豆配一啖回甘抹茶最剛剛好。」' },
  cs14: { rarity: 'SR', title: '氣泡深海鯨', quote: '「噴出彩虹蘇打泡泡，全海灣一齊 Party Time！」' },
  cs15: { rarity: 'SR', title: '布丁忠犬柴', quote: '「旺旺！我幫你睇實杯黑糖珍奶，絕不偷飲一啖！」' },
  cs17: { rarity: 'R', title: '雲端海鹽象', quote: '「用長鼻噴出淡淡海水味棉花糖雲朵。」' },
  cs18: { rarity: 'SR', title: '絲絨香氛刺', quote: '「背後雖然有刺，但其實全部係粉紅朱古力碎！」' },
  cs19: { rarity: 'R', title: '芝麻麻糬熊貓', quote: '「黑白雙拼剛剛好，邊行邊滾就最可愛。」' },
  cs20: { rarity: 'SSR', title: '荔枝彩夢獸', quote: '「角尖閃過粉紫微光，傳說遇見佢今日必破個人紀錄！」' },
  cs22: { rarity: 'SR', title: '馬卡龍小鹿', quote: '「玫瑰花瓣落滿草地，音樂盒響起我哋嘅圓舞曲。」' },
  cs23: { rarity: 'R', title: '榛子可可鼠', quote: '「面珠登塞滿松露朱古力，食一粒先再繼續玩！」' },
  cs25: { rarity: 'SR', title: '彈珠電玩母', quote: '「Biu Biu～有六隻觸手打機點會輸畀人類？」' },
  cs26: { rarity: 'SR', title: '太妃奶油獅', quote: '「蓬鬆鬃毛係黃金焦糖捲，霸氣中帶點甜！」' },
  cs31: { rarity: 'SR', title: '星象茶博士', quote: '「茶香散開嘅時候，水晶球入面會浮現明日運勢。」' },
  cs36: { rarity: 'SSR', title: '王國許願星龍', quote: '「合成罐終極傳說體！見到佢代表今日全場歐氣大爆發！」' },
  sp1: { rarity: 'SR', title: '魔法神器', quote: '「揮動星光棒，全盤同色糖果都會閃閃發亮。」' },
  sp2: { rarity: 'R', title: '甜飲神器', quote: '「半糖走冰多波霸，焦糖布丁柴指定御用能量水！」' },
  sp3: { rarity: 'SR', title: '占卜神器', quote: '「紫霧流轉，隱藏住下一關嘅致勝路線。」' },
  sp4: { rarity: 'SR', title: '香氛神器', quote: '「輕按一下噴嘴，空氣即刻充滿紅絲絨莓果甜香。」' },
  sp5: { rarity: 'R', title: '飛行神器', quote: '「搭載雙倍風力，帶棉花雲羊飛越高塔第九十九層！」' },
  sp6: { rarity: 'R', title: '旋律神器', quote: '「轉動發條就會奏出糖果王國最療癒嘅圓舞曲。」' },
  sp7: { rarity: 'R', title: '盛夏水果', quote: '「脆卜卜無籽紅肉西瓜！哈密瓜龍最愛嘅夏日絕配。」' },
  sp8: { rarity: 'SR', title: '茶道神器', quote: '「釉面泛住翡翠光澤，茶香一飄出嚟就令人放鬆。」' },
  sp9: { rarity: 'SR', title: '傳情神器', quote: '「投進郵筒嘅心意，無論隔幾遠都會甜住送到。」' },
  sp10: { rarity: 'SR', title: '電玩神器', quote: '「經典掌機配色，蘇打水母連擊破關必備神器！」' },
  sp11: { rarity: 'SR', title: '寫真神器', quote: '「菲林裝滿粉紅濾鏡，影咩都變成夢幻糖果畫報！」' },
};

export interface MergeTierConfig {
  tier: number;
  item: ThemeItem;
  radius: number;
  points: number;
  ringColor: string;
  bgTint: string;
}

const ITEM_BY_ID = new Map(CANDY_SPIRIT_ITEMS.map((item) => [item.id, item]));

const MERGE_TIER_SPECS: Array<{
  id: string;
  radius: number;
  points: number;
  ringColor: string;
  bgTint: string;
}> = [
  { id: 'cs1', radius: 17, points: 10, ringColor: '#38bdf8', bgTint: '#e0f2fe' },
  { id: 'cs5', radius: 22, points: 25, ringColor: '#eab308', bgTint: '#fef9c3' },
  { id: 'cs4', radius: 27, points: 45, ringColor: '#10b981', bgTint: '#d1fae5' },
  { id: 'cs6', radius: 33, points: 80, ringColor: '#a855f7', bgTint: '#f3e8ff' },
  { id: 'cs7', radius: 39, points: 130, ringColor: '#f43f5e', bgTint: '#ffe4e6' },
  { id: 'cs15', radius: 46, points: 200, ringColor: '#d97706', bgTint: '#fef3c7' },
  { id: 'cs26', radius: 53, points: 300, ringColor: '#f59e0b', bgTint: '#ffedd5' },
  { id: 'cs17', radius: 60, points: 450, ringColor: '#06b6d4', bgTint: '#cffafe' },
  { id: 'cs20', radius: 68, points: 700, ringColor: '#d946ef', bgTint: '#fae8ff' },
  { id: 'cs36', radius: 77, points: 1200, ringColor: '#ec4899', bgTint: '#fce7f3' },
];

export const MERGE_EVOLUTION_CHAIN: MergeTierConfig[] = MERGE_TIER_SPECS.map((spec, idx) => ({
  tier: idx,
  item: ITEM_BY_ID.get(spec.id) || CANDY_SPIRIT_ITEMS[idx],
  radius: spec.radius,
  points: spec.points,
  ringColor: spec.ringColor,
  bgTint: spec.bgTint,
}));

export function getSpiritById(id: string): ThemeItem | undefined {
  return ITEM_BY_ID.get(id);
}

export function getCpPartnerId(itemId: string): { pair: SpiritPropPairing; partnerId: string } | null {
  for (const pair of SPIRIT_PROP_PAIRINGS) {
    if (pair.spiritId === itemId) return { pair, partnerId: pair.propId };
    if (pair.propId === itemId) return { pair, partnerId: pair.spiritId };
  }
  return null;
}
