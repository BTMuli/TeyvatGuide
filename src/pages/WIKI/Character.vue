<template>
  <div class="cards-grid">
    <div v-for="item in cardsInfo" :key="item.id" class="card-box" @click="toOuter(item)">
      <TibWikiAvatar size="128px" :model-value="item" />
    </div>
    <v-snackbar v-model="snackbar" timeout="1500" color="error"> 该角色暂无详情 </v-snackbar>
  </div>
</template>

<script lang="ts" setup>
// vue
import { ref, computed } from "vue";
import TibWikiAvatar from "../../components/itembox/tib-wiki-avatar.vue";
// utils
import { createTGWindow } from "../../utils/TGWindow";
import { AppCharacterData } from "../../data";
// plugins
import Mys from "../../plugins/Mys";

// snackbar
const snackbar = ref(false);
// data
const cardsInfo = computed(() => AppCharacterData);

function toOuter(item: TGApp.App.Character.WikiBriefInfo): void {
  if (item.contentId === 0) {
    snackbar.value = true;
    return;
  }
  const url = Mys.Api.Obc.replace("{contentId}", item.contentId.toString());
  createTGWindow(url, "Sub_window", `Content_${item.contentId} ${item.name}`, 1200, 800, true);
}
</script>
<style scoped>
.cards-grid {
  display: grid;
  padding: 20px;
  grid-gap: 20px;
  grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
}
</style>
