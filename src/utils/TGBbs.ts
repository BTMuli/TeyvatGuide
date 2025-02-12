/**
 * @file utils/TGBbs.ts
 * @description 关于 BBS 的工具函数
 * @since Beta v0.6.10
 */

const BBS_VERSION: Readonly<string> = "2.81.1";
const BBS_UA_MOBILE: Readonly<string> = `Mozilla/5.0 (Linux; Android 12) Mobile miHoYoBBS/${BBS_VERSION}`;

/**
 * @description 频道列表
 * @since Beta v0.6.8
 * @interface ChannelItem
 * @property {string} title - 频道名称
 * @property {number} gid - 频道 gid
 * @property {string} mini - 频道简称
 * @return ToChannelItem
 */
type ChannelItem = { title: string; gid: number; mini: string };

/**
 * @description 渠道列表
 * @since Beta v0.6.8
 * @type {Array<ChannelItem>}
 */
const CHANNEL_LIST: Readonly<Array<ChannelItem>> = [
  { title: "原神", gid: 2, mini: "ys" },
  { title: "崩坏：星穹铁道", gid: 6, mini: "sr" },
  { title: "绝区零", gid: 8, mini: "zzz" },
  { title: "崩坏3", gid: 1, mini: "bh3" },
  { title: "崩坏2", gid: 3, mini: "bh2" },
  { title: "未定事件簿", gid: 4, mini: "wd" },
  { title: "大别野", gid: 5, mini: "dby" },
];

const TGBbs = { version: BBS_VERSION, ua: BBS_UA_MOBILE, channels: CHANNEL_LIST };

export default TGBbs;
