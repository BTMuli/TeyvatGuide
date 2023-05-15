<template>
  <div v-if="loading">
    <TLoading title="正在加载卡牌列表" />
  </div>
  <div v-else>
    <v-tabs v-model="tab" align-tabs="start" class="cards-tab">
      <div v-show="!doSearch">
        <v-tab value="character" title="角色牌" />
        <v-tab value="action" title="行动牌" />
        <v-tab value="monster" title="魔物牌" />
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
    <div v-if="!doSearch">
      <v-window v-model="tab">
        <v-window-item value="character">
          <div class="cards-grid">
            <v-card v-for="item in CardsInfoC" :key="item.content_id" class="card-cls" @click="toOuter(item.name, item.content_id)">
              <div class="card-border">
                <img src="/WIKI/GCG/bg/normal.webp" alt="border">
              </div>
              <div class="card-cover">
                <img :src="item.icon" alt="cover">
              </div>
              <div class="card-content">
                <span>{{ item.name }}</span>
              </div>
            </v-card>
          </div>
        </v-window-item>
        <v-window-item value="action">
          <div class="cards-grid">
            <v-card v-for="item in CardsInfoA" :key="item.content_id" class="card-cls" @click="toOuter(item.name, item.content_id)">
              <div class="card-border">
                <img src="/WIKI/GCG/bg/normal.webp" alt="border">
              </div>
              <div class="card-cover">
                <img :src="item.icon" alt="cover">
              </div>
              <div class="card-content">
                <span>{{ item.name }}</span>
              </div>
            </v-card>
          </div>
        </v-window-item>
        <v-window-item value="monster">
          <div class="cards-grid">
            <v-card v-for="item in CardsInfoM" :key="item.content_id" class="card-cls" @click="toOuter(item.name, item.content_id)">
              <div class="card-border">
                <img src="/WIKI/GCG/bg/normal.webp" alt="border">
              </div>
              <div class="card-cover">
                <img :src="item.icon" alt="cover">
              </div>
              <div class="card-content">
                <span>{{ item.name }}</span>
              </div>
            </v-card>
          </div>
        </v-window-item>
      </v-window>
    </div>
    <div v-else>
      <div class="cards-grid">
        <div v-for="item in CardsInfoS" :key="item.content_id" class="card-cls" @click="toOuter(item.name, item.content_id)">
          <div class="card-border">
            <img src="/WIKI/GCG/bg/normal.webp" alt="border">
          </div>
          <div class="card-cover">
            <img :src="item.icon" alt="cover">
          </div>
          <div class="card-content">
            <span>{{ item.name }}</span>
          </div>
        </div>
      </div>
    </div>
    <v-snackbar v-model="snackbar" timeout="1500" color="error">
      未找到相关卡牌
    </v-snackbar>
  </div>
</template>
<script lang="ts" setup>
// vue
import { ref, onMounted } from "vue";
import TLoading from "../../components/t-loading.vue";
// utils
import { createTGWindow } from "../../utils/TGWindow";
import { TGAppData } from "../../data";
// interface
import { OBC_CONTENT_API } from "../../plugins/Mys/interface/utils";

// loading
const loading = ref(true);
// snackbar
const snackbar = ref(false);
// search
const doSearch = ref(false);
const search = ref("");
// data
const tab = ref("character");
const CardsInfoC = ref([] as BTMuli.Genshin.Wiki.GCG.BriefInfo[]);
const CardsInfoA = ref([] as BTMuli.Genshin.Wiki.GCG.BriefInfo[]);
const CardsInfoM = ref([] as BTMuli.Genshin.Wiki.GCG.BriefInfo[]);
const CardsInfoS = ref([] as BTMuli.Genshin.Wiki.GCG.BriefInfo[]);

onMounted(async () => {
  await loadData();
});

async function loadData () {
  const CardsInfo = TGAppData.GCG;
  CardsInfoC.value = CardsInfo.filter((item) => item.type === "角色牌");
  CardsInfoA.value = CardsInfo.filter((item) => item.type === "行动牌");
  CardsInfoM.value = CardsInfo.filter((item) => item.type === "魔物牌");
  loading.value = false;
}
function toOuter (cardName: string, cardId: number) {
  const url = OBC_CONTENT_API.replace("{content_id}", cardId.toString());
  createTGWindow(url, "GCG", cardName, 1200, 800, true);
}
async function searchCard () {
  loading.value = true;
  doSearch.value = true;
  const res: BTMuli.Genshin.Wiki.GCG.BriefInfo[] = [];
  const allCardsInfo = TGAppData.GCG;
  allCardsInfo.map((item) => (item.name.includes(search.value) ? res.push(item) : null));
  res.sort((a, b) => a.name.localeCompare(b.name));
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
  font-family: Genshin,serif;
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