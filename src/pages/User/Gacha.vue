<!-- 祈愿记录页面 -->
<template>
  <v-app-bar>
    <template #prepend>
      <div class="gacha-top-title">
        <img alt="gacha" src="/UI/nav/userGacha.webp" />
        <span>祈愿记录</span>
        <v-select
          v-model="uidCur"
          :hide-details="true"
          :items="uidList"
          density="compact"
          label="游戏UID"
          variant="outlined"
        />
        <img
          alt="byd"
          class="gacha-top-byd"
          src="/icon/nation/千星奇域.webp"
          title="千星奇域"
          @click="toBeyond()"
        />
      </div>
    </template>
    <template #append>
      <div class="gacha-top-append">
        <div class="gacha-hutao-box">
          <span @click="tryLoginHutao()">{{ userName ?? "登录胡桃云" }}</span>
          <v-btn
            :disabled="!isLoginHutao"
            class="gacha-top-btn"
            prepend-icon="mdi-upload"
            variant="elevated"
            @click="tryUploadGacha()"
          >
            上传
          </v-btn>
          <v-btn
            :disabled="!isLoginHutao"
            class="gacha-top-btn"
            prepend-icon="mdi-download"
            variant="elevated"
            @click="tryDownloadGacha()"
          >
            下载
          </v-btn>
          <v-btn
            :disabled="!isLoginHutao"
            class="gacha-top-btn"
            prepend-icon="mdi-delete"
            variant="elevated"
            @click="tryDeleteGacha()"
          >
            删除
          </v-btn>
        </div>
      </div>
    </template>
    <template #extension>
      <div class="gacha-top-btns">
        <v-btn
          class="gacha-top-btn"
          prepend-icon="mdi-refresh"
          variant="elevated"
          @click="confirmRefresh(false)"
        >
          增量刷新
        </v-btn>
        <v-btn
          class="gacha-top-btn"
          prepend-icon="mdi-refresh"
          variant="elevated"
          @click="confirmRefresh(true)"
        >
          全量刷新
        </v-btn>
        <v-btn
          class="gacha-top-btn"
          prepend-icon="mdi-import"
          variant="elevated"
          @click="importUigf()"
        >
          导入
        </v-btn>
        <v-btn
          class="gacha-top-btn"
          prepend-icon="mdi-export"
          variant="elevated"
          @click="exportUigf()"
        >
          导出
        </v-btn>
        <v-btn
          class="gacha-top-btn"
          prepend-icon="mdi-export"
          variant="elevated"
          @click="exportUigf4()"
        >
          导出(v4)
        </v-btn>
        <v-btn
          class="gacha-top-btn"
          prepend-icon="mdi-delete"
          variant="elevated"
          @click="deleteGacha()"
        >
          删除
        </v-btn>
        <v-btn
          class="gacha-top-btn"
          prepend-icon="mdi-database-check"
          title="检测并补充遗漏的itemId"
          variant="elevated"
          @click="checkData()"
        >
          检测数据
        </v-btn>
      </div>
    </template>
  </v-app-bar>
  <div class="gacha-container">
    <v-tabs v-model="tab" align-tabs="start" class="gacha-tab" density="compact">
      <v-tab value="overview">数据概览</v-tab>
      <v-tab value="echarts">图表概览</v-tab>
      <v-tab value="table">数据表格</v-tab>
      <v-tab value="history">过往祈愿</v-tab>
    </v-tabs>
    <v-window v-model="tab" class="gacha-window">
      <v-window-item class="gacha-window-item" value="overview">
        <gro-overview v-model="gachaListCur" />
      </v-window-item>
      <v-window-item class="gacha-window-item" value="echarts">
        <gro-echarts v-if="uidCur" :uid="uidCur" />
      </v-window-item>
      <v-window-item class="gacha-window-item" value="table">
        <gro-table v-model="gachaListCur" />
      </v-window-item>
      <v-window-item class="gacha-window-item" value="history">
        <gro-history :uid="uidCur" />
      </v-window-item>
    </v-window>
  </div>
  <UgoUid v-model="ovShow" :fpi="ovFpi" :mode="ovMode" />
  <UgoHutaoDu v-model="hutaoShow" :mode="htMode" @selected="handleHutaoDu" />
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import GroEcharts from "@comp/userGacha/gro-echarts.vue";
import GroHistory from "@comp/userGacha/gro-history.vue";
import GroOverview from "@comp/userGacha/gro-overview.vue";
import GroTable from "@comp/userGacha/gro-table.vue";
import UgoHutaoDu, { type UgoHutaoMode } from "@comp/userGacha/ugo-hutao-du.vue";
import UgoUid from "@comp/userGacha/ugo-uid.vue";
import hutao from "@Hutao/index.js";
import hk4eReq from "@req/hk4eReq.js";
import takumiReq from "@req/takumiReq.js";
import TSUserAccount from "@Sqlm/userAccount.js";
import TSUserGacha from "@Sqlm/userGacha.js";
import useHutaoStore from "@store/hutao.js";
import useUserStore from "@store/user.js";
import { path } from "@tauri-apps/api";
import { open, save } from "@tauri-apps/plugin-dialog";
import TGLogger from "@utils/TGLogger.js";
import { str2timeStr, timeStr2str } from "@utils/toolFunc.js";
import { exportUigfData } from "@utils/UIGF.js";
import fetchYattaJson from "@utils/Yatta.js";
import { storeToRefs } from "pinia";
import { onMounted, ref, shallowRef, watch } from "vue";
import { useRouter } from "vue-router";

