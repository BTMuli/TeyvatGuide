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
import { type Achievement, type AchievementSeries } from "../../interface/Achievements";
import { type Map } from "../../interface/Base";
import { type BaseCard } from "../../interface/GCG";
import { type NameCard } from "../../interface/NameCard";
import { type CalendarData } from "../../interface/Calendar";

export const AppDataList = [
  {
    name: "achievements.json",
    data: achievements as Map<Achievement>,
  },
  {
    name: "achievementSeries.json",
    data: achievementSeries as Map<AchievementSeries>,
  },
  {
    name: "GCG.json",
    data: GCG as BaseCard[],
  },
  {
    name: "nameCards.json",
    data: nameCards as unknown as Map<NameCard[]>,
  },
  {
    name: "calendar.json",
    data: calendar as Map<CalendarData>,
  },
];

export const AppData = {
  achievements: achievements as Map<Achievement>,
  achievementSeries: achievementSeries as Map<AchievementSeries>,
  GCG: GCG as BaseCard[],
  nameCards: nameCards as unknown as Map<NameCard[]>,
  calendar: calendar as Map<CalendarData>,
};
