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
      <div v-show="localChallenge.length === 0" class="ucb-empty">
        <img alt="empty" src="/UI/app/empty.webp" />
        <span>暂无数据，请尝试刷新</span>
      </div>
    </v-window>
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
import TSUserAccount from "@Sqlm/userAccount.js";
import TSUserChallenge from "@Sqlm/userChallenge.js";
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
const { account, cookie } = storeToRefs(useUserStore());

const version = ref<string>();

const userTab = ref<number>(0);
const uidCur = ref<string>();
const uidList = shallowRef<Array<string>>();
const localChallenge = shallowRef<Array<TGApp.Sqlite.Challenge.TableTrans>>([]);

const server = ref<TGApp.Game.Base.ServerTypeEnum>(gameEnum.server.CN_GF01);
const reqPop = ref<boolean>(false);
const popList = shallowRef<Array<TGApp.Game.Challenge.PopularityItem>>([]);

onMounted(async () => {
  await showLoading.start("正在加载危战数据");
  version.value = await getVersion();
  await TGLogger.Info("[UserCombat][onMounted] 打开幽境危战页面");
  await showLoading.update("正在获取UID列表");
  await reloadUid();
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
watch(
  () => uidCur.value,
  async () => await loadChallenge(),
);

async function reloadUid(uid?: string): Promise<void> {
  uidList.value = await TSUserChallenge.getAllUid();
  if (uidList.value.length === 0) uidList.value = [account.value.gameUid];
  if (uidList.value.includes(account.value.gameUid)) {
    if (uid === undefined) uidCur.value = account.value.gameUid;
  } else {
    uidList.value = [account.value.gameUid, ...uidList.value];
    if (uid === undefined) uidCur.value = uidList.value[0];
  }
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

async function loadChallenge(): Promise<void> {
  if (uidCur.value === undefined || uidCur.value === "") return;
  localChallenge.value = await TSUserChallenge.getChallenge(uidCur.value);
  if (localChallenge.value.length > 0) userTab.value = localChallenge.value[0].id;
}

async function refreshChallenge(): Promise<void> {
  let rfAccount = account.value;
  let rfCk = cookie.value;
  if (!uidCur.value) {
    if (!rfCk) {
      showSnackbar.warn("请先登录");
      await TGLogger.Warn(`[Challenge][refreshChallenge][${rfAccount.gameUid}] 未登录`);
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
  await TGLogger.Info("[Challenge][refreshChallenge] 开始刷新挑战数据");
  await showLoading.start(`正在获取${rfAccount.gameUid}的幽境危战数据`);
  const resp = await recordReq.challenge.detail(rfCk!, rfAccount);
  console.log(resp);
  if ("retcode" in resp) {
    await showLoading.end();
    showSnackbar.error(`[${resp.retcode}] ${resp.message}`);
    await TGLogger.Error(`[Challenge][refreshChallenge] ${resp.retcode} - ${resp.message}`);
    return;
  }
  if (!resp.is_unlock) {
    await showLoading.end();
    showSnackbar.warn("幽境危战未解锁");
    await TGLogger.Warn("[Challenge][refreshChallenge] 幽境危战未解锁");
    return;
  }
  await showLoading.update("", { title: "正在保存幽境危战数据" });
  for (const challenge of resp.data) {
    if (challenge.schedule.schedule_id === "0") continue;
    await showLoading.update(`ScheduleID：${challenge.schedule.schedule_id}`);
    await TSUserChallenge.saveChallenge(rfAccount.gameUid, challenge);
  }
  await reloadUid(uidCur.value);
  await loadChallenge();
  await showLoading.end();
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
  await reloadUid();
  await loadChallenge();
  await showLoading.end();
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