import { AppCalendarData } from "@/data/index.js";

const router = useRouter();
const hutaoStore = useHutaoStore();

const { account, cookie } = storeToRefs(useUserStore());
const { isLogin: isLoginHutao, accessToken, userName, userInfo } = storeToRefs(hutaoStore);

const ovMode = ref<"export" | "import">("import");
const ovShow = ref<boolean>(false);
const ovFpi = ref<string>();

const authkey = ref<string>("");
const uidCur = ref<string>();
const tab = ref<string>("overview");
const hutaoShow = ref<boolean>(false);
const htMode = ref<UgoHutaoMode>("download");
const uidList = shallowRef<Array<string>>([]);
const gachaListCur = shallowRef<Array<TGApp.Sqlite.Gacha.Gacha>>([]);
const yattaData = shallowRef<Array<TGApp.Plugins.Yatta.ConvertData>>([]);

onMounted(async () => {
  await showLoading.start("正在加载祈愿数据", "正在获取祈愿 UID 列表");
  await TGLogger.Info("[UserGacha][onMounted] 进入角色祈愿页面");
  await reloadUid();
  await showLoading.end();
});

watch(
  () => uidCur.value,
  async () => await loadGachaList(),
);
watch(
  () => account.value,
  async () => await reloadUid(),
);

async function toBeyond(): Promise<void> {
  await router.push({ name: "颂愿记录" });
}

async function tryLoginHutao(): Promise<void> {
  if (!userName.value) await hutaoStore.tryLogin();
}

async function tryUploadGacha(): Promise<void> {
  if (!isLoginHutao.value) return;
  htMode.value = "upload";
  hutaoShow.value = true;
}

async function tryDownloadGacha(): Promise<void> {
  if (!isLoginHutao.value) return;
  htMode.value = "download";
  hutaoShow.value = true;
}

