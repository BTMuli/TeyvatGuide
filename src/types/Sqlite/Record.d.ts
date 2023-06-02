/**
 * @file types Sqlite Record.d.ts
 * @description Sqlite 原神战绩相关类型定义文件
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

declare namespace TGApp.Sqlite.Record {
  /**
   * @description 原神战绩数据表
   * @interface SingleTable
   * @since Alpha v0.2.0
   * @property {string} uid - UID
   * @description 下面的数据在数据库中以 string 类型存储
   * @property {Role} role - 角色信息
   * @property {Avatar[]} avatars - 角色列表
   * @property {Stats} stats - 统计信息
   * @property {WorldExplore} worldExplore - 世界探索信息
   * @property {Home[]} homes - 尘歌壶信息
   * @property {string} updated - 更新时间
   * @return SingleTable
   */
  export interface SingleTable {
    uid: string
    role: string // Role
    avatars: string // Avatar[]
    stats: string // Stats
    worldExplore: string // WorldExplore
    homes: string // Home[]
    updated: string
  }

  /**
   * @description 角色信息类型
   * @interface Role
   * @since Alpha v0.2.0
   * @property {string} nickname - 角色昵称
   * @property {string} region - 区域
   * @property {number} level - 等级
   * @return Role
   */
  export interface Role {
    nickname: string
    region: string
    level: number
  }

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
   * @return Avatar
   */
  export interface Avatar {
    id: number
    name: string
    element: string
    fetter: number
    level: number
    star: number
    constellation: number
    isShow: 0 | 1
  }

  /**
   * @description 统计信息类型
   * @interface Stats
   * @since Alpha v0.2.0
   * @property {number} activeDays - 活跃天数
   * @property {number} achievementNumber - 成就达成数
   * @property {number} avatarNumber - 获得角色数
   * @property {number} wayPoints - 解锁传送点数
   * @property {number} domainNumber - 解锁秘境数
   * @property {number} anemoCulus - 风神瞳数
   * @property {number} geoCulus - 岩神瞳数
   * @property {number} electroCulus - 雷神瞳数
   * @property {number} dendroCulus - 草神瞳数
   * @property {string} sprialAbyss - 深境螺旋信息
   * @property {number} luxuriousChest - 华丽宝箱数
   * @property {number} preciousChest - 珍贵宝箱数
   * @property {number} exquisiteChest - 精致宝箱数
   * @property {number} commonChest - 普通宝箱数
   * @property {number} magicChest - 奇馈宝箱数
   * @return Stats
   */
  export interface Stats {
    activeDays: number
    achievementNumber: number
    avatarNumber: number
    wayPoints: number
    domainNumber: number
    anemoCulus: number
    geoCulus: number
    electroCulus: number
    dendroCulus: number
    sprialAbyss: string
    luxuriousChest: number
    preciousChest: number
    exquisiteChest: number
    commonChest: number
    magicChest: number
  }

  /**
   * @description 世界探索信息类型
   * @interface WorldExplore
   * @since Alpha v0.2.0
   * @property {number} level - 等级
   * @property {number} exploration - 探索度 // 千分比
   * @property {string} iconLight - 图标（浅色）
   * @property {string} iconDark - 图标（深色）
   * @property {string} name - 名称
   * @property {string} type - 类型
   * @property {WorldOffering[]} offerings - 祭祀物
   * @property {string} bg - 背景
   * @property {string} cover - 封面
   * @return WorldExplore
   */
  export interface WorldExplore {
    level: number
    exploration: number
    iconLight: string
    iconDark: string
    name: string
    type: string
    offerings: WorldOffering[]
    bg: string
    cover: string
  }

  /**
   * @description 祭祀物类型
   * @interface WorldOffering
   * @since Alpha v0.2.0
   * @property {string} name - 名称
   * @property {number} level - 等级
   * @property {string} icon - 图标
   * @return WorldOffering
   */
  export interface WorldOffering {
    name: string
    level: number
    icon: string
  }

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
   * @return Home
   */
  export interface Home {
    comfortIcon: string
    comfortName: string
    name: string
    level: number
    comfort: number
    furniture: number
    visit: number
    bg: string
  }
}
