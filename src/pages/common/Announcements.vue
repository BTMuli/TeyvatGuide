<template>
  <ToLoading v-model="loading" :title="loadingTitle" />
  <v-tabs v-model="tab" align-tabs="start" class="anno-tab">
    <v-tab v-for="(value, index) in tabValues" :key="index" :value="value">
      {{ AnnoType[value] }}
    </v-tab>
    <v-spacer />
    <v-btn class="anno-switch-btn" @click="switchNews">
      <template #prepend>
        <v-icon>mdi-bullhorn</v-icon>
      </template>
      切换米游社咨讯
    </v-btn>
  </v-tabs>
  <v-window v-model="tab">
    <v-window-item v-for="(value, index) in tabValues" :key="index" :value="value">
      <div class="anno-grid">
        <v-card v-for="item in annoCards[value]" :key="item.id" class="anno-card">
          <div class="anno-cover" @click="createAnno(item)" :title="item.title">
            <img :src="item.banner" alt="cover" />
            <div class="anno-info">
              <div class="anno-id">ID:{{ item.id }}</div>
              <div class="anno-time">
                <v-icon>mdi-clock-time-four-outline</v-icon>
                <span>{{ item.timeStr }}</span>
              </div>
            </div>
          </div>
          <v-card-title class="anno-title" :title="item.title">{{ item.subtitle }}</v-card-title>
          <div class="anno-label" :title="`标签：${item.tagLabel}`">
            <img :src="item.tagIcon" alt="tag" />
            <span>{{ item.tagLabel }}</span>
          </div>
        </v-card>
      </div>
    </v-window-item>
  </v-window>
</template>

<script lang="ts" setup>
import { nextTick, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import ToLoading from "../../components/overlay/to-loading.vue";
import { createAnno } from "../../utils/TGWindow";
import TGRequest from "../../web/request/TGRequest";
import TGUtils from "../../web/utils/TGUtils";

// 类型定义
enum AnnoType {
  activity = "活动公告",
  game = "游戏公告",
}

type AnnoKey = keyof typeof AnnoType;
type AnnoCard = {
  [key in AnnoKey]: TGApp.App.Announcement.ListCard[];
};

// loading
const loading = ref<boolean>(true);
const loadingTitle = ref<string>("正在加载");

// 路由
const router = useRouter();

// 数据
const tab = ref<AnnoKey>("activity");
const tabValues = ref<Array<AnnoKey>>(["activity", "game"]);
const annoCards = ref<AnnoCard>({
  activity: [],
  game: [],
});
const annoData = ref<TGApp.BBS.Announcement.ListData>(<TGApp.BBS.Announcement.ListData>{});

onMounted(async () => {
  loadingTitle.value = "正在获取公告数据";
  loading.value = true;
  annoData.value = await TGRequest.Anno.getList();
  const listCards = TGUtils.Anno.getCard(annoData.value);
  tab.value = "activity";
  annoCards.value = {
    activity: listCards.filter((item) => item.typeLabel === AnnoType.activity),
    game: listCards.filter((item) => item.typeLabel === AnnoType.game),
  };
  loadingTitle.value = "正在渲染公告数据";
  await nextTick(() => {
    loading.value = false;
  });
});

async function switchNews(): Promise<void> {
  await router.push("/news/2");
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
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
}

.anno-card {
  border-radius: 5px;
  background: var(--app-page-bg);
  color: var(--box-text-1);
}

/* 增加辨识度 */
.dark .anno-card {
  border: 1px solid var(--common-shadow-2);
}

.anno-cover {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 100%;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid var(--common-shadow-2);
  aspect-ratio: 36 / 13;
  border-top-left-radius: 5px;
  border-top-right-radius: 5px;
}

.anno-cover img {
  min-width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  transition: all 0.3s linear;
}

.anno-title {
  position: relative;
  height: 50px;
  text-align: right;
}

.anno-info {
  position: absolute;
  bottom: 0;
  left: 0;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  backdrop-filter: blur(20px);
  background: rgb(0 0 0/50%);
  font-size: 12px;
}

.anno-id {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 5px 30px 5px 5px;
  background: var(--app-page-bg);
  clip-path: polygon(0 0, calc(100% - 15px) 0, 100% 50%, calc(100% - 15px) 100%, 0 100%);
  color: var(--app-page-content);

  &::after {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: var(--common-shadow-2);
    clip-path: polygon(
      calc(100% - 25px) 0,
      100% 0,
      100% 100%,
      calc(100% - 25px) 100%,
      calc(100% - 10px) 50%
    );
    content: "";
  }
}

.anno-time {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin: 5px;
  color: var(--tgc-white-1);
  gap: 5px;
  opacity: 0.8;
}

.anno-label {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 5px;
  backdrop-filter: blur(20px);
  background: rgb(0 0 0/20%);
  border-bottom-left-radius: 5px;
  border-top-right-radius: 5px;
  box-shadow: 0 0 10px var(--tgc-dark-1);
  color: var(--tgc-white-1);
}

.anno-label img {
  width: 20px;
  height: 20px;
  margin-right: 5px;
}

.anno-cover img:hover {
  cursor: pointer;
  transform: scale(1.1);
  transition: all 0.3s linear;
}
</style>
