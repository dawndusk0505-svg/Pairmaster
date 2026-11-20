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
import spiritMatchaTurtle from '../assets/images/spirit_matcha_turtle_1795178238628.jpg';
import spiritBlueberryWhale from '../assets/images/spirit_blueberry_whale_1795178239051.jpg';
import spiritCaramelShiba from '../assets/images/spirit_caramel_shiba_1795178239272.jpg';
import spiritSeasaltElephant from '../assets/images/spirit_seasalt_elephant_1795178238737.jpg';
import spiritVelvetHedgehog from '../assets/images/spirit_velvet_hedgehog_1795178238194.jpg';
import spiritSesamePanda from '../assets/images/spirit_sesame_panda_1795178239510.jpg';
import spiritLycheeUnicorn from '../assets/images/spirit_lychee_unicorn_1795178239472.jpg';
import spiritRoseDeer from '../assets/images/spirit_rose_deer_1795178239097.jpg';
import spiritCocoaSquirrel from '../assets/images/spirit_cocoa_squirrel_1795178238529.jpg';
import spiritSodaJellyfish from '../assets/images/spirit_soda_jellyfish_1795178239077.jpg';
import spiritToffeeLion from '../assets/images/spirit_toffee_lion_1795178239267.jpg';
import spiritEarlgreyOwl from '../assets/images/spirit_earlgrey_owl_1795178238973.jpg';
import spiritStarAxolotl from '../assets/images/spirit_star_axolotl_1795178238925.jpg';
import propStarWand from '../assets/images/prop_star_wand_1795178642249.jpg';
import propBobaCup from '../assets/images/prop_boba_cup_1795178642080.jpg';
import propCrystalBall from '../assets/images/prop_crystal_ball_1795178642309.jpg';
import propPerfumeBottle from '../assets/images/prop_perfume_bottle_1795178642613.jpg';
import propRainbowBalloon from '../assets/images/prop_rainbow_balloon_1795178642708.jpg';
import propMusicBox from '../assets/images/prop_music_box_1795178642273.jpg';
import propWatermelonSlice from '../assets/images/prop_watermelon_slice_1795178642025.jpg';
import propMatchaTeapot from '../assets/images/prop_matcha_teapot_1795178642847.jpg';
import propLoveMailbox from '../assets/images/prop_love_mailbox_1795178642188.jpg';
import propCandyConsole from '../assets/images/prop_candy_console_1795178642074.jpg';
import propBerryCamera from '../assets/images/prop_berry_camera_1795178642286.jpg';

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
  // 高辨識度動物糖果精靈（已篩走撞色撞樣款式）
  { id: 'cs4', name: '薄荷萌蛙', symbol: '🐸', color: 'text-emerald-500', imageUrl: spiritMintFrog, category: '糖果精靈' },
  { id: 'cs5', name: '布丁小雞', symbol: '🐥', color: 'text-yellow-500', imageUrl: spiritLemonChick, category: '糖果精靈' },
  { id: 'cs6', name: '香芋星喵', symbol: '🐱', color: 'text-purple-400', imageUrl: spiritLavenderCat, category: '糖果精靈' },
  { id: 'cs7', name: '草莓軟糖熊', symbol: '🐻', color: 'text-rose-500', imageUrl: spiritStrawberryBear, category: '糖果精靈' },
  { id: 'cs8', name: '棉花雲羊', symbol: '🐑', color: 'text-amber-400', imageUrl: spiritCloudLamb, category: '糖果精靈' },
  { id: 'cs9', name: '哈密瓜龍', symbol: '🦕', color: 'text-teal-500', imageUrl: spiritMelonDino, category: '糖果精靈' },
  { id: 'cs10', name: '葡萄企鵝', symbol: '🐧', color: 'text-indigo-400', imageUrl: spiritGrapePenguin, category: '糖果精靈' },
  { id: 'cs11', name: '櫻桃甜狐', symbol: '🦊', color: 'text-orange-400', imageUrl: spiritCherryFox, category: '糖果精靈' },
  { id: 'cs12', name: '奶蓋海豹', symbol: '🦭', color: 'text-sky-400', imageUrl: spiritMilkSeal, category: '糖果精靈' },
  { id: 'cs13', name: '抹茶紅豆龜', symbol: '🐢', color: 'text-emerald-600', imageUrl: spiritMatchaTurtle, category: '糖果精靈' },
  { id: 'cs14', name: '藍莓泡泡鯨', symbol: '🐳', color: 'text-blue-500', imageUrl: spiritBlueberryWhale, category: '糖果精靈' },
  { id: 'cs15', name: '焦糖布丁柴', symbol: '🐕', color: 'text-amber-600', imageUrl: spiritCaramelShiba, category: '糖果精靈' },
  { id: 'cs17', name: '海鹽雲朵象', symbol: '🐘', color: 'text-cyan-500', imageUrl: spiritSeasaltElephant, category: '糖果精靈' },
  { id: 'cs18', name: '紅絲絨刺蝟', symbol: '🦔', color: 'text-rose-500', imageUrl: spiritVelvetHedgehog, category: '糖果精靈' },
  { id: 'cs19', name: '黑芝麻熊貓', symbol: '🐼', color: 'text-slate-600', imageUrl: spiritSesamePanda, category: '糖果精靈' },
  { id: 'cs20', name: '荔枝夢獨角', symbol: '🦄', color: 'text-fuchsia-400', imageUrl: spiritLycheeUnicorn, category: '糖果精靈' },
  { id: 'cs22', name: '玫瑰馬卡龍鹿', symbol: '🦌', color: 'text-pink-400', imageUrl: spiritRoseDeer, category: '糖果精靈' },
  { id: 'cs23', name: '可可松鼠', symbol: '🐿️', color: 'text-amber-700', imageUrl: spiritCocoaSquirrel, category: '糖果精靈' },
  { id: 'cs25', name: '蘇打水母', symbol: '🪼', color: 'text-sky-400', imageUrl: spiritSodaJellyfish, category: '糖果精靈' },
  { id: 'cs26', name: '太妃糖獅', symbol: '🦁', color: 'text-amber-500', imageUrl: spiritToffeeLion, category: '糖果精靈' },
  { id: 'cs31', name: '伯爵茶貓頭鷹', symbol: '🦉', color: 'text-indigo-400', imageUrl: spiritEarlgreyOwl, category: '糖果精靈' },
  { id: 'cs36', name: '星願蠑螈', symbol: '✨', color: 'text-violet-500', imageUrl: spiritStarAxolotl, category: '糖果精靈' },
  // 精靈魔法用具與鮮明水果化身（幾何輪廓＋高對比色）
  { id: 'sp1', name: '星願魔法杖', symbol: '🪄', color: 'text-amber-400', imageUrl: propStarWand, category: '精靈用具' },
  { id: 'sp2', name: '黑糖珍奶杯', symbol: '🧋', color: 'text-amber-700', imageUrl: propBobaCup, category: '精靈用具' },
  { id: 'sp3', name: '魔法水晶球', symbol: '🔮', color: 'text-violet-500', imageUrl: propCrystalBall, category: '精靈用具' },
  { id: 'sp4', name: '夢幻香水瓶', symbol: '🎀', color: 'text-rose-500', imageUrl: propPerfumeBottle, category: '精靈用具' },
  { id: 'sp5', name: '彩虹熱氣球', symbol: '🎈', color: 'text-sky-500', imageUrl: propRainbowBalloon, category: '精靈用具' },
  { id: 'sp6', name: '雲朵音樂盒', symbol: '🎵', color: 'text-indigo-500', imageUrl: propMusicBox, category: '精靈用具' },
  { id: 'sp7', name: '西瓜切角精靈', symbol: '🍉', color: 'text-red-500', imageUrl: propWatermelonSlice, category: '水果化身' },
  { id: 'sp8', name: '皇家抹茶茶壺', symbol: '🫖', color: 'text-emerald-600', imageUrl: propMatchaTeapot, category: '精靈用具' },
  { id: 'sp9', name: '幸運糖果郵筒', symbol: '💌', color: 'text-rose-600', imageUrl: propLoveMailbox, category: '精靈用具' },
  { id: 'sp10', name: '復古像素掌機', symbol: '🎮', color: 'text-teal-500', imageUrl: propCandyConsole, category: '精靈用具' },
  { id: 'sp11', name: '草莓牛奶相機', symbol: '📷', color: 'text-pink-500', imageUrl: propBerryCamera, category: '精靈用具' },
];

export const MATCH_THEMES: MatchTheme[] = [
  {
    id: 'candy-spirits',
    name: '糖果萌星',
    enName: 'Candy Match Spirits',
    description: '25 位零撞樣糖果精靈 × 11 款精靈用具與水果化身',
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
