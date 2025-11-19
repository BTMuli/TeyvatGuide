<!-- 真境剧诗页面 TODO: 重构UI -->
<template>
  <v-app-bar>
    <template #prepend>
      <div class="uct-left">
        <img alt="icon" src="/source/UI/userCombat.webp" />
        <span>幻想真境剧诗</span>
        <v-select
          density="compact"
          variant="outlined"
          v-model="uidCur"
          :items="uidList"
          :hide-details="true"
          label="游戏UID"
        />
        <v-btn :rounded="true" class="uc-btn" @click="toAbyss()">
          <img src="/source/UI/userAbyss.webp" alt="abyss" />
          <span>深境螺旋</span>
        </v-btn>
        <v-btn :rounded="true" class="uc-btn" @click="toChallenge()">
          <img src="/source/UI/userChallenge.webp" alt="challenge" />
          <span>幽境危战</span>
        </v-btn>
      </div>
    </template>
    <template #append>
      <div class="uct-right">
        <v-btn
          class="uc-btn"
          @click="shareCombat()"
          :rounded="true"
          :disabled="localCombat.length === 0"
          prepend-icon="mdi-share"
        >
          分享
        </v-btn>
        <v-btn class="uc-btn" @click="refreshCombat()" :rounded="true" prepend-icon="mdi-refresh">
          刷新
        </v-btn>
        <v-btn class="uc-btn" @click="tryReadCombat()" :rounded="true" prepend-icon="mdi-download">
          导入
        </v-btn>
        <v-btn class="uc-btn" @click="deleteCombat()" :rounded="true" prepend-icon="mdi-delete">
          删除
        </v-btn>
      </div>
    </template>
  </v-app-bar>
  <div class="uc-box">
    <v-tabs v-model="userTab" direction="vertical" class="uc-tabs-box" center-active>
      <v-tab v-for="item in localCombat" :key="item.id" :value="item.id"> 第{{ item.id }}期</v-tab>
    </v-tabs>
    <v-window v-model="userTab" class="uc-window">
      <v-window-item
        v-for="item in localCombat"
        :key="item.id"
        :value="item.id"
        class="uc-window-item"
      >
        <div :id="`user-combat-${item.id}`" class="ucw-i-ref">
          <div class="ucw-top">
            <div class="ucw-title">
              <span>第</span>
              <span>{{ item.id }}</span>
              <span>期 UID</span>
              <span>{{ uidCur }}</span>
              <span>更新于</span>
              <span>{{ item.updated }}</span>
            </div>
            <div class="ucw-share">真境剧诗 | Render by TeyvatGuide v{{ version }}</div>
          </div>
          <TSubLine>统计周期 {{ item.startTime }} ~ {{ item.endTime }}</TSubLine>
          <TucOverview :data="item.stat" :fights="item.detail.fight_statisic" />
          <TSubLine>使用角色({{ item.detail.backup_avatars.length }}名)</TSubLine>
          <TucAvatars :model-value="item.detail.backup_avatars" :detail="false" />
          <div class="ucw-rounds">
            <TucRound v-for="(round, idx) in item.detail.rounds_data" :key="idx" :round="round" />
          </div>
        </div>
      </v-window-item>
    </v-window>
    <div v-show="localCombat.length === 0" class="user-empty">
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
import TucAvatars from "@comp/userCombat/tuc-avatars.vue";
import TucOverview from "@comp/userCombat/tuc-overview.vue";
import TucRound from "@comp/userCombat/tuc-round.vue";
import recordReq from "@req/recordReq.js";
import TSUserCombat from "@Sqlm/userCombat.js";
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
const { account, cookie } = storeToRefs(useUserStore());
const userTab = ref<number>(0);
const version = ref<string>();
const uidCur = ref<string>();
const uidList = shallowRef<Array<string>>();
const localCombat = shallowRef<Array<TGApp.Sqlite.Combat.SingleTable>>([]);

onMounted(async () => {
  await showLoading.start("正在加载剧诗数据");
  version.value = await getVersion();
  await TGLogger.Info("[UserCombat][onMounted] 打开真境剧诗页面");
  await showLoading.update("正在加载UID列表");
  uidList.value = await TSUserCombat.getAllUid();
  if (uidList.value.length === 0) {
    uidCur.value = "";
  } else {
    if (uidList.value.includes(account.value.gameUid)) uidCur.value = account.value.gameUid;
    else uidCur.value = uidList.value[0];
    await showLoading.update(`正在加载UID${uidCur.value}的剧诗数据`);
  }
  await loadCombat();
  await showLoading.end();
});

watch(() => uidCur.value, loadCombat);

async function toAbyss(): Promise<void> {
  await router.push({ name: "深境螺旋" });
}

async function toChallenge(): Promise<void> {
  await router.push({ name: "幽境危战" });
}

async function loadCombat(): Promise<void> {
  localCombat.value = [];
  if (uidCur.value === undefined || uidCur.value === "") return;
  localCombat.value = await TSUserCombat.getCombat(uidCur.value);
  if (localCombat.value.length > 0) userTab.value = localCombat.value[0].id;
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
  uidList.value = await TSUserCombat.getAllUid();
  uidCur.value = account.value.gameUid;
  await loadCombat();
  await showLoading.end();
}

async function shareCombat(): Promise<void> {
  await TGLogger.Info(`[UserCombat][shareCombat][${userTab.value}] 生成剧诗数据分享图片`);
  const fileName = `【真境剧诗】${userTab.value}-${uidCur.value}.png`;
  const shareDom = document.querySelector<HTMLElement>(`#user-combat-${userTab.value}`);
  if (shareDom === null) {
    showSnackbar.error("未找到分享数据");
    await TGLogger.Warn(`[UserCombat][shareCombat][${userTab.value}] 未找到分享数据`);
    return;
  }
  await showLoading.start("正在生成图片", fileName);
  await generateShareImg(fileName, shareDom);
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
  uidList.value = await TSUserCombat.getAllUid();
  if (uidList.value.length > 0) uidCur.value = uidList.value[0];
  else uidCur.value = undefined;
  await loadCombat();
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
</script>
<style lang="scss" scoped>
.uct-left {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 12px;
  gap: 8px;

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

.dark .uc-btn {
  border: 1px solid var(--common-shadow-2);
}

.uc-box {
  display: flex;
  height: calc(100vh - 96px);
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
  justify-content: space-between;
}

.ucw-title {
  display: flex;
  align-items: center;
  color: var(--common-text-title);
  column-gap: 4px;
  font-family: var(--font-title);
  font-size: 20px;
}

.ucw-title :nth-child(2n) {
  color: var(--tgc-yellow-1);
}

.ucw-share {
  z-index: -1;
  font-size: 12px;
  opacity: 0.8;
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
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, 1fr);
}
</style>
