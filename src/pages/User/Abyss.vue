<!-- 深境螺旋 -->
<template>
  <v-app-bar>
    <template #prepend>
      <div class="uat-left">
        <div class="uat-title">
          <img alt="icon" src="/UI/nav/userAbyss.webp" />
          <span>深境螺旋</span>
        </div>
        <v-select
          v-model="uidCur"
          :hide-details="true"
          :items="uidList"
          density="compact"
          label="游戏UID"
          variant="outlined"
        />
        <v-btn :rounded="true" class="ua-btn" variant="elevated" @click="toCombat()">
          <img alt="combat" src="/UI/nav/userCombat.webp" />
          <span>真境剧诗</span>
        </v-btn>
        <v-btn :rounded="true" class="ua-btn" variant="elevated" @click="toChallenge()">
          <img alt="challenge" src="/UI/nav/userChallenge.webp" />
          <span>幽境危战</span>
        </v-btn>
      </div>
    </template>
    <template #append>
      <div class="uat-acts">
        <v-btn
          :disabled="localAbyss.length === 0"
          class="ua-btn"
          prepend-icon="mdi-share"
          variant="elevated"
          @click="shareAbyss()"
        >
          分享
        </v-btn>
        <v-btn class="ua-btn" prepend-icon="mdi-refresh" variant="elevated" @click="refreshAbyss()">
          刷新
        </v-btn>
        <v-btn
          class="ua-btn"
          prepend-icon="mdi-download"
          variant="elevated"
          @click="tryReadAbyss()"
        >
          导入
        </v-btn>
        <v-btn class="ua-btn" prepend-icon="mdi-delete" variant="elevated" @click="deleteAbyss()">
          删除
        </v-btn>
      </div>
    </template>
    <template #extension>
      <div class="uat-extension">
        <v-btn :rounded="true" class="ua-btn" variant="elevated" @click="toWiki()">
          <img alt="wiki" src="/platforms/other/hutao.webp" />
          <span>统计数据</span>
        </v-btn>
        <div class="uat-extension-right">
          <span @click="tryLoginHutao()">{{ userName ?? "登录胡桃云" }}</span>
          <v-btn class="ua-btn" prepend-icon="mdi-upload" variant="elevated" @click="uploadAbyss()">
            上传
          </v-btn>
        </div>
      </div>
    </template>
  </v-app-bar>
  <div class="ua-box">
    <v-tabs v-model="userTab" center-active class="ua-tabs-box" direction="vertical">
      <v-tab v-for="item in localAbyss" :key="item.id" :value="item.id">第{{ item.id }}期</v-tab>
    </v-tabs>
    <v-window v-model="userTab" class="ua-window">
      <v-window-item
        v-for="item in localAbyss"
        :key="item.id"
        :value="item.id"
        class="ua-window-item"
      >
        <div :id="`user-abyss-${item.id}`" class="uaw-i-ref">
          <div class="uaw-top">
            <div class="uaw-title">
              <span>第</span>
              <span>{{ item.id }}</span>
              <span>期 UID</span>
              <span>{{ uidCur }}</span>
              <span>更新于</span>
              <span>{{ item.updated }}</span>
            </div>
            <div class="uaw-share">深境螺旋 | Render by TeyvatGuide v{{ version }}</div>
          </div>
          <TSubLine>统计周期 {{ item.startTime }} ~ {{ item.endTime }}</TSubLine>
          <div class="uaw-o-box">
            <TuaOverview :val-text="item.totalBattleTimes" title="战斗次数" />
            <TuaOverview :val-text="item.totalStar" title="获得渊星" />
            <TuaOverview
              :val-text="
                item.skippedFloor !== '' ? `${item.maxFloor}(${item.skippedFloor})` : item.maxFloor
              "
              title="最深抵达"
            />
            <TuaOverview :val-icons="item.defeatRank" title="最多击破" />
            <TuaOverview :val-icons="item.takeDamageRank" title="最多承伤" />
            <TuaOverview :val-icons="item.damageRank" title="最强一击" />
            <TuaOverview :val-icons="item.normalSkillRank" title="元素战技" />
            <TuaOverview :multi4="true" :val-icons="item.revealRank" title="出战次数" />
            <TuaOverview :val-icons="item.energySkillRank" title="元素爆发" />
          </div>
          <div class="uaw-d-box">
            <TuaDetail
              v-for="floor in item.floors"
              :id="item.id"
              :key="floor.id"
              :floor
              :uid="uidCur"
            />
          </div>
        </div>
      </v-window-item>
      <div v-show="localAbyss.length === 0" class="ua-empty">
        <img alt="empty" src="/UI/app/empty.webp" />
        <span>暂无数据，请尝试刷新</span>
      </div>
    </v-window>
  </div>
