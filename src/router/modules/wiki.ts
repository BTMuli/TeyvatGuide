/**
 * @file router modules wiki.ts
 * @description wiki 路由模块
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.3
 */

// Wiki main
import GCG from "../../pages/WIKI/GCG.vue";
import Character from "../../pages/WIKI/Character.vue";
import Weapon from "../../pages/WIKI/Weapon.vue";
// Wiki sub
import TGCG from "../../views/WIKI/t-gcg.vue";
import TCharacter from "../../views/WIKI/t-character.vue";
import TWeapon from "../../views/WIKI/t-weapon.vue";

const wikiRoutes = [
  {
    path: "/wiki/GCG",
    name: "卡牌图鉴",
    component: GCG,
  },
  {
    path: "/wiki/character",
    name: "角色图鉴",
    component: Character,
  },
  {
    path: "/wiki/weapon",
    name: "武器图鉴",
    component: Weapon,
  },
  {
    path: "/wiki/GCG_detail/:id",
    name: "卡牌详情",
    component: TGCG,
  },
  {
    path: "/wiki/character_detail/:id",
    name: "角色详情",
    component: TCharacter,
  },
  {
    path: "/wiki/weapon_detail/:id",
    name: "武器详情",
    component: TWeapon,
  },
];

export default wikiRoutes;
