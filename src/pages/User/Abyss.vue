<template>
  <v-app-bar>
    <template #prepend>
      <div class="uat-left">
        <img alt="icon" src="/source/UI/userAbyss.webp" />
        <span>深境螺旋</span>
        <v-select
          variant="outlined"
          v-model="uidCur"
          :items="uidList"
          :hide-details="true"
          title="游戏UID"
        />
        <v-btn :rounded="true" class="ua-btn" @click="toCombat()">
          <template #prepend>
            <img src="/source/UI/userCombat.webp" alt="combat" />
          </template>
          <span>幻想真境剧诗</span>
        </v-btn>
        <v-btn :rounded="true" class="ua-btn" @click="toWiki()">
          <template #prepend>
            <img src="/source/UI/wikiAbyss.webp" alt="wiki" />
          </template>
          <span>深渊数据库</span>
        </v-btn>
      </div>
    </template>
    <template #append>
      <div class="uat-right">
        <v-btn
          class="ua-btn"
          @click="shareAbyss()"
          :rounded="true"
          :disabled="localAbyss.length === 0"
        >
          <v-icon>mdi-share</v-icon>
          <span>分享</span>
        </v-btn>
        <v-btn class="ua-btn" @click="refreshAbyss()" :rounded="true">
          <v-icon>mdi-refresh</v-icon>
          <span>刷新</span>
        </v-btn>
        <v-btn class="ua-btn" @click="uploadAbyss()" :rounded="true">
          <v-icon>mdi-cloud-upload</v-icon>
          <span>上传</span>
        </v-btn>
        <v-btn class="ua-btn" @click="deleteAbyss()" :rounded="true">
          <v-icon>mdi-delete</v-icon>
          <span>删除</span>
        </v-btn>
      </div>
    </template>
  </v-app-bar>
  <div class="ua-box">
    <v-tabs v-model="userTab" direction="vertical" class="ua-tabs-box" center-active>
      <v-tab v-for="item in localAbyss" :key="item.id" :value="item.id"> 第{{ item.id }}期</v-tab>
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
            <TuaOverview title="战斗次数" :val-text="item.totalBattleTimes" />
            <TuaOverview title="获得渊星" :val-text="item.totalStar" />
            <TuaOverview
              title="最深抵达"
              :val-text="
                item.skippedFloor !== '' ? `${item.maxFloor}(${item.skippedFloor})` : item.maxFloor
              "
            />
            <TuaOverview title="最多击破" :val-icons="item.defeatRank" />
            <TuaOverview title="最多承伤" :val-icons="item.takeDamageRank" />
            <TuaOverview title="最强一击" :val-icons="item.damageRank" />
            <TuaOverview title="元素战技" :val-icons="item.normalSkillRank" />
            <TuaOverview title="出战次数" :val-icons="item.revealRank" :multi4="true" />
            <TuaOverview title="元素爆发" :val-icons="item.energySkillRank" />
          </div>
          <TSubLine>详情</TSubLine>
          <div class="uaw-d-box">
            <TuaDetail v-for="floor in item.floors" :key="floor.id" :model-value="floor" />
          </div>
        </div>
      </v-window-item>
    </v-window>
    <div v-show="localAbyss.length === 0" class="user-empty">
      <img src="/source/UI/empty.webp" alt="empty" />
      <span>暂无数据，请尝试刷新</span>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { getVersion } from "@tauri-apps/api/app";
import { storeToRefs } from "pinia";
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";

import TSubLine from "../../components/app/t-subline.vue";
import showDialog from "../../components/func/dialog.js";
import showLoading from "../../components/func/loading.js";
import showSnackbar from "../../components/func/snackbar.js";
import TuaDetail from "../../components/userAbyss/tua-detail.vue";
import TuaOverview from "../../components/userAbyss/tua-overview.vue";
import Hutao from "../../plugins/Hutao/index.js";
import TSUserAbyss from "../../plugins/Sqlite/modules/userAbyss.js";
import TSUserAvatar from "../../plugins/Sqlite/modules/userAvatar.js";
import TSUserCombat from "../../plugins/Sqlite/modules/userCombat.js";
import { useUserStore } from "../../store/modules/user.js";
import TGLogger from "../../utils/TGLogger.js";
import { generateShareImg } from "../../utils/TGShare.js";
import TakumiRecordGenshinApi from "../../web/request/recordReq.js";

// store
const userStore = storeToRefs(useUserStore());

// data
const userTab = ref<number>(0);
const user = computed<TGApp.Sqlite.Account.Game>(() => userStore.account.value);

const localAbyss = ref<TGApp.Sqlite.Abyss.TableData[]>([]);
const abyssRef = ref<HTMLElement>(<HTMLElement>{});
const version = ref<string>();
const router = useRouter();

const uidList = ref<string[]>();
const uidCur = ref<string>();
const abyssIdList = computed<number[]>(() => {
  return localAbyss.value.map((abyss) => abyss.id);
});

