<!-- 背包材料物品项 -->
<template>
  <div v-if="info" :title="info.name" class="pb-mi-box" @click="toMaterial()">
    <div class="pb-mi-left">
      <img :src="`/icon/bg/${info.star}-Star.webp`" alt="bg" class="pb-mi-bg" />
      <img :src="`/icon/material/${info.id}.webp`" alt="icon" class="pb-mi-icon" />
    </div>
    <div class="pb-mi-right">{{ info.name }}</div>
    <div class="pb-mi-id">{{ item.count }}_{{ info.id }}</div>
  </div>
</template>
<script lang="ts" setup>
import { onMounted, shallowRef } from "vue";

import { WikiMaterialData } from "@/data/index.js";

type PbMaterialItemProps = { tb: TGApp.Sqlite.UserBag.TableMaterial };

const props = defineProps<PbMaterialItemProps>();

const info = shallowRef<TGApp.App.Material.WikiItem>();
const item = shallowRef<TGApp.Sqlite.UserBag.TableMaterial>(props.tb);

onMounted(() => {
  const find = WikiMaterialData.find((i) => i.id === props.tb.id);
  if (find) info.value = find;
});

// TODO: 点击修改数量/查看更改历史
function toMaterial(): void {}
</script>
<style lang="scss" scoped>
.pb-mi-box {
  position: relative;
  display: flex;
  height: 45px;
  align-items: center;
  justify-content: flex-start;
  padding-right: 5px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 5px;
  background: var(--box-bg-1);
  column-gap: 5px;
  cursor: pointer;
}

.pb-mi-left {
  position: relative;
  width: 45px;
  height: 45px;
  border-bottom-left-radius: 5px;
  border-top-left-radius: 5px;
}

.pb-mi-bg,
.pb-mi-icon {
  position: absolute;
  top: 0;
  width: 45px;
  height: 45px;
  border-bottom-left-radius: 5px;
  border-top-left-radius: 5px;
}

.pb-mi-right {
  position: relative;
  overflow: hidden;
  max-width: calc(100% - 50px);
  color: var(--box-text-2);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
  word-break: break-all;
}

.pb-mi-id {
  position: absolute;
  right: 4px;
  bottom: 2px;
  font-size: 8px;
  opacity: 0.6;
}
</style>
