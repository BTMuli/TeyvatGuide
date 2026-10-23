/**
 * 祈愿记录页的官服祈愿数据刷新。
 * @since Beta v0.13.0
 */

import showDialog from "@comp/func/dialog.js";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import hk4eReq from "@req/hk4eReq.js";
import takumiReq from "@req/takumiReq.js";
import TSUserAccount from "@Sqlm/userAccount.js";
import TSUserGacha from "@Sqlm/userGacha.js";
import useUserStore from "@store/user.js";
import { maskUid, maskUidTail } from "@utils/display/TGUid.js";
import TGHttps from "@utils/network/TGHttps.js";
import TGLogger from "@utils/system/TGLogger.js";
import { storeToRefs } from "pinia";
import { ref } from "vue";
import type { Ref } from "vue";

import { AppCalendarData } from "@/data/index.js";

/** 刷新域依赖的共享状态与跨域回调。 */
type GachaRefreshDeps = {
  /** 当前选中的祈愿 UID */
  uidCur: Ref<string | undefined>;
  /** Yatta 元数据缓存 */
  yattaData: Ref<Array<TGApp.Plugins.Yatta.ConvertData>>;
  /** 拉取 Yatta 元数据 */
  loadYatta: () => Promise<void>;
  /** 重新汇总 UID 列表并复位选中 UID */
  reloadUid: (uid?: string) => Promise<void>;
  /** 载入当前 UID 的祈愿记录 */
  loadGachaList: () => Promise<void>;
};

/** 单个卡池请求的最大重试次数。 */
const GACHA_REQUEST_MAX_RETRIES = 3;

/**
 * 创建官服祈愿数据刷新。
 * @since Beta v0.13.0
 * @param deps - 共享状态依赖与跨域回调
 * @returns 刷新入口与刷新中标记
 */
