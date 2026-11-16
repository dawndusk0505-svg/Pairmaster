import spiritBluePuff from '../assets/images/spirit_blue_puff_1794759568554.jpg';
import spiritPinkBunny from '../assets/images/spirit_pink_bunny_1794759568204.jpg';
import spiritOrangeCitrus from '../assets/images/spirit_orange_citrus_1794759569187.jpg';
import spiritMintFrog from '../assets/images/spirit_mint_frog_1794759569443.jpg';
import spiritLemonChick from '../assets/images/spirit_lemon_chick_1794759570724.jpg';
import spiritLavenderCat from '../assets/images/spirit_lavender_cat_1794759571232.jpg';
import spiritStrawberryBear from '../assets/images/spirit_strawberry_bear_1794759571374.jpg';
import spiritCloudLamb from '../assets/images/spirit_cloud_lamb_1794759571925.jpg';
import spiritMelonDino from '../assets/images/spirit_melon_dino_1794759573621.jpg';
import spiritGrapePenguin from '../assets/images/spirit_grape_penguin_1794759574222.jpg';
import spiritCherryFox from '../assets/images/spirit_cherry_fox_1794759573611.jpg';
import spiritMilkSeal from '../assets/images/spirit_milk_seal_1794759575080.jpg';

export interface ThemeItem {
  id: string;
  name: string;
  symbol: string;
  color: string;
  imageUrl?: string;
  category?: string;
}

export interface MatchTheme {
  id: string;
  name: string;
  enName: string;
  description: string;
  icon: string;
  items: ThemeItem[];
}

export const CANDY_SPIRIT_ITEMS: ThemeItem[] = [
  // 海報三大主角精靈
  { id: 'cs1', name: '藍絨波波', symbol: '🩵', color: 'text-sky-400', imageUrl: spiritBluePuff, category: '海報主角' },
  { id: 'cs2', name: '蜜桃粉兔', symbol: '🐰', color: 'text-pink-500', imageUrl: spiritPinkBunny, category: '海報主角' },
  { id: 'cs3', name: '暖陽小橘', symbol: '🍊', color: 'text-amber-500', imageUrl: spiritOrangeCitrus, category: '海報主角' },
  // 9 位全新延伸糖果精靈夥伴
  { id: 'cs4', name: '薄荷萌蛙', symbol: '🐸', color: 'text-emerald-500', imageUrl: spiritMintFrog, category: '新夥伴' },
  { id: 'cs5', name: '布丁小雞', symbol: '🐥', color: 'text-yellow-500', imageUrl: spiritLemonChick, category: '新夥伴' },
  { id: 'cs6', name: '香芋星喵', symbol: '🐱', color: 'text-purple-400', imageUrl: spiritLavenderCat, category: '新夥伴' },
  { id: 'cs7', name: '草莓軟糖熊', symbol: '🐻', color: 'text-rose-500', imageUrl: spiritStrawberryBear, category: '新夥伴' },
  { id: 'cs8', name: '棉花雲羊', symbol: '🐑', color: 'text-amber-400', imageUrl: spiritCloudLamb, category: '新夥伴' },
  { id: 'cs9', name: '哈密瓜龍', symbol: '🦕', color: 'text-teal-500', imageUrl: spiritMelonDino, category: '新夥伴' },
  { id: 'cs10', name: '葡萄企鵝', symbol: '🐧', color: 'text-indigo-400', imageUrl: spiritGrapePenguin, category: '新夥伴' },
  { id: 'cs11', name: '櫻桃甜狐', symbol: '🦊', color: 'text-orange-400', imageUrl: spiritCherryFox, category: '新夥伴' },
  { id: 'cs12', name: '奶蓋海豹', symbol: '🦭', color: 'text-sky-400', imageUrl: spiritMilkSeal, category: '新夥伴' },
];

