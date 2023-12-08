<template>
  <ToLoading v-model="loading" title="正在加载卡牌列表" />
  <v-tabs v-model="tab" align-tabs="start" class="cards-tab">
    <div v-show="!doSearch">
      <v-tab value="character"> 角色牌 </v-tab>
      <v-tab value="action"> 行动牌 </v-tab>
      <v-tab value="monster"> 魔物牌 </v-tab>
    </div>
    <v-spacer />
    <v-text-field
      v-model="search"
      append-icon="mdi-magnify"
      label="搜索"
      :single-line="true"
      hide-details
      @click:append="searchCard"
      @keyup.enter="searchCard"
    />
  </v-tabs>
  <div v-show="!doSearch">
    <v-window v-model="tab">
      <v-window-item value="character">
        <div class="cards-grid">
          <v-card
            v-for="item in CardsInfoC"
            :key="item.contentId"
            class="card-cls"
            @click="toOuter(item.name, item.contentId)"
          >
            <div class="card-border">
              <img src="/WIKI/GCG/bg/normal.webp" alt="border" />
            </div>
            <div class="card-cover">
              <img :src="item.icon" alt="cover" />
            </div>
            <div class="card-content">
              <span>{{ item.name }}</span>
            </div>
          </v-card>
        </div>
      </v-window-item>
      <v-window-item value="action">
        <div class="cards-grid">
          <v-card
            v-for="item in CardsInfoA"
            :key="item.contentId"
            class="card-cls"
            @click="toOuter(item.name, item.contentId)"
          >
            <div class="card-border">
              <img src="/WIKI/GCG/bg/normal.webp" alt="border" />
            </div>
            <div class="card-cover">
              <img :src="item.icon" alt="cover" />
            </div>
            <div class="card-content">
              <span>{{ item.name }}</span>
            </div>
          </v-card>
        </div>
      </v-window-item>
      <v-window-item value="monster">
        <div class="cards-grid">
          <v-card
            v-for="item in CardsInfoM"
            :key="item.contentId"
            class="card-cls"
            @click="toOuter(item.name, item.contentId)"
          >
            <div class="card-border">
              <img src="/WIKI/GCG/bg/normal.webp" alt="border" />
            </div>
            <div class="card-cover">
              <img :src="item.icon" alt="cover" />
            </div>
            <div class="card-content">
              <span>{{ item.name }}</span>
            </div>
          </v-card>
        </div>
      </v-window-item>
    </v-window>
  </div>
  <div v-show="doSearch">
    <div class="cards-grid">
      <v-card
        v-for="item in CardsInfoS"
        :key="item.contentId"
        class="card-cls"
        @click="toOuter(item.name, item.contentId)"
      >
        <div class="card-border">
          <img src="/WIKI/GCG/bg/special.webp" alt="border" />
        </div>
        <div class="card-cover">
          <img :src="item.icon" alt="cover" />
        </div>
        <div class="card-content">
          <span>{{ item.name }}</span>
        </div>
      </v-card>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed, onMounted, ref } from "vue";

import showSnackbar from "../../components/func/snackbar";
import ToLoading from "../../components/overlay/to-loading.vue";
import { AppGCGData } from "../../data";
import Mys from "../../plugins/Mys";
import { createTGWindow } from "../../utils/TGWindow";

// loading
const loading = ref<boolean>(true);
const allCards = computed(() => AppGCGData);
// search
const doSearch = ref<boolean>(false);
const search = ref<string>("");
// data
const tab = ref<string>("character");
const CardsInfoC = ref<TGApp.App.GCG.WikiBriefInfo[]>([]);
const CardsInfoA = ref<TGApp.App.GCG.WikiBriefInfo[]>([]);
const CardsInfoM = ref<TGApp.App.GCG.WikiBriefInfo[]>([]);
const CardsInfoS = ref<TGApp.App.GCG.WikiBriefInfo[]>([]);

onMounted(() => {
  for (const item of allCards.value) {
    if (item.type === "角色牌") CardsInfoC.value.push(item);
    if (item.type === "行动牌") CardsInfoA.value.push(item);
    if (item.type === "魔物牌") CardsInfoM.value.push(item);
  }
  loading.value = false;
});

function toOuter(cardName: string, cardId: number): void {
  console.log(cardName, cardId);
  // 若不存在 contentId
  if (cardId === -1) {
    showSnackbar({
      text: "该卡牌暂无外部链接",
      color: "error",
    });
    return;
  }
  const url = Mys.Api.Obc.replace("{contentId}", cardId.toString());
  createTGWindow(url, "Sub_window", `Content_${cardId} ${cardName}`, 1200, 800, true);
}

async function searchCard(): Promise<void> {
  loading.value = true;
  if (search.value === "") {
    setTimeout(() => {
      doSearch.value = false;
      loading.value = false;
    }, 1000);
    return;
  }
  doSearch.value = true;
  const res: TGApp.App.GCG.WikiBriefInfo[] = [];
  await Promise.allSettled(
    allCards.value.map((item) => (item.name.includes(search.value) ? res.push(item) : null)),
  );
  res.sort((a, b) => a.name.localeCompare(b.name));
  console.log(res);
  loading.value = false;
  if (res.length === 0) {
    showSnackbar({
      text: "未找到相关卡牌",
      color: "error",
    });
    doSearch.value = false;
  } else {
    CardsInfoS.value = res;
  }
}
</script>
<style lang="css" scoped>
.cards-tab {
  margin-bottom: 20px;
  color: var(--content-text-3);
  font-family: Genshin, serif;
}

.cards-grid {
  display: grid;
  overflow: hidden;
  padding: 10px;
  border-radius: 0 0 10px 10px;
  grid-gap: 10px;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
}

.cards-grid :hover {
  cursor: pointer;
}

.card-cls {
  position: relative;
  overflow: hidden;
  width: 140px;
  height: 240px;
  border-radius: 10px;
  transition: all 0.3s;
}

.card-cover {
  position: absolute;
  z-index: -1;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transition: all 0.3s;
}

.card-cls:hover .card-cover {
  transform: scale(1.1);
  transition: all 0.3s;
}

.card-border {
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  border-radius: 10px;
}

.card-border img {
  width: 100%;
  height: 100%;
  border-radius: 10px;
}

.card-cover img {
  width: 100%;
  height: 100%;
  border-radius: 10px;
  object-fit: cover;
}

.card-content {
  position: absolute;
  bottom: 0;
  left: 0;
  display: flex;
  overflow: hidden;
  width: 100%;
  height: 40px;
  align-items: center;
  justify-content: center;
  border-radius: 0 0 10px 10px;
  background: rgb(0 0 0 / 50%);
  color: white;
  font-family: Genshin, serif;
  font-size: small;
}
</style>
