/**
 * @file web/constant/bbs.ts
 * @description 常量-应用数据
 * @since Beta v0.6.3
 */

export const BBS_VERSION = "2.77.2";
export const BBS_UA_PC = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) miHoYoBBS/${BBS_VERSION}`;
export const BBS_UA_MOBILE = `Mozilla/5.0 (Linux; Android 12) Mobile miHoYoBBS/${BBS_VERSION}`;
export const BBS_APP_ID = "bll8iq97cem8";

/**
 * @description salt 值
 * @version 2.77.2
 * @since Beta v0.6.3
 */
export const BBS_SALT = {
  K2: "TKAsNctXTFctUMIgTfkHncRKJjvvRuOf",
  LK2: "LfWCPiYcIZyzGUgeFUbuJZNOyqpLoNlv",
  X4: "xV8v4Qu54lUKrEYFZkJhB8cuOh9Asafs",
  X6: "t0qEgfub6cvueAPgR5m9aQWWVciEer7v",
  PROD: "t0qEgfub6cvueAPgR5m9aQWWVciEer7v",
};

/**
 * @description 频道列表
 * @version 2.72.2
 * @since Beta v0.5.1
 * @interface ToChannelItem
 * @property {string} title - 频道名称
 * @property {string} icon - 频道图标
 * @property {string} gid - 频道 gid
 * @return ToChannelItem
 */
export interface ToChannelItem {
  title: string;
  icon: string;
  gid: string;
}

/**
 * @description 渠道列表
 * @version 2.72.2
 * @since Beta v0.5.1
 * @type {Array<ToChannelItem>}
 */
export const CHANNEL_LIST: ToChannelItem[] = [
  {
    title: "原神",
    icon: "/platforms/mhy/ys.webp",
    gid: "2",
  },
  {
    title: "崩坏：星穹铁道",
    icon: "/platforms/mhy/sr.webp",
    gid: "6",
  },
  {
    title: "绝区零",
    icon: "/platforms/mhy/zzz.webp",
    gid: "8",
  },
  {
    title: "崩坏3",
    icon: "/platforms/mhy/bh3.webp",
    gid: "1",
  },
  {
    title: "崩坏2",
    icon: "/platforms/mhy/bh2.webp",
    gid: "3",
  },
  {
    title: "未定事件簿",
    icon: "/platforms/mhy/wd.webp",
    gid: "4",
  },
  {
    title: "大别野",
    icon: "/platforms/mhy/dby.webp",
    gid: "5",
  },
];
