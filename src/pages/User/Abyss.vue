<template>
  <ToLoading v-model="loading" :title="loadingTitle" :subtitle="loadingSub" />
  <div class="ua-box">
    <div class="ua-left-box">
      <v-tabs v-model="userTab" direction="vertical" class="ua-tabs-box">
        <v-tab v-for="item in localAbyss" :key="item.id" :value="item.id" @click="toAbyss(item.id)">
          第{{ item.id }}期
        </v-tab>
      </v-tabs>
      <div class="ua-tab-bottom">
        <v-btn class="ua-btn" @click="shareAbyss" rounded>
          <v-icon>mdi-share</v-icon>
          <span>分享</span>
        </v-btn>
        <v-btn class="ua-btn" @click="getAbyssData" rounded>
          <v-icon>mdi-refresh</v-icon>
          <span>刷新</span>
        </v-btn>
        <v-btn class="ua-btn" @click="uploadAbyss" rounded>
          <v-icon>mdi-cloud-upload</v-icon>
          <span>上传</span>
        </v-btn>
      </div>
    </div>
    <v-window v-model="userTab" class="ua-window">
      <v-window-item
        v-for="item in localAbyss"
        :key="item.id"
        :value="item.id"
        class="ua-window-item"
      >
        <div :id="`user-abyss-${item.id}`" class="uaw-i-ref">
          <div class="uaw-title">
            <span>第</span>
            <span>{{ item.id }}</span>
            <span>期 UID</span>
            <span>{{ user.gameUid }}</span>
            <span>更新于</span>
            <span>{{ item.updated }}</span>
          </div>
          <TSubLine>统计周期 {{ item.startTime }} ~ {{ item.endTime }}</TSubLine>
          <div class="uaw-o-box">
            <TuaOverview title="战斗次数" :val-text="item.totalBattleTimes" />
            <TuaOverview title="获得渊星" :val-text="item.totalStar" />
            <TuaOverview title="最深抵达" :val-text="item.maxFloor" />
            <TuaOverview title="最多击破" :val-icons="item.defeatRank" />
            <TuaOverview title="最多承伤" :val-icons="item.takeDamageRank" />
            <TuaOverview title="最强一击" :val-icons="item.damageRank" />
            <TuaOverview title="元素战技" :val-icons="item.normalSkillRank" />
            <TuaOverview title="出战次数" :val-icons="item.revealRank" :multi4="true" />
            <TuaOverview title="元素爆发" :val-icons="item.energySkillRank" />
          </div>
          <TSubLine>详情</TSubLine>
          <div class="uaw-d-box">
            <TuaDetail
              v-for="floor in JSON.parse(item.floors) as TGApp.Sqlite.Abyss.Floor[]"
              :key="floor.id"
              :model-value="floor"
            />
          </div>
        </div>
      </v-window-item>
    </v-window>
    <div v-show="localAbyssID.length === 0" class="user-empty">
      <img src="/source/UI/empty.webp" alt="empty" />
      <span>暂无数据，请尝试刷新</span>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { storeToRefs } from "pinia";
import { onMounted, ref } from "vue";

import showSnackbar from "../../components/func/snackbar";
import TSubLine from "../../components/main/t-subline.vue";
import ToLoading from "../../components/overlay/to-loading.vue";
import TuaDetail from "../../components/userAbyss/tua-detail.vue";
import TuaOverview from "../../components/userAbyss/tua-overview.vue";
import Hutao from "../../plugins/Hutao";
import TGSqlite from "../../plugins/Sqlite";
import { useUserStore } from "../../store/modules/user";
import TGLogger from "../../utils/TGLogger";
import { generateShareImg } from "../../utils/TGShare";
import TGRequest from "../../web/request/TGRequest";

// store
const userStore = storeToRefs(useUserStore());
// loading
const loading = ref<boolean>(true);
const loadingTitle = ref<string>();
const loadingSub = ref<string>();

// data
const userTab = ref<number>(0);
const user = ref<TGApp.Sqlite.Account.Game>(userStore.account.value);

