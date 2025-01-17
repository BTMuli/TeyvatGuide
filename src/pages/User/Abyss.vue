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
      <div class="uat-hutao">
        <span>胡桃云账号：</span>
        <span @click="editHutaoEmail()">{{ hutaoEmail ?? "未设置" }}</span>
      </div>
    </template>
    <template #extension>
      <div class="uat-acts">
        <v-btn
          class="ua-btn"
          @click="shareAbyss()"
          :disabled="localAbyss.length === 0"
          prepend-icon="mdi-share"
        >
          分享
        </v-btn>
        <v-btn class="ua-btn" @click="refreshAbyss()" prepend-icon="mdi-refresh">刷新</v-btn>
        <v-btn class="ua-btn" @click="uploadAbyss()" prepend-icon="mdi-cloud-upload">上传</v-btn>
        <v-btn class="ua-btn" @click="deleteAbyss()" prepend-icon="mdi-delete">删除</v-btn>
      </div>
    </template>
  </v-app-bar>
  <div class="ua-box">
    <v-tabs v-model="userTab" direction="vertical" class="ua-tabs-box" center-active>
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
import TSubLine from "@comp/app/t-subline.vue";
import showDialog from "@comp/func/dialog.js";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import TuaDetail from "@comp/userAbyss/tua-detail.vue";
import TuaOverview from "@comp/userAbyss/tua-overview.vue";
import Hutao from "@Hutao/index.js";
import TSUserAbyss from "@Sqlite/modules/userAbyss.js";
import TSUserAvatar from "@Sqlite/modules/userAvatar.js";
import { getVersion } from "@tauri-apps/api/app";
import { storeToRefs } from "pinia";
import { computed, onMounted, ref, shallowRef, watch } from "vue";
import { useRouter } from "vue-router";

import { useUserStore } from "@/store/modules/user.js";
import TGLogger from "@/utils/TGLogger.js";
import { generateShareImg } from "@/utils/TGShare.js";
import TakumiRecordGenshinApi from "@/web/request/recordReq.js";

const router = useRouter();
const { account, cookie, hutaoEmail } = storeToRefs(useUserStore());
const userTab = ref<number>(0);
const version = ref<string>();
const uidCur = ref<string>();
const uidList = shallowRef<Array<string>>();
const localAbyss = shallowRef<TGApp.Sqlite.Abyss.TableData[]>([]);
const abyssIdList = computed<Array<number>>(() => localAbyss.value.map((abyss) => abyss.id));

onMounted(async () => {
  await showLoading.start("正在加载深渊数据");
  version.value = await getVersion();
  await TGLogger.Info("[UserAbyss][onMounted] 打开角色深渊页面");
  await showLoading.update("正在获取UID列表");
  uidList.value = await TSUserAbyss.getAllUid();
  if (uidList.value.includes(account.value.gameUid)) uidCur.value = account.value.gameUid;
  else if (uidList.value.length > 0) uidCur.value = uidList.value[0];
  else uidCur.value = "";
  await showLoading.update(`正在加载${uidCur.value}的深渊数据`);
  await loadAbyss();
  await showLoading.end();
  showSnackbar.success(`已加载${uidCur.value}的${localAbyss.value.length}条深渊数据`);
});

watch(() => uidCur.value, loadAbyss);

async function toCombat(): Promise<void> {
  await router.push({ name: "真境剧诗" });
}

async function toWiki(): Promise<void> {
  await router.push({ name: "深渊数据库" });
}

