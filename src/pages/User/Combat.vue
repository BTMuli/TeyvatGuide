<!-- 真境剧诗页面 -->
<template>
  <v-app-bar>
    <template #prepend>
      <div class="uct-left">
        <div class="uct-title">
          <img alt="icon" src="/source/UI/userCombat.webp" />
          <span>幻想真境剧诗</span>
        </div>
        <v-select
          v-model="uidCur"
          :hide-details="true"
          :items="uidList"
          density="compact"
          label="游戏UID"
          variant="outlined"
        />
        <v-btn class="uc-btn" rounded variant="elevated" @click="toAbyss()">
          <img alt="abyss" src="/source/UI/userAbyss.webp" />
          <span>深境螺旋</span>
        </v-btn>
        <v-btn class="uc-btn" rounded variant="elevated" @click="toChallenge()">
          <img alt="challenge" src="/source/UI/userChallenge.webp" />
          <span>幽境危战</span>
        </v-btn>
      </div>
    </template>
    <template #append>
      <div class="uct-right">
        <v-btn
          :disabled="localCombat.length === 0"
          class="uc-btn"
          prepend-icon="mdi-share"
          variant="elevated"
          @click="shareCombat()"
        >
          分享
        </v-btn>
        <v-btn
          class="uc-btn"
          prepend-icon="mdi-refresh"
          variant="elevated"
          @click="refreshCombat()"
        >
          刷新
        </v-btn>
        <v-btn
          class="uc-btn"
          prepend-icon="mdi-download"
          variant="elevated"
          @click="tryReadCombat()"
        >
          导入
        </v-btn>
        <v-btn class="uc-btn" prepend-icon="mdi-delete" variant="elevated" @click="deleteCombat()">
          删除
        </v-btn>
      </div>
    </template>
    <template #extension>
      <div class="uct-extension">
        <v-btn class="uc-btn" variant="elevated" @click="loadWiki()">
          <img alt="abyss" src="/platforms/other/hutao.webp" />
          <span>统计数据</span>
        </v-btn>
        <div class="uct-extension-right">
          <span @click="tryLoginHutao()">{{ userName ?? "登录胡桃云" }}</span>
          <v-btn
            class="uc-btn"
            prepend-icon="mdi-cloud-upload"
            variant="elevated"
            @click="uploadCombat()"
          >
            上传
          </v-btn>
        </div>
      </div>
    </template>
  </v-app-bar>
  <div class="uc-box">
    <v-tabs v-model="userTab" center-active class="uc-tabs-box" direction="vertical">
      <v-tab v-for="item in localCombat" :key="item.id" :value="item.id"> 第{{ item.id }}期</v-tab>
    </v-tabs>
    <v-window v-model="userTab" class="uc-window">
      <v-window-item
        v-for="item in localCombat"
        :key="item.id"
        :value="item.id"
        class="uc-window-item"
      >
        <div :class="userTab === item.id ? 'ucw-i-ref active' : 'ucw-i-ref'">
          <div class="ucw-top">
            <img
              v-if="isFinTarot(item)"
              alt="tarot"
              class="ucw-tarot"
              src="/icon/combat/tarot.webp"
            />
            <div class="ucw-title">
              <span>第</span>
              <span>{{ item.id }}</span>
              <span>期 UID</span>
              <span>{{ uidCur }}</span>
            </div>
            <div class="ucw-share">真境剧诗 | Render by TeyvatGuide v{{ version }}</div>
          </div>
          <TSubLine>
            <div class="ucw-subtitle">
              <span>统计周期 {{ item.startTime }} ~ {{ item.endTime }}</span>
              <span>{{ item.updated }}更新</span>
            </div>
          </TSubLine>
          <TucOverview :data="item.stat" :fights="item.detail.fight_statisic" />
          <TSubLine>使用角色({{ item.detail.backup_avatars.length }}名)</TSubLine>
          <TucAvatars :detail="false" :model-value="item.detail.backup_avatars" />
          <div class="ucw-rounds">
            <TucRound
              v-for="(round, idx) in item.detail.rounds_data"
              :id="item.id"
              :key="idx"
              :round="round"
              :uid="item.uid"
            />
          </div>
        </div>
      </v-window-item>
    </v-window>
    <div v-show="localCombat.length === 0" class="user-empty">
      <img alt="empty" src="/source/UI/empty.webp" />
      <span>暂无数据，请尝试刷新</span>
    </div>
  </div>
  <TucOverlay v-model="showData" :data="cloudCombat" />
