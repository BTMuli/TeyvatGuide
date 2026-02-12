<!-- 幽境危战 -->
<template>
  <v-app-bar>
    <template #prepend>
      <div class="ucp-top-prepend">
        <div class="ucp-top-title">
          <img alt="icon" src="/UI/nav/userChallenge.webp" />
          <span>幽境危战</span>
        </div>
        <v-select
          v-model="uidCur"
          :hide-details="true"
          :items="uidList"
          density="compact"
          label="游戏UID"
          variant="outlined"
          @update:model-value="switchUid"
        />
        <v-btn class="ucp-btn" rounded variant="elevated" @click="toAbyss()">
          <img alt="abyss" src="/UI/nav/userAbyss.webp" />
          <span>深境螺旋</span>
        </v-btn>
        <v-btn class="ucp-btn" rounded variant="elevated" @click="toCombat()">
          <img alt="abyss" src="/UI/nav/userCombat.webp" />
          <span>真境剧诗</span>
        </v-btn>
      </div>
    </template>
    <template #append>
      <div class="ucp-top-append">
        <div class="act-list">
          <v-btn
            :disabled="localChallenge.length === 0"
            class="ucp-btn"
            prepend-icon="mdi-share"
            variant="elevated"
            @click="shareChallenge()"
          >
            分享
          </v-btn>
          <v-btn
            class="ucp-btn"
            prepend-icon="mdi-refresh"
            variant="elevated"
            @click="refreshChallenge()"
          >
            刷新
          </v-btn>
          <v-btn
            class="ucp-btn"
            prepend-icon="mdi-download"
            variant="elevated"
            @click="tryReadChallenge()"
          >
            导入
          </v-btn>
          <v-btn
            class="ucp-btn"
            prepend-icon="mdi-delete"
            variant="elevated"
            @click="deleteChallenge()"
          >
            删除
          </v-btn>
        </div>
      </div>
    </template>
    <template #extension>
      <div class="ucp-top-extension">
        <div class="pop-list">
          <v-btn
            :disabled="reqPop"
            :loading="reqPop"
            class="pop-btn"
            icon="mdi-refresh"
            size="36"
            @click="refreshPopList"
          />
          <TucPopItem v-for="avatar in popList" :key="avatar.avatar_id" :avatar />
        </div>
        <v-select
          v-model="server"
          :disabled="reqPop"
          :hide-details="true"
          :items="serverList"
          class="uct-extension-select"
          density="compact"
          item-title="text"
          item-value="value"
          label="赋光之人服务器"
          variant="outlined"
          width="200px"
        />
      </div>
    </template>
  </v-app-bar>
  <div class="user-challenge-box">
    <v-tabs
      v-if="localChallenge.length > 0"
      v-model="userTab"
      center-active
      class="ucb-tabs"
      direction="vertical"
    >
      <v-tab v-for="item in localChallenge" :key="item.id" :value="item.id">
        <div class="ucb-tab">
          <span>{{ item.name }}</span>
          <span>{{ item.startTime.slice(0, 10) }} ~ {{ item.endTime.slice(0, 10) }}</span>
        </div>
      </v-tab>
    </v-tabs>
    <v-window v-model="userTab" class="ucb-window">
      <v-window-item
        v-for="item in localChallenge"
        :key="item.id"
        :value="item.id"
        class="ucb-window-item"
      >
        <div :id="`user-challenge-${item.id}`" class="ucb-window-box">
          <div class="ucw-top">
            <div class="ucw-title">
              <span>{{ item.name }}</span>
              <span>{{ item.startTime }} ~ {{ item.endTime }}</span>
              <span>更新于 {{ item.updated }}</span>
            </div>
            <div class="ucw-share">
              幽境危战 | UID-{{ item.uid }} | Render by TeyvatGuide v{{ version }}
            </div>
          </div>
          <TucBlings v-if="item.blings.length > 0" :data="item.blings" />
          <TucOverview :data="item.single" title="单人模式" />
          <TucOverview v-if="item.mp.has_data" :data="item.mp" title="联机模式" />
        </div>
      </v-window-item>
    </v-window>
    <div v-show="localChallenge.length === 0" class="ucb-empty">
      <img alt="empty" src="/UI/app/empty.webp" />
      <span>暂无数据，请尝试刷新</span>
    </div>
  </div>
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import TucBlings from "@comp/userChallenge/tuc-blings.vue";
import TucOverview from "@comp/userChallenge/tuc-overview.vue";
import TucPopItem from "@comp/userChallenge/tuc-pop-item.vue";
import gameEnum from "@enum/game.js";
import recordReq from "@req/recordReq.js";
import TSUserChallenge from "@Sqlm/userChallenge.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { getVersion } from "@tauri-apps/api/app";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import TGLogger from "@utils/TGLogger.js";
import { generateShareImg } from "@utils/TGShare.js";
import { storeToRefs } from "pinia";
import { onMounted, ref, shallowRef, watch } from "vue";
import { useRouter } from "vue-router";