async function editHutaoEmail(): Promise<void> {
  if (hutaoEmail.value) {
    const chgCheck = await showDialog.check("是否更改胡桃云账号", `当前账号：${hutaoEmail.value}`);
    if (!chgCheck) {
      showSnackbar.cancel("已取消更改胡桃云账号");
      return;
    }
  }
  const newEmail = await showDialog.input("请输入胡桃云账号", "胡桃云账号", hutaoEmail.value);
  if (!newEmail) {
    showSnackbar.cancel("已取消设置胡桃云账号");
    return;
  }
  // 简单验证邮箱格式
  const mailReg = /^[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/;
  if (!mailReg.test(newEmail)) {
    showSnackbar.error("邮箱格式错误");
    return;
  }
  hutaoEmail.value = newEmail;
  showSnackbar.success("已设置胡桃云账号");
}

async function loadAbyss(): Promise<void> {
  localAbyss.value = [];
  if (uidCur.value === undefined || uidCur.value === "") return;
  localAbyss.value = await TSUserAbyss.getAbyss(uidCur.value);
  if (localAbyss.value.length > 0) userTab.value = localAbyss.value[0].id;
}

async function refreshAbyss(): Promise<void> {
  if (!cookie.value) {
    showSnackbar.warn("未登录");
    await TGLogger.Warn("[UserAbyss][getAbyssData] 未登录");
    return;
  }
  if (uidCur.value && uidCur.value !== account.value.gameUid) {
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
      `用户${account.value.gameUid}与当前UID${uidCur.value}不一致`,
    );
    if (!freshCheck) {
      showSnackbar.cancel("已取消深渊数据刷新");
      return;
    }
  }
  await TGLogger.Info("[UserAbyss][getAbyssData] 更新深渊数据");
  await showLoading.start(`正在获取${account.value.gameUid}的深渊数据`, "正在获取上期数据");
  const resP = await TakumiRecordGenshinApi.spiralAbyss(cookie.value, account.value, "2");
  if ("retcode" in resP) {
    await showLoading.end();
    showSnackbar.error(`[${resP.retcode}]${resP.message}`);
    await TGLogger.Error(
      `[UserAbyss][getAbyssData] 获取${account.value.gameUid}的上期深渊数据失败`,
    );
    await TGLogger.Error(`[UserAbyss][getAbyssData] ${resP.retcode} ${resP.message}`);
    return;
  }
  await TGLogger.Info("[UserAbyss][getAbyssData] 成功获取上期深渊数据");
  await showLoading.update("正在保存上期深渊数据");
  await TSUserAbyss.saveAbyss(account.value.gameUid, resP);
  await showLoading.update("正在获取本期深渊数据");
  const res = await TakumiRecordGenshinApi.spiralAbyss(cookie.value, account.value, "1");
  if ("retcode" in res) {
    await showLoading.end();
    showSnackbar.error(`[${res.retcode}]${res.message}`);
    await TGLogger.Error(
      `[UserAbyss][getAbyssData] 获取${account.value.gameUid}的本期深渊数据失败`,
    );
    await TGLogger.Error(`[UserAbyss][getAbyssData] ${res.retcode} ${res.message}`);
    return;
  }
  await showLoading.update("正在保存本期深渊数据");
  await TSUserAbyss.saveAbyss(account.value.gameUid, res);
  await TGLogger.Info(`[UserAbyss][getAbyssData] 成功获取${account.value.gameUid}的本期深渊数据`);
  await showLoading.update("正在加载深渊数据");
  uidList.value = await TSUserAbyss.getAllUid();
  uidCur.value = account.value.gameUid;
  await loadAbyss();
  await showLoading.end();
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
    await showLoading.start(`正在上传${account.value.gameUid}的深渊数据`, `期数：${abyssData.id}`);
    const transAbyss = Hutao.Abyss.utils.transData(abyssData);
    if (hutaoEmail.value) transAbyss.ReservedUserName = hutaoEmail.value;
    await showLoading.update("正在获取角色数据");
    const roles = await TSUserAvatar.getAvatars(Number(account.value.gameUid));
    if (!roles) {
      await showLoading.end();
      showSnackbar.warn("未找到角色数据");
      return;
    }
    await showLoading.update("正在转换角色数据");
    transAbyss.Avatars = Hutao.Abyss.utils.transAvatars(roles);
    await showLoading.update("正在上传深渊数据");
    const res = await Hutao.Abyss.upload(transAbyss);
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
  await showLoading.end();
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

.uat-hutao {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  font-family: var(--font-text);
  font-size: 16px;

  :last-child {
    color: var(--tgc-pink-1);
    cursor: pointer;
    font-weight: bold;
  }
}

.uat-acts {
  display: flex;
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
  height: calc(100vh - 150px);
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
