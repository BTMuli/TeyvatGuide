<template>
  <div v-if="props.modelValue.length === 0">暂无数据</div>
  <div v-else class="tur-ag-box">
    <TItembox
      v-for="avatar in props.modelValue"
      :key="avatar.id"
      :model-value="getBoxData(avatar)"
      :title="getTitle(avatar)"
    />
  </div>
</template>
<script lang="ts" setup>
import TItembox, { type TItemBoxData } from "@comp/app/t-itemBox.vue";

type TurAvatarGridProps = { modelValue: Array<TGApp.Sqlite.Record.Avatar> };

const props = defineProps<TurAvatarGridProps>();

function getBoxData(avatar: TGApp.Sqlite.Record.Avatar): TItemBoxData {
  let name = avatar.name;
  if (avatar.id === 10000005) name = "旅行者-空";
  if (avatar.id === 10000007) name = "旅行者-荧";
  return {
    size: "80px",
    height: "80px",
    ltSize: "20px",
    clickable: false,
    bg: `/icon/bg/${avatar.star}-Star.webp`,
    icon: `/WIKI/character/${avatar.id}.webp`,
    lt: `/icon/element/${avatar.element}元素.webp`,
    rt: avatar.constellation.toString() || "0",
    rtSize: "20px",
    innerText: name,
    innerHeight: 20,
    display: "inner",
  };
}

function getTitle(avatar: TGApp.Sqlite.Record.Avatar): string {
  return `等级：${avatar.level}\n好感：${avatar.fetter}\n角色ID：${avatar.id}`;
}
</script>
<style lang="css" scoped>
.tur-ag-box {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
}
</style>