const localAbyss = ref<TGApp.Sqlite.Abyss.SingleTable[]>([]);
const localAbyssID = ref<number[]>([]);
const curAbyss = ref<TGApp.Sqlite.Abyss.SingleTable>(<TGApp.Sqlite.Abyss.SingleTable>{});
const abyssRef = ref<HTMLElement>(<HTMLElement>{});

onMounted(async () => {
  await TGLogger.Info("[UserAbyss][onMounted] 打开角色深渊页面");
  loadingTitle.value = "正在加载深渊数据";
  await initAbyssData();
  loading.value = false;
});

async function initAbyssData(): Promise<void> {
  const abyssGet = await TGSqlite.getAbyss(user.value.gameUid);
  if (abyssGet.length === 0) {
    await TGLogger.Warn("[UserAbyss][initAbyssData] 未找到深渊数据");
    return;
  }
  localAbyss.value = abyssGet;
  localAbyss.value.forEach((item) => {
    localAbyssID.value.push(item.id);
  });
  curAbyss.value = localAbyss.value[0];
  userTab.value = localAbyssID.value[0];
  await TGLogger.Info(`[UserAbyss][initAbyssData] 成功获取 ${abyssGet.length} 条深渊数据`);
}

async function getAbyssData(): Promise<void> {
  await TGLogger.Info("[UserAbyss][getAbyssData] 更新深渊数据");
  loadingTitle.value = "正在获取深渊数据";
  loading.value = true;
  if (!userStore.cookie.value) {
    showSnackbar({
      text: "未登录",
      color: "error",
    });
    loading.value = false;
    await TGLogger.Warn("[UserAbyss][getAbyssData] 未登录");
    return;
  }
  const cookie = {
    account_id: userStore.cookie.value.account_id,
    cookie_token: userStore.cookie.value.cookie_token,
    ltoken: userStore.cookie.value.ltoken,
    ltuid: userStore.cookie.value.ltuid,
  };
  loadingTitle.value = "正在获取上期深渊数据";
  const resP = await TGRequest.User.byCookie.getAbyss(cookie, "2", user.value);
  if (!("retcode" in resP)) {
    await TGLogger.Info("[UserAbyss][getAbyssData] 成功获取上期深渊数据");
    loadingTitle.value = "正在保存上期深渊数据";
    await TGSqlite.saveAbyss(user.value.gameUid, resP);
  } else {
    showSnackbar({
      text: `[${resP.retcode}]${resP.message}`,
      color: "error",
    });
    loading.value = false;
    await TGLogger.Error("[UserAbyss][getAbyssData] 获取上期深渊数据失败");
    await TGLogger.Error(`[UserAbyss][getAbyssData] ${resP.retcode} ${resP.message}`);
    return;
  }
  loadingTitle.value = "正在获取本期深渊数据";
  const res = await TGRequest.User.byCookie.getAbyss(cookie, "1", user.value);
  if (!("retcode" in res)) {
    loadingTitle.value = "正在保存本期深渊数据";
    await TGSqlite.saveAbyss(user.value.gameUid, res);
    await TGLogger.Info("[UserAbyss][getAbyssData] 成功获取本期深渊数据");
  } else {
    showSnackbar({
      text: `[${res.retcode}]${res.message}`,
      color: "error",
    });
    loading.value = false;
    await TGLogger.Error("[UserAbyss][getAbyssData] 获取本期深渊数据失败");
    await TGLogger.Error(`[UserAbyss][getAbyssData] ${res.retcode} ${res.message}`);
    return;
  }
  loadingTitle.value = "正在加载深渊数据";
  await initAbyssData();
  loading.value = false;
}

function toAbyss(id: number): void {
  const abyssFind = localAbyss.value.find((item) => item.id === id);
  if (abyssFind) {
    curAbyss.value = abyssFind;
  } else {
    showSnackbar({
      text: "未找到该深渊数据",
      color: "error",
    });
  }
}

