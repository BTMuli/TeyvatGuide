/**
 * @file data app index
 * @description data app index
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.4
 */

// Data
import achievements from "./achievements.json";
import achievementSeries from "./achievementSeries.json";
import calendar from "./calendar.json";
import character from "./character.json";
import GCG from "./GCG.json";
import nameCards from "./nameCards.json";
import weapon from "./weapon.json";

export const AppDataList = [
  {
    name: "achievements.json",
    data: achievements as BTMuli.Genshin.Achievement[],
  },
  {
    name: "achievementSeries.json",
    data: achievementSeries as BTMuli.Genshin.AchievementSeries[],
  },
  {
    name: "calendar.json",
    data: calendar as Record<number, BTMuli.Genshin.Calendar.Data>,
  },
  {
    name: "character.json",
    data: character as BTMuli.Genshin.Wiki.Character.BriefInfo[],
  },
  {
    name: "GCG.json",
    data: GCG as BTMuli.Genshin.Wiki.GCG.BriefInfo[],
  },
  {
    name: "nameCards.json",
    data: nameCards as Record<number, BTMuli.Genshin.NameCard[]>,
  },
  {
    name: "weapon.json",
    data: weapon as BTMuli.Genshin.Wiki.Weapon.BriefInfo[],
  },
];

export const AppData = {
  achievements: achievements as Record<number, BTMuli.Genshin.Achievement>,
  achievementSeries: achievementSeries as Record<number, BTMuli.Genshin.AchievementSeries>,
  calendar: calendar as Record<number, BTMuli.Genshin.Calendar.Data>,
  character: character as BTMuli.Genshin.Wiki.Character.BriefInfo[],
  GCG: GCG as BTMuli.Genshin.Wiki.GCG.BriefInfo[],
  nameCards: nameCards as Record<number, BTMuli.Genshin.NameCard[]>,
  weapon: weapon as BTMuli.Genshin.Wiki.Weapon.BriefInfo[],
};
