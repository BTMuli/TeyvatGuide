<template>
  <div v-if="loading">
    <TLoading :title="loadingTitle" />
  </div>
  <div v-else>
    <v-tabs v-model="tab" align-tabs="start" class="anno-tab">
      <v-tab value="activity">
        活动公告
      </v-tab>
      <v-tab value="game">
        游戏公告
      </v-tab>
      <v-spacer />
      <v-btn class="switch-btn" @click="switchNews">
        <template #prepend>
          <v-icon>mdi-bullhorn</v-icon>
        </template>
        切换米游社咨讯
      </v-btn>
    </v-tabs>
    <v-window v-model="tab">
      <v-window-item value="activity">
        <div class="anno-grid">
          <v-card v-for="item in annoCards.activity" :key="item.id" class="anno-card" width="340">
            <div class="anno-cover" @click="toPost(item)">
              <img :src="item.banner" alt="cover">
            </div>
            <v-card-title>
              {{ item.title }}
            </v-card-title>
            <v-card-subtitle>{{ item.subtitle }}</v-card-subtitle>
            <v-card-actions>
              <v-btn class="anno-btn" @click="toPost(item)">
                <template #prepend>
                  <img :src="item.tagIcon || '../assets/icons/arrow-right.svg'" alt="right">
                </template>
                查看
              </v-btn>
              <v-card-subtitle v-show="!appStore.devMode">
                <v-icon>mdi-calendar</v-icon>
                {{ item.startTime.split(" ")[0] }} -
                {{ item.endTime.split(" ")[0] }}
              </v-card-subtitle>
              <v-card-subtitle v-show="appStore.devMode">
                id: {{ item.id }}
              </v-card-subtitle>
              <v-btn v-show="appStore.devMode" class="card-dev-btn" @click="toJson(item)">
                <template #prepend>
                  <img src="../assets/icons/arrow-right.svg" alt="right">
                </template>
                查看数据
              </v-btn>
            </v-card-actions>
          </v-card>
        </div>
      </v-window-item>
      <v-window-item value="game">
        <div class="anno-grid">
          <v-card v-for="item in annoCards.game" :key="item.id" class="anno-card" width="340">
            <div class="anno-cover" @click="toPost(item)">
              <img :src="item.banner" alt="cover">
            </div>
            <v-card-title>{{ item.title }}</v-card-title>
            <v-card-subtitle>{{ item.subtitle }}</v-card-subtitle>
            <v-card-actions>
              <v-btn class="anno-btn" @click="toPost(item)">
                <template #prepend>
                  <img :src="item.tagIcon || '../assets/icons/arrow-right.svg'" alt="right">
                </template>
                查看
              </v-btn>
              <v-card-subtitle v-show="!appStore.devMode">
                <v-icon>mdi-calendar</v-icon>
                {{ item.startTime.split(" ")[0] }} -
                {{ item.endTime.split(" ")[0] }}
              </v-card-subtitle>
              <v-card-subtitle v-show="appStore.devMode">
                id: {{ item.id }}
              </v-card-subtitle>
              <v-btn v-show="appStore.devMode" class="card-dev-btn" @click="toJson(item)">
                <template #prepend>
                  <img src="../assets/icons/arrow-right.svg" alt="right">
                </template>
                查看数据
              </v-btn>
            </v-card-actions>
          </v-card>
        </div>
      </v-window-item>
    </v-window>
  </div>
</template>

<script lang="ts" setup>
// vue
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import TLoading from "../components/t-loading.vue";
// store
import { useAppStore } from "../store/modules/app";
// utils
import TGRequest from "../web/request/TGRequest";
import TGUtils from "../web/utils/TGUtils";
import { createTGWindow } from "../utils/TGWindow";

// store
const appStore = useAppStore();

// loading
const loading = ref(true);
const loadingTitle = ref("正在加载");
// 路由
const router = useRouter();

// 数据
const tab = ref("");
const annoCards = ref({
  activity: [] as TGApp.App.Announcement.ListCard[],
  game: [] as TGApp.App.Announcement.ListCard[],
});
const annoData = ref({} as TGApp.BBS.Announcement.ListData);

onMounted(async () => {
  loadingTitle.value = "正在获取公告数据";
  annoData.value = await TGRequest.Anno.getList();
  loadingTitle.value = "正在转换公告数据";
  const listCards = TGUtils.Anno.getCard(annoData.value);
  const activityCard = listCards.filter((item) => item.typeLabel === "活动公告");
  const newsCard = listCards.filter((item) => item.typeLabel === "游戏公告");
  annoCards.value = {
    activity: activityCard,
    game: newsCard,
  };
  tab.value = "activity";
  loading.value = false;
});

async function switchNews () {
  await router.push("/news/2");
}

async function toPost (item: TGApp.App.Announcement.ListCard) {
  const path = router.resolve({
    name: "游戏内公告",
    params: {
      // eslint-disable-next-line camelcase
      anno_id: item.id,
    },
  }).href;
  createTGWindow(path, "游戏内公告", item.title, 960, 720, false, false);
}

async function toJson (item: TGApp.App.Announcement.ListCard) {
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
  font-family: Genshin, serif;
  margin-bottom: 20px;
  color: var(--content-text-3)
}

.anno-grid {
  font-family: Genshin, serif;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  grid-gap: 20px;
}

.anno-card {
  border-radius: 10px;
  background: var(--content-bg-2);
  color: var(--content-text-2);
  border-bottom: #4b5366 1px solid;
}

.anno-cover {
  height: 130px;
  overflow: hidden;
}

.anno-cover :hover {
  transform: scale(1.1);
  transition: all 0.3s linear;
  cursor: pointer;
}

.anno-cover img {
  object-fit: cover;
  width: 100%;
  height: 130px;
  transition: all 0.3s linear;
}

.anno-btn {
  margin-left: 5px;
  background: var(--btn-bg-3);
  color: #faf7e8;
}

.anno-btn img {
  height: 30px;
  width: 30px;
}

/* switch */
.switch-btn {
  font-family: Genshin, serif;
  background: var(--btn-bg-1);
  height: 40px;
  margin-right: 10px;
  margin-top: 5px;
  color: var(--content-text-3);
}
</style>
