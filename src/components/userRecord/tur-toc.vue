<template>
  <TFloatingToc :items />
</template>
<script lang="ts" setup>
import TFloatingToc from "@comp/app/t-floating-toc.vue";

const items = [
  { id: "record-overview", label: "数据总览", icon: "mdi-chart-box-outline" },
  { id: "record-avatars", label: "角色信息", icon: "mdi-account-group-outline" },
  { id: "record-world", label: "世界探索", icon: "mdi-earth" },
  { id: "record-home", label: "尘歌壶", icon: "mdi-tea-outline" },
];
</script>