async function tryDeleteGacha(): Promise<void> {
  if (!isLoginHutao.value) return;
  htMode.value = "delete";
  hutaoShow.value = true;
}

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
      text: `到期时间:${timeStr2str(userInfo.value.GachaLogExpireAt)}`,
    });
    if (!check) return;
  }
  await showLoading.start("正在上传至胡桃云...", "正在刷新Token");
  await hutaoStore.tryRefreshToken();
  for (const u of uids) {
    await showLoading.start(`正在上传UID:${u}`, "正在获取EndId");
    let endIdRes: TGApp.Plugins.Hutao.Gacha.EndIdRes = {
      "100": 0,
      "200": 0,
      "301": 0,
      "302": 0,
      "500": 0,
    };
    const endIdResp = await hutao.Gacha.endIds(accessToken.value!, u);
    if ("retcode" in endIdResp) {
      showSnackbar.warn(`[${endIdResp.retcode}] ${endIdResp.message}`);
    } else endIdRes = endIdResp;
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
        Time: str2timeStr(i.time),
        Id: i.id.toString(),
      })),
    };
    const resp = await hutao.Gacha.upload(accessToken.value!, data);
    if (resp.retcode === 0) {
      showSnackbar.success(`成功上传祈愿数据：${resp.message}`);
    } else {
      showSnackbar.warn(`[${resp.retcode}] ${resp.message}`);
    }
  }
  await showLoading.end();
}

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
    await showLoading.start(`正在下载UID:${u}的祈愿记录`, "正在获取EndIds");
    const endIdResp = await hutao.Gacha.endIds(accessToken.value!, u);
    if ("retcode" in endIdResp) {
      showSnackbar.warn(`[${endIdResp.retcode}] ${endIdResp.message}`);
      continue;
    }
    for (const [p, i] of Object.entries(endIdResp)) {
      if (i === 0) continue;
      let endId: string | undefined = undefined;
      let flag = true;
      const pageSize = 200;
      await showLoading.start(`正在下载卡池 ${p}`);
      const uigfList: Array<TGApp.Plugins.UIGF.GachaItem> = [];
      while (flag) {
        await showLoading.update(`EndId:${endId ?? "无"}`);
        await hutaoStore.tryRefreshToken();
        const gachaResp = await hutao.Gacha.logs(accessToken.value!, u, Number(p), pageSize, endId);
        if (gachaResp.retcode !== 0) {
          showSnackbar.warn(`[${gachaResp.retcode}] ${gachaResp.message}`);
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
          const find = AppCalendarData.find((i) => i.id.toString() === item.ItemId.toString());
          if (find) {
            tempItem.name = find.name;
            tempItem.item_type = find.itemType;
            tempItem.rank_type = find.star.toString();
          } else {
            if (yattaData.value.length === 0) {
              await showLoading.update(`未查找到 ${tempItem.item_id} 的 信息，正在获取 Yatta 数据`);
              await loadYatta();
            }
            const findH = yattaData.value.find((i) => i.id.toString() === item.ItemId.toString());
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
      }
      await showLoading.start(`正在写入卡池 ${p}-${uigfList.length}`);
      await TSUserGacha.mergeUIGF(u, uigfList, true);
    }
  }
  await showLoading.end();
  showSnackbar.success("成功下载，即将刷新页面");
  await new Promise<void>((resolve) => setTimeout(resolve, 1000));
  window.location.reload();
}

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
  const check = await showDialog.check("确定删除？", uids.join("、"));
  if (!check) return;
  await showLoading.start("正在删除胡桃云祈愿记录");
  for (const u of uids) {
    await showLoading.update(`UID:${u}`);
    const deleteResp = await hutao.Gacha.delete(accessToken.value!, u);
    if (deleteResp.retcode === 0) {
      showSnackbar.success(`删除记录成功：${deleteResp.message}`);
    } else {
      showSnackbar.warn(`[${deleteResp.retcode}] ${deleteResp.message}`);
    }
  }
  await showLoading.end();
}

async function loadGachaList(): Promise<void> {
  if (uidCur.value === undefined || uidCur.value === "") return;
  gachaListCur.value = await TSUserGacha.record.all(uidCur.value);
  showSnackbar.success(`成功获取 ${uidCur.value} 的 ${gachaListCur.value.length} 条祈愿数据`);
  await TGLogger.Info(
    `[UserGacha][loadGachaList] 成功获取 ${gachaListCur.value.length} 条祈愿数据`,
  );
}

