/**
 * @file types/Sqlite/Record.d.ts
 * @description Sqlite 原神战绩相关类型定义文件
 * @since Beta v0.8.1
 */

declare namespace TGApp.Sqlite.Record {
  /**
   * @description 原神战绩数据表
   * @interface SingleTable
   * @since Beta v0.6.0
   * @property {number} uid - UID
   * @property {string} role - 角色信息
   * @property {string} avatars - 角色列表
   * @property {string} stats - 统计信息
   * @property {string} worldExplore - 世界探索信息
   * @property {string} homes - 尘歌壶信息
   * @property {string} updated - 更新时间
   */
  type SingleTable = {
    uid: number;
    role: string;
    avatars: string;
    stats: string;
    worldExplore: string;
    homes: string;
    updated: string;
  };

  /**
   * @description 渲染用数据
   * @interface RenderData
   * @since Beta v0.6.0
   * @property {number} uid - UID
   * @property {Role} role - 用户信息
   * @property {Avatar[]} avatars - 角色列表
   * @property {Stats} stats - 统计信息
   * @property {WorldExplore[]} worldExplore - 世界探索信息
   * @property {Home[]} homes - 尘歌壶信息
   * @property {string} updated - 更新时间
   */
  type RenderData = {
    uid: number;
    role: Role;
    avatars: Avatar[];
    stats: Stats;
    worldExplore: WorldExplore[];
    homes: Home[];
    updated: string;
  };

  /**
   * @description 角色信息类型
   * @interface Role
   * @since Beta v0.6.0
   * @property {string} nickname - 角色昵称
   * @property {string} region - 区域
   * @property {number} level - 等级
   * @property {string} avatar - 头像
   */
  type Role = { nickname: string; region: string; level: number; avatar: string };

  /**
   * @description 角色列表类型
   * @interface Avatar
   * @since Alpha v0.2.0
   * @property {number} id - 角色 ID
   * @property {string} name - 角色名称
   * @property {string} element - 角色元素
   * @property {number} fetter - 角色羁绊等级
   * @property {number} level - 角色等级
   * @property {number} star - 角色星级
   * @property {number} constellation - 角色命座
   * @property {boolean} isShow - 角色是否展示
   */
  type Avatar = {
    id: number;
    name: string;
    element: string;
    fetter: number;
    level: number;
    star: number;
    constellation: number;
    isShow: 0 | 1;
  };

  /**
   * @description 统计信息类型
   * @interface Stats
   * @since Beta v0.8.1
   * @property {number} activeDays - 活跃天数
   * @property {number} achievementNumber - 成就达成数
   * @property {number} avatarNumber - 获得角色数
   * @property {number} avatarFetter - 满好感角色数
   * @property {number} wayPoints - 解锁传送点数
   * @property {number} domainNumber - 解锁秘境数
   * @property {number} anemoCulus - 风神瞳数
   * @property {number} geoCulus - 岩神瞳数
   * @property {number} electroCulus - 雷神瞳数
   * @property {number} dendroCulus - 草神瞳数
   * @property {number} hydroCulus - 水神瞳数
   * @property {number} pyroCulus - 火神瞳数
   * @property {number} moonCulus - 月神瞳数
   * @property {string} sprialAbyss - 深境螺旋信息
   * @property {string} combatRole - 幻想真境剧诗
   * @property {string} hardChallenge - 幽境危战挑战
   * @property {number} luxuriousChest - 华丽宝箱数
   * @property {number} preciousChest - 珍贵宝箱数
   * @property {number} exquisiteChest - 精致宝箱数
   * @property {number} commonChest - 普通宝箱数
   * @property {number} magicChest - 奇馈宝箱数
   */
  type Stats = {
    activeDays: number;
    achievementNumber: number;
    avatarNumber: number;
    avatarFetter: number;
    wayPoints: number;
    domainNumber: number;
    anemoCulus: number;
    geoCulus: number;
    electroCulus: number;
    dendroCulus: number;
    hydroCulus: number;
    pyroCulus: number;
    moonCulus: number;
    sprialAbyss: string;
    combatRole: string;
    hardChallenge: string;
    luxuriousChest: number;
    preciousChest: number;
    exquisiteChest: number;
    commonChest: number;
    magicChest: number;
  };

  /**
   * @description 世界探索信息类型
   * @interface WorldExplore
   * @since Beta v0.7.2
   * @property {number} id - 地区 ID
   * @property {string} name - 地区名称
   * @property {string} iconLight - 地区图标（亮）
   * @property {string} bg - 背景
   * @property {string} cover - 封面
   * @property {number} reputation - 地区声望等级
   * @property {WorldOffering} offering - 地区供奉信息
   * @property {number} exploration - 地区探索进度
   * @property {Array<WorldChild>} children - 子地区
   */
  type WorldExplore = {
    id: number;
    name: string;
    iconLight: string;
    icon?: string;
    bg: string;
    cover: string;
    reputation?: number;
    offering?: WorldOffering;
    exploration: number;
    children: Array<WorldChild>;
  };

  /**
   * @description 祭祀物类型
   * @interface WorldOffering
   * @since Alpha v0.2.0
   * @property {string} name - 名称
   * @property {number} level - 等级
   * @property {string} icon - 图标
   */
  type WorldOffering = { name: string; level: number; icon: string };

  /**
   * @description 子地区类型
   * @interface WorldChild
   * @since Beta v0.4.3
   * @property {number} id - 子地区 ID
   * @property {string} name - 子地区名称
   * @property {number} exploration - 子地区探索进度
   */
  type WorldChild = { id: number; name: string; exploration: number };

  /**
   * @description 尘歌壶信息类型
   * @interface Home
   * @since Alpha v0.2.0
   * @property {string} comfortIcon - 洞天仙力图标
   * @property {string} comfortName - 洞天仙力名称
   * @property {string} name - 洞天名称
   * @property {number} level - 信任等阶
   * @property {number} comfort - 最高洞天仙力
   * @property {number} furniture - 获得摆设数
   * @property {number} visit - ；历史访客数
   * @property {string} bg - 背景
   */
  type Home = {
    comfortIcon: string;
    comfortName: string;
    name: string;
    level: number;
    comfort: number;
    furniture: number;
    visit: number;
    bg: string;
  };
}
