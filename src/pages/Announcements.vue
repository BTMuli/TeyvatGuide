<template>
  <ToLoading v-model="loading" :title="loadingTitle" />
  <v-tabs v-model="tab" align-tabs="start" class="anno-tab">
    <v-tab value="activity"> 活动公告 </v-tab>
    <v-tab value="game"> 游戏公告 </v-tab>
    <v-spacer />
    <v-btn class="anno-switch-btn" @click="switchNews">
      <template #prepend>
        <v-icon>mdi-bullhorn</v-icon>
      </template>
      切换米游社咨讯
    </v-btn>
  </v-tabs>
  <v-window v-model="tab">
    <v-window-item value="activity">
      <div class="anno-grid">
        <v-card v-for="item in annoCards.activity" :key="item.id" class="anno-card">
          <div class="anno-cover" @click="toPost(item)">
            <img :src="item.banner" alt="cover" />
          </div>
          <v-card-title class="anno-card-title">
            {{ item.title }}
          </v-card-title>
          <v-card-subtitle>{{ item.subtitle }}</v-card-subtitle>
          <v-card-actions>
            <v-btn class="anno-btn" @click="toPost(item)">
              <img :src="item.tagIcon || '../assets/icons/arrow-right.svg'" alt="right" />
              <span>查看</span>
            </v-btn>
            <v-card-subtitle v-show="!appStore.devMode">
              <v-icon>mdi-calendar</v-icon>
              {{ item.startTime.split(" ")[0] }} -
              {{ item.endTime.split(" ")[0] }}
            </v-card-subtitle>
            <v-card-subtitle v-show="appStore.devMode"> id: {{ item.id }} </v-card-subtitle>
            <v-btn v-show="appStore.devMode" class="anno-dev-btn" @click="toJson(item)">
              <img src="../assets/icons/arrow-right.svg" alt="right" />
              <span>查看数据</span>
            </v-btn>
          </v-card-actions>
        </v-card>
      </div>
    </v-window-item>
    <v-window-item value="game">
      <div class="anno-grid">
        <v-card v-for="item in annoCards.game" :key="item.id" class="anno-card">
          <div class="anno-cover" @click="toPost(item)">
            <img :src="item.banner" alt="cover" />
          </div>
          <v-card-title class="anno-card-title">{{ item.title }}</v-card-title>
          <v-card-subtitle>{{ item.subtitle }}</v-card-subtitle>
          <v-card-actions>
            <v-btn class="anno-btn" @click="toPost(item)">
              <img :src="item.tagIcon || '../assets/icons/arrow-right.svg'" alt="right" />
              <span>查看</span>
            </v-btn>
            <v-card-subtitle v-show="!appStore.devMode">
              <v-icon>mdi-calendar</v-icon>
              {{ item.startTime.split(" ")[0] }} -
              {{ item.endTime.split(" ")[0] }}
            </v-card-subtitle>
            <v-card-subtitle v-show="appStore.devMode"> id: {{ item.id }} </v-card-subtitle>
            <v-btn v-show="appStore.devMode" class="anno-dev-btn" @click="toJson(item)">
              <img src="../assets/icons/arrow-right.svg" alt="right" />
              <span>查看数据</span>
            </v-btn>
          </v-card-actions>
        </v-card>
      </div>
    </v-window-item>
  </v-window>
</template>

<script lang="ts" setup>
// vue
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import ToLoading from "../components/overlay/to-loading.vue";
// store
import { useAppStore } from "../store/modules/app";
// utils
import TGRequest from "../web/request/TGRequest";
import TGUtils from "../web/utils/TGUtils";
import { createTGWindow } from "../utils/TGWindow";

// store
const appStore = useAppStore();

// loading
const loading = ref<boolean>(true);
const loadingTitle = ref<string>("正在加载");
// 路由
const router = useRouter();

// 数据
const tab = ref<string>("");
const annoCards = ref({
  activity: [] as TGApp.App.Announcement.ListCard[],
  game: [] as TGApp.App.Announcement.ListCard[],
});
const annoData = ref<TGApp.BBS.Announcement.ListData>({} as TGApp.BBS.Announcement.ListData);

onMounted(async () => {
  loadingTitle.value = "正在获取公告数据";
  annoData.value = await TGRequest.Anno.getList();
  loadingTitle.value = "正在转换公告数据";
  const listCards: TGApp.App.Announcement.ListCard[] = TGUtils.Anno.getCard(annoData.value);
  const activityCard: TGApp.App.Announcement.ListCard[] = listCards.filter(
    (item) => item.typeLabel === "活动公告",
  );
  const newsCard: TGApp.App.Announcement.ListCard[] = listCards.filter(
    (item) => item.typeLabel === "游戏公告",
  );
  annoCards.value = {
    activity: activityCard,
    game: newsCard,
  };
  tab.value = "activity";
  loading.value = false;
});

async function switchNews() {
  await router.push("/news/2");
}

async function toPost(item: TGApp.App.Announcement.ListCard) {
  const path = router.resolve({
    name: "游戏内公告",
    params: {
      // eslint-disable-next-line camelcase
      anno_id: item.id,
    },
  }).href;
  createTGWindow(path, "游戏内公告", item.title, 960, 720, false, false);
}

async function toJson(item: TGApp.App.Announcement.ListCard) {
  const path = router.resolve({
    name: "游戏内公告（JSON）",
    params: {
      // eslint-disable-next-line camelcase
      anno_id: item.id,
    },
  }).href;
  createTGWindow(path, "游戏内公告-JSON", item.title, 960, 720, false, false);
}
</script>

<style lang="css" scoped>
.anno-tab {
  margin-bottom: 10px;
  color: var(--common-text-title);
  font-family: var(--font-title);
}

.anno-switch-btn {
  height: 40px;
  background: var(--common-btn-bg-1);
  color: var(--common-btn-bgt-1);
  font-family: var(--font-title);
}

.anno-grid {
  display: grid;
  padding: 5px;
  font-family: var(--font-title);
  grid-gap: 10px;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
}

.anno-card {
  border-radius: 5px;
  background: var(--common-bg-1);
  color: var(--common-bgt-1);
}

.anno-cover {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 100%;
  height: 120px;
  align-items: center;
  justify-content: center;
}

.anno-cover img {
  min-width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  transition: all 0.3s linear;
}

.anno-cover :hover {
  cursor: pointer;
  transform: scale(1.1);
  transition: all 0.3s linear;
}

.anno-card-title {
  position: relative;
  height: 50px;
  transition: padding-top 0.3s linear, padding-bottom 0.3s linear, background 0.3s linear,
    font-size 0.3s linear, line-height 0.3s linear, white-space 0.3s linear;
}

.anno-card-title:hover {
  display: flex;
  height: 50px;
  padding: 5px;
  background: var(--common-shadow-2);
  font-size: 16px;
  line-height: normal;
  white-space: normal;
}

.anno-btn {
  display: flex;
  height: 30px;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  background: var(--common-btn-bg-2);
  color: var(--common-btn-bgt-2);
}

.anno-btn img {
  width: 25px;
  height: 25px;
  margin-right: 5px;
  object-fit: cover;
}

.anno-dev-btn {
  background: var(--common-btn-bg-2);
  color: var(--common-btn-bgt-2);
  font-family: var(--font-title);
}

.anno-dev-btn img {
  width: 20px;
  height: 20px;
  padding: 2px;
  border-radius: 50%;
  margin-right: 5px;
  background: var(--common-shadow-2);
  object-fit: cover;
}
</style>
