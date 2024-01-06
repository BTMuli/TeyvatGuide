<template>
  <div class="wc-box">
    <div class="wc-list">
      <TwcListItem
        v-for="item in cardsInfo"
        v-model:cur-item="curItem"
        :key="item.id"
        :data="item"
        @click="switchC(item)"
        mode="character"
      />
    </div>
    <div class="wc-detail">
      <TwcCharacter :item="curItem" @error="toOuter(curItem)" />
    </div>
  </div>
</template>
<script lang="ts" setup>
import { onBeforeMount, ref } from "vue";

import showConfirm from "../../components/func/confirm";
import showSnackbar from "../../components/func/snackbar";
import TwcCharacter from "../../components/wiki/twc-character.vue";
import TwcListItem from "../../components/wiki/twc-list-item.vue";
import { AppCharacterData } from "../../data";
import Mys from "../../plugins/Mys";
import { createTGWindow } from "../../utils/TGWindow";

const cardsInfo = AppCharacterData;
const curItem = ref<TGApp.App.Character.WikiBriefInfo>();

onBeforeMount(() => {
  curItem.value = cardsInfo[0];
});

async function switchC(item: TGApp.App.Character.WikiBriefInfo): Promise<void> {
  if (item.id === 10000005 || item.id === 10000007) {
    await toOuter(item);
    return;
  }
  curItem.value = item;
}

async function toOuter(item?: TGApp.App.Character.WikiBriefInfo): Promise<void> {
  if (!item) return;
  if (item.contentId === 0) {
    showSnackbar({
      text: `角色 ${item.name} 暂无观测枢页面`,
      color: "warn",
    });
    return;
  }
  const confirm = await showConfirm({
    title: `角色 ${item.name} 暂无数据`,
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
.wc-box {
  position: relative;
  display: flex;
  max-height: calc(100vh - 40px);
  column-gap: 10px;
}

.wc-list {
  display: grid;
  width: 500px;
  max-height: 100%;
  padding-right: 10px;
  gap: 10px;
  grid-template-columns: repeat(3, minmax(100px, 1fr));
  overflow-y: auto;
}

.wc-detail {
  max-height: 100%;
  flex: 1;
  padding: 10px;
  border-radius: 10px;
  box-shadow: 0 0 10px var(--common-shadow-2);
  overflow-y: auto;
}
</style>
