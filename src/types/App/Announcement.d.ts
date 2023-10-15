/**
 * @file types App Announcement.d.ts
 * @description 应用公告相关类型定义文件
 * @since Beta v0.3.3
 */

declare namespace TGApp.App.Announcement {
  /**
   * @description 渲染用的公告列表数据类型
   * @since Beta v0.3.3
   * @interface ListCard
   * @property {number} id - 公告 ID
   * @property {string} title - 公告标题
   * @property {string} subtitle - 公告副标题
   * @property {string} banner - 公告横幅
   * @property {string} typeLabel - 公告类型标签
   * @property {string} tagIcon - 公告标签图标
   * @property {string} tagLabel - 公告标签文字
   * @property {string} timeStr - 公告时间字符串
   * @return ListCard
   */
  interface ListCard {
    id: number;
    title: string;
    subtitle: string;
    banner: string;
    typeLabel: string;
    tagIcon: string;
    tagLabel: string;
    timeStr: string;
  }
}
