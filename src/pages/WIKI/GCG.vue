<template>
  <ToLoading v-model="loading" title="正在加载卡牌列表" />
  <v-tabs v-model="tab" align-tabs="start" class="cards-tab">
    <div v-if="!doSearch">
      <v-tab value="character">角色牌</v-tab>
      <v-tab value="action">行动牌</v-tab>
      <v-tab value="monster">魔物牌</v-tab>
    </div>
    <v-text-field
      v-model="search"
      class="card-search"
      prepend-inner-icon="mdi-magnify"
      label="搜索"
      :single-line="true"
      hide-details
      @click:append="searchCard"
      @keyup.enter="searchCard"
    />
    <v-spacer />
  </v-tabs>
  <div v-if="!doSearch">
    <v-window v-model="tab">
      <v-window-item v-for="(item, index) in tabValues" :key="index" :value="item">
        <div class="cards-grid">
          <TwgCard v-for="(card, index) in cardsInfo[item]" :key="index" :data="card" />
        </div>
      </v-window-item>
    </v-window>
  </div>
  <div v-else>
    <div class="cards-grid">
      <TwgCard v-for="(item, index) in CardsInfoS" :key="index" :data="item" />
    </div>
  </div>
</template>
<script lang="ts" setup>
import { onBeforeMount, onMounted, ref } from "vue";

import showSnackbar from "../../components/func/snackbar";
import ToLoading from "../../components/overlay/to-loading.vue";
import TwgCard from "../../components/wiki/twg-card.vue";
import { AppGCGData } from "../../data";

const loading = ref<boolean>(true);
const doSearch = ref<boolean>(false);
const search = ref<string>("");

const tab = ref<string>("character");
const cardsInfo = ref<{ [key: string]: TGApp.App.GCG.WikiBriefInfo[] }>({
  character: [],
  action: [],
  monster: [],
});
const tabValues = ref<string[]>(["character", "action", "monster"]);
const CardsInfoS = ref<TGApp.App.GCG.WikiBriefInfo[]>([]);

onBeforeMount(() => {
  for (const item of AppGCGData) {
    if (item.type === "角色牌") cardsInfo.value.character.push(item);
    if (item.type === "行动牌") cardsInfo.value.action.push(item);
    if (item.type === "魔物牌") cardsInfo.value.monster.push(item);
  }
});

onMounted(() => {
  loading.value = false;
});

async function searchCard(): Promise<void> {
  loading.value = true;
  if (search.value === "") {
    if (CardsInfoS.value.length === 0) {
      showSnackbar({
        text: "未搜索任何卡牌",
        color: "error",
      });
      loading.value = false;
      return;
    }
    doSearch.value = false;
    loading.value = false;
    CardsInfoS.value = [];
    showSnackbar({
      text: "已重置搜索",
      color: "success",
    });
    return;
  }
  doSearch.value = true;
  const res: TGApp.App.GCG.WikiBriefInfo[] = [];
  await Promise.allSettled(
    AppGCGData.map((item) => (item.name.includes(search.value) ? res.push(item) : null)),
  );
  loading.value = false;
  if (res.length === 0) {
    showSnackbar({
      text: "未找到相关卡牌",
      color: "error",
    });
    doSearch.value = false;
  } else {
    CardsInfoS.value = res.sort((a, b) => a.name.localeCompare(b.name));
    showSnackbar({
      text: `找到 ${res.length} 张相关卡牌`,
      color: "success",
    });
  }
}
</script>
<style lang="css" scoped>
.cards-tab {
  margin-bottom: 20px;
  color: var(--common-text-title);
  font-family: var(--font-title);
}

.card-search {
  margin-left: 10px;
  color: var(--box-text-1);
}

.cards-grid {
  display: grid;
  overflow: hidden;
  grid-gap: 10px;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
}
</style>