</template>
<script lang="ts" setup>
import TSubLine from "@comp/app/t-subline.vue";
import showDialog from "@comp/func/dialog.js";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import TucAvatars from "@comp/userCombat/tuc-avatars.vue";
import TucOverlay from "@comp/userCombat/tuc-overlay.vue";
import TucOverview from "@comp/userCombat/tuc-overview.vue";
import TucRound from "@comp/userCombat/tuc-round.vue";
import hutao from "@Hutao/index.js";
import recordReq from "@req/recordReq.js";
import TSUserCombat from "@Sqlm/userCombat.js";
import useAppStore from "@store/app.js";
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

const { isLogin } = storeToRefs(useAppStore());
const { account, cookie } = storeToRefs(useUserStore());
const { userName } = storeToRefs(hutaoStore);

const userTab = ref<number>(0);
const version = ref<string>();
const uidCur = ref<string>();
const showData = ref<boolean>(false);
const uidList = shallowRef<Array<string>>();
const cloudCombat = shallowRef<TGApp.Plugins.Hutao.Combat.Data>();
const localCombat = shallowRef<Array<TGApp.Sqlite.Combat.TableTrans>>([]);

onMounted(async () => {
  await showLoading.start("正在加载剧诗数据");
  version.value = await getVersion();
  await TGLogger.Info("[UserCombat][onMounted] 打开真境剧诗页面");
  await showLoading.update("正在加载UID列表");
  await reloadUid();
  if (uidCur.value) {
    await showLoading.update(`正在加载UID${uidCur.value}的剧诗数据`);
    await loadCombat();
  }
  await showLoading.end();
});

watch(() => uidCur.value, loadCombat);

async function toAbyss(): Promise<void> {
  await router.push({ name: "深境螺旋" });
}

async function toChallenge(): Promise<void> {
  await router.push({ name: "幽境危战" });
}

async function loadWiki(): Promise<void> {
  await showLoading.start("正在加载统计数据");
  const res = await hutao.Combat.data();
  if (res === undefined) showSnackbar.error("未获取到剧诗数据");
  else if ("retcode" in res) {
    showSnackbar.warn(`[${res.retcode}] ${res.message}`);
    await TGLogger.Warn(`[Combat][loadWiki] ${JSON.stringify(res)}`);
  } else cloudCombat.value = res;
  await showLoading.end();
  showSnackbar.success("成功获取统计数据");
  showData.value = true;
}

async function reloadUid(): Promise<void> {
  uidList.value = await TSUserCombat.getAllUid();
  if (uidList.value.includes(account.value.gameUid)) uidCur.value = account.value.gameUid;
  else if (uidList.value.length > 0) uidCur.value = uidList.value[0];
  else if (isLogin.value) {
    uidList.value = [account.value.gameUid];
    uidCur.value = account.value.gameUid;
  } else uidCur.value = undefined;
}

async function loadCombat(): Promise<void> {
  localCombat.value = [];
  if (uidCur.value === undefined || uidCur.value === "") return;
  localCombat.value = await TSUserCombat.getCombat(uidCur.value);
  if (localCombat.value.length > 0) userTab.value = localCombat.value[0].id;
}

async function tryLoginHutao(): Promise<void> {
  if (!userName.value) await hutaoStore.tryLogin();
}

