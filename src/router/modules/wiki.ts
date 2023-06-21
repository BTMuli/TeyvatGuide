/**
 * @file router modules wiki.ts
 * @description wiki 路由模块
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.1
 */

// Wiki main
import Abyss from "../../pages/WIKI/Abyss.vue";
import Character from "../../pages/WIKI/Character.vue";
import GCG from "../../pages/WIKI/GCG.vue";
import Weapon from "../../pages/WIKI/Weapon.vue";
// Wiki sub
import TCharacter from "../../views/WIKI/t-character.vue";
import TGCG from "../../views/WIKI/t-gcg.vue";
import TWeapon from "../../views/WIKI/t-weapon.vue";

const wikiRoutes = [
  {
    path: "/wiki/abyss",
    name: "深渊数据库",
    component: Abyss,
  },
  {
    path: "/wiki/character",
    name: "角色图鉴",
    component: Character,
  },
  {
    path: "/wiki/GCG",
    name: "卡牌图鉴",
    component: GCG,
  },
  {
    path: "/wiki/weapon",
    name: "武器图鉴",
    component: Weapon,
  },
  {
    path: "/wiki/detail/character/:id",
    name: "角色详情",
    component: TCharacter,
  },
  {
    path: "/wiki/detail/GCG/:id",
    name: "卡牌详情",
    component: TGCG,
  },
  {
    path: "/wiki/detail/weapon/:id",
    name: "武器详情",
    component: TWeapon,
  },
];

export default wikiRoutes;
