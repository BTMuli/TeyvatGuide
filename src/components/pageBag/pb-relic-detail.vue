<!-- 圣遗物详情浮窗 -->
<template>
  <v-navigation-drawer v-model="visible" :location="'right'" :style="{ zIndex: 9 }">
    <PbRelicDetailContent
      :avatar-id="props.avatarId"
      :closable="true"
      :cur="props.cur"
      @close="hide"
    />
  </v-navigation-drawer>
</template>

<script lang="ts" setup>
import PbRelicDetailContent from "@comp/pageBag/pb-relic-detail-content.vue";

type PbRelicDetailProps = { cur: TGApp.Sqlite.UserBag.RelicTable; avatarId?: number };

const props = defineProps<PbRelicDetailProps>();
const visible = defineModel<boolean>("show");

function hide(): void {
  visible.value = false;
}
</script>
