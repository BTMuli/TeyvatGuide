<!-- 武器详情浮窗 -->
<template>
  <v-navigation-drawer v-model="visible" :location="'right'" :style="{ zIndex: 9 }">
    <PbWeaponDetailContent :avatar-id="props.avatarId" :cur="props.cur" @close="hide" />
  </v-navigation-drawer>
</template>

<script lang="ts" setup>
import PbWeaponDetailContent from "@comp/pageBag/pb-weapon-detail-content.vue";

type PbWeaponDetailProps = { cur: TGApp.App.UserBag.WeaponItem; avatarId?: number };

const props = defineProps<PbWeaponDetailProps>();
const visible = defineModel<boolean>("show", { required: true });

function hide(): void {
  visible.value = false;
}
</script>