type SelectItem<T = string> = { text: string; value: T };
const serverList: ReadonlyArray<SelectItem<TGApp.Game.Base.ServerTypeEnum>> = [
  gameEnum.server.CN_GF01,
  gameEnum.server.CN_QD01,
].map((i) => ({ text: gameEnum.serverDesc(i), value: i }));

const router = useRouter();
const { isLogin } = storeToRefs(useAppStore());
const { account, cookie } = storeToRefs(useUserStore());

const version = ref<string>();

const isReq = ref<boolean>(false);
const userTab = ref<number>(0);
const uidCur = ref<string>();
const uidList = shallowRef<Array<string>>();
const localChallenge = shallowRef<Array<TGApp.Sqlite.Challenge.TableTrans>>([]);

const server = ref<TGApp.Game.Base.ServerTypeEnum>(gameEnum.server.CN_GF01);
const reqPop = ref<boolean>(false);
const popList = shallowRef<Array<TGApp.Game.Challenge.PopularityItem>>([]);

onMounted(async () => {
  version.value = await getVersion();
  await TGLogger.Info("[UserCombat][onMounted] 打开幽境危战页面");
  await reloadChallenge();
  if (uidCur.value?.startsWith("5")) server.value = gameEnum.server.CN_QD01;
  await refreshPopList(false);
});

watch(
  () => server.value,
  async () => {
    const name = gameEnum.serverDesc(server.value);
    await TGLogger.Info(`[UserChallenge][watch][server] 切换服务器: ${name}`);
    await refreshPopList();
  },
);

async function switchUid(): Promise<void> {
  if (uidCur.value === undefined || uidCur.value === "") return;
  await TGLogger.Info(`[UserChallenge][watch][uidCur] 切换UID: ${uidCur.value}`);
  await showLoading.start(`正在加载UID ${uidCur.value} 的幽境危战数据`);
  await loadChallenge();
  await showLoading.end();
  showSnackbar.success(
    `已加载UID ${uidCur.value} 的 ${localChallenge.value.length} 条幽境危战数据`,
  );
}

async function toAbyss(): Promise<void> {
  await router.push({ name: "深境螺旋" });
}

async function toCombat(): Promise<void> {
  await router.push({ name: "真境剧诗" });
}

async function shareChallenge(): Promise<void> {
  await TGLogger.Info(`[UserChallenge][shareChallenge][${userTab.value}] 生成幽境危战分享图片`);
  const challengeFind = localChallenge.value.find((i) => i.id === userTab.value);
  if (!challengeFind) {
    showSnackbar.warn("未找到对应的挑战记录");
    await TGLogger.Warn("[UserChallenge][shareChallenge] 未找到对应的挑战记录");
    return;
  }
  const fileName = `【幽境危战】【${challengeFind.name}】${challengeFind.id}-${uidCur.value}.png`;
  const shareDom = document.querySelector<HTMLDivElement>(`#user-challenge-${challengeFind.id}`);
  if (shareDom === null) {
    showSnackbar.warn("未找到对应的挑战记录DOM");
    await TGLogger.Warn("[UserChallenge][shareChallenge] 未找到对应的挑战记录DOM");
    return;
  }
  await showLoading.start("正在生成分享图片", fileName);
  await generateShareImg(fileName, shareDom);
  await showLoading.end();
  await TGLogger.Info(`[UserChallenge][shareChallenge][${userTab.value}] 成功生成分享图片`);
}

