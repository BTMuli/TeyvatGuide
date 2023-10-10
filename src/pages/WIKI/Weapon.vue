<template>
  <div class="cards-grid">
    <div v-for="item in cardsInfo" :key="item.id" class="card-box" @click="toOuter(item)">
      <TibWikiWeapon size="128px" :model-value="item" />
    </div>
    <v-snackbar v-model="snackbar" timeout="1500" color="error"> 该武器暂无详情 </v-snackbar>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from "vue";

import TibWikiWeapon from "../../components/itembox/tib-wiki-weapon.vue";
import { AppWeaponData } from "../../data";
import Mys from "../../plugins/Mys";
import { createTGWindow } from "../../utils/TGWindow";

// snackbar
const snackbar = ref<boolean>(false);
// data
const cardsInfo = computed(() => AppWeaponData);

function toOuter(item: TGApp.App.Weapon.WikiBriefInfo): void {
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
  padding: 15px;
  grid-gap: 15px;
  grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
}
</style>
