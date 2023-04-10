/**
 * @file data app index
 * @description data app index
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

// Data
import achievements from "./achievements.json";
import achievementSeries from "./achievementSeries.json";
import GCG from "./GCG.json";
import nameCards from "./nameCards.json";
import calendar from "./calendar.json";
// Interface
import { type BaseCard } from "../../interface/GCG";

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
    data: GCG as BaseCard[],
  },
  {
    name: "nameCards.json",
    data: nameCards as Record<number, BTMuli.Genshin.NameCard[]>,
  },
  {
    name: "calendar.json",
    data: calendar as Record<number, BTMuli.Genshin.Calendar.CalendarData>,
  },
];

export const AppData = {
  achievements: achievements as Record<number, BTMuli.Genshin.Achievement>,
  achievementSeries: achievementSeries as Record<number, BTMuli.Genshin.AchievementSeries>,
  GCG: GCG as BaseCard[],
  nameCards: nameCards as Record<number, BTMuli.Genshin.NameCard[]>,
  calendar: calendar as Record<number, BTMuli.Genshin.Calendar.CalendarData>,
};
