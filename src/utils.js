// src/utils.js

export const AVATARS_BY_LEVEL = {
  1:  ["🦊","🐼","🦋","🐸","🦄"],
  3:  ["🐙","🦁","🐺","🐨","🦝"],
  5:  ["🦩","🐬","🐯","🦅","🐲"],
  7:  ["🌟","🔥","⚡","🎯","🚀"],
  9:  ["👑","💎","🌈","🦋","🔮"],
  11: ["🧬","🌌","⚛️","🎭","🏆"],
};
export const ALL_AVATARS = Object.values(AVATARS_BY_LEVEL).flat();
export const AVATARS  = AVATARS_BY_LEVEL[1];
export const TAGS     = ["work","study","health","creative","social","errands","other"];
export const MOODS = [
  { e:"😄", l:"Happy",       c:"#FDCB6E" },
  { e:"🥰", l:"Loved",       c:"#FD79A8" },
  { e:"😎", l:"Confident",   c:"#6C63FF" },
  { e:"⚡", l:"Energized",   c:"#55EFC4" },
  { e:"🎯", l:"Focused",     c:"#00CEC9" },
  { e:"😌", l:"Calm",        c:"#74B9FF" },
  { e:"🙂", l:"Okay",        c:"#A29BFE" },
  { e:"😐", l:"Meh",         c:"#b2bec3" },
  { e:"😔", l:"Down",        c:"#636e72" },
  { e:"😰", l:"Anxious",     c:"#FF7675" },
  { e:"😤", l:"Frustrated",  c:"#E17055" },
  { e:"😢", l:"Sad",         c:"#74B9FF" },
  { e:"😵‍💫", l:"Overwhelmed", c:"#FF6B6B" },
  { e:"🤯", l:"Scattered",   c:"#fd79a8" },
  { e:"😴", l:"Exhausted",   c:"#A29BFE" },
  { e:"🥱", l:"Bored",       c:"#b2bec3" },
  { e:"😤", l:"Stressed",    c:"#d63031" },
  { e:"🤩", l:"Excited",     c:"#FDCB6E" },
  { e:"😇", l:"Grateful",    c:"#55EFC4" },
  { e:"🤔", l:"Unsure",      c:"#74B9FF" },
];
export const HABIT_ICONS   = ["🌟","💧","🏃","📚","🧘","💪","🥗","😴","🎨","🎵","✍️","🧹","🌿","🧠","❤️","🎯"];
export const HABIT_COLORS  = ["#6C63FF","#FDCB6E","#55EFC4","#FF6B6B","#A29BFE","#74B9FF","#FD79A8","#00CEC9"];

export const LEVEL_XP    = [0,100,250,500,900,1400,2100,3000,4200,5700,7500,9500,12000];
export const LEVEL_NAMES = ["Seedling","Sprout","Bloom","Spark","Flame","Comet","Nova","Nebula","Galaxy","Cosmos","Legend","Mythic","Eternal"];

// Streak flame colors by level
export const STREAK_COLORS = { 1:"#FDCB6E", 3:"#FF6B6B", 5:"#74B9FF", 7:"#A29BFE", 9:"#55EFC4", 11:"#FD79A8" };
export function streakColor(level) {
  const keys = Object.keys(STREAK_COLORS).map(Number).sort((a,b)=>b-a);
  for (const k of keys) if (level >= k) return STREAK_COLORS[k];
  return STREAK_COLORS[1];
}

// Level unlock gates
export const LEVEL_UNLOCKS = {
  1:  { maxSquads: 1, streakShields: 0, canCreateSquad: true  }, // everyone gets 1 free squad
  3:  { maxSquads: 1, streakShields: 1, canCreateSquad: true  },
  5:  { maxSquads: 2, streakShields: 1, canCreateSquad: true  },
  7:  { maxSquads: 3, streakShields: 2, canCreateSquad: true  },
  9:  { maxSquads: 4, streakShields: 2, canCreateSquad: true  },
  11: { maxSquads: 6, streakShields: 3, canCreateSquad: true  },
};
export function getLevelUnlocks(level) {
  const keys = Object.keys(LEVEL_UNLOCKS).map(Number).sort((a,b)=>b-a);
  for (const k of keys) if (level >= k) return LEVEL_UNLOCKS[k];
  return LEVEL_UNLOCKS[1];
}

export function uid()    { return Math.random().toString(36).slice(2,10); }
export function today()  { return new Date().toISOString().slice(0,10); }

export function getLevel(xp) {
  for (let i = LEVEL_XP.length - 1; i >= 0; i--) if (xp >= LEVEL_XP[i]) return i + 1;
  return 1;
}
export function xpProgress(xp) {
  const lvl = getLevel(xp);
  if (lvl >= LEVEL_XP.length) return { pct: 100, earned: 0, needed: 0 };
  const cur = LEVEL_XP[lvl - 1], next = LEVEL_XP[lvl];
  return { pct: ((xp - cur) / (next - cur)) * 100, earned: xp - cur, needed: next - cur };
}
export function levelName(xp) { return LEVEL_NAMES[getLevel(xp) - 1]; }
export function getUnlockedAvatars(level) {
  return Object.entries(AVATARS_BY_LEVEL)
    .filter(([minLvl]) => level >= Number(minLvl))
    .flatMap(([, avatars]) => avatars);
}

export const TYPE_ICONS  = { xp:"✨", task:"✅", habit:"🔥", mood:"💭", join:"👋", message:"💬", gold:"🪙" };
export const TYPE_COLORS = { xp:"#FDCB6E", task:"#55EFC4", habit:"#FF6B6B", mood:"#A29BFE", join:"#74B9FF", message:"#E8E9F3", gold:"#FDCB6E" };
