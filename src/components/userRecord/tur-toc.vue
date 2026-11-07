<template>
  <TFloatingToc :items />
</template>
<script lang="ts" setup>
import TFloatingToc, { type FloatingTocItem } from "@comp/app/t-floating-toc.vue";
import { computed } from "vue";

type TurTocProps = {
  /** 世界探索首个地区图标 */
  worldIcon?: string;
  /** 尘歌壶洞天仙力等级图标 */
  homeIcon?: string;
};

const { worldIcon, homeIcon } = defineProps<TurTocProps>();

const items = computed<Array<FloatingTocItem>>(() => [
  { id: "record-overview", label: "数据总览", icon: "mdi-chart-box-outline" },
  { id: "record-avatars", label: "角色信息", icon: "mdi-account-group-outline" },
  { id: "record-world", label: "世界探索", icon: "mdi-earth", image: worldIcon },
  { id: "record-home", label: "尘歌壶", icon: "mdi-tea-outline", image: homeIcon },
]);
</script>