async function refreshCombat(): Promise<void> {
  if (!cookie.value) {
    showSnackbar.error("未登录");
    await TGLogger.Warn("[UserCombat][refreshCombat] 未登录");
    return;
  }
  if (uidCur.value && uidCur.value !== account.value.gameUid) {
    const switchCheck = await showDialog.check(
      "是否切换游戏账户",
      `确认则尝试切换至 ${uidCur.value}`,
    );
    if (switchCheck) {
      await useUserStore().switchGameAccount(uidCur.value);
      await refreshCombat();
      return;
    }
    const freshCheck = await showDialog.check(
      "确定刷新？",
      `用户${account.value.gameUid}与当前UID${uidCur.value}不一致`,
    );
    if (!freshCheck) {
      showSnackbar.cancel("已取消剧诗数据刷新");
      return;
    }
  }
  await TGLogger.Info("[UserCombat][refreshCombat] 更新剧诗数据");
  await showLoading.start(`正在获取${account.value.gameUid}的剧诗数据`);
  const res = await recordReq.roleCombat(cookie.value, account.value);
  console.log(res);
  if (res === false) {
    await showLoading.end();
    showSnackbar.warn("用户未解锁幻想真境剧诗");
    return;
  }
  if ("retcode" in res) {
    await showLoading.end();
    showSnackbar.error(`[${res.retcode}]${res.message}`);
    await TGLogger.Error(`[UserCombat][refreshCombat] 获取${account.value.gameUid}的剧诗数据失败`);
    await TGLogger.Error(`[UserCombat][refreshCombat] ${res.retcode} ${res.message}`);
    return;
  }
  await showLoading.update("正在保存剧诗数据");
  for (const combat of res) {
    await showLoading.update("正在保存剧诗数据");
    await TSUserCombat.saveCombat(account.value.gameUid, combat);
  }
  await showLoading.update("正在加载剧诗数据");
  await reloadUid();
  await loadCombat();
  await showLoading.end();
}

async function shareCombat(): Promise<void> {
  await TGLogger.Info(`[UserCombat][shareCombat][${userTab.value}] 生成剧诗数据分享图片`);
  const fileName = `【真境剧诗】${userTab.value}-${uidCur.value}.png`;
  const shareDom = document.querySelector<HTMLElement>(`.ucw-i-ref.active`);
  if (shareDom === null) {
    showSnackbar.error("未找到分享数据");
    await TGLogger.Warn(`[UserCombat][shareCombat][${userTab.value}] 未找到分享数据`);
    return;
  }
  await showLoading.start("正在生成图片", fileName);
  await generateShareImg(fileName, shareDom, 2.0);
  await showLoading.end();
  await TGLogger.Info(`[UserCombat][shareCombat][${userTab.value}] 生成剧诗数据分享图片成功`);
}

async function deleteCombat(): Promise<void> {
  if (uidCur.value === undefined || uidCur.value === "") {
    showSnackbar.error("未找到符合条件的数据!");
    return;
  }
  const delCheck = await showDialog.check("确定删除数据？", `将清除${uidCur.value}的所有剧诗数据`);
  if (!delCheck) {
    showSnackbar.cancel("已取消删除");
    return;
  }
  await showLoading.start("正在删除剧诗数据", `UID: ${uidCur.value}`);
  await TSUserCombat.delCombat(uidCur.value);
  showSnackbar.success(`已清除 ${uidCur.value} 的剧诗数据`);
  await showLoading.update("正在加载剧诗数据");
  await reloadUid();
  await loadCombat();
  await showLoading.end();
}

async function uploadCombat(): Promise<void> {
  if (!userName.value || userName.value === "") {
    const check = await showDialog.check("确定上传？", "未设置胡桃云账号");
    if (!check) return;
  }
  await TGLogger.Info("[UserCombat][uploadCombat] 上传剧诗数据");
  const maxId = Math.max(...localCombat.value.map((i) => i.id));
  const combatData = localCombat.value.find((item) => item.id === maxId);
  if (!combatData) {
    showSnackbar.error("未找到剧诗数据");
    await TGLogger.Warn("[UserCombat][uploadCombat] 未找到深渊数据");
    return;
  }
  if (!combatData.hasDetailData) {
    showSnackbar.error("未获取到详情数据");
    await TGLogger.Warn(`[UserCombat][uploadCombat] 未获取到详细数据`);
    return;
  }
  const startTime = new Date(combatData.startTime).getTime();
  const endTime = new Date(combatData.endTime).getTime();
  const nowTime = new Date().getTime();
  if (nowTime < startTime || nowTime > endTime) {
    showSnackbar.warn("非最新剧诗数据，请刷新剧诗数据后重试！");
    await TGLogger.Warn("[UserCombat][uploadCombat] 非最新剧诗数据");
    return;
  }
  try {
    await showLoading.start("正在上传剧诗数据");
    const transCombat = hutao.Combat.trans(combatData);
    const res = await hutao.Combat.upload(transCombat);
    if (res.retcode === 0) {
      showSnackbar.success(res.message ?? "上传剧诗数据成功");
      await TGLogger.Info("[UserCombat][uploadCombat] 上传剧诗数据成功");
    } else {
      showSnackbar.error(`[${res.retcode}]${res.message}`);
      await TGLogger.Error("[UserCombat][uploadCombat] 上传剧诗数据失败");
      await TGLogger.Error(`[UserCombat][uploadCombat] ${res.retcode} ${res.message}`);
    }
  } catch (e) {
    if (e instanceof Error) {
      showSnackbar.error(e.message);
      await TGLogger.Error("[UserCombat][uploadCombat] 上传剧诗数据失败");
      await TGLogger.Error(`[UserCombat][uploadCombat] ${e.message}`);
    }
  }
  await showLoading.end();
}

