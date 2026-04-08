/**
 * Github API
 * @since Beta v0.10.0
 */

import TGHttps from "./TGHttps.js";
import showSnackbar from "@comp/func/snackbar.js";
import TGLogger from "./TGLogger.js";

/**
 * 获取最新Release版本
 * @since Beta v0.10.0
 * @returns 最新版本
 */
async function getLrv(): Promise<string> {
  const LR_API: Readonly<string> =
    "https://api.github.com/repos/BTMuli/TeyvatGuide/releases/latest";
  try {
    const lrResp = await TGHttps.get<TGApp.Plugins.Github.LastestReleaseResp>(LR_API);
    return lrResp.data.tag_name.replace("v", "");
  } catch (e) {
    let errMsg = String(e);
    if (TGHttps.isHttpErr(e)) {
      errMsg = e.status ? `[${e.status}] ${e.statusText}` : e.message;
    }
    showSnackbar.warn(`获取远程仓库版本异常：${errMsg}`);
    await TGLogger.Error(`[Github][getLrv] 获取远程仓库版本异常 ${LR_API}`);
    await TGLogger.Error(`[Github][getLrv] ${e}`);
    return "0";
  }
}

export default getLrv;
