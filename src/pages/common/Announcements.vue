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
          <v-card-title class="anno-card-title" :title="item.title">
            {{ item.title }}
          </v-card-title>
          <v-card-subtitle>{{ item.subtitle }}</v-card-subtitle>
          <v-card-actions>
            <v-btn class="anno-btn" variant="outlined" @click="toPost(item)">
              <img :src="item.tagIcon || '../assets/icons/arrow-right.svg'" alt="right" />
              <span>查看</span>
            </v-btn>
            <v-card-subtitle v-show="!appStore.devMode">
              <v-icon>mdi-calendar</v-icon>
              {{ item.startTime.split(" ")[0] }}~{{ item.endTime.split(" ")[0] }}
            </v-card-subtitle>
            <v-card-subtitle v-show="appStore.devMode"> id: {{ item.id }} </v-card-subtitle>
            <v-btn
              v-show="appStore.devMode"
              variant="outlined"
              class="anno-dev-btn"
              @click="toJson(item)"
            >
              <img src="../../assets/icons/arrow-right.svg" alt="right" />
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
          <v-card-title class="anno-card-title" :title="item.title">{{ item.title }}</v-card-title>
          <v-card-subtitle>{{ item.subtitle }}</v-card-subtitle>
          <v-card-actions>
            <v-btn class="anno-btn" variant="outlined" @click="toPost(item)">
              <img :src="item.tagIcon || '../assets/icons/arrow-right.svg'" alt="right" />
              <span>查看</span>
            </v-btn>
            <v-card-subtitle v-show="!appStore.devMode">
              <v-icon>mdi-calendar</v-icon>
              {{ item.startTime.split(" ")[0] }}~{{ item.endTime.split(" ")[0] }}
            </v-card-subtitle>
            <v-card-subtitle v-show="appStore.devMode"> id: {{ item.id }} </v-card-subtitle>
            <v-btn
              v-show="appStore.devMode"
              variant="outlined"
              class="anno-dev-btn"
              @click="toJson(item)"
            >
              <img src="../../assets/icons/arrow-right.svg" alt="right" />
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
import ToLoading from "../../components/overlay/to-loading.vue";
// store
import { useAppStore } from "../../store/modules/app";
// utils
import TGRequest from "../../web/request/TGRequest";
import TGUtils from "../../web/utils/TGUtils";
import { createTGWindow } from "../../utils/TGWindow";

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
  activity: <TGApp.App.Announcement.ListCard[]>[],
  game: <TGApp.App.Announcement.ListCard[]>[],
});
const annoData = ref<TGApp.BBS.Announcement.ListData>(<TGApp.BBS.Announcement.ListData>{});

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

async function switchNews(): Promise<void> {
  await router.push("/news/2");
}

async function toPost(item: TGApp.App.Announcement.ListCard): Promise<void> {
  const path = router.resolve({
    name: "游戏内公告",
    params: {
      anno_id: item.id,
    },
  }).href;
  createTGWindow(path, "Sub_window", `Anno_${item.id} ${item.title}`, 960, 720, false, false);
}

async function toJson(item: TGApp.App.Announcement.ListCard): Promise<void> {
  const path = router.resolve({
    name: "游戏内公告（JSON）",
    params: {
      anno_id: item.id,
    },
  }).href;
  createTGWindow(path, "Dev_JSON", `Anno_${item.id}_JSON ${item.title}`, 960, 720, false, false);
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
  background: var(--btn-bg-1);
  color: var(--btn-text-1);
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
  background: var(--box-bg-1);
  color: var(--box-text-1);
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
}

.anno-btn {
  display: flex;
  height: 30px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--common-shadow-4);
  border-radius: 5px;
}

.anno-btn img {
  width: 25px;
  height: 25px;
  margin-right: 5px;
  object-fit: cover;
}

.anno-dev-btn {
  border: 1px solid var(--common-shadow-4);
  border-radius: 5px;
  margin-left: auto;
  font-family: var(--font-title);
}

.anno-dev-btn img {
  width: 20px;
  height: 20px;
  padding: 3px;
  border-radius: 50%;
  margin-right: 5px;
  background: var(--common-shadow-4);
  object-fit: cover;
}
</style>
