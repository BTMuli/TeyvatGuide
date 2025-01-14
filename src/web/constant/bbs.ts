/**
 * @file web/constant/bbs.ts
 * @description 常量-应用数据
 * @since Beta v0.6.8
 */

export const BBS_VERSION: Readonly<string> = "2.80.1";
export const BBS_UA_MOBILE: Readonly<string> = `Mozilla/5.0 (Linux; Android 12) Mobile miHoYoBBS/${BBS_VERSION}`;

/**
 * @description 频道列表
 * @since Beta v0.6.5
 * @interface ToChannelItem
 * @property {string} title - 频道名称
 * @property {string} icon - 频道图标
 * @property {string} gid - 频道 gid
 * @property {string} mini - 频道简称
 * @return ToChannelItem
 */
export interface ToChannelItem {
  title: string;
  icon: string;
  gid: string;
  mini: string;
}

/**
 * @description 渠道列表
 * @since Beta v0.6.5
 * @type {Array<ToChannelItem>}
 */
export const CHANNEL_LIST: Readonly<Array<ToChannelItem>> = [
  {
    title: "原神",
    icon: "/platforms/mhy/ys.webp",
    gid: "2",
    mini: "ys",
  },
  {
    title: "崩坏：星穹铁道",
    icon: "/platforms/mhy/sr.webp",
    gid: "6",
    mini: "sr",
  },
  {
    title: "绝区零",
    icon: "/platforms/mhy/zzz.webp",
    gid: "8",
    mini: "zzz",
  },
  {
    title: "崩坏3",
    icon: "/platforms/mhy/bh3.webp",
    gid: "1",
    mini: "bh3",
  },
  {
    title: "崩坏2",
    icon: "/platforms/mhy/bh2.webp",
    gid: "3",
    mini: "bh2",
  },
  {
    title: "未定事件簿",
    icon: "/platforms/mhy/wd.webp",
    gid: "4",
    mini: "wd",
  },
  {
    title: "大别野",
    icon: "/platforms/mhy/dby.webp",
    gid: "5",
    mini: "dby",
  },
];
