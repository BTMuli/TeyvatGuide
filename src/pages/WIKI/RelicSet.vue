<!-- 圣遗物套装WIKI -->
<template>
  <div class="wr-box">
    <div class="wr-left">
      <!-- TODO:筛选 -->
      <div class="wr-list">
        <PwRelicSetItem
          v-for="set in showSets"
          :key="set.id"
          :selected="curSet && curSet.id === set.id"
          :set
          @click="switchR(set)"
        />
      </div>
    </div>
    <div class="wr-detail">
      <PwdRelicSet :set="curSet" />
    </div>
  </div>
</template>
<script lang="ts" setup>
import { wrSet } from "@/data/index.js";
import PwRelicSetItem from "@comp/pageWiki/pw-relic-set-item.vue";
import { shallowRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import PwdRelicSet from "@comp/pageWiki/pwd-relic-set.vue";
import showSnackbar from "@comp/func/snackbar.js";

const appRsData = wrSet.sort((a, b) => b.maxStar - a.maxStar || b.id - a.id);

const route = useRoute();
const router = useRouter();

const showSets = shallowRef<Array<TGApp.App.Relic.SetItem>>(appRsData);
const curSet = shallowRef<TGApp.App.Relic.SetItem>();

watch(
  () => route.params.id,
  (newId) => loadCurSet((newId ?? 0).toString()),
  { immediate: true },
);

function loadCurSet(id: string): void {
  if (id === "0") {
    curSet.value = showSets.value[0];
    return;
  }
  const item = showSets.value.find((item) => item.id.toString() === id);
  if (item) {
    curSet.value = item;
    return;
  }
  showSnackbar.warn(`圣遗物套装 ${id} 不存在`);
  curSet.value = showSets.value[0];
}

function switchR(set: TGApp.App.Relic.SetItem): void {
  curSet.value = set;
  router.replace({ params: { id: set.id.toString() } });
}
</script>
<style lang="scss" scoped>
.wr-box {
  position: relative;
  display: flex;
  max-height: calc(100vh - 32px);
  column-gap: 8px;
}

.wr-left {
  position: relative;
  display: flex;
  flex: 3;
  flex-direction: column;
  flex-shrink: 0;
  gap: 8px;
}

.wr-list {
  position: relative;
  display: grid;
  overflow: hidden auto;
  width: 100%;
  padding-right: 8px;
  gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(144px, 1fr));
}

.wr-detail {
  position: relative;
  width: 100%;
  box-sizing: border-box;
  flex: 5;
  padding: 8px;
  border-radius: 4px;
  box-shadow: 0 0 4px var(--common-shadow-2);
  overflow-y: auto;
}
</style>
