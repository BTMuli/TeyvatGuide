/**
 * 祈愿记录页的胡桃云祈愿数据同步。
 * @since Beta v0.13.0
 */

import showDialog from "@comp/func/dialog.js";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import type { UgoHutaoMode } from "@comp/userGacha/ugo-hutao-du.vue";
import hutao from "@Hutao/index.js";
import TSUserGacha from "@Sqlm/userGacha.js";
import useHutaoStore from "@store/hutao.js";
import fmtUtil from "@utils/display/fmtUtil.js";
import { maskUidTail } from "@utils/display/TGUid.js";
import TGHttps from "@utils/network/TGHttps.js";
import TGLogger from "@utils/system/TGLogger.js";
import { storeToRefs } from "pinia";
import { ref } from "vue";
import type { Ref } from "vue";

import { AppCalendarData } from "@/data/index.js";

/** 胡桃云同步域依赖的共享状态与跨域回调。 */
type HutaoGachaSyncDeps = {
  /** Yatta 元数据缓存 */
  yattaData: Ref<Array<TGApp.Plugins.Yatta.ConvertData>>;
  /** 拉取 Yatta 元数据 */
  loadYatta: () => Promise<void>;
};

/**
 * 创建胡桃云祈愿数据同步。
 * @since Beta v0.13.0
 * @param deps - 共享状态依赖与跨域回调
 * @returns 胡桃云浮层状态、登录态与上传/下载/删除入口
 */
