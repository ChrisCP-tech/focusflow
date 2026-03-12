// src/utils.js

export const AVATARS  = ["🦊","🐼","🦋","🐸","🦄","🐙","🦁","🐺","🐨","🦝","🦩","🐬"];
export const TAGS     = ["work","study","health","creative","social","errands","other"];
export const MOODS    = [
  { e:"😵‍💫", l:"Overwhelmed", c:"#FF6B6B" },
  { e:"😴",   l:"Low Energy",  c:"#A29BFE" },
  { e:"😐",   l:"Meh",         c:"#74B9FF" },
  { e:"🙂",   l:"Okay",        c:"#55EFC4" },
  { e:"⚡",   l:"Hyperfocus!", c:"#FDCB6E" },
];
export const HABIT_ICONS   = ["🌟","💧","🏃","📚","🧘","💪","🥗","😴","🎨","🎵","✍️","🧹","🌿","🧠","❤️","🎯"];
export const HABIT_COLORS  = ["#6C63FF","#FDCB6E","#55EFC4","#FF6B6B","#A29BFE","#74B9FF","#FD79A8","#00CEC9"];
export const LEVEL_XP      = [0,100,250,500,900,1400,2100,3000,4200,5700,7500];
export const LEVEL_NAMES   = ["Seedling","Sprout","Bloom","Spark","Flame","Comet","Nova","Nebula","Galaxy","Cosmos","Legend"];

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

export const TYPE_ICONS  = { xp:"✨", task:"✅", habit:"🔥", mood:"💭", join:"👋", message:"💬" };
export const TYPE_COLORS = { xp:"#FDCB6E", task:"#55EFC4", habit:"#FF6B6B", mood:"#A29BFE", join:"#74B9FF", message:"#E8E9F3" };