export const MATCH_THEMES: MatchTheme[] = [
  {
    id: 'candy-spirits',
    name: '糖果萌星',
    enName: 'Candy Match Spirits',
    description: '海報 3 位元祖小精靈 × 9 位全新 3D 糖果精靈夥伴',
    icon: '🍬',
    items: CANDY_SPIRIT_ITEMS,
  },
  {
    id: 'pets',
    name: '萌寵家族',
    enName: 'Cute Pets',
    description: '療癒溫暖的超萌動物小夥伴',
    icon: '🐾',
    items: [
      { id: 'p1', name: '柴犬', symbol: '🐕', color: 'text-amber-400' },
      { id: 'p2', name: '小貓', symbol: '🐱', color: 'text-orange-400' },
      { id: 'p3', name: '大熊貓', symbol: '🐼', color: 'text-slate-100' },
      { id: 'p4', name: '紅狐狸', symbol: '🦊', color: 'text-orange-500' },
      { id: 'p5', name: '企鵝', symbol: '🐧', color: 'text-sky-400' },
      { id: 'p6', name: '海獺', symbol: '🦦', color: 'text-amber-600' },
      { id: 'p7', name: '白兔', symbol: '🐰', color: 'text-pink-300' },
      { id: 'p8', name: '無尾熊', symbol: '🐨', color: 'text-slate-300' },
      { id: 'p9', name: '柯基犬', symbol: '🐶', color: 'text-yellow-500' },
      { id: 'p10', name: '倉鼠', symbol: '🐹', color: 'text-amber-300' },
      { id: 'p11', name: '小海豹', symbol: '🦭', color: 'text-blue-200' },
      { id: 'p12', name: '貓頭鷹', symbol: '🦉', color: 'text-amber-700' },
      { id: 'p13', name: '水豚君', symbol: '🦫', color: 'text-amber-800' },
      { id: 'p14', name: '羊駝', symbol: '🦙', color: 'text-stone-300' },
      { id: 'p15', name: '刺蝟', symbol: '🦔', color: 'text-amber-500' },
      { id: 'p16', name: '梅花鹿', symbol: '🦌', color: 'text-orange-300' },
      { id: 'p17', name: '海豚', symbol: '🐬', color: 'text-cyan-400' },
      { id: 'p18', name: '小青蛙', symbol: '🐸', color: 'text-emerald-400' },
    ],
  },
  {
    id: 'food',
    name: '甜心點心',
    enName: 'Sweet Treats',
    description: '草莓蛋糕、馬卡龍與夢幻甜品',
    icon: '🍰',
    items: [
      { id: 'f1', name: '草莓蛋糕', symbol: '🍰', color: 'text-pink-400' },
      { id: 'f2', name: '珍珠奶茶', symbol: '🧋', color: 'text-amber-600' },
      { id: 'f3', name: '法式馬卡龍', symbol: '🧁', color: 'text-purple-400' },
      { id: 'f4', name: '甜甜圈', symbol: '🍩', color: 'text-pink-500' },
      { id: 'f5', name: '抹茶甜筒', symbol: '🍦', color: 'text-emerald-400' },
      { id: 'f6', name: '焦糖布丁', symbol: '🍮', color: 'text-amber-400' },
      { id: 'f7', name: '法式可頌', symbol: '🥐', color: 'text-yellow-600' },
      { id: 'f8', name: '日式三色丸', symbol: '🍡', color: 'text-rose-300' },
      { id: 'f9', name: '蜂蜜鬆餅', symbol: '🥞', color: 'text-amber-400' },
      { id: 'f10', name: '現烤舒芙蕾', symbol: '🥧', color: 'text-amber-500' },
      { id: 'f11', name: '棒棒糖', symbol: '🍭', color: 'text-pink-500' },
      { id: 'f12', name: '彩虹水果糖', symbol: '🍬', color: 'text-purple-400' },
      { id: 'f13', name: '櫻桃芭菲', symbol: '🍧', color: 'text-rose-400' },
      { id: 'f14', name: '生巧松露', symbol: '🍫', color: 'text-amber-800' },
      { id: 'f15', name: '熱拿鐵', symbol: '☕', color: 'text-amber-700' },
      { id: 'f16', name: '水果可麗餅', symbol: '🌮', color: 'text-yellow-500' },
      { id: 'f17', name: '握壽司', symbol: '🍣', color: 'text-rose-400' },
      { id: 'f18', name: '拉麵', symbol: '🍜', color: 'text-amber-500' },
    ],
  },
  {
    id: 'zodiac',
    name: '星象宇宙',
    enName: 'Cosmos & Zodiac',
    description: '神秘幽深的黃道十二宮與行星',
    icon: '🪐',
    items: [
      { id: 'z1', name: '牡羊座', symbol: '♈', color: 'text-red-400' },
      { id: 'z2', name: '金牛座', symbol: '♉', color: 'text-emerald-400' },
      { id: 'z3', name: '雙子座', symbol: '♊', color: 'text-yellow-300' },
      { id: 'z4', name: '巨蟹座', symbol: '♋', color: 'text-sky-300' },
      { id: 'z5', name: '獅子座', symbol: '♌', color: 'text-amber-400' },
      { id: 'z6', name: '處女座', symbol: '♍', color: 'text-stone-300' },
      { id: 'z7', name: '天秤座', symbol: '♎', color: 'text-rose-300' },
      { id: 'z8', name: '天蠍座', symbol: '♏', color: 'text-purple-400' },
      { id: 'z9', name: '射手座', symbol: '♐', color: 'text-indigo-400' },
      { id: 'z10', name: '摩羯座', symbol: '♑', color: 'text-slate-400' },
      { id: 'z11', name: '水瓶座', symbol: '♒', color: 'text-cyan-400' },
      { id: 'z12', name: '雙魚座', symbol: '♓', color: 'text-teal-300' },
      { id: 'z13', name: '土星環', symbol: '🪐', color: 'text-amber-500' },
      { id: 'z14', name: '超新星', symbol: '⭐', color: 'text-yellow-200' },
      { id: 'z15', name: '流星雨', symbol: '🌠', color: 'text-purple-300' },
      { id: 'z16', name: '彎月影', symbol: '🌙', color: 'text-amber-200' },
      { id: 'z17', name: '烈日陽', symbol: '☀️', color: 'text-orange-400' },
      { id: 'z18', name: '望遠鏡', symbol: '🔭', color: 'text-blue-400' },
    ],
  },
  {
    id: 'fantasy',
    name: '奇幻魔法',
    enName: 'Fantasy Realm',
    description: '傳奇冒險的魔導器物與秘寶',
    icon: '🪄',
    items: [
      { id: 'm1', name: '生命藥水', symbol: '🧪', color: 'text-emerald-400' },
      { id: 'm2', name: '魔導魔杖', symbol: '🪄', color: 'text-pink-400' },
      { id: 'm3', name: '璀璨水晶', symbol: '🔮', color: 'text-purple-400' },
      { id: 'm4', name: '傳奇寶劍', symbol: '⚔️', color: 'text-sky-300' },
      { id: 'm5', name: '古代符文', symbol: '📜', color: 'text-amber-300' },
      { id: 'm6', name: '守護神盾', symbol: '🛡️', color: 'text-blue-400' },
      { id: 'm7', name: '王國之冠', symbol: '👑', color: 'text-yellow-400' },
      { id: 'm8', name: '魔法指環', symbol: '💍', color: 'text-cyan-300' },
      { id: 'm9', name: '神秘鑰匙', symbol: '🗝️', color: 'text-amber-500' },
      { id: 'm10', name: '鳳凰羽毛', symbol: '🪶', color: 'text-orange-400' },
      { id: 'm11', name: '寶藏箱', symbol: '🪙', color: 'text-yellow-300' },
      { id: 'm12', name: '煉金聖杯', symbol: '🏆', color: 'text-amber-400' },
      { id: 'm13', name: '精靈豎琴', symbol: '🪕', color: 'text-yellow-600' },
      { id: 'm14', name: '時光沙漏', symbol: '⏳', color: 'text-amber-200' },
      { id: 'm15', name: '元素明珠', symbol: '💎', color: 'text-cyan-400' },
      { id: 'm16', name: '黑夜油燈', symbol: '🏮', color: 'text-rose-400' },
      { id: 'm17', name: '守護符印', symbol: '🧿', color: 'text-indigo-400' },
      { id: 'm18', name: '指南針', symbol: '🧭', color: 'text-emerald-300' },
    ],
  },
];

export interface DifficultyConfig {
  id: 'easy' | 'medium' | 'hard' | 'expert';
  label: string;
  rows: number;
  cols: number;
  totalCards: number;
  timeLimitSec: number;
  starMovesThreshold: [number, number];
}

export const DIFFICULTY_PRESETS: DifficultyConfig[] = [
  {
    id: 'easy',
    label: '輕鬆入門 (4x3)',
    rows: 3,
    cols: 4,
    totalCards: 12,
    timeLimitSec: 90,
    starMovesThreshold: [10, 16],
  },
  {
    id: 'medium',
    label: '標準挑戰 (4x4)',
    rows: 4,
    cols: 4,
    totalCards: 16,
    timeLimitSec: 120,
    starMovesThreshold: [14, 24],
  },
  {
    id: 'hard',
    label: '進階燒腦 (6x4)',
    rows: 4,
    cols: 6,
    totalCards: 24,
    timeLimitSec: 180,
    starMovesThreshold: [22, 36],
  },
  {
    id: 'expert',
    label: '終極大師 (6x6)',
    rows: 6,
    cols: 6,
    totalCards: 36,
    timeLimitSec: 240,
    starMovesThreshold: [36, 56],
  },
];