export function useGachaRefresh(deps: GachaRefreshDeps) {
  const { uidCur, yattaData, loadYatta, reloadUid, loadGachaList } = deps;
  const { account, cookie } = storeToRefs(useUserStore());

  const authkey = ref<string>("");
  const isRefreshing = ref<boolean>(false);

  /**
   * 刷新按钮点击事件。
   * @since Beta v0.13.0
   * @param force - 是否全量刷新
   */
  async function confirmRefresh(force: boolean): Promise<void> {
    if (isRefreshing.value) return;
    isRefreshing.value = true;
    try {
      await executeRefresh(force);
    } finally {
      isRefreshing.value = false;
      await showLoading.end();
    }
  }

  /**
   * 执行祈愿数据刷新。
   * @since Beta v0.13.0
   * @param force - 是否全量刷新
   */
  async function executeRefresh(force: boolean): Promise<void> {
    let rfAccount = account.value;
    let rfCk = cookie.value;
    if (!uidCur.value) {
      if (!rfCk) {
        showSnackbar.warn("请先登录");
        await TGLogger.Warn(`[Gacha][confirmRefresh][${rfAccount.gameUid}] 未登录`);
        return;
      }
    } else {
      const gcFind = await TSUserAccount.game.getAccountByGid(uidCur.value.toString());
      if (!gcFind) {
        const check = await showDialog.check(
          `确定刷新？`,
          `未找到 ${maskUidTail(uidCur.value)} 对应 UID，将刷新 ${maskUidTail(rfAccount.gameUid)} 数据`,
        );
        if (!check) return;
      } else {
        const acFind = await TSUserAccount.account.getAccount(gcFind.uid);
        if (!acFind) {
          const check = await showDialog.check(
            `确定刷新？`,
            `未找到 ${maskUidTail(uidCur.value)} 对应 CK，将刷新 ${maskUidTail(rfAccount.gameUid)} 数据`,
          );
          if (!check) return;
        } else {
          rfAccount = gcFind;
          rfCk = acFind.cookie;
        }
      }
    }
    await TGLogger.Info(`[Gacha][${rfAccount.gameUid}][confirmRefresh] 刷新祈愿数据`);
    await showLoading.start(
      `正在刷新祈愿数据`,
      `UID:${maskUid(rfAccount.gameUid)},正在获取 authkey`,
    );
    let authkeyRes: TGApp.Game.Gacha.AuthKeyResp | undefined;
    try {
      authkeyRes = await takumiReq.bind.authKey(rfCk!, rfAccount);
      if (authkeyRes.retcode !== 0) {
        await showLoading.update("获取authkey失败");
        showSnackbar.error(`[${authkeyRes.retcode}] ${authkeyRes.message}`);
        await TGLogger.Warn(`[Gacha][${rfAccount.gameUid}][confirmRefresh] 获取 authkey 失败`);
        await TGLogger.Warn(
          `[Gacha][${rfAccount.gameUid}][confirmRefresh] ${authkeyRes.retcode} ${authkeyRes.message}`,
        );
        await new Promise<void>((resolve) => setTimeout(resolve, 1000));
        await showLoading.end();
        return;
      }
    } catch (e) {
      const errMsg = TGHttps.getErrMsg(e);
      await showLoading.update("获取authkey失败");
      showSnackbar.error(`获取authkey失败：${errMsg}`);
      await TGLogger.Error(`[Gacha][${rfAccount.gameUid}][confirmRefresh] 获取 authkey 异常`);
      await TGLogger.Error(`[Gacha][${rfAccount.gameUid}][confirmRefresh] ${e}`);
      await new Promise<void>((resolve) => setTimeout(resolve, 1000));
      await showLoading.end();
      return;
    }
    authkey.value = authkeyRes.data.authkey;
    await TGLogger.Info(`[Gacha][${rfAccount.gameUid}][confirmRefresh] 成功获取 authkey`);
    const results: Array<TGApp.App.Gacha.GachaRefRes> = [];
    results.push(await refreshGachaPoolSafely(rfAccount, "100", "新手祈愿", force));
    results.push(await refreshGachaPoolSafely(rfAccount, "200", "常驻祈愿", force));
    results.push(await refreshGachaPoolSafely(rfAccount, "301", "角色祈愿", force));
    results.push(await refreshGachaPoolSafely(rfAccount, "400", "角色祈愿2", force));
    results.push(await refreshGachaPoolSafely(rfAccount, "302", "武器祈愿", force));
    results.push(await refreshGachaPoolSafely(rfAccount, "500", "集录祈愿", force));
    const failedResults = results.filter((result) => !result.success);
    await TGLogger.Info(
      `[Gacha][${rfAccount.gameUid}][confirmRefresh] 刷新祈愿数据完成，失败 ${failedResults.length} 个卡池`,
    );
    await reloadUid(uidCur.value);
    await loadGachaList();
    if (failedResults.length > 0) {
      showSnackbar.warn(
        `祈愿数据已部分刷新，${failedResults.map((result) => result.label).join("、")}失败`,
      );
    } else {
      showSnackbar.success("祈愿数据刷新完成");
    }
  }

  /**
   * 安全刷新单个卡池，异常时返回失败结果。
   * @since Beta v0.13.0
   * @param ac - 游戏账号
   * @param type - 卡池类型
   * @param label - 卡池名称
   * @param force - 是否全量刷新
   * @returns 刷新结果
   */
  async function refreshGachaPoolSafely(
    ac: TGApp.Sqlite.Account.Game,
    type: string,
    label: string,
    force: boolean,
  ): Promise<TGApp.App.Gacha.GachaRefRes> {
    try {
      return await refreshGachaPool(ac, type, label, force);
    } catch (e) {
      const errMsg = TGHttps.getErrMsg(e);
      showSnackbar.error(`[${label}] 刷新祈愿数据失败：${errMsg}`);
      await TGLogger.Error(
        `[Gacha][${ac.gameUid}][refreshGachaPool] 刷新${label}数据异常：${errMsg}`,
      );
      await TGLogger.Error(`[Gacha][${ac.gameUid}][refreshGachaPool] ${e}`);
      return { success: false, label };
    }
  }

  /**
   * 刷新单个池子。
   * @since Beta v0.13.0
   * @param ac - 游戏账号
   * @param type - 卡池类型
   * @param label - 卡池名称
   * @param force - 是否全量刷新
   * @returns 刷新结果
   */
  async function refreshGachaPool(
    ac: TGApp.Sqlite.Account.Game,
    type: string,
    label: string,
    force: boolean = false,
  ): Promise<TGApp.App.Gacha.GachaRefRes> {
    let endId = "0";
    let reqId = "0";
    let gachaDataMap: Record<string, Array<string>> | undefined = undefined;
    let page = 0;
    await showLoading.start(`正在刷新${label}数据`);
    if (!force) endId = (await TSUserGacha.getGachaCheck(ac.gameUid, type)) ?? "0";
    while (true) {
      page++;
      let gachaRes: TGApp.Game.Gacha.GachaLogResp | undefined;
      let requestError: unknown;
      for (let retryCount = 0; retryCount <= GACHA_REQUEST_MAX_RETRIES; retryCount++) {
        try {
          const response = await hk4eReq.gacha(authkey.value, type, reqId);
          if (response.retcode === 0) {
            gachaRes = response;
            break;
          }
          requestError = new Error(`[${response.retcode}] ${response.message}`);
        } catch (e) {
          requestError = e;
        }
        if (retryCount < GACHA_REQUEST_MAX_RETRIES) {
          await showLoading.update(
            `[${label}] 第${page}页请求失败，正在重试（${retryCount + 1}/${GACHA_REQUEST_MAX_RETRIES}）`,
          );
        }
      }
      if (!gachaRes) {
        const errMsg = TGHttps.getErrMsg(requestError);
        showSnackbar.error(`[${type}] 获取祈愿数据失败：${errMsg}`);
        await TGLogger.Error(
          `[Gacha][${ac.gameUid}][refreshGachaPool] 获取祈愿数据异常：${errMsg}`,
        );
        return { success: false, label };
      }
      if (!gachaRes.data || !Array.isArray(gachaRes.data.list)) {
        const errMsg = "响应数据缺少祈愿列表";
        showSnackbar.error(`[${type}] ${errMsg}`);
        await TGLogger.Error(`[Gacha][${ac.gameUid}][refreshGachaPool] ${errMsg}`);
        return { success: false, label };
      }
      const gachaList = gachaRes.data.list;
      if (gachaList.length === 0) {
        if (force) {
          await showLoading.update(`正在清理${label}数据`);
          if (gachaDataMap) {
            await TSUserGacha.cleanGachaRecords(ac.gameUid, type, gachaDataMap);
          }
        }
        return { success: true, label };
      }
      const uigfList: Array<TGApp.Plugins.UIGF.GachaItem> = [];
      if (force) await showLoading.update(`[${label}] 第${page}页，${gachaList.length}条`);
      for (const item of gachaList) {
        if (!force) {
          await showLoading.update(`[${item.item_type}][${item.time}] ${item.name}`, {
            timeout: 0,
          });
        }
        const tempItem: TGApp.Plugins.UIGF.GachaItem = {
          gacha_type: item.gacha_type,
          item_id: item.item_id,
          count: item.count,
          time: item.time,
          name: item.name,
          item_type: item.item_type,
          rank_type: item.rank_type,
          id: item.id.toString(),
          uigf_gacha_type: item.gacha_type === "400" ? "301" : item.gacha_type,
        };
        // TODO: 如果有名字重复的需要注意
        const find = AppCalendarData.find((i) => i.name === item.name);
        if (find) tempItem.item_id = find.id.toString();
        if (tempItem.item_id === "") {
          if (yattaData.value.length === 0) {
            await showLoading.update(`未查找到 ${tempItem.name} 的 ItemId，正在获取 Yatta 数据`);
            await loadYatta();
          }
          const find = yattaData.value.find(
            (i) => i.type === item.item_type && i.name === item.name,
          );
          if (find) tempItem.item_id = find.id.toString();
          else {
            showSnackbar.warn(`无法搜索到 ${item.item_type} ${item.name} 的ID，请等待元数据更新`);
            continue;
          }
        }
        uigfList.push(tempItem);
        if (force) {
          if (!gachaDataMap) gachaDataMap = {};
          if (!gachaDataMap[item.time]) gachaDataMap[item.time] = [];
          gachaDataMap[item.time].push(item.id.toString());
        }
      }
      try {
        await TSUserGacha.mergeUIGF(ac.gameUid, uigfList);
      } catch (e) {
        const errMsg = TGHttps.getErrMsg(e);
        showSnackbar.error(`[${label}] 保存祈愿数据失败：${errMsg}`);
        await TGLogger.Error(
          `[Gacha][${ac.gameUid}][refreshGachaPool] 保存${label}数据异常：${errMsg}`,
        );
        await TGLogger.Error(`[Gacha][${ac.gameUid}][refreshGachaPool] ${e}`);
        return { success: false, label };
      }
      if (!force && gachaList.some((i) => i.id.toString() === endId.toString())) {
        return { success: true, label };
      }
      reqId = gachaList[gachaList.length - 1].id.toString();
      if (force) await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    }
  }

  return { isRefreshing, confirmRefresh };
}
