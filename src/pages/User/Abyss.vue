<!-- 深境螺旋 -->
<template>
  <v-app-bar>
    <template #prepend>
      <div class="uat-left">
        <img alt="icon" src="/source/UI/userAbyss.webp" />
        <span>深境螺旋</span>
        <v-select
          density="compact"
          variant="outlined"
          v-model="uidCur"
          :items="uidList"
          :hide-details="true"
          label="游戏UID"
        />
        <v-btn :rounded="true" class="ua-btn" @click="toCombat()">
          <img src="/source/UI/userCombat.webp" alt="combat" />
          <span>真境剧诗</span>
        </v-btn>
        <v-btn :rounded="true" class="ua-btn" @click="toChallenge()">
          <img src="/source/UI/userChallenge.webp" alt="challenge" />
          <span>幽境危战</span>
        </v-btn>
      </div>
    </template>
    <template #append>
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
        <v-btn class="ua-btn" @click="tryReadAbyss()" prepend-icon="mdi-download">导入</v-btn>
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
          <div class="uaw-d-box">
            <TuaDetail v-for="floor in item.floors" :key="floor.id" :floor />
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
import recordReq from "@req/recordReq.js";
import TSUserAbyss from "@Sqlm/userAbyss.js";
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
const localAbyss = shallowRef<TGApp.Sqlite.Abyss.TableData[]>([]);

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

async function toChallenge(): Promise<void> {
  await router.push({ name: "幽境危战" });
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
  const resP = await recordReq.spiralAbyss(cookie.value, account.value, "2");
  console.log(resP);
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
  const res = await recordReq.spiralAbyss(cookie.value, account.value, "1");
  console.log(res);
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
  showSnackbar.success(`已加载${account.value.gameUid}的${localAbyss.value.length}条深渊数据`);
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
  uidList.value = await TSUserAbyss.getAllUid();
  if (uidList.value.length > 0) uidCur.value = uidList.value[0];
  else uidCur.value = undefined;
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
</script>
<style lang="css" scoped>
.uat-left {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
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

.uat-acts {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  margin-left: 8px;
  gap: 8px;
}

.ua-btn {
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

.dark .ua-btn {
  border: 1px solid var(--common-shadow-2);
}

.ua-box {
  display: flex;
  height: calc(100vh - 96px);
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
  background: var(--app-page-bg);
  border-bottom-right-radius: 4px;
  border-top-right-radius: 4px;
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

.user-empty {
  position: absolute;
  top: calc(50vh - 200px);
  left: calc(50vw - 400px);
  display: flex;
  width: 800px;
  height: 400px;
  flex-direction: column;
  align-items: center;
  border-radius: 4px;
  background: var(--common-shadow-t-2);
  box-shadow: 0 0 5px var(--common-shadow-2);
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 1.5rem;
}
</style>