async function reloadUid(uid?: string): Promise<void> {
  uidList.value = await TSUserGacha.getUidList();
  if (uidList.value.length === 0) uidList.value = [account.value.gameUid];
  if (uidList.value.includes(account.value.gameUid)) {
    if (uid === undefined) uidCur.value = account.value.gameUid;
  } else {
    uidList.value = [account.value.gameUid, ...uidList.value];
    if (uid === undefined) uidCur.value = uidList.value[0];
  }
}

// 刷新按钮点击事件
async function confirmRefresh(force: boolean): Promise<void> {
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
    console.log(uidCur.value, gcFind);
    if (!gcFind) {
      const check = await showDialog.check(
        `确定刷新？`,
        `未找到 ${uidCur.value} 对应 UID，将刷新 ${rfAccount.gameUid} 数据`,
      );
      if (!check) return;
    } else {
      const acFind = await TSUserAccount.account.getAccount(gcFind.uid);
      if (!acFind) {
        const check = await showDialog.check(
          `确定刷新？`,
          `未找到 ${uidCur.value} 对应 CK，将刷新 ${rfAccount.gameUid} 数据`,
        );
        if (!check) return;
      } else {
        rfAccount = gcFind;
        rfCk = acFind.cookie;
      }
    }
  }
  await TGLogger.Info(`[Gacha][${rfAccount.gameUid}][confirmRefresh] 刷新祈愿数据`);
  await showLoading.start(`正在刷新祈愿数据`, `UID:${rfAccount.gameUid},正在获取 authkey`);
  const authkeyRes = await takumiReq.bind.authKey(rfCk!, rfAccount);
  if (typeof authkeyRes === "string") {
    authkey.value = authkeyRes;
    await TGLogger.Info(`[Gacha][${rfAccount.gameUid}][confirmRefresh] 成功获取 authkey`);
  } else {
    showSnackbar.error("获取 authkey 失败");
    await TGLogger.Error(`[Gacha][${rfAccount.gameUid}][confirmRefresh] 获取 authkey 失败`);
    await TGLogger.Error(
      `[Gacha][${rfAccount.gameUid}][confirmRefresh] ${authkeyRes.retcode} ${authkeyRes.message}`,
    );
    await showLoading.end();
    return;
  }
  await refreshGachaPool(rfAccount, "100", "新手祈愿", force);
  await refreshGachaPool(rfAccount, "200", "常驻祈愿", force);
  await refreshGachaPool(rfAccount, "301", "角色祈愿", force);
  await refreshGachaPool(rfAccount, "400", "角色祈愿2", force);
  await refreshGachaPool(rfAccount, "302", "武器祈愿", force);
  await refreshGachaPool(rfAccount, "500", "集录祈愿", force);
  await TGLogger.Info(`[Gacha][${rfAccount.gameUid}][confirmRefresh] 刷新祈愿数据完成`);
  await reloadUid(uidCur.value);
  await loadGachaList();
  await showLoading.end();
}

