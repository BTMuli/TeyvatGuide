/**
 * @file web api Hk4e.ts
 * @description 定义 Hk4e API
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

const Hk4eApi = "https://hk4e-api.mihoyo.com"; // 基础 API
const Hk4eAnnoApi = `${Hk4eApi}/common/hk4e_cn/announcement/api`; // 公告 API
export const Hk4eAnnoListApi = `${Hk4eAnnoApi}/getAnnList?`; // 公告列表 API
export const Hk4eAnnoContentApi = `${Hk4eAnnoApi}/getAnnContent?`; // 公告内容 API
export const Hk4eAnnoQuery =
    "game=hk4e&game_biz=hk4e_cn&lang=zh-cn&bundle_id=hk4e_cn&platform=pc&region=cn_gf01&level=60&uid=500299765"; // 公告 Query
