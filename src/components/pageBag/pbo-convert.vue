<!-- 背包材料合成 -->
<template>
  <div class="pboc-container">
    <v-icon>mdi-all-inclusive</v-icon>
    <PboConvertMaterial v-for="(material, index) in convertSources" :key="index" :material />
  </div>
</template>
<script lang="ts" setup>
import TSUserBagMaterial from "@Sqlm/userBagMaterial.js";
import { shallowRef, watch } from "vue";

import PboConvertMaterial from "./pbo-convert-material.vue";

/** 组件参数 */
type PboConvertProps = {
  /** 用户UID */
  uid: number;
  /** 转换材料 */
  data: TGApp.App.Material.Convert;
};
/** 渲染数据 */
export type PboConvertSource = TGApp.App.Material.ConvertSrc & {
  /** 本地数量 */
  local: number;
};

const props = defineProps<PboConvertProps>();
const convertSources = shallowRef<Array<PboConvertSource>>([]);

watch(
  () => props.data,
  async () => await loadData(),
  { immediate: true },
);

async function loadData(): Promise<void> {
  const tmp: Array<PboConvertSource> = [];
  for (const item of props.data.source) {
    let cnt: number = 0;
    const dbGet = await TSUserBagMaterial.getMaterial(props.uid, Number(item.id));
    if (dbGet.length > 0) cnt = dbGet[0].count;
    tmp.push({ ...item, local: cnt });
  }
  convertSources.value = tmp;
}
</script>
<style lang="css" scoped>
.pboc-container {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-start;
  border-radius: 4px;
  column-gap: 8px;
}
</style>