// 刷新单个池子
async function refreshGachaPool(
  ac: TGApp.Sqlite.Account.Game,
  type: string,
  label: string,
  force: boolean = false,
): Promise<void> {
  let endId = "0";
  let reqId = "0";
  let gachaDataMap: Record<string, Array<string>> | undefined = undefined;
  let page = 0;
  await showLoading.start(`正在刷新${label}数据`);
  if (!force) endId = (await TSUserGacha.getGachaCheck(ac.gameUid, type)) ?? "0";
  while (true) {
    page++;
    const gachaRes = await hk4eReq.gacha(authkey.value, type, reqId);
    if (!Array.isArray(gachaRes)) {
      showSnackbar.error(`[${type}][${gachaRes.retcode}] ${gachaRes.message}`);
      await TGLogger.Error(`[Gacha][${ac.gameUid}][refreshGachaPool] 获取祈愿数据失败`);
      await TGLogger.Error(
        `[Gacha][${ac.gameUid}][refreshGachaPool] ${gachaRes.retcode} ${gachaRes.message}`,
      );
      await new Promise<void>((resolve) => setTimeout(resolve, 1000));
      break;
    }
    if (gachaRes.length === 0) {
      if (force) {
        await showLoading.update(`正在清理${label}数据`);
        if (gachaDataMap) {
          await TSUserGacha.cleanGachaRecords(ac.gameUid, type, gachaDataMap);
        }
      }
      break;
    }
    const uigfList: Array<TGApp.Plugins.UIGF.GachaItem> = [];
    if (force) await showLoading.update(`[${label}] 第${page}页，${gachaRes.length}条`);
    for (const item of gachaRes) {
      if (!force) {
        await showLoading.update(`[${item.item_type}][${item.time}] ${item.name}`, { timeout: 0 });
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
        const find = yattaData.value.find((i) => i.type === item.item_type && i.name === item.name);
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
    await TSUserGacha.mergeUIGF(ac.gameUid, uigfList);
    if (!force && gachaRes.some((i) => i.id.toString() === endId.toString())) break;
    reqId = gachaRes[gachaRes.length - 1].id.toString();
    if (force) await new Promise<void>((resolve) => setTimeout(resolve, 1000));
  }
}

async function loadYatta(): Promise<void> {
  try {
    yattaData.value = await fetchYattaJson();
  } catch (e) {
    console.error(e);
    showSnackbar.warn(`获取 Yatta 元数据失败`);
    await TGLogger.Error(`[UserGacha][onMounted]获取 Yatta 元数据失败`);
    await TGLogger.Error(`${e}`);
  }
}

async function importUigf(): Promise<void> {
  await TGLogger.Info(`[UserGacha][handleImportBtn] 导入祈愿数据`);
  const selectedFile = await open({
    multiple: false,
    title: "导入UIGF文件",
    filters: [{ name: "UIGF JSON", extensions: ["json"] }],
    defaultPath: await path.downloadDir(),
    directory: false,
  });
  if (selectedFile === null) {
    showSnackbar.cancel("已取消文件选择");
    return;
  }
  ovFpi.value = selectedFile;
  ovMode.value = "import";
  ovShow.value = true;
}

// 导出当前UID的祈愿数据
async function exportUigf(): Promise<void> {
  if (!uidCur.value) return;
  await TGLogger.Info(`[UserGacha][${uidCur.value}][exportUigf] 导出祈愿数据`);
  const gachaList = await TSUserGacha.record.all(uidCur.value);
  if (gachaList.length === 0) {
    showSnackbar.error(`UID ${uidCur.value} 暂无祈愿数据`);
    return;
  }
  const file = await save({
    title: "导出祈愿数据",
    filters: [{ name: "UIGF JSON", extensions: ["json"] }],
    defaultPath: `${await path.downloadDir()}${path.sep()}UIGF_${uidCur.value}.json`,
  });
  if (!file) {
    showSnackbar.cancel("已取消文件保存");
    return;
  }
  await TGLogger.Info(
    `[UserGacha][${uidCur.value}][exportUigf] 导出${gachaList.length} 条祈愿数据到 ${file}`,
  );
  await showLoading.start("正在导出祈愿数据", `UID:${uidCur.value}`);
  await exportUigfData(uidCur.value, gachaList, file);
  await showLoading.end();
  showSnackbar.success(`成功导出 ${uidCur.value} 的祈愿数据`);
  await TGLogger.Info(`[UserGacha][${uidCur.value}][exportUigf] 导出祈愿数据完成`);
}

// 导出 UIGF v4 版本的祈愿数据
async function exportUigf4(): Promise<void> {
  if (!uidCur.value) {
    showSnackbar.error("未获取到 UID");
    return;
  }
  await TGLogger.Info(`[UserGacha][${uidCur.value}][exportUigf4] 导出祈愿数据(v4)`);
  ovMode.value = "export";
  ovShow.value = true;
}

// 删除当前 UID 的祈愿数据
async function deleteGacha(): Promise<void> {
  if (gachaListCur.value.length === 0 || !uidCur.value) {
    showSnackbar.error("暂无祈愿数据");
    return;
  }
  await TGLogger.Info(`[UserGacha][${uidCur.value}][deleteGacha] 删除祈愿数据`);
  const delCheck = await showDialog.check(
    "确定删除祈愿数据？",
    `UID：${uidCur.value}，共 ${gachaListCur.value.length} 条数据`,
  );
  if (!delCheck) {
    showSnackbar.cancel("已取消祈愿数据删除");
    await TGLogger.Info(`[UserGacha][${uidCur.value}][deleteGacha] 已取消祈愿数据删除`);
    return;
  }
  const uidList = await TSUserGacha.getUidList();
  if (uidList.length <= 1) {
    const forceCheck = await showDialog.check("删除后数据库将为空，确定删除？");
    if (!forceCheck) {
      showSnackbar.cancel("已取消祈愿数据删除");
      return;
    }
  }
  await showLoading.start("正在删除祈愿数据", `UID:${uidCur.value}`);
  await TSUserGacha.deleteGachaRecords(uidCur.value);
  await reloadUid();
  await loadGachaList();
  await showLoading.end();
  showSnackbar.success(`已成功删除 ${uidCur.value} 的祈愿数据，即将刷新页面`);
}

async function checkData(): Promise<void> {
  let cnt = 0;
  let fail = 0;
  await showLoading.start(
    "正在检测数据",
    `UID:${uidCur.value}，共${gachaListCur.value.length}条祈愿数据`,
  );
  for (const data of gachaListCur.value) {
    if (data.itemId === "") {
      // TODO: 如果有名字重复的需要注意
      const find = AppCalendarData.find((i) => i.name === data.name);
      if (find) {
        await showLoading.update(`${data.name} -> ${find.id}`);
        await TSUserGacha.update.itemId(data, find.id.toString());
        cnt++;
        continue;
      }
      if (yattaData.value.length === 0) {
        await showLoading.update(`尝试获取 Yatta 数据`);
        await loadYatta();
      }
      // TODO: 如果有名字重复的需要注意
      const find2 = yattaData.value.find((i) => i.name === data.name);
      if (find2) {
        await showLoading.update(`${data.name} -> ${find2.id}`);
        await TSUserGacha.update.itemId(data, find2.id);
        cnt++;
        continue;
      }
      await showLoading.update(`[${data.id}]${data.type}-${data.name}未找到ID`);
      await TGLogger.Warn(`[${data.id}]${data.type}-${data.name}未找到ID`);
      fail++;
    }
  }
  await showLoading.end();
  if (cnt > 0 || fail > 0) {
    showSnackbar.success(`成功补充遗漏数据${cnt}条，失败${fail}条，即将刷新`);
    await new Promise<void>((resolve) => setTimeout(resolve, 1500));
    window.location.reload();
  } else {
    showSnackbar.success(`成功检测${gachaListCur.value.length}条数据，无需更新`);
  }
}
</script>
<style lang="scss" scoped>
.gacha-top-title {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 12px;
  column-gap: 8px;

  img {
    width: 32px;
    height: 32px;

    &:last-child {
      cursor: pointer;
    }
  }

  span {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 20px;
  }
}

.gacha-top-byd {
  filter: invert(0.75);
}

.dark .gacha-top-byd {
  filter: none;
}

.gacha-top-append {
  position: relative;
  margin-right: 16px;
}

.gacha-hutao-box {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 8px;

  span {
    color: var(--tgc-od-red);
    cursor: pointer;
  }
}

.gacha-top-btns {
  display: flex;
  margin-bottom: 4px;
  margin-left: 16px;
  column-gap: 8px;
}

.gacha-top-btn {
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

.gacha-container {
  display: flex;
  height: calc(100vh - 144px);
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  border: 1px solid var(--common-shadow-2);
  border-radius: 4px;
  background: var(--app-page-bg);
}

.gacha-tab {
  height: 40px;
  color: var(--box-text-4);
  font-family: var(--font-title);

  img {
    width: 16px;
    height: 16px;
    margin-right: 4px;
  }
}

.gacha-window {
  width: 100%;
  height: 100%;
  padding: 8px;
}

.gacha-window-item {
  height: 100%;
}
</style>
