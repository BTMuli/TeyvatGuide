/**
 * @file data app index
 * @description data app index
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.3
 */

// Data
import achievements from "./achievements.json";
import achievementSeries from "./achievementSeries.json";
import GCG from "./GCG.json";
import nameCards from "./nameCards.json";
import calendar from "./calendar.json";

export const AppDataList = [
  {
    name: "achievements.json",
    data: achievements as Record<number, BTMuli.Genshin.Achievement>,
  },
  {
    name: "achievementSeries.json",
    data: achievementSeries as Record<number, BTMuli.Genshin.AchievementSeries>,
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
    name: "calendar.json",
    data: calendar as Record<number, BTMuli.Genshin.Calendar.Data>,
  },
];

export const AppData = {
  achievements: achievements as Record<number, BTMuli.Genshin.Achievement>,
  achievementSeries: achievementSeries as Record<number, BTMuli.Genshin.AchievementSeries>,
  GCG: GCG as BTMuli.Genshin.Wiki.GCG.BriefInfo[],
  nameCards: nameCards as Record<number, BTMuli.Genshin.NameCard[]>,
  calendar: calendar as Record<number, BTMuli.Genshin.Calendar.Data>,
};
