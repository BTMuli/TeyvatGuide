<template>
  <div class="cards-grid">
    <div v-for="item in cardsInfo" :key="item.id" class="card-box" @click="toOuter(item)">
      <TMiniWeapon size="128px" :model-value="item" />
    </div>
    <v-snackbar v-model="snackbar" timeout="1500" color="error">
      该武器暂无详情
    </v-snackbar>
  </div>
</template>

<script lang="ts" setup>
// vue
import { ref, onMounted } from "vue";
import TMiniWeapon from "../../components/t-mini-weapon.vue";
// utils
import { createTGWindow } from "../../utils/TGWindow";
import { TGAppData } from "../../data";
import { OBC_CONTENT_API } from "../../plugins/Mys/interface/utils";

// snackbar
const snackbar = ref(false);
// data
const cardsInfo = ref([] as BTMuli.Genshin.Wiki.Weapon.BriefInfo[]);

onMounted(async () => {
  cardsInfo.value = TGAppData.weapon;
});

function toOuter (item: BTMuli.Genshin.Wiki.Weapon.BriefInfo) {
  if (item.content_id === null || item.content_id === undefined) {
    snackbar.value = true;
    return;
  }
  const url = OBC_CONTENT_API.replace("{content_id}", item.content_id.toString());
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