</template>
<script lang="ts" setup>
import TSubLine from "@comp/app/t-subline.vue";
import showDialog from "@comp/func/dialog.js";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import TuaDetail from "@comp/userAbyss/tua-detail.vue";
import TuaOverview from "@comp/userAbyss/tua-overview.vue";
import hutao from "@Hutao/index.js";
import recordReq from "@req/recordReq.js";
import TSUserAbyss from "@Sqlm/userAbyss.js";
import TSUserAccount from "@Sqlm/userAccount.js";
import TSUserAvatar from "@Sqlm/userAvatar.js";
import useHutaoStore from "@store/hutao.js";
import useUserStore from "@store/user.js";
import { getVersion } from "@tauri-apps/api/app";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import TGLogger from "@utils/TGLogger.js";
import { generateShareImg } from "@utils/TGShare.js";
import { storeToRefs } from "pinia";
import { onMounted, ref, shallowRef, watch } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const hutaoStore = useHutaoStore();

const { account, cookie, propMap } = storeToRefs(useUserStore());
const { userName } = storeToRefs(hutaoStore);
const userTab = ref<number>(0);
const version = ref<string>();
const uidCur = ref<string>();
const uidList = shallowRef<Array<string>>();
const localAbyss = shallowRef<Array<TGApp.Sqlite.Abyss.TableTrans>>([]);

onMounted(async () => {
  await showLoading.start("正在加载深渊数据");
  version.value = await getVersion();
  await TGLogger.Info("[UserAbyss][onMounted] 打开角色深渊页面");
  await showLoading.update("正在获取UID列表");
  await reloadUid();
  await showLoading.end();
  showSnackbar.success(`已加载${uidCur.value}的${localAbyss.value.length}条深渊数据`);
});

watch(() => uidCur.value, loadAbyss);
watch(
  () => account.value,
  async () => await reloadUid(),
);

async function reloadUid(uid?: string): Promise<void> {
  uidList.value = await TSUserAbyss.getAllUid();
  if (uidList.value.length === 0) uidList.value = [account.value.gameUid];
  if (uidList.value.includes(account.value.gameUid)) {
    if (uid === undefined) uidCur.value = account.value.gameUid;
  } else {
    uidList.value = [account.value.gameUid, ...uidList.value];
    if (uid === undefined) uidCur.value = uidList.value[0];
  }
}

async function toCombat(): Promise<void> {
  await router.push({ name: "真境剧诗" });
}

async function toChallenge(): Promise<void> {
  await router.push({ name: "幽境危战" });
}

async function toWiki(): Promise<void> {
  await router.push({ name: "深渊数据库" });
}

async function tryLoginHutao(): Promise<void> {
  if (!userName.value) await hutaoStore.tryLogin();
}

async function loadAbyss(): Promise<void> {
  if (uidCur.value === undefined || uidCur.value === "") return;
  localAbyss.value = await TSUserAbyss.getAbyss(uidCur.value);
  if (localAbyss.value.length > 0) userTab.value = localAbyss.value[0].id;
}

