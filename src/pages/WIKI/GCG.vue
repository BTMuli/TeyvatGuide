<template>
  <TOLoading v-model="loading" title="正在加载卡牌列表" />
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
      single-line
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
  <v-snackbar v-model="snackbar" timeout="1500" color="error"> 未找到相关卡牌 </v-snackbar>
</template>
<script lang="ts" setup>
// vue
import { computed, onMounted, ref } from "vue";
import TOLoading from "../../components/overlay/to-loading.vue";
// utils
import { createTGWindow } from "../../utils/TGWindow";
import { AppGCGData } from "../../data";
// interface
import { OBC_CONTENT_API } from "../../plugins/Mys/interface/utils";

// loading
const loading = ref(true);
const allCards = computed(() => AppGCGData);
// snackbar
const snackbar = ref(false);
// search
const doSearch = ref(false);
const search = ref("");
// data
const tab = ref("character");
const CardsInfoC = ref([] as TGApp.App.GCG.WikiBriefInfo[]);
const CardsInfoA = ref([] as TGApp.App.GCG.WikiBriefInfo[]);
const CardsInfoM = ref([] as TGApp.App.GCG.WikiBriefInfo[]);
const CardsInfoS = ref([] as TGApp.App.GCG.WikiBriefInfo[]);

onMounted(async () => {
  await loadData();
});

async function loadData() {
  await Promise.allSettled(
    allCards.value.map(async (item) => {
      if (item.type === "角色牌") CardsInfoC.value.push(item);
      if (item.type === "行动牌") CardsInfoA.value.push(item);
      if (item.type === "魔物牌") CardsInfoM.value.push(item);
    }),
  );
  loading.value = false;
}

function toOuter(cardName: string, cardId: number) {
  const url = OBC_CONTENT_API.replace("{content_id}", cardId.toString());
  createTGWindow(url, "GCG", cardName, 1200, 800, true);
}

async function searchCard() {
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
    snackbar.value = true;
    doSearch.value = false;
  } else {
    CardsInfoS.value = res;
  }
}
</script>
<style lang="css" scoped>
.cards-tab {
  font-family: Genshin, serif;
  margin-bottom: 20px;
  color: var(--content-text-3);
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  grid-gap: 10px;
  padding: 10px;
  border-radius: 0 0 10px 10px;
  overflow: hidden;
}

.cards-grid :hover {
  cursor: pointer;
}

.card-cls {
  position: relative;
  width: 140px;
  height: 240px;
  overflow: hidden;
  transition: all 0.3s;
  border-radius: 10px;
}

.card-cover {
  position: absolute;
  transition: all 0.3s;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
}

.card-cls:hover .card-cover {
  transform: scale(1.1);
  transition: all 0.3s;
}

.card-border {
  position: absolute;
  border-radius: 10px;
  top: 0;
  left: 0;
  overflow: hidden;
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
  width: 100%;
  height: 40px;
  background: rgb(0 0 0 / 50%);
  color: white;
  display: flex;
  font-size: small;
  overflow: hidden;
  font-family: Genshin, serif;
  border-radius: 0 0 10px 10px;
  justify-content: center;
  align-items: center;
}
</style>
