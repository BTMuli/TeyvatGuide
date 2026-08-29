/**
 * HoYoPlay 启动器请求。
 * @since Beta v0.12.0
 */

import TGHttps from "@utils/TGHttps.js";

const ApiOrigin: Readonly<string> = "https://hyp-api.mihoyo.com";
const OfficialGameId: Readonly<string> = "1Z8W5NHUQb";
const OfficialLauncherId: Readonly<string> = "jGHBHlcOq1";

/**
 * 获取启动器轮换背景。
 * @since Beta v0.12.0
 * @param language - 语言
 * @returns 国服官服的背景列表
 */
async function getGameBackgrounds(
  language: TGApp.Game.Anno.AnnoLangEnum,
): Promise<Array<TGApp.Game.HoYoPlay.Background>> {
  const resp = await TGHttps.get<TGApp.Game.HoYoPlay.BackgroundResp>(
    `${ApiOrigin}/hyp/hyp-connect/api/getAllGameBasicInfo`,
    {
      query: {
        game_id: OfficialGameId,
        language,
        launcher_id: OfficialLauncherId,
      },
    },
  );
  if (resp.data.retcode !== 0) {
    throw new Error(`HoYoPlay 返回错误 ${resp.data.retcode}：${resp.data.message}`);
  }
  const match = resp.data.data.game_info_list.find((item) => item.game.id === OfficialGameId);
  return match?.backgrounds ?? [];
}

const hoyoPlayReq = {
  backgrounds: getGameBackgrounds,
};

export default hoyoPlayReq;
