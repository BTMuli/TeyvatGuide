/**
 * @file plugins Sqlite utils transUserRoles.ts
 * @description 转换用户角色数据格式，用于数据库存储
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

enum EnumElementEn {
  pyro = "Pyro",
  hydro = "Hydro",
  anemo = "Anemo",
  electro = "Electro",
  cryo = "Cryo",
  geo = "Geo",
  dendro = "Dendro",
}

enum EnumElement {
  pyro = "火元素",
  hydro = "水元素",
  anemo = "风元素",
  electro = "雷元素",
  cryo = "冰元素",
  geo = "岩元素",
  dendro = "草元素",
}

/**
 * @description 将通过 api 获取到的用户角色数据转换为数据库中的数据
 * @since Alpha v0.2.0
 * @param {TGApp.Game.Character.ListItem} data 用户角色数据
 * @returns {TGApp.Sqlite.Character.UserRole} 转换后的用户角色数据
 */
export function transUserRoles(
  data: TGApp.Game.Character.ListItem,
): TGApp.Sqlite.Character.UserRole {
  return {
    uid: -1,
    cid: data.id,
    img: data.image,
    name: data.name,
    fetter: data.fetter,
    level: data.level,
    element: transElement(data.element),
    star: data.rarity === 105 ? 5 : data.rarity,
    weapon: transWeapon(data.weapon),
    reliquary: transReliquary(data.reliquaries),
    constellation: transConstellation(data.constellations),
    activeConstellation: data.actived_constellation_num,
    costume: JSON.stringify(data.costumes),
    talent: "",
    updated: "",
  };
}

/**
 * @description 将角色元素转换为数据库中的数据
 * @since Alpha v0.2.0
 * @param {EnumElementEn} data 角色元素
 * @returns {EnumElement} 转换后的角色元素
 */
function transElement(data: EnumElementEn): EnumElement {
  switch (data) {
    case EnumElementEn.pyro:
      return EnumElement.pyro;
    case EnumElementEn.hydro:
      return EnumElement.hydro;
    case EnumElementEn.anemo:
      return EnumElement.anemo;
    case EnumElementEn.electro:
      return EnumElement.electro;
    case EnumElementEn.cryo:
      return EnumElement.cryo;
    case EnumElementEn.geo:
      return EnumElement.geo;
    case EnumElementEn.dendro:
      return EnumElement.dendro;
    default:
      throw new Error("未知的角色元素类型");
  }
}

/**
 * @description 将角色武器转换为数据库中的数据
 * @since Alpha v0.2.0
 * @param {TGApp.Game.Character.LIWeapon} data 角色武器
 * @returns {string} 转换后的角色武器
 */
function transWeapon(data: TGApp.Game.Character.LIWeapon): string {
  const weapon: TGApp.Sqlite.Character.RoleWeapon = {
    id: data.id,
    name: data.name,
    type: data.type_name,
    star: data.rarity,
    level: data.level,
    promote: data.promote_level,
    description: data.desc,
    affix: data.affix_level,
  };
  return JSON.stringify(weapon);
}

/**
 * @description 将角色命座转换为数据库中的数据
 * @since Alpha v0.2.0
 * @param {TGApp.Game.Character.LIRelic[]} data 角色命座
 * @returns {string} 转换后的角色命座
 */
function transReliquary(data: TGApp.Game.Character.LIRelic[]): string {
  if (data.length === 0) {
    return "";
  }
  const reliquary: TGApp.Sqlite.Character.RoleReliquary[] = [];
  for (const item of data) {
    reliquary.push({
      id: item.id,
      name: item.name,
      pos: item.pos,
      posName: item.pos_name,
      star: item.rarity,
      level: item.level,
      icon: item.icon,
      set: {
        id: item.set.id,
        name: item.set.name,
        effect: item.set.affixes.map((setItem) => {
          return {
            active: setItem.activation_number,
            description: setItem.effect,
          };
        }),
      },
    });
  }
  return JSON.stringify(reliquary);
}

/**
 * @description 将角色命座转换为数据库中的数据
 * @since Alpha v0.2.0
 * @param {TGApp.Game.Character.LIConstellation[]} data 角色命座
 * @returns {string} 转换后的角色命座
 */
function transConstellation(data: TGApp.Game.Character.LIConstellation[]): string {
  const constellation: TGApp.Sqlite.Character.RoleConstellation[] = [];
  for (const item of data) {
    constellation.push({
      id: item.id,
      name: item.name,
      icon: item.icon,
      description: item.effect,
      active: item.is_actived,
      pos: item.pos,
    });
  }
  return JSON.stringify(constellation);
}
