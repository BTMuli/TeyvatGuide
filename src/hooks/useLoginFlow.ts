/**
 * 米游社账号登录流程组合式函数。
 * @since Beta v0.13.0
 */

import showDialog from "@comp/func/dialog.js";
import showGeetest from "@comp/func/geetest.js";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import bbsReq from "@req/bbsReq.js";
import passportReq from "@req/passportReq.js";
import takumiReq from "@req/takumiReq.js";
import TSUserAccount from "@Sqlm/userAccount.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import TGHttps from "@utils/network/TGHttps.js";
import TGLogger from "@utils/system/TGLogger.js";
import { storeToRefs } from "pinia";
import { ref } from "vue";

/**
 * 创建一组米游社账号登录流程状态。
 * @since Beta v0.13.0
 * @returns 二维码浮层开关、登录中标记与四条登录入口
 */
export function useLoginFlow() {
  const { isLogin } = storeToRefs(useAppStore());
  const userStore = useUserStore();
  const { uid, briefInfo, cookie, account } = storeToRefs(userStore);
  const showLoginQr = ref<boolean>(false);
  const isTryLogin = ref<boolean>(false);

  // 不输出可能携带凭据的异常消息，仅保留可控类别与 HTTP 状态。
  function loginErrorKind(error: unknown): string {
    if (
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof error.status === "number"
    ) {
      return "HTTP " + error.status;
    }
    if (error instanceof SyntaxError) return "响应解析异常";
    if (error instanceof TypeError) return "网络或数据类型异常";
    return "请求或本地操作异常";
  }

  /**
   * 通过米游社登录票据补全 Cookie 并落库。
   * @since Beta v0.13.0
   * @param ck - 含 stoken 的米游社 Cookie
   */
  async function tryGetTokens(ck: TGApp.App.Account.Cookie): Promise<void> {
    let stage: string;
    await TGLogger.Info("[用户登录][tryGetTokens] 开始");
    let briefInfoGet: TGApp.App.Account.BriefInfo | undefined;
    stage = "获取LToken";
    await TGLogger.Info("[用户登录][tryGetTokens] 开始：" + stage);
    await showLoading.update("正在获取 LToken");
    try {
      const ltokenRes = await passportReq.lToken.get(ck);
      if (ltokenRes.retcode !== 0) {
        await showLoading.end();
        showSnackbar.error(`[${ltokenRes.retcode}]${ltokenRes.message}`);
        await TGLogger.Warn(
          "[用户登录][tryGetTokens] " + stage + "失败，retcode=" + ltokenRes.retcode,
        );
        isTryLogin.value = false;
        return;
      }
      showSnackbar.success("获取LToken成功");
      ck.ltoken = ltokenRes.data.ltoken;
      await TGLogger.Info("[用户登录][tryGetTokens] 获取 LToken 成功");
    } catch (e) {
      const errMsg = TGHttps.getErrMsg(e);
      await showLoading.end();
      showSnackbar.error(`获取LToken失败：${errMsg}`);
      await TGLogger.Error("[用户登录][tryGetTokens] " + stage + "失败：" + loginErrorKind(e));
      isTryLogin.value = false;
      return;
    }
    stage = "获取CookieToken";
    await TGLogger.Info("[用户登录][tryGetTokens] 开始：" + stage);
    await showLoading.update("正在获取 CookieToken");
    try {
      const cookieTokenRes = await passportReq.cookieToken(ck);
      if (cookieTokenRes.retcode !== 0) {
        await showLoading.end();
        showSnackbar.error(`[${cookieTokenRes.retcode}]${cookieTokenRes.message}`);
        await TGLogger.Warn(
          "[用户登录][tryGetTokens] " + stage + "失败，retcode=" + cookieTokenRes.retcode,
        );
        isTryLogin.value = false;
        return;
      }
      showSnackbar.success("获取CookieToken成功");
      ck.cookie_token = cookieTokenRes.data.cookie_token;
      await TGLogger.Info("[用户登录][tryGetTokens] 获取 CookieToken 成功");
    } catch (e) {
      const errMsg = TGHttps.getErrMsg(e);
      await showLoading.end();
      showSnackbar.error(`获取CookieToken失败：${errMsg}`);
      await TGLogger.Error("[用户登录][tryGetTokens] " + stage + "失败：" + loginErrorKind(e));
      isTryLogin.value = false;
      return;
    }
    stage = "获取用户信息";
    await TGLogger.Info("[用户登录][tryGetTokens] 开始：" + stage);
    await showLoading.update("正在获取用户信息");
    try {
      const briefRes = await bbsReq.userInfo(ck);
      if (briefRes.retcode !== 0) {
        await showLoading.end();
        showSnackbar.error(`[${briefRes.retcode}]${briefRes.message}`);
        await TGLogger.Warn(
          "[用户登录][tryGetTokens] " + stage + "失败，retcode=" + briefRes.retcode,
        );
        isTryLogin.value = false;
        return;
      }
      showSnackbar.success("获取用户信息成功");
      await TGLogger.Info("[用户登录][tryGetTokens] 获取用户信息成功");
      briefInfoGet = {
        nickname: briefRes.data.user_info.nickname,
        uid: briefRes.data.user_info.uid,
        avatar: briefRes.data.user_info.avatar_url,
        desc: briefRes.data.user_info.introduce,
      };
      stage = "保存用户数据";
      await TGLogger.Info("[用户登录][tryGetTokens] 开始：" + stage);
      await showLoading.update("正在保存用户数据");
      await TSUserAccount.account.saveAccount({
        uid: briefInfoGet.uid,
        cookie: ck,
        brief: briefInfoGet,
        updated: "",
      });
      await TGLogger.Info("[用户登录][tryGetTokens] 保存用户数据成功");
      uid.value = briefInfoGet.uid;
      briefInfo.value = briefInfoGet;
      cookie.value = ck;
      isLogin.value = true;
    } catch (e) {
      const errMsg = TGHttps.getErrMsg(e);
      await showLoading.end();
      showSnackbar.error(`获取用户信息失败：${errMsg}`);
      await TGLogger.Error("[用户登录][tryGetTokens] " + stage + "失败：" + loginErrorKind(e));
      isTryLogin.value = false;
      return;
    }
    if (!briefInfoGet) {
      await showLoading.end();
      showSnackbar.error("获取用户信息失败");
      isTryLogin.value = false;
      return;
    }
    stage = "获取游戏账号";
    await TGLogger.Info("[用户登录][tryGetTokens] 开始：" + stage);
    await showLoading.update("正在获取游戏账号");
    let gameRes: TGApp.BBS.Game.AccountResp | undefined;
    try {
      gameRes = await takumiReq.bind.gameRoles(cookie.value);
      if (gameRes.retcode !== 0) {
        await showLoading.end();
        showSnackbar.error(`[${gameRes.retcode}] ${gameRes.message}`);
        await TGLogger.Warn(
          "[用户登录][tryGetTokens] " + stage + "失败，retcode=" + gameRes.retcode,
        );
        isTryLogin.value = false;
        return;
      }
    } catch (e) {
      const errMsg = TGHttps.getErrMsg(e);
      await showLoading.end();
      showSnackbar.error(`获取游戏账号失败：${errMsg}`);
      await TGLogger.Error("[用户登录][tryGetTokens] 获取游戏账号异常：" + loginErrorKind(e));
      isTryLogin.value = false;
      return;
    }
    showSnackbar.success("获取游戏账号成功");
    stage = "保存并载入游戏账号";
    await TGLogger.Info(
      "[用户登录][tryGetTokens] 获取游戏账号成功，数量=" + gameRes.data.list.length,
    );
    try {
      await TSUserAccount.game.saveAccounts(briefInfoGet.uid, gameRes.data.list);
      const curAccount = await TSUserAccount.game.getCurAccount(briefInfoGet.uid);
      if (!curAccount) {
        await TGLogger.Warn("[用户登录][tryGetTokens] 用户已登录，但未找到可用的默认游戏账号");
        showSnackbar.warn("未检测到游戏账号，请重新刷新");
        await showLoading.end();
        isTryLogin.value = false;
        return;
      }
      account.value = curAccount;
    } catch (e) {
      await TGLogger.Error("[用户登录][tryGetTokens] " + stage + "失败：" + loginErrorKind(e));
      await showLoading.end();
      showSnackbar.error("保存或载入游戏账号失败，请重试");
      isTryLogin.value = false;
      return;
    }
    await showLoading.end();
    await TGLogger.Info("[用户登录][tryGetTokens] 登录完成，已载入默认游戏账号");
    showSnackbar.success("成功登录!");
    isTryLogin.value = false;
  }

  /**
   * 尝试发送短信验证码，必要时递归处理极验验证。
   * @since Beta v0.13.0
   * @param phone - 手机号
   * @param aigis - 极验重试参数
   * @returns action_type，失败返回 false
   */
  async function tryGetCaptcha(phone: string, aigis?: string): Promise<string | false> {
    await TGLogger.Info("[用户登录][验证码] 发送验证码开始，极验重试=" + Boolean(aigis));
    try {
      const resp = await passportReq.captcha.create(phone, aigis);
      if (resp.data.retcode !== 0) {
        // 检查是否需要极验验证
        const aigisData = resp.headers.get("x-rpc-aigis");
        if (!aigisData) {
          showSnackbar.error(`[${resp.data.retcode}] ${resp.data.message}`);
          await TGLogger.Warn("[用户登录][验证码] 发送验证码失败，retcode=" + resp.data.retcode);
          return false;
        }
        await TGLogger.Info("[用户登录][验证码] 发送验证码需要极验");
        const aigisResp = <TGApp.BBS.CaptchaLogin.CaptchaAigis>JSON.parse(aigisData);
        const gtRes = await showGeetest(JSON.parse(aigisResp.data), aigisResp);
        if (!gtRes) {
          await TGLogger.Warn("[用户登录][验证码] 发送验证码极验未完成或已取消");
          showSnackbar.error("极验验证失败");
          return false;
        }
        await TGLogger.Info("[用户登录][验证码] 极验完成，重试发送验证码");
        const aigisStr = `${aigisResp.session_id};${btoa(JSON.stringify(gtRes))}`;
        return await tryGetCaptcha(phone, aigisStr);
      }
      await TGLogger.Info("[用户登录][验证码] 发送验证码成功");
      return resp.data.data.action_type;
    } catch (e) {
      const errMsg = TGHttps.getErrMsg(e);
      showSnackbar.error(`获取验证码失败：${errMsg}`);
      await TGLogger.Error("[用户登录][验证码] 发送验证码异常：" + loginErrorKind(e));
      return false;
    }
  }

  /**
   * 尝试验证短信验证码完成登录，必要时递归处理极验验证。
   * @since Beta v0.13.0
   * @param phone - 手机号
   * @param captcha - 短信验证码
   * @param actionType - action_type
   * @param aigis - 极验重试参数
   * @returns 登录响应，失败返回 false
   */
  async function tryLoginByCaptcha(
    phone: string,
    captcha: string,
    actionType: string,
    aigis?: string,
  ): Promise<TGApp.BBS.CaptchaLogin.LoginRes | false> {
    await TGLogger.Info("[用户登录][验证码] 验证短信验证码开始，极验重试=" + Boolean(aigis));
    try {
      const resp = await passportReq.captcha.login(phone, captcha, actionType, aigis);
      if (resp.data.retcode !== 0) {
        // 检查是否需要极验验证
        const aigisData = resp.headers.get("x-rpc-aigis");
        if (!aigisData) {
          showSnackbar.error(`[${resp.data.retcode}] ${resp.data.message}`);
          await TGLogger.Warn(
            "[用户登录][验证码] 验证短信验证码失败，retcode=" + resp.data.retcode,
          );
          return false;
        }
        await TGLogger.Info("[用户登录][验证码] 验证短信验证码需要极验");
        const aigisResp = <TGApp.BBS.CaptchaLogin.CaptchaAigis>JSON.parse(aigisData);
        const gtRes = await showGeetest(JSON.parse(aigisResp.data), aigisResp);
        if (!gtRes) {
          await TGLogger.Warn("[用户登录][验证码] 验证短信验证码极验未完成或已取消");
          showSnackbar.error("极验验证失败");
          return false;
        }
        await TGLogger.Info("[用户登录][验证码] 极验完成，重试验证短信验证码");
        const aigisStr = `${aigisResp.session_id};${btoa(JSON.stringify(gtRes))}`;
        return await tryLoginByCaptcha(phone, captcha, actionType, aigisStr);
      }
      await TGLogger.Info("[用户登录][验证码] 验证短信验证码成功");
      return resp.data.data;
    } catch (e) {
      const errMsg = TGHttps.getErrMsg(e);
      showSnackbar.error(`验证码登录失败：${errMsg}`);
      await TGLogger.Error("[用户登录][验证码] 验证短信验证码异常：" + loginErrorKind(e));
      return false;
    }
  }

  /**
   * 手机号验证码登录。
   * @since Beta v0.13.0
   */
  async function tryCaptchaLogin(): Promise<void> {
    if (showLoginQr.value) showLoginQr.value = false;
    isTryLogin.value = true;
    await TGLogger.Info("[用户登录][验证码] 开始登录");
    const phone = await showDialog.input("请输入手机号", "+86");
    if (!phone) {
      await TGLogger.Info("[用户登录][验证码] 用户取消手机号输入");
      showSnackbar.cancel("已取消验证码登录");
      isTryLogin.value = false;
      return;
    }
    const phoneReg = /^1[3-9]\d{9}$/;
    if (!phoneReg.test(phone)) {
      await TGLogger.Warn("[用户登录][验证码] 手机号格式错误");
      showSnackbar.warn("请输入正确的手机号");
      isTryLogin.value = false;
      return;
    }
    const actionType = await tryGetCaptcha(phone);
    if (!actionType) {
      showSnackbar.warn("获取验证码失败");
      isTryLogin.value = false;
      return;
    }
    showSnackbar.success(`已发送验证码到 ${phone}`, 3000);
    const captcha = await showDialog.input("请输入验证码", "验证码：", undefined, false);
    if (!captcha) {
      await TGLogger.Info("[用户登录][验证码] 验证码输入为空或用户取消输入");
      showSnackbar.warn("输入验证码为空");
      isTryLogin.value = false;
      return;
    }
    const loginResp = await tryLoginByCaptcha(phone, captcha, actionType);
    if (!loginResp) {
      showSnackbar.warn("验证码登录失败");
      isTryLogin.value = false;
      return;
    }
    await showLoading.start("正在尝试登录...");
    const ck: TGApp.App.Account.Cookie = {
      account_id: loginResp.user_info.aid,
      ltuid: loginResp.user_info.aid,
      stuid: loginResp.user_info.aid,
      mid: loginResp.user_info.mid,
      cookie_token: "",
      stoken: loginResp.token.token,
      ltoken: "",
    };
    await tryGetTokens(ck);
  }

  /**
   * 扫码登录，打开米游社二维码浮层。
   * @since Beta v0.13.0
   */
  async function tryCodeLogin(): Promise<void> {
    showLoginQr.value = true;
  }

  /**
   * 手动输入 Cookie 添加账号。
   * @since Beta v0.13.0
   */
  async function addByCookie(): Promise<void> {
    let stage: string;
    if (showLoginQr.value) showLoginQr.value = false;
    isTryLogin.value = true;
    await TGLogger.Info("[用户登录][addByCookie] 开始");
    const ckInput = await showDialog.input("请输入Cookie", "Cookie:");
    if (!ckInput) {
      await TGLogger.Info("[用户登录][addByCookie] 用户取消 Cookie 输入");
      showSnackbar.cancel("已取消Cookie输入");
      isTryLogin.value = false;
      return;
    }
    if (ckInput === "") {
      showSnackbar.warn("请输入Cookie!");
      isTryLogin.value = false;
      return;
    }
    const ckArr = ckInput.split(";");
    const ckRes = { stoken: "", stuid: "", mid: "" };
    for (const ck of ckArr) {
      if (ck.startsWith("mid=")) ckRes.mid = ck.substring(4);
      else if (ck.startsWith("stoken=")) ckRes.stoken = ck.substring(7);
      else if (ck.startsWith("stuid=")) ckRes.stuid = ck.substring(6);
    }
    if (ckRes.mid === "" || ckRes.stoken === "" || ckRes.stuid === "") {
      showSnackbar.warn("Cookie格式错误");
      await TGLogger.Warn("[用户登录][addByCookie] Cookie 格式错误，缺少必要字段");
      isTryLogin.value = false;
      return;
    }
    await showLoading.start("正在添加用户", "正在尝试刷新Cookie");
    const ck: TGApp.App.Account.Cookie = {
      account_id: ckRes.stuid,
      ltuid: ckRes.stuid,
      stuid: ckRes.stuid,
      mid: ckRes.mid,
      cookie_token: "",
      stoken: ckRes.stoken,
      ltoken: "",
    };
    stage = "获取LToken";
    await TGLogger.Info("[用户登录][addByCookie] 开始：" + stage);
    await showLoading.update("正在获取 LToken");
    try {
      const ltokenRes = await passportReq.lToken.get(ck);
      if (ltokenRes.retcode !== 0) {
        await showLoading.end();
        showSnackbar.error(`[${ltokenRes.retcode}]${ltokenRes.message}`);
        await TGLogger.Warn(
          "[用户登录][addByCookie] " + stage + "失败，retcode=" + ltokenRes.retcode,
        );
        isTryLogin.value = false;
        return;
      }
      ck.ltoken = ltokenRes.data.ltoken;
      await TGLogger.Info("[用户登录][addByCookie] 获取 LToken 成功");
    } catch (e) {
      const errMsg = TGHttps.getErrMsg(e);
      await showLoading.end();
      showSnackbar.error(`获取LToken失败：${errMsg}`);
      await TGLogger.Error("[用户登录][addByCookie] " + stage + "失败：" + loginErrorKind(e));
      isTryLogin.value = false;
      return;
    }
    stage = "获取CookieToken";
    await TGLogger.Info("[用户登录][addByCookie] 开始：" + stage);
    await showLoading.update("正在获取 CookieToken");
    try {
      const cookieTokenRes = await passportReq.cookieToken(ck);
      if (cookieTokenRes.retcode !== 0) {
        await showLoading.end();
        showSnackbar.error(`[${cookieTokenRes.retcode}]${cookieTokenRes.message}`);
        await TGLogger.Warn(
          "[用户登录][addByCookie] " + stage + "失败，retcode=" + cookieTokenRes.retcode,
        );
        isTryLogin.value = false;
        return;
      }
      ck.cookie_token = cookieTokenRes.data.cookie_token;
      await TGLogger.Info("[用户登录][addByCookie] 获取 CookieToken 成功");
    } catch (e) {
      const errMsg = TGHttps.getErrMsg(e);
      await showLoading.end();
      showSnackbar.error(`获取CookieToken失败：${errMsg}`);
      await TGLogger.Error("[用户登录][addByCookie] " + stage + "失败：" + loginErrorKind(e));
      isTryLogin.value = false;
      return;
    }
    stage = "获取用户信息";
    await TGLogger.Info("[用户登录][addByCookie] 开始：" + stage);
    await showLoading.update("正在获取用户信息");
    let briefGet: TGApp.App.Account.BriefInfo | undefined;
    try {
      const briefRes = await bbsReq.userInfo(ck);
      if (briefRes.retcode !== 0) {
        await showLoading.end();
        showSnackbar.error(`[${briefRes.retcode}]${briefRes.message}`);
        await TGLogger.Warn(
          "[用户登录][addByCookie] " + stage + "失败，retcode=" + briefRes.retcode,
        );
        isTryLogin.value = false;
        return;
      }
      await TGLogger.Info("[用户登录][addByCookie] 获取用户信息成功");
      briefGet = {
        nickname: briefRes.data.user_info.nickname,
        uid: briefRes.data.user_info.uid,
        avatar: briefRes.data.user_info.avatar_url,
        desc: briefRes.data.user_info.introduce,
      };
    } catch (e) {
      const errMsg = TGHttps.getErrMsg(e);
      await showLoading.end();
      showSnackbar.error(`获取用户信息失败：${errMsg}`);
      await TGLogger.Error("[用户登录][addByCookie] " + stage + "失败：" + loginErrorKind(e));
      isTryLogin.value = false;
      return;
    }
    if (!briefGet) {
      await showLoading.end();
      showSnackbar.error("获取用户信息失败");
      isTryLogin.value = false;
      return;
    }
    uid.value = briefGet.uid;
    briefInfo.value = briefGet;
    cookie.value = ck;
    isLogin.value = true;
    stage = "保存用户数据";
    await TGLogger.Info("[用户登录][addByCookie] 开始：" + stage);
    await showLoading.update("正在保存用户数据");
    try {
      await TSUserAccount.account.saveAccount({
        uid: briefGet.uid,
        cookie: ck,
        brief: briefGet,
        updated: "",
      });
      await TGLogger.Info("[用户登录][addByCookie] 保存用户数据成功");
    } catch (e) {
      await TGLogger.Error("[用户登录][addByCookie] " + stage + "失败：" + loginErrorKind(e));
      await showLoading.end();
      showSnackbar.error("保存用户数据失败，请重试");
      isTryLogin.value = false;
      return;
    }
    stage = "获取游戏账号";
    await TGLogger.Info("[用户登录][addByCookie] 开始：" + stage);
    await showLoading.update("正在获取游戏账号");
    let gameRes: TGApp.BBS.Game.AccountResp | undefined;
    try {
      gameRes = await takumiReq.bind.gameRoles(ck);
      if (gameRes.retcode !== 0) {
        await showLoading.end();
        showSnackbar.error(`[${gameRes.retcode}] ${gameRes.message}`);
        await TGLogger.Warn(
          "[用户登录][addByCookie] " + stage + "失败，retcode=" + gameRes.retcode,
        );
        isTryLogin.value = false;
        return;
      }
    } catch (e) {
      const errMsg = TGHttps.getErrMsg(e);
      await showLoading.end();
      showSnackbar.error(`获取游戏账号失败：${errMsg}`);
      await TGLogger.Error("[用户登录][addByCookie] 获取游戏账号异常：" + loginErrorKind(e));
      isTryLogin.value = false;
      return;
    }
    stage = "保存游戏账号";
    await TGLogger.Info("[用户登录][addByCookie] 开始：" + stage);
    await showLoading.update("正在保存游戏账号");
    stage = "保存并载入游戏账号";
    await TGLogger.Info(
      "[用户登录][addByCookie] 获取游戏账号成功，数量=" + gameRes.data.list.length,
    );
    try {
      await TSUserAccount.game.saveAccounts(briefGet.uid, gameRes.data.list);
      const curAccount = await TSUserAccount.game.getCurAccount(briefGet.uid);
      if (!curAccount) {
        await showLoading.end();
        await TGLogger.Warn("[用户登录][addByCookie] 用户已登录，但未找到可用的默认游戏账号");
        showSnackbar.warn("未检测到游戏账号，请重新刷新");
        isTryLogin.value = false;
        return;
      }
      account.value = curAccount;
    } catch (e) {
      await TGLogger.Error("[用户登录][addByCookie] " + stage + "失败：" + loginErrorKind(e));
      await showLoading.end();
      showSnackbar.error("保存或载入游戏账号失败，请重试");
      isTryLogin.value = false;
      return;
    }
    await showLoading.end();
    await TGLogger.Info("[用户登录][addByCookie] 登录完成，已载入默认游戏账号");
    showSnackbar.success("成功添加用户!");
    isTryLogin.value = false;
  }

  return { showLoginQr, isTryLogin, tryGetTokens, tryCaptchaLogin, tryCodeLogin, addByCookie };
}
