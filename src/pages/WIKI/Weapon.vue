<template>
  <div class="ww-box">
    <div class="ww-list">
      <TwcListItem
        v-for="item in cardsInfo"
        v-model:cur-item="curItem"
        :key="item.id"
        :data="item"
        @click="switchW(item)"
        mode="weapon"
      />
    </div>
    <div class="ww-detail">
      <TwcWeapon :item="curItem" @error="toOuter(curItem)" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onBeforeMount, ref } from "vue";

import showConfirm from "../../components/func/confirm";
import showSnackbar from "../../components/func/snackbar";
import TwcListItem from "../../components/wiki/twc-list-item.vue";
import TwcWeapon from "../../components/wiki/twc-weapon.vue";
import { AppWeaponData } from "../../data";
import Mys from "../../plugins/Mys";
import { createTGWindow } from "../../utils/TGWindow";

const cardsInfo = AppWeaponData;
const curItem = ref<TGApp.App.Weapon.WikiBriefInfo>();

onBeforeMount(() => {
  curItem.value = cardsInfo[0];
});

async function switchW(item: TGApp.App.Weapon.WikiBriefInfo): Promise<void> {
  curItem.value = item;
}

async function toOuter(item?: TGApp.App.Weapon.WikiBriefInfo): Promise<void> {
  if (!item) return;
  if (item.contentId === 0) {
    showSnackbar({
      text: `武器 ${item.name} 暂无观测枢页面`,
      color: "warn",
    });
    return;
  }
  const confirm = await showConfirm({
    title: `武器 ${item.name} 暂无数据`,
    text: "是否打开观测枢页面？",
  });
  if (!confirm) {
    showSnackbar({
      text: "已取消",
      color: "cancel",
    });
    return;
  }
  const url = Mys.Api.Obc.replace("{contentId}", item.contentId.toString());
  createTGWindow(url, "Sub_window", `Content_${item.contentId} ${item.name}`, 1200, 800, true);
}
</script>
<style scoped>
.ww-box {
  position: relative;
  display: flex;
  max-height: calc(100vh - 40px);
  column-gap: 10px;
}

.ww-list {
  display: grid;
  width: 500px;
  max-height: 100%;
  padding-right: 10px;
  gap: 10px;
  grid-template-columns: repeat(3, minmax(100px, 1fr));
  overflow-y: auto;
}

.ww-detail {
  max-height: 100%;
  flex: 1;
  padding: 10px;
  border-radius: 10px;
  box-shadow: 0 0 10px var(--common-shadow-2);
  overflow-y: auto;
}
</style>
