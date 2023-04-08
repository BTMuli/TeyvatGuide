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
import type TGAppTypes from "../../core/types/TGTypes";
import { type BaseCard } from "../../interface/GCG";
import { type CalendarData } from "../../interface/Calendar";

export const AppDataList = [
  {
    name: "achievements.json",
    data: achievements as Record<number, TGAppTypes.Achievement>,
  },
  {
    name: "achievementSeries.json",
    data: achievementSeries as Record<number, TGAppTypes.AchievementSeries>,
  },
  {
    name: "GCG.json",
    data: GCG as BaseCard[],
  },
  {
    name: "nameCards.json",
    data: nameCards as Record<number, TGAppTypes.NameCard[]>,
  },
  {
    name: "calendar.json",
    data: calendar as Record<number, CalendarData>,
  },
];

export const AppData = {
  achievements: achievements as Record<number, TGAppTypes.Achievement>,
  achievementSeries: achievementSeries as Record<number, TGAppTypes.AchievementSeries>,
  GCG: GCG as BaseCard[],
  nameCards: nameCards as Record<number, TGAppTypes.NameCard[]>,
  calendar: calendar as Record<number, CalendarData>,
};
