<template>
  <ToLoading v-model="loading" :title="loadingTitle" />
  <div class="ua-box">
    <v-tabs v-model="userTab" direction="vertical" align-tabs="start" class="ua-tab">
      <v-tab v-for="item in localAbyss" :key="item.id" :value="item.id" @click="toAbyss(item.id)">
        第{{ item.id }}期
      </v-tab>
      <div class="ua-tab-bottom">
        <v-btn class="ua-btn" variant="outlined" @click="shareAbyss">
          <v-icon>mdi-share</v-icon>
          <span>分享</span>
        </v-btn>
        <v-btn class="ua-btn" variant="outlined" @click="getAbyssData">
          <v-icon>mdi-refresh</v-icon>
          <span>刷新</span>
        </v-btn>
        <v-btn class="ua-btn" variant="outlined" @click="uploadAbyss">
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
        <div :ref="getAbyssRef">
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
// vue
import { computed, onMounted, ref } from "vue";
import ToLoading from "../../components/overlay/to-loading.vue";
import TSubLine from "../../components/main/t-subline.vue";
import TuaOverview from "../../components/userAbyss/tua-overview.vue";
import TuaDetail from "../../components/userAbyss/tua-detail.vue";
// store
import { useUserStore } from "../../store/modules/user";
// utils
import TGRequest from "../../web/request/TGRequest";
import TGSqlite from "../../plugins/Sqlite";
import { generateShareImg } from "../../utils/TGShare";
import HutaoRequest from "../../plugins/Hutao";

// store
const userStore = useUserStore();
// loading
const loading = ref(true);
const loadingTitle = ref("");

// data
const userTab = ref(0);
const user = computed(() => userStore.getCurAccount());

const localAbyss = ref([] as TGApp.Sqlite.Abyss.SingleTable[]);
const localAbyssID = ref([] as number[]);
const curAbyss = ref({} as TGApp.Sqlite.Abyss.SingleTable);
const abyssRef = ref(null as unknown as HTMLElement);

onMounted(async () => {
  loadingTitle.value = "正在加载深渊数据";
  await initAbyssData();
  loading.value = false;
});

async function initAbyssData() {
  localAbyss.value = await TGSqlite.getAbyss(user.value.gameUid);
  localAbyss.value.forEach((item) => {
    localAbyssID.value.push(item.id);
  });
  curAbyss.value = localAbyss.value[0];
  userTab.value = localAbyssID.value[0];
}

async function getAbyssData(): Promise<void> {
  loadingTitle.value = "正在获取深渊数据";
  loading.value = true;
  const abyssCookie = userStore.getCookieGroup4();
  const cookie: Record<string, string> = {
    account_id: abyssCookie.account_id,
    cookie_token: abyssCookie.cookie_token,
    ltoken: abyssCookie.ltoken,
    ltuid: abyssCookie.ltuid,
  };
  if (localAbyssID.value.length < 2) {
    loadingTitle.value = "正在获取上期深渊数据";
    const resP = await TGRequest.User.byCookie.getAbyss(cookie, "2", user.value);
    if (!resP.hasOwnProperty("retcode")) {
      loadingTitle.value = "正在保存上期深渊数据";
      await TGSqlite.saveAbyss(user.value.gameUid, resP as TGApp.Game.Abyss.FullData);
    }
  }
  loadingTitle.value = "正在获取本期深渊数据";
  const res = await TGRequest.User.byCookie.getAbyss(cookie, "1", user.value);
  if (!res.hasOwnProperty("retcode")) {
    loadingTitle.value = "正在保存本期深渊数据";
    await TGSqlite.saveAbyss(user.value.gameUid, res as TGApp.Game.Abyss.FullData);
  }
  loadingTitle.value = "正在加载深渊数据";
  await initAbyssData();
  loading.value = false;
}

function toAbyss(id: number): void {
  curAbyss.value = localAbyss.value.find((item) => item.id === id)!;
}

function getAbyssRef(el: HTMLElement): void {
  abyssRef.value = el;
}

async function shareAbyss(): Promise<void> {
  const fileName = `【深渊数据】${curAbyss.value.id}-${user.value.gameUid}`;
  await generateShareImg(fileName, abyssRef.value);
}

async function uploadAbyss(): Promise<void> {
  const abyssData = curAbyss.value;
  loadingTitle.value = "正在转换深渊数据";
  loading.value = true;
  let transAbyss = HutaoRequest.Abyss.utils.transData(abyssData);
  loadingTitle.value = "正在获取角色数据";
  const roles = await TGSqlite.getUserCharacter(user.value.gameUid);
  if (!roles) {
    loading.value = false;
    return;
  }
  loadingTitle.value = "正在转换角色数据";
  transAbyss.avatars = HutaoRequest.Abyss.utils.transAvatars(roles);
  loadingTitle.value = "正在上传深渊数据";
  const res = await HutaoRequest.Abyss.postData(transAbyss);
  console.log(res);
  loading.value = false;
}
</script>
<style lang="css" scoped>
.ua-box {
  display: flex;
  height: calc(100vh - 35px);
  align-items: center;
  justify-content: left;
  border-radius: 5px;
  box-shadow: 0 0 10px 0 var(--common-shadow-4);
}

.ua-tab {
  width: 100px;
  height: 100%;
  color: var(--common-text-title);
  font-family: var(--font-text);
}

.ua-tab-bottom {
  position: absolute;
  bottom: 0;
  width: 100%;
  padding: 10px;
}

.ua-btn {
  margin-top: 15px;
  background: var(--common-shadow-2);
  color: var(--common-color-white);
}

.ua-window {
  width: calc(100% - 100px);
  height: 100%;
  padding: 10px;
}

.ua-window-item {
  height: 100%;
  padding: 10px;
  border-radius: 5px;
  box-shadow: 0 0 10px var(--common-shadow-2);
  overflow-y: auto;
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
  color: var(--common-color-white);
  text-shadow: 0 0 10px var(--common-color-yellow);
}

.dark .uaw-title :nth-child(2n) {
  color: var(--common-color-yellow);
  text-shadow: none;
}

.uaw-o-box {
  display: grid;
  width: 100%;
  grid-gap: 10px;
  grid-template-columns: repeat(3, 1fr);
}

.uaw-d-box {
  display: grid;
  width: 100%;
  grid-gap: 10px;
  grid-template-columns: repeat(4, 1fr);
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
  background: var(--common-shadow-2);
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 1.5rem;
}
</style>