export function useHutaoGachaSync(deps: HutaoGachaSyncDeps) {
  const { yattaData, loadYatta } = deps;

  const hutaoStore = useHutaoStore();
  const { isLogin: isLoginHutao, accessToken, userName, userInfo } = storeToRefs(hutaoStore);
  const hutaoShow = ref<boolean>(false);
  const htMode = ref<UgoHutaoMode>("download");

  /**
   * 登录胡桃云账号。
   * @since Beta v0.13.0
   */
  async function tryLoginHutao(): Promise<void> {
    if (!userName.value) await hutaoStore.tryLogin();
  }

  /**
   * 打开胡桃云祈愿上传浮层。
   * @since Beta v0.13.0
   */
  async function tryUploadGacha(): Promise<void> {
    if (!isLoginHutao.value) return;
    htMode.value = "upload";
    hutaoShow.value = true;
  }

  /**
   * 打开胡桃云祈愿下载浮层。
   * @since Beta v0.13.0
   */
  async function tryDownloadGacha(): Promise<void> {
    if (!isLoginHutao.value) return;
    htMode.value = "download";
    hutaoShow.value = true;
  }

  /**
   * 打开胡桃云祈愿删除浮层。
   * @since Beta v0.13.0
   */
  async function tryDeleteGacha(): Promise<void> {
    if (!isLoginHutao.value) return;
    htMode.value = "delete";
    hutaoShow.value = true;
  }

  /**
   * 处理胡桃云浮层选择的 UID 列表。
   * @since Beta v0.13.0
   * @param uids - 选中的 UID 列表
   * @param mode - 同步模式
   */
  async function handleHutaoDu(uids: Array<string>, mode: UgoHutaoMode): Promise<void> {
    switch (mode) {
      case "download":
        await handleHutaoDownload(uids);
        break;
      case "upload":
        await handleHutaoUpload(uids);
        break;
      case "delete":
        await handleHutaoDelete(uids);
        break;
    }
  }

  /**
   * 上传祈愿数据至胡桃云。
   * @since Beta v0.13.0
   * @param uids - 选中的 UID 列表
   */
  async function handleHutaoUpload(uids: Array<string>): Promise<void> {
    if (uids.length === 0) {
      showSnackbar.warn("没有选中的UID");
      return;
    }
    if (!isLoginHutao.value) {
      showSnackbar.warn("未登录胡桃云账号");
      return;
    }
    if (!userInfo.value) {
      await hutaoStore.tryRefreshInfo();
      if (!userInfo.value) {
        showSnackbar.warn("未检测到胡桃云用户信息");
        return;
      }
    }
    const isExpire = hutaoStore.checkGachaExpire();
    if (isExpire) {
      const check = await showDialog.checkF({
        title: "胡桃云祈愿已过期，确定上传？",
        text: `到期时间:${fmtUtil.formatTime(userInfo.value.GachaLogExpireAt)}`,
      });
      if (!check) return;
    }
    await showLoading.start("正在上传至胡桃云...", "正在刷新Token");
    await hutaoStore.tryRefreshToken();
    for (const u of uids) {
      await showLoading.start(`正在上传UID:${maskUidTail(u)}`, "正在获取EndId");
      let endIdRes: TGApp.Plugins.Hutao.Gacha.EndIdRes = {
        "100": 0,
        "200": 0,
        "301": 0,
        "302": 0,
        "500": 0,
      };
      try {
        const endIdResp = await hutao.Gacha.endIds(accessToken.value!, u);
        if (endIdResp.retcode !== 0) {
          showSnackbar.warn(`[${endIdResp.retcode}] ${endIdResp.message}`);
          await TGLogger.Warn(
            `[Gacha][handleHutaoUpload] 获取EndId失败：${endIdResp.retcode} ${endIdResp.message}`,
          );
        } else if (endIdResp.data) {
          endIdRes = endIdResp.data;
        }
      } catch (e) {
        const errMsg = TGHttps.getErrMsg(e);
        showSnackbar.error(`获取EndId失败：${errMsg}`);
        await TGLogger.Error(`[Gacha][handleHutaoUpload] 获取EndId异常：${errMsg}`);
      }
      const dataRaw: Array<TGApp.Sqlite.Gacha.Gacha> = [];
      for (const [k, v] of Object.entries(endIdRes)) {
        const gachaRead = await TSUserGacha.record.endId(u, k, v.toString());
        await showLoading.update(`${k}-${v.toString()}-${gachaRead.length}条`);
        dataRaw.push(...gachaRead);
      }
      const data: TGApp.Plugins.Hutao.Gacha.UploadData = {
        Uid: u,
        Items: dataRaw.map((i) => ({
          GachaType: Number(i.gachaType),
          QueryType: Number(i.uigfType),
          ItemId: Number(i.itemId),
          Time: fmtUtil.toTimeStr(i.time),
          Id: i.id.toString(),
        })),
      };
      try {
        const resp = await hutao.Gacha.upload(accessToken.value!, data);
        if (resp.retcode === 0) {
          showSnackbar.success(`成功上传祈愿数据：${resp.message}`);
        } else {
          showSnackbar.warn(`[${resp.retcode}] ${resp.message}`);
          await TGLogger.Warn(
            `[Gacha][handleHutaoUpload] 上传失败：${resp.retcode} ${resp.message}`,
          );
        }
      } catch (e) {
        const errMsg = TGHttps.getErrMsg(e);
        showSnackbar.error(`上传祈愿数据失败：${errMsg}`);
        await TGLogger.Error(`[Gacha][handleHutaoUpload] 上传异常：${errMsg}`);
      }
    }
    await showLoading.end();
  }

  /**
   * 从胡桃云下载祈愿数据。
   * @since Beta v0.13.0
   * @param uids - 选中的 UID 列表
   */
  async function handleHutaoDownload(uids: Array<string>): Promise<void> {
    if (uids.length === 0) {
      showSnackbar.warn("没有选中的UID");
      return;
    }
    if (!isLoginHutao.value) {
      showSnackbar.warn("未登录胡桃云账号");
      return;
    }
    if (!userInfo.value) {
      await hutaoStore.tryRefreshInfo();
      if (!userInfo.value) {
        showSnackbar.warn("未检测到胡桃云用户信息");
        return;
      }
    }
    await showLoading.start("正在下载胡桃云祈愿记录...", "正在刷新Token");
    for (const u of uids) {
      await showLoading.start(`正在下载UID:${maskUidTail(u)}的祈愿记录`, "正在获取EndIds");
      try {
        const endIdResp = await hutao.Gacha.endIds(accessToken.value!, u);
        if (endIdResp.retcode !== 0) {
          showSnackbar.warn(`[${endIdResp.retcode}] ${endIdResp.message}`);
          await TGLogger.Warn(
            `[Gacha][handleHutaoDownload] 获取EndIds失败：${endIdResp.retcode} ${endIdResp.message}`,
          );
          continue;
        }
        if (!endIdResp.data) {
          showSnackbar.warn("获取EndIds返回数据为空");
          await TGLogger.Warn(`[Gacha][handleHutaoDownload] 获取EndIds返回数据为空`);
          continue;
        }
        const endIdRes = endIdResp.data;
        for (const [p, i] of Object.entries(endIdRes)) {
          if (i === 0) continue;
          let endId: string | undefined = undefined;
          let flag = true;
          const pageSize = 200;
          await showLoading.start(`正在下载卡池 ${p}`);
          const uigfList: Array<TGApp.Plugins.UIGF.GachaItem> = [];
          while (flag) {
            await showLoading.update(`EndId:${endId ?? "无"}`);
            await hutaoStore.tryRefreshToken();
            try {
              const gachaResp = await hutao.Gacha.logs(
                accessToken.value!,
                u,
                Number(p),
                pageSize,
                endId,
              );
              if (gachaResp.retcode !== 0) {
                showSnackbar.warn(`[${gachaResp.retcode}] ${gachaResp.message}`);
                await TGLogger.Warn(
                  `[Gacha][handleHutaoDownload] 获取记录失败：${gachaResp.retcode} ${gachaResp.message}`,
                );
                break;
              }
              const data: TGApp.Plugins.Hutao.Gacha.GachaLogRes = gachaResp.data ?? [];
              if (data.length === pageSize) {
                endId = data[data.length - 1].Id.toString();
              } else flag = false;
              for (const item of data) {
                const tempItem: TGApp.Plugins.UIGF.GachaItem = {
                  gacha_type: item.GachaType.toString(),
                  item_id: item.ItemId.toString(),
                  count: "1",
                  time: item.Time,
                  name: "",
                  item_type: "",
                  rank_type: "",
                  id: BigInt(item.Id).toString(),
                  uigf_gacha_type: item.QueryType.toString(),
                };
                const find = AppCalendarData.find(
                  (i) => i.id.toString() === item.ItemId.toString(),
                );
                if (find) {
                  tempItem.name = find.name;
                  tempItem.item_type = find.itemType;
                  tempItem.rank_type = find.star.toString();
                } else {
                  if (yattaData.value.length === 0) {
                    await showLoading.update(
                      `未查找到 ${tempItem.item_id} 的 信息，正在获取 Yatta 数据`,
                    );
                    await loadYatta();
                  }
                  const findH = yattaData.value.find(
                    (i) => i.id.toString() === item.ItemId.toString(),
                  );
                  if (findH) {
                    tempItem.name = findH.name;
                    tempItem.item_type = findH.type;
                    tempItem.rank_type = findH.star.toString();
                  } else {
                    showSnackbar.warn(`无法搜索到 ${item.ItemId} 的信息，请等待元数据更新`);
                    continue;
                  }
                }
                uigfList.push(tempItem);
              }
            } catch (e) {
              const errMsg = TGHttps.getErrMsg(e);
              showSnackbar.error(`获取祈愿记录失败：${errMsg}`);
              await TGLogger.Error(`[Gacha][handleHutaoDownload] 获取记录异常：${errMsg}`);
              break;
            }
          }
          await showLoading.start(`正在写入卡池 ${p}-${uigfList.length}`);
          await TSUserGacha.mergeUIGF(u, uigfList, true);
        }
      } catch (e) {
        const errMsg = TGHttps.getErrMsg(e);
        showSnackbar.error(`下载祈愿记录失败：${errMsg}`);
        await TGLogger.Error(`[Gacha][handleHutaoDownload] 下载异常：${errMsg}`);
      }
    }
    await showLoading.end();
    showSnackbar.success("成功下载，即将刷新页面");
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    window.location.reload();
  }

  /**
   * 删除胡桃云上的祈愿数据。
   * @since Beta v0.13.0
   * @param uids - 选中的 UID 列表
   */
  async function handleHutaoDelete(uids: Array<string>): Promise<void> {
    if (uids.length === 0) {
      showSnackbar.warn("没有选中的UID");
      return;
    }
    if (!isLoginHutao.value) {
      showSnackbar.warn("未登录胡桃云账号");
      return;
    }
    if (!userInfo.value) {
      await hutaoStore.tryRefreshInfo();
      if (!userInfo.value) {
        showSnackbar.warn("未检测到胡桃云用户信息");
        return;
      }
    }
    const check = await showDialog.check("确定删除？", uids.map((u) => maskUidTail(u)).join("、"));
    if (!check) return;
    await showLoading.start("正在删除胡桃云祈愿记录");
    for (const u of uids) {
      await showLoading.update(`UID:${maskUidTail(u)}`);
      try {
        const deleteResp = await hutao.Gacha.delete(accessToken.value!, u);
        if (deleteResp.retcode === 0) {
          showSnackbar.success(`删除记录成功：${deleteResp.message}`);
        } else {
          showSnackbar.warn(`[${deleteResp.retcode}] ${deleteResp.message}`);
          await TGLogger.Warn(
            `[Gacha][handleHutaoDelete] 删除失败：${deleteResp.retcode} ${deleteResp.message}`,
          );
        }
      } catch (e) {
        const errMsg = TGHttps.getErrMsg(e);
        showSnackbar.error(`删除记录失败：${errMsg}`);
        await TGLogger.Error(`[Gacha][handleHutaoDelete] 删除异常：${errMsg}`);
      }
    }
    await showLoading.end();
  }

  return {
    hutaoShow,
    htMode,
    userName,
    isLoginHutao,
    tryLoginHutao,
    tryUploadGacha,
    tryDownloadGacha,
    tryDeleteGacha,
    handleHutaoDu,
  };
}
