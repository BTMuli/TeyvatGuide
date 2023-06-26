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
import { OBC_CONTENT_API } from "../../plugins/Mys/interface/utils";

// snackbar
const snackbar = ref(false);
// data
const cardsInfo = computed(() => AppCharacterData);

function toOuter(item: TGApp.App.Character.WikiBriefInfo) {
  if (item.contentId === 0) {
    snackbar.value = true;
    return;
  }
  const url = OBC_CONTENT_API.replace("{content_id}", item.contentId.toString());
  createTGWindow(url, "角色详情", item.name, 1200, 800, true);
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