async function reloadChallenge(): Promise<void> {
  await showLoading.start("正在加载UID列表");
  uidList.value = await TSUserChallenge.getAllUid();
  if (uidList.value.includes(account.value.gameUid)) uidCur.value = account.value.gameUid;
  else if (uidList.value.length > 0) uidCur.value = uidList.value[0];
  else if (isLogin.value) {
    uidList.value = [account.value.gameUid];
    uidCur.value = account.value.gameUid;
  } else uidCur.value = undefined;
  if (uidCur.value) {
    await showLoading.update(`正在加载UID${uidCur.value}的幽境危战数据`);
    await loadChallenge();
  }
  await showLoading.end();
  if (uidCur.value !== undefined && uidCur.value !== "") {
    showSnackbar.success(
      `已加载UID ${uidCur.value} 的 ${localChallenge.value.length} 条幽境危战数据`,
    );
  } else {
    showSnackbar.warn("未检测到可用UID，请尝试刷新数据！");
  }
}

async function loadChallenge(): Promise<void> {
  if (uidCur.value === undefined || uidCur.value === "") return;
  localChallenge.value = await TSUserChallenge.getChallenge(uidCur.value);
  if (localChallenge.value.length > 0) userTab.value = localChallenge.value[0].id;
}

async function refreshChallenge(): Promise<void> {
  if (isReq.value) return;
  if (!cookie.value) {
    showSnackbar.error("未登录");
    await TGLogger.Warn("[UserChallenge][refreshChallenge] 未登录");
    return;
  }
  if (uidCur.value && uidCur.value !== account.value.gameUid) {
    const switchCheck = await showDialog.check(
      "是否切换游戏账户",
      `确认则尝试切换至 ${uidCur.value}`,
    );
    if (switchCheck) {
      await useUserStore().switchGameAccount(uidCur.value);
      await refreshChallenge();
      return;
    }
    const freshCheck = await showDialog.check(
      "确定刷新？",
      `用户${account.value.gameUid}与当前UID${uidCur.value}不一致`,
    );
    if (!freshCheck) {
      showSnackbar.cancel("已取消幽境危战数据刷新");
      return;
    }
  }
  isReq.value = true;
  await TGLogger.Info("[UserChallenge][refreshChallenge] 开始刷新挑战数据");
  await showLoading.start(`正在获取${account.value.gameUid}的幽境危战数据`);
  const resp = await recordReq.challenge.detail(cookie.value, account.value);
  console.log(resp);
  if ("retcode" in resp) {
    await showLoading.end();
    isReq.value = false;
    showSnackbar.error(`[${resp.retcode}] ${resp.message}`);
    await TGLogger.Error(`[UserChallenge][refreshChallenge] ${resp.retcode} - ${resp.message}`);
    return;
  }
  if (!resp.is_unlock) {
    await showLoading.end();
    isReq.value = false;
    showSnackbar.warn("幽境危战未解锁");
    await TGLogger.Warn("[UserChallenge][refreshChallenge] 幽境危战未解锁");
    return;
  }
  await showLoading.update("", { title: "正在保存幽境危战数据" });
  for (const challenge of resp.data) {
    if (challenge.schedule.schedule_id === "0") continue;
    await showLoading.update(`ScheduleID：${challenge.schedule.schedule_id}`);
    await TSUserChallenge.saveChallenge(account.value.gameUid, challenge);
  }
  isReq.value = false;
  uidCur.value = account.value.gameUid;
  await reloadChallenge();
}

async function deleteChallenge(): Promise<void> {
  if (uidCur.value === undefined || uidCur.value === "" || localChallenge.value.length === 0) {
    showSnackbar.warn("没有可删除的挑战记录");
    return;
  }
  const delCheck = await showDialog.check("确认删除？", "此操作将删除当前UID的所有幽境危战记录");
  if (!delCheck) {
    showSnackbar.cancel("已取消幽境危战数据删除");
    return;
  }
  await showLoading.start("正在删除幽境危战数据", `UID: ${uidCur.value}`);
  await TSUserChallenge.delChallenge(uidCur.value);
  showSnackbar.success(`已清除 ${uidCur.value} 的幽境危战数据`);
  uidCur.value = "";
  await reloadChallenge();
}

