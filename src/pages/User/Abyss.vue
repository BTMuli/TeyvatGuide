<template>
  <ToLoading v-model="loading" :title="loadingTitle" :subtitle="loadingSub" />
  <div class="ua-box">
    <v-tabs v-model="userTab" direction="vertical" align-tabs="start" class="ua-tab">
      <div class="ua-tabs">
        <v-tab v-for="item in localAbyss" :key="item.id" :value="item.id" @click="toAbyss(item.id)">
          第{{ item.id }}期
        </v-tab>
      </div>
      <div class="ua-tab-bottom">
        <v-btn class="ua-btn" @click="shareAbyss">
          <v-icon>mdi-share</v-icon>
          <span>分享</span>
        </v-btn>
        <v-btn class="ua-btn" @click="getAbyssData">
          <v-icon>mdi-refresh</v-icon>
          <span>刷新</span>
        </v-btn>
        <v-btn class="ua-btn" @click="uploadAbyss">
          <v-icon>mdi-cloud-upload</v-icon>
          <span>上传</span>
        </v-btn>
      </div>
    </v-tabs>
    <v-window v-model="userTab" class="ua-window">
      <v-window-item
        v-for="item in localAbyss"
        :key="item.id"
        :value="item.id"
        class="ua-window-item"
      >
        <div :ref="getAbyssRef" class="uaw-i-ref">
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
  loadingTitle.value = "正在加载深渊数据";
  await initAbyssData();
  loading.value = false;
});

async function initAbyssData(): Promise<void> {
  const abyssGet = await TGSqlite.getAbyss(user.value.gameUid);
  if (abyssGet.length === 0) return;
  localAbyss.value = abyssGet;
  localAbyss.value.forEach((item) => {
    localAbyssID.value.push(item.id);
  });
  curAbyss.value = localAbyss.value[0];
  userTab.value = localAbyssID.value[0];
}

async function getAbyssData(): Promise<void> {
  loadingTitle.value = "正在获取深渊数据";
  loading.value = true;
  if (!userStore.cookie.value) {
    showSnackbar({
      text: "未登录",
      color: "error",
    });
    loading.value = false;
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
    loadingTitle.value = "正在保存上期深渊数据";
    await TGSqlite.saveAbyss(user.value.gameUid, resP);
  } else {
    showSnackbar({
      text: `[${resP.retcode}]${resP.message}`,
      color: "error",
    });
    loading.value = false;
    return;
  }
  loadingTitle.value = "正在获取本期深渊数据";
  const res = await TGRequest.User.byCookie.getAbyss(cookie, "1", user.value);
  if (!("retcode" in res)) {
    loadingTitle.value = "正在保存本期深渊数据";
    await TGSqlite.saveAbyss(user.value.gameUid, res);
  } else {
    showSnackbar({
      text: `[${res.retcode}]${res.message}`,
      color: "error",
    });
    loading.value = false;
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

function getAbyssRef(el: HTMLElement): void {
  abyssRef.value = el;
}

async function shareAbyss(): Promise<void> {
  const fileName = `【深渊数据】${curAbyss.value.id}-${user.value.gameUid}`;
  loadingTitle.value = "正在生成图片";
  loadingSub.value = `${fileName}.png`;
  loading.value = true;
  await generateShareImg(fileName, abyssRef.value);
  loadingSub.value = "";
  loading.value = false;
}

async function uploadAbyss(): Promise<void> {
  const abyssData = curAbyss.value;
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
    showSnackbar({ text: <string>res.message });
  } else {
    showSnackbar({
      text: <string>res.message,
      color: "error",
    });
  }
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

.ua-tab {
  width: 100px;
  color: var(--box-text-4);
  font-family: var(--font-text);
}

.ua-tabs {
  max-height: calc(100% - 150px);
  margin-top: 5px;
  overflow-y: auto;
}

/* stylelint-disable selector-class-pattern */
.ua-tab.v-tabs.v-slide-group--vertical {
  height: 100%;
}

.ua-tab-bottom {
  position: absolute;
  bottom: 0;
  display: flex;
  width: 100%;
  flex-wrap: wrap;
  padding: 10px;
  gap: 10px;
}

.ua-btn {
  border-radius: 5px;
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
