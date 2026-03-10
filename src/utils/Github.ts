/**
 * Github API
 * @since Beta v0.9.8
 */

import TGHttp from "@utils/TGHttp.js";

/**
 * 获取最新Release版本
 * @since Beta v0.9.8
 * @returns 最新版本
 */
export async function getLatestReleaseVersion(): Promise<string> {
  const latestReleaseApi: Readonly<string> =
    "https://api.github.com/repos/BTMuli/TeyvatGuide/releases/latest";
  try {
    const latestReleaseResp = await TGHttp<TGApp.Plugins.Github.LastestReleaseResp>(
      latestReleaseApi,
      { method: "GET" },
    );
    return latestReleaseResp.tag_name.replace("v", "");
  } catch (e) {
    console.error(e);
    return "0";
  }
}