/**
 * 尝试读取胡桃工具箱导出的剧诗数据
 * @since Beta v0.8.6
 * @returns {Promise<void>}
 */
async function tryReadCombat(): Promise<void> {
  const file = await open({
    multiple: false,
    title: "选择胡桃工具箱导出的剧诗数据文件",
    filters: [{ name: "JSON 文件", extensions: ["json"] }],
    directory: false,
  });
  if (file === null) {
    showSnackbar.cancel("已取消文件选择");
    return;
  }
  try {
    await showLoading.start("正在导入剧诗数据文件", file);
    const fileData = JSON.parse(await readTextFile(file));
    if (!Array.isArray(fileData)) {
      await showLoading.end();
      showSnackbar.warn("文件数据格式错误");
      return;
    }
    // TODO:数据结构
    for (const item of fileData) {
      await showLoading.update(`Uid: ${item["uid"]},ScheduleId: ${item["schedule_id"]}`);
      await TSUserCombat.saveCombat(item["uid"], item["data"]);
    }
    await showLoading.end();
    showSnackbar.success(`成功导入 ${fileData.length} 条剧诗数据，即将刷新页面`);
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    window.location.reload();
  } catch (e) {
    console.error(e);
    await TGLogger.Error(`[UserCombat][tryReadCombat] 导入剧诗数据失败: ${e}`);
    await showLoading.end();
    showSnackbar.error("导入剧诗数据失败，请检查文件格式是否正确");
  }
}

function isFinTarot(data: TGApp.Sqlite.Combat.TableTrans): boolean {
  if (!data.hasData) return false;
  return data.stat.max_round_id === 10 && data.stat.tarot_finished_cnt > 0;
}
</script>
<style lang="scss" scoped>
.uct-left {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 12px;
  gap: 8px;
}

.uct-title {
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

.uct-extension {
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

.uct-extension-right {
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

.uct-right {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  gap: 8px;
}

.uc-btn {
  background: var(--tgc-btn-1);
  color: var(--btn-text);
  font-family: var(--font-text);

  img {
    width: 24px;
    height: 24px;
    margin-right: 4px;
    object-fit: contain;
  }
}

.uc-box {
  position: relative;
  display: flex;
  height: calc(100vh - 144px);
  align-items: flex-start;
  justify-content: center;
  border: 1px solid var(--common-shadow-2);
  border-radius: 4px;
  background: var(--box-bg-1);
}

.uc-tabs-box {
  max-height: 100%;
  overflow-y: auto;
}

.uc-window {
  overflow: hidden;
  width: 100%;
  height: 100%;
  padding: 8px;
  background: var(--app-page-bg);
  border-bottom-right-radius: 4px;
  border-top-right-radius: 4px;
}

.uc-window-item {
  height: 100%;
  padding-right: 8px;
  overflow-y: auto;
}

.ucw-i-ref {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ucw-top {
  display: flex;
  width: 100%;
  align-items: flex-end;
  justify-content: flex-start;
  column-gap: 8px;
}

.ucw-title {
  display: flex;
  align-items: center;
  color: var(--common-text-title);
  column-gap: 4px;
  font-size: 18px;

  :nth-child(2n) {
    color: var(--tgc-od-orange);
    font-family: var(--font-title);
  }
}

.ucw-tarot {
  width: 48px;
}

.ucw-share {
  z-index: -1;
  margin-left: auto;
  font-size: 12px;
  opacity: 0.8;
}

.ucw-subtitle {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding-right: 8px;
  padding-left: 4px;
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

.ucw-rounds {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  row-gap: 8px;
}
</style>