onMounted(async () => {
  showLoading.start("正在加载深渊数据...");
  version.value = await getVersion();
  await TGLogger.Info("[UserAbyss][onMounted] 打开角色深渊页面");
  uidList.value = await TSUserAbyss.getAllUid();
  if (uidList.value.includes(user.value.gameUid)) uidCur.value = user.value.gameUid;
  else if (uidList.value.length > 0) uidCur.value = uidList.value[0];
  else uidCur.value = "";
  await loadAbyss();
  showLoading.end();
});

watch(
  () => uidCur.value,
  async () => await loadAbyss(),
);

async function toCombat(): Promise<void> {
  const check = await TSUserCombat.check();
  if (!check) {
    showSnackbar.warn("未检测到剧诗表，请更新数据库！");
    return;
  }
  await router.push({ name: "真境剧诗" });
}

async function toWiki(): Promise<void> {
  await router.push({ name: "深渊数据库" });
}

async function loadAbyss(): Promise<void> {
  localAbyss.value = [];
  if (uidCur.value === undefined || uidCur.value === "") return;
  localAbyss.value = await TSUserAbyss.getAbyss(uidCur.value);
  if (localAbyss.value.length > 0) userTab.value = localAbyss.value[0].id;
}

async function refreshAbyss(): Promise<void> {
  if (!userStore.cookie.value) {
    showSnackbar.warn("未登录");
    await TGLogger.Warn("[UserAbyss][getAbyssData] 未登录");
    return;
  }
  if (uidCur.value && uidCur.value !== user.value.gameUid) {
    const switchCheck = await showDialog.check(
      "是否切换游戏账户",
      `确认则尝试切换至 ${uidCur.value}`,
    );
    if (switchCheck) {
      await useUserStore().switchGameAccount(uidCur.value);
      await refreshAbyss();
      return;
    }
    const freshCheck = await showDialog.check(
      "确定刷新？",
      `用户${user.value.gameUid}与当前UID${uidCur.value}不一致`,
    );
    if (!freshCheck) {
      showSnackbar.cancel("已取消深渊数据刷新");
      return;
    }
  }
  await TGLogger.Info("[UserAbyss][getAbyssData] 更新深渊数据");
  showLoading.start("正在获取上期深渊数据...", `UID: ${user.value.gameUid}`);
  const resP = await TakumiRecordGenshinApi.spiralAbyss(userStore.cookie.value, user.value, "2");
  if ("retcode" in resP) {
    showLoading.end();
    showSnackbar.error(`[${resP.retcode}]${resP.message}`);
    await TGLogger.Error(`[UserAbyss][getAbyssData] 获取${user.value.gameUid}的上期深渊数据失败`);
    await TGLogger.Error(`[UserAbyss][getAbyssData] ${resP.retcode} ${resP.message}`);
    return;
  }
  await TGLogger.Info("[UserAbyss][getAbyssData] 成功获取上期深渊数据");
  showLoading.update("正在保存上期深渊数据...", `UID: ${user.value.gameUid}`);
  await TSUserAbyss.saveAbyss(user.value.gameUid, resP);
  showLoading.update("正在获取本期深渊数据...", `UID: ${user.value.gameUid}`);
  const res = await TakumiRecordGenshinApi.spiralAbyss(userStore.cookie.value, user.value, "1");
  if ("retcode" in res) {
    showLoading.end();
    showSnackbar.error(`[${res.retcode}]${res.message}`);
    await TGLogger.Error(`[UserAbyss][getAbyssData] 获取${user.value.gameUid}的本期深渊数据失败`);
    await TGLogger.Error(`[UserAbyss][getAbyssData] ${res.retcode} ${res.message}`);
    return;
  }
  showLoading.update("正在保存本期深渊数据...", `UID: ${user.value.gameUid}`);
  await TSUserAbyss.saveAbyss(user.value.gameUid, res);
  await TGLogger.Info(`[UserAbyss][getAbyssData] 成功获取${user.value.gameUid}的本期深渊数据`);
  showLoading.update("正在加载深渊数据...", `UID: ${user.value.gameUid}`);
  uidList.value = await TSUserAbyss.getAllUid();
  uidCur.value = user.value.gameUid;
  await loadAbyss();
  showLoading.end();
}

async function shareAbyss(): Promise<void> {
  await TGLogger.Info(`[UserAbyss][shareAbyss][${userTab.value}] 生成深渊数据分享图片`);
  const fileName = `【深渊数据】${userTab.value}-${user.value.gameUid}`;
  showLoading.start("正在生成图片", `${fileName}.png`);
  abyssRef.value = <HTMLElement>document.getElementById(`user-abyss-${userTab.value}`);
  await generateShareImg(fileName, abyssRef.value);
  showLoading.end();
  await TGLogger.Info(`[UserAbyss][shareAbyss][${userTab.value}] 生成深渊数据分享图片成功`);
}

