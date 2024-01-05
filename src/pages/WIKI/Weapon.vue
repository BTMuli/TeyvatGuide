<template>
  <!-- todo 排布优化  -->
  <div class="cards-grid">
    <div v-for="item in cardsInfo" :key="item.id" class="card-box" @click="toOuter(item)">
      <TItemBox :model-value="getBox(item)" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";

import showConfirm from "../../components/func/confirm";
import showSnackbar from "../../components/func/snackbar";
import TItemBox, { TItemBoxData } from "../../components/main/t-itembox.vue";
import { AppWeaponData } from "../../data";
import Mys from "../../plugins/Mys";
import { createTGWindow, createWiki } from "../../utils/TGWindow";

const cardsInfo = computed(() => AppWeaponData);

async function toOuter(item: TGApp.App.Weapon.WikiBriefInfo): Promise<void> {
  const confirm = await showConfirm({
    title: "是否打开 Wiki 页面？",
    text: "取消则跳转至观测枢",
  });
  if (confirm === undefined) {
    showSnackbar({
      text: "已取消",
      color: "cancel",
    });
    return;
  }
  if (confirm) {
    createWiki("Weapon", item.id.toString());
    return;
  }
  if (item.contentId === 0) {
    showSnackbar({
      text: "该武器暂无观测枢页面，将跳转至 Wiki 页面",
      color: "warn",
    });
    setTimeout(() => {
      createWiki("Weapon", item.id.toString());
    }, 1000);
    return;
  }
  const url = Mys.Api.Obc.replace("{contentId}", item.contentId.toString());
  createTGWindow(url, "Sub_window", `Content_${item.contentId} ${item.name}`, 1200, 800, true);
}

function getBox(item: TGApp.App.Weapon.WikiBriefInfo): TItemBoxData {
  return {
    bg: item.bg,
    icon: item.icon,
    clickable: true,
    size: "128px",
    height: "128px",
    display: "inner",
    lt: item.weaponIcon,
    ltSize: "40px",
    innerText: item.name,
    innerHeight: 30,
  };
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