async function shareAbyss(): Promise<void> {
  if (localAbyssID.value.length === 0) {
    showSnackbar({
      text: "暂无数据",
      color: "error",
    });
    return;
  }
  await TGLogger.Info(`[UserAbyss][shareAbyss][${curAbyss.value.id}] 生成深渊数据分享图片`);
  const fileName = `【深渊数据】${curAbyss.value.id}-${user.value.gameUid}`;
  loadingTitle.value = "正在生成图片";
  loadingSub.value = `${fileName}.png`;
  loading.value = true;
  abyssRef.value = <HTMLElement>document.getElementById(`user-abyss-${curAbyss.value.id}`);
  await generateShareImg(fileName, abyssRef.value);
  loadingSub.value = "";
  loading.value = false;
  await TGLogger.Info(`[UserAbyss][shareAbyss][${curAbyss.value.id}] 生成深渊数据分享图片成功`);
}

async function uploadAbyss(): Promise<void> {
  await TGLogger.Info("[UserAbyss][uploadAbyss] 上传深渊数据");
  const abyssData = localAbyss.value.find((item) => item.id === Math.max(...localAbyssID.value));
  if (!abyssData) {
    showSnackbar({
      text: "未找到深渊数据",
      color: "error",
    });
    await TGLogger.Warn("[UserAbyss][uploadAbyss] 未找到深渊数据");
    return;
  }
  const maxFloor = abyssData.maxFloor.split("-")[0];
  if (maxFloor <= "8") {
    showSnackbar({
      text: "尚未完成深渊，请完成深渊后重试！",
      color: "error",
    });
    await TGLogger.Warn(`[UserAbyss][uploadAbyss] 尚未完成深渊 ${abyssData.maxFloor}`);
    return;
  }
  const startTime = new Date(abyssData.startTime).getTime();
  const endTime = new Date(abyssData.endTime).getTime();
  const nowTime = new Date().getTime();
  if (nowTime < startTime || nowTime > endTime) {
    showSnackbar({
      text: "非最新深渊数据，请刷新深渊数据后重试！",
      color: "error",
    });
    await TGLogger.Warn("[UserAbyss][uploadAbyss] 非最新深渊数据");
    return;
  }
  try {
    loadingTitle.value = "正在转换深渊数据";
    loading.value = true;
    const transAbyss = Hutao.Abyss.utils.transData(abyssData);
    loadingTitle.value = "正在获取角色数据";
    const roles = await TGSqlite.getUserCharacter(user.value.gameUid);
    if (!roles) {
      loading.value = false;
      return;
    }
    loadingTitle.value = "正在转换角色数据";
    transAbyss.Avatars = Hutao.Abyss.utils.transAvatars(roles);
    loadingTitle.value = "正在上传深渊数据";
    const res = await Hutao.Abyss.postData(transAbyss);
    loading.value = false;
    if (res.retcode === 0) {
      showSnackbar({ text: res.message ?? "上传深渊数据成功" });
      await TGLogger.Info("[UserAbyss][uploadAbyss] 上传深渊数据成功");
    } else {
      showSnackbar({
        text: `[${res.retcode}]${res.message}`,
        color: "error",
      });
      await TGLogger.Error("[UserAbyss][uploadAbyss] 上传深渊数据失败");
      await TGLogger.Error(`[UserAbyss][uploadAbyss] ${res.retcode} ${res.message}`);
    }
  } catch (e) {
    if (e instanceof Error) {
      showSnackbar({
        text: e.message,
        color: "error",
      });
      await TGLogger.Error("[UserAbyss][uploadAbyss] 上传深渊数据失败");
      await TGLogger.Error(`[UserAbyss][uploadAbyss] ${e.message}`);
    }
  }
  if (loading.value) loading.value = false;
}
</script>
<style lang="css" scoped>
.ua-box {
  display: flex;
  height: calc(100vh - 35px);
  align-items: center;
  justify-content: center;
  border: 1px solid var(--common-shadow-4);
  border-radius: 5px;
}

.ua-left-box {
  position: relative;
  display: flex;
  width: 100px;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  border-right: 1px solid var(--common-shadow-2);
  color: var(--box-text-4);
}

.ua-tabs-box {
  max-height: calc(100% - 150px);
  overflow-y: auto;
}

.ua-tab-bottom {
  display: flex;
  width: 100%;
  flex-direction: column;
  padding: 10px;
  gap: 10px;
}

.ua-btn {
  background: var(--tgc-btn-1);
  color: var(--btn-text);
  font-family: var(--font-text);
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