async function uploadAbyss(): Promise<void> {
  await TGLogger.Info("[UserAbyss][uploadAbyss] 上传深渊数据");
  const abyssData = localAbyss.value.find((item) => item.id === Math.max(...abyssIdList.value));
  if (!abyssData) {
    showSnackbar.warn("未找到深渊数据");
    await TGLogger.Warn("[UserAbyss][uploadAbyss] 未找到深渊数据");
    return;
  }
  const maxFloor = Number(abyssData.maxFloor.split("-")[0]);
  if (isNaN(maxFloor) || maxFloor <= 9) {
    showSnackbar.warn("尚未完成深渊，请完成深渊后重试！");
    await TGLogger.Warn(`[UserAbyss][uploadAbyss] 尚未完成深渊 ${abyssData.maxFloor}`);
    return;
  }
  const startTime = new Date(abyssData.startTime).getTime();
  const endTime = new Date(abyssData.endTime).getTime();
  const nowTime = new Date().getTime();
  if (nowTime < startTime || nowTime > endTime) {
    showSnackbar.warn("非最新深渊数据，请刷新深渊数据后重试！");
    await TGLogger.Warn("[UserAbyss][uploadAbyss] 非最新深渊数据");
    return;
  }
  try {
    showLoading.start("正在上传深渊数据", `UID: ${user.value.gameUid}`);
    const transAbyss = Hutao.Abyss.utils.transData(abyssData);
    showLoading.update("正在获取角色数据", `UID: ${user.value.gameUid}`);
    const roles = await TSUserAvatar.getAvatars(Number(user.value.gameUid));
    if (!roles) {
      showLoading.end();
      showSnackbar.warn("未找到角色数据");
      return;
    }
    showLoading.update("正在转换角色数据", `UID: ${user.value.gameUid}`);
    transAbyss.Avatars = Hutao.Abyss.utils.transAvatars(roles);
    showLoading.update("正在上传深渊数据", `UID: ${user.value.gameUid}`);
    const res = await Hutao.Abyss.upload(transAbyss);
    showLoading.end();
    if (res.retcode !== 0) {
      showSnackbar.error(`[${res.retcode}]${res.message}`);
      await TGLogger.Error("[UserAbyss][uploadAbyss] 上传深渊数据失败");
      await TGLogger.Error(`[UserAbyss][uploadAbyss] ${res.retcode} ${res.message}`);
      return;
    }
    showSnackbar.success(res.message ?? "上传深渊数据成功");
    await TGLogger.Info("[UserAbyss][uploadAbyss] 上传深渊数据成功");
  } catch (e) {
    if (e instanceof Error) {
      showSnackbar.error(e.message);
      await TGLogger.Error("[UserAbyss][uploadAbyss] 上传深渊数据失败");
      await TGLogger.Error(`[UserAbyss][uploadAbyss] ${e.message}`);
    }
  }
  showLoading.end();
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
  showLoading.start(`正在删除 ${uidCur.value} 的深渊数据`);
  await TSUserAbyss.delAbyss(uidCur.value);
  showLoading.end();
  showSnackbar.success(`已清除 ${uidCur.value} 的深渊数据`);
  uidList.value = await TSUserAbyss.getAllUid();
  if (uidList.value.length > 0) uidCur.value = uidList.value[0];
  else uidCur.value = undefined;
  await loadAbyss();
}
</script>
<style lang="css" scoped>
.uat-left {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  padding: 10px;
  gap: 10px;

  img {
    width: 32px;
    height: 32px;
  }

  span {
    font-family: var(--font-title);
    font-size: 20px;
  }

  span :first-child {
    color: var(--common-text-title);
  }
}

.uat-right {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  padding: 10px;
  gap: 10px;
}

.ua-btn {
  background: var(--tgc-btn-1);
  color: var(--btn-text);
  font-family: var(--font-text);
}

.ua-box {
  display: flex;
  height: calc(100vh - 100px);
  align-items: flex-start;
  justify-content: center;
  border: 1px solid var(--common-shadow-4);
  border-radius: 5px;
}

.ua-tabs-box {
  max-height: 100%;
  overflow-y: auto;
}

.ua-window {
  overflow: hidden;
  width: calc(100% - 100px);
  height: 100%;
  padding: 10px;
}

.ua-window-item {
  height: 100%;
  padding: 10px;
  border-radius: 5px;
  overflow-y: auto;
}

.uaw-i-ref {
  display: flex;
  flex-direction: column;
  gap: 5px;
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
  font-family: var(--font-title);
  font-size: 20px;
}

.uaw-title :nth-child(2n) {
  margin-right: 10px;
  margin-left: 10px;
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
  grid-gap: 10px;
  grid-template-columns: repeat(3, 1fr);
}

.uaw-d-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.user-empty {
  position: absolute;
  top: calc(50vh - 200px);
  left: calc(50vw - 400px);
  display: flex;
  width: 800px;
  height: 400px;
  flex-direction: column;
  align-items: center;
  border-radius: 5px;
  background: var(--common-shadow-t-2);
  box-shadow: 0 0 5px var(--common-shadow-2);
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 1.5rem;
}
</style>
