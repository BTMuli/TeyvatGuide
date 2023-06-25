<template>
  <div class="cards-grid">
    <div v-for="item in cardsInfo" :key="item.id" class="card-box" @click="toOuter(item)">
      <TibWikiWeapon size="128px" :model-value="item" />
    </div>
    <v-snackbar v-model="snackbar" timeout="1500" color="error"> 该武器暂无详情 </v-snackbar>
  </div>
</template>

<script lang="ts" setup>
// vue
import { ref, computed } from "vue";
import TibWikiWeapon from "../../components/itembox/tib-wiki-weapon.vue";
// utils
import { createTGWindow } from "../../utils/TGWindow";
import { AppWeaponData } from "../../data";
import { OBC_CONTENT_API } from "../../plugins/Mys/interface/utils";

// snackbar
const snackbar = ref(false);
// data
const cardsInfo = computed(() => AppWeaponData);

function toOuter(item: TGApp.App.Weapon.WikiBriefInfo) {
  if (item.contentId === 0) {
    snackbar.value = true;
    return;
  }
  const url = OBC_CONTENT_API.replace("{content_id}", item.contentId.toString());
  createTGWindow(url, "武器详情", item.name, 1200, 800, true);
}
</script>
<style scoped>
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
  grid-gap: 15px;
  padding: 15px;
}
</style>