async function refreshPopList(hint: boolean = true): Promise<void> {
  if (reqPop.value) return;
  reqPop.value = true;
  if (hint) {
    await showLoading.start(
      "正在加载赋光之人列表",
      `服务器： ${gameEnum.serverDesc(server.value)}`,
    );
  }
  const resp = await recordReq.challenge.pop(server.value);
  console.log("赋光之人列表", resp);
  if (resp.retcode !== 0) {
    reqPop.value = false;
    showSnackbar.error(`[${resp.retcode}] ${resp.message}`);
    await TGLogger.Error(
      `[UserChallenge][RefreshPopList] Error: ${resp.retcode} - ${resp.message}`,
    );
    await showLoading.end();
    return;
  }
  popList.value = resp.data.avatar_list;
  await showLoading.end();
  reqPop.value = false;
  showSnackbar.success(
    `已刷新 ${gameEnum.serverDesc(server.value)} 的 ${popList.value.length} 位赋光之人`,
  );
}

/**
 * 尝试读取胡桃工具箱导出的危战数据
 * @since Beta v0.8.6
 * @return {Promise<void>}
 */
async function tryReadChallenge(): Promise<void> {
  const file = await open({
    multiple: false,
    title: "选择胡桃工具箱导出的危战数据文件",
    filters: [{ name: "JSON 文件", extensions: ["json"] }],
    directory: false,
  });
  if (file === null) {
    showSnackbar.cancel("已取消文件选择");
    return;
  }
  try {
    await showLoading.start("正在导入危战数据文件", file);
    const fileData = JSON.parse(await readTextFile(file));
    if (!Array.isArray(fileData)) {
      await showLoading.end();
      showSnackbar.warn("文件数据格式错误");
      return;
    }
    // TODO:数据结构
    for (const item of fileData) {
      await showLoading.update(`Uid: ${item["uid"]},ScheduleId: ${item["schedule_id"]}`);
      await TSUserChallenge.saveChallenge(item["uid"], item["data"]);
    }
    await showLoading.end();
    showSnackbar.success(`成功导入 ${fileData.length} 条危战数据，即将刷新页面`);
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    window.location.reload();
  } catch (e) {
    console.error(e);
    await TGLogger.Error(`[UserChallenge][tryReadChallenge] 导入危战数据失败: ${e}`);
    await showLoading.end();
    showSnackbar.error("导入危战数据失败，请检查文件格式是否正确");
  }
}
</script>
<style lang="scss" scoped>
.ucp-top-prepend {
  position: relative;
  display: flex;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  margin-left: 12px;
  column-gap: 8px;
}

.ucp-top-title {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--common-text-title);
  column-gap: 8px;
  font-family: var(--font-title);
  font-size: 20px;

  img {
    width: 32px;
    height: 32px;
  }
}

.ucp-btn {
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

.ucp-top-append {
  position: relative;
  width: fit-content;
  height: 40px;
  box-sizing: border-box;
  margin-right: 12px;
}

.ucp-top-extension {
  position: relative;
  display: flex;
  width: 100%;
  box-sizing: border-box;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  margin-bottom: 4px;
}

.uct-extension-select {
  position: relative;
  max-width: 200px;
}

.act-list {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.pop-list {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 4px;
}

.pop-btn {
  background: var(--tgc-btn-1);
  color: var(--btn-text);
  font-family: var(--font-title);
}

.dark .pop-btn {
  border: 1px solid var(--common-shadow-2);
}

.user-challenge-box {
  display: flex;
  height: calc(100vh - 144px);
  align-items: flex-start;
  justify-content: center;
  border: 1px solid var(--common-shadow-2);
  border-radius: 4px;
  background: var(--box-bg-1);
}

.ucb-tabs {
  max-width: 200px;
  max-height: 100%;
  overflow-y: auto;
}

.ucb-tab {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;

  span {
    &:last-child {
      font-size: 10px;
      opacity: 0.6;
    }
  }
}

.ucb-window {
  overflow: hidden;
  width: 100%;
  height: 100%;
  padding: 8px;
  background: var(--app-page-bg);
  border-bottom-right-radius: 4px;
  border-top-right-radius: 4px;
}

.ucb-window-item {
  height: 100%;
  padding-right: 8px;
  overflow-y: auto;
}

.ucb-window-box {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ucb-empty {
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
}

.ucw-top {
  display: flex;
  width: 100%;
  align-items: flex-start;
  justify-content: space-between;
}

.ucw-title {
  display: flex;
  flex-direction: column;
  column-gap: 4px;
  font-size: 12px;

  :first-child {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 20px;
  }
}

.ucw-share {
  z-index: -1;
  font-size: 12px;
  opacity: 0.8;
}
</style>