async function refreshAbyss(): Promise<void> {
  let rfAccount = account.value;
  let rfCk = cookie.value;
  if (!uidCur.value) {
    if (!rfCk) {
      showSnackbar.warn("请先登录");
      await TGLogger.Warn(`[Abyss][refreshAbyss][${rfAccount.gameUid}] 未登录`);
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
  await TGLogger.Info("[Abyss][refreshAbyss] 更新深渊数据");
  await showLoading.start(`正在获取 ${rfAccount.gameUid} 的深渊数据`, "正在获取上期数据");
  const resP = await recordReq.spiralAbyss(rfCk!, rfAccount, "2");
  console.log(resP);
  if ("retcode" in resP) {
    await showLoading.end();
    showSnackbar.error(`[${resP.retcode}]${resP.message}`);
    await TGLogger.Error(`[Abyss][refreshAbyss] 获取${rfAccount.gameUid}的上期深渊数据失败`);
    await TGLogger.Error(`[Abyss][refreshAbyss] ${resP.retcode} ${resP.message}`);
    return;
  }
  await TGLogger.Info("[Abyss][refreshAbyss] 成功获取上期深渊数据");
  await showLoading.update("正在保存上期深渊数据");
  await TSUserAbyss.saveAbyss(rfAccount.gameUid, resP);
  await showLoading.update("正在获取本期深渊数据");
  const res = await recordReq.spiralAbyss(rfCk!, rfAccount, "1");
  console.log(res);
  if ("retcode" in res) {
    await showLoading.end();
    showSnackbar.error(`[${res.retcode}]${res.message}`);
    await TGLogger.Error(`[Abyss][refreshAbyss] 获取${rfAccount.gameUid}的本期深渊数据失败`);
    await TGLogger.Error(`[Abyss][refreshAbyss] ${res.retcode} ${res.message}`);
    return;
  }
  await showLoading.update("正在保存本期深渊数据");
  await TSUserAbyss.saveAbyss(rfAccount.gameUid, res);
  await TGLogger.Info(`[Abyss][refreshAbyss] 成功获取${rfAccount.gameUid}的本期深渊数据`);
  await showLoading.update("正在加载深渊数据");
  await reloadUid(uidCur.value);
  await loadAbyss();
  await showLoading.end();
  showSnackbar.success(`已加载${rfAccount.gameUid}的${localAbyss.value.length}条深渊数据`);
}

async function shareAbyss(): Promise<void> {
  await TGLogger.Info(`[UserAbyss][shareAbyss][${userTab.value}] 生成深渊数据分享图片`);
  const fileName = `【深渊数据】${userTab.value}-${account.value.gameUid}.png`;
  const shareDom = document.querySelector<HTMLElement>(`#user-abyss-${userTab.value}`);
  if (shareDom === null) {
    showSnackbar.error("未找到深渊数据");
    await TGLogger.Error("[UserAbyss][shareAbyss] 未找到深渊数据");
    return;
  }
  await showLoading.start("正在生成图片", fileName);
  await generateShareImg(fileName, shareDom);
  await showLoading.end();
  await TGLogger.Info(`[UserAbyss][shareAbyss][${userTab.value}] 生成深渊数据分享图片成功`);
}

async function deleteAbyss(): Promise<void> {
  if (uidCur.value === undefined || uidCur.value === "") {
    showSnackbar.warn("未选择游戏UID");
    return;
  }
  const delCheck = await showDialog.check("确定删除数据？", `将清除${uidCur.value}的所有深渊数据`);
  if (!delCheck) {
    showSnackbar.cancel("已取消删除");
    return;
  }
  await showLoading.start("正在删除深渊数据", `UID: ${uidCur.value}`);
  await TSUserAbyss.delAbyss(uidCur.value);
  await showLoading.end();
  showSnackbar.success(`已清除 ${uidCur.value} 的深渊数据`);
  await reloadUid();
  await loadAbyss();
}

/**
 * 尝试读取胡桃工具箱导出的深渊数据
 * @since Beta v0.8.6
 * @return {Promise<void>}
 */
async function tryReadAbyss(): Promise<void> {
  const file = await open({
    multiple: false,
    title: "选择胡桃工具箱导出的深渊数据文件",
    filters: [{ name: "JSON 文件", extensions: ["json"] }],
    directory: false,
  });
  if (file === null) {
    showSnackbar.cancel("已取消文件选择");
    return;
  }
  try {
    await showLoading.start("正在导入深渊数据文件", file);
    const fileData = JSON.parse(await readTextFile(file));
    if (!Array.isArray(fileData)) {
      await showLoading.end();
      showSnackbar.warn("文件数据格式错误");
      return;
    }
    // TODO:数据结构
    for (const item of fileData) {
      await showLoading.update(`Uid: ${item["uid"]},ScheduleId: ${item["schedule_id"]}`);
      await TSUserAbyss.saveAbyss(item["uid"], item["data"]);
    }
    await showLoading.end();
    showSnackbar.success(`成功导入 ${fileData.length} 条深渊数据，即将刷新页面`);
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    window.location.reload();
  } catch (e) {
    console.error(e);
    await TGLogger.Error(`[UserAbyss][tryReadAbyss] 导入深渊数据失败: ${e}`);
    await showLoading.end();
    showSnackbar.error("导入深渊数据失败，请检查文件格式是否正确");
  }
}

async function uploadAbyss(): Promise<void> {
  if (!userName.value || userName.value === "") {
    const check = await showDialog.check("确定上传？", "未设置胡桃云账号");
    if (!check) return;
  }
  await TGLogger.Info("[Abyss][uploadAbyss] 上传深渊数据");
  const maxId = Math.max(...localAbyss.value.map((i) => i.id));
  const abyssData = localAbyss.value.find((item) => item.id === maxId);
  if (!abyssData) {
    showSnackbar.warn("未找到深渊数据");
    await TGLogger.Warn("[Abyss][uploadAbyss] 未找到深渊数据");
    return;
  }
  const maxFloor = Number(abyssData.maxFloor.split("-")[0]);
  if (isNaN(maxFloor) || maxFloor <= 9) {
    showSnackbar.warn("尚未完成深渊，请完成深渊后重试！");
    await TGLogger.Warn(`[Abyss][uploadAbyss] 尚未完成深渊 ${abyssData.maxFloor}`);
    return;
  }
  const startTime = new Date(abyssData.startTime).getTime();
  const endTime = new Date(abyssData.endTime).getTime();
  const nowTime = new Date().getTime();
  if (nowTime < startTime || nowTime > endTime) {
    showSnackbar.warn("非最新深渊数据，请刷新深渊数据后重试！");
    await TGLogger.Warn("[Abyss][uploadAbyss] 非最新深渊数据");
    return;
  }
  let upAccount = account.value;
  let upCk = cookie.value;
  const gcFind = await TSUserAccount.game.getAccountByGid(uidCur.value!.toString());
  console.log(uidCur.value, gcFind);
  if (!gcFind) {
    showSnackbar.warn(`未找到 ${uidCur.value} 对应 UID，无法刷新角色数据进行上传`);
    return;
  }
  upAccount = gcFind;
  const acFind = await TSUserAccount.account.getAccount(gcFind.uid);
  if (!acFind) {
    showSnackbar.warn(`未找到 ${uidCur.value} 对应 CK，无法刷新角色数据进行上传`);
    return;
  }
  upCk = acFind.cookie;
  try {
    await showLoading.start(`正在上传 ${upAccount.gameUid} 的深渊数据`, `期数：${abyssData.id}`);
    const transAbyss = hutao.Abyss.utils.transData(abyssData);
    if (userName.value) transAbyss.ReservedUserName = userName.value;
    const check = await refreshAvatars(upCk!, upAccount);
    if (!check) return;
    const roles = await TSUserAvatar.getAvatars(Number(upAccount.gameUid));
    if (!roles) {
      await showLoading.end();
      showSnackbar.warn("未找到角色数据");
      return;
    }
    await showLoading.update("正在转换角色数据");
    transAbyss.Avatars = hutao.Abyss.utils.transAvatars(roles);
    await showLoading.update("正在上传深渊数据");
    console.log("uploadAbyss", transAbyss);
    const res = await hutao.Abyss.upload(transAbyss);
    if (res.retcode !== 0) {
      showSnackbar.error(`[${res.retcode}]${res.message}`);
      await TGLogger.Error("[Abyss][uploadAbyss] 上传深渊数据失败");
      await TGLogger.Error(`[Abyss][uploadAbyss] ${res.retcode} ${res.message}`);
      return;
    }
    showSnackbar.success(res.message ?? "上传深渊数据成功，即将刷新祈愿时长");
    await TGLogger.Info("[Abyss][uploadAbyss] 上传深渊数据成功");
    await TGLogger.Info(`[${res.retcode}] ${res.message}`);
    // 等待5s刷新时长
    await showLoading.update("正在刷新胡桃云数据");
    await new Promise<void>((resolve) => setTimeout(resolve, 5000));
    await hutaoStore.tryRefreshInfo();
  } catch (e) {
    if (e instanceof Error) {
      showSnackbar.error(e.message);
      await TGLogger.Error("[Abyss][uploadAbyss] 上传深渊数据失败");
      await TGLogger.Error(`[Abyss][uploadAbyss] ${e.message}`);
    }
  }
  await showLoading.end();
}

async function refreshAvatars(
  ck: TGApp.App.Account.Cookie,
  ac: TGApp.Sqlite.Account.Game,
): Promise<boolean> {
  await showLoading.update("正在更新角色数据");
  const idxRes = await recordReq.index(ck, ac, 1);
  if ("retcode" in idxRes) {
    await showLoading.update("角色更新失败");
    showSnackbar.error(`[${idxRes.retcode}] ${idxRes.message}`);
    await TGLogger.Error(JSON.stringify(idxRes));
    await showLoading.end();
    return false;
  }
  await showLoading.update("正在更新角色列表");
  const listRes = await recordReq.character.list(ck, ac);
  if ("retcode" in listRes) {
    await showLoading.update("角色列表更新失败");
    showSnackbar.error(`[${listRes.message}] ${listRes.message}`);
    await TGLogger.Error(JSON.stringify(listRes));
    await showLoading.end();
    return false;
  }
  const idList = listRes.map((i) => i.id.toString());
  await showLoading.update(`正在获取 ${idList.length} 个角色详情`);
  const detailRes = await recordReq.character.detail(ck, ac, idList);
  if ("retcode" in detailRes) {
    await showLoading.update("角色详情获取失败");
    showSnackbar.error(`[${detailRes.retcode}] ${detailRes.message}`);
    await TGLogger.Error(JSON.stringify(detailRes));
    await showLoading.end();
    return false;
  }
  propMap.value = detailRes.property_map;
  await showLoading.update("正在保存角色数据");
  await TSUserAvatar.saveAvatars(ac.gameUid, detailRes.list);
  return true;
}
</script>
<style lang="css" scoped>
.uat-left {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 12px;
  gap: 8px;
}

.uat-title {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 4px;

  img {
    width: 32px;
    height: 32px;
  }

  span {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 20px;
  }
}

.uat-acts {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  gap: 8px;
}

.ua-btn {
  background: var(--tgc-btn-1);
  color: var(--btn-text);

  img {
    width: 24px;
    height: 24px;
    margin-right: 4px;
    object-fit: contain;
  }
}

.uat-extension {
  position: relative;
  display: flex;
  width: 100%;
  box-sizing: border-box;
  align-items: center;
  justify-content: space-between;
  padding-right: 16px;
  padding-left: 16px;
  margin-bottom: 4px;
}

.uat-extension-right {
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

.ua-box {
  display: flex;
  height: calc(100vh - 144px);
  align-items: flex-start;
  justify-content: center;
  border: 1px solid var(--common-shadow-2);
  border-radius: 4px;
  background: var(--box-bg-1);
  color: var(--box-text-1);
}

.ua-tabs-box {
  max-height: 100%;
  overflow-y: auto;
}

.ua-window {
  overflow: hidden;
  width: 100%;
  height: 100%;
  padding: 8px;
  border-radius: 4px;
  background: var(--app-page-bg);
}

.ua-window-item {
  height: 100%;
  box-sizing: border-box;
  padding-right: 8px;
  overflow-y: auto;
}

.uaw-i-ref {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.uaw-top {
  display: flex;
  width: 100%;
  align-items: flex-end;
  justify-content: space-between;
}

.uaw-title {
  display: flex;
  align-items: center;
  color: var(--common-text-title);
  column-gap: 4px;
  font-family: var(--font-title);
  font-size: 20px;
}

.uaw-title :nth-child(2n) {
  color: var(--tgc-yellow-1);
}

.uaw-share {
  z-index: -1;
  font-size: 12px;
  opacity: 0.8;
}

.uaw-o-box {
  display: grid;
  width: 100%;
  gap: 8px;
  grid-template-columns: repeat(3, 1fr);
}

.uaw-d-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ua-empty {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 1.5rem;
  row-gap: 12px;
}
</style>
