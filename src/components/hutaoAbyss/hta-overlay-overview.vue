<template>
  <TOverlay v-model="visible" hide :to-click="onCancel" blur-val="0px">
    <div class="hta-oo-box">
      <TSubLine>数据收集统计</TSubLine>
      <TSubLine>深渊数据统计</TSubLine>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
// vue
import { computed } from "vue";
import TOverlay from "../main/t-overlay.vue";
import TSubLine from "../main/t-subline.vue";

interface HtaOverlayOverviewProps {
  modelValue: boolean;
  data?: TGApp.Plugins.Hutao.AbyssOverview;
}

interface HtaOverlayOverviewEmits {
  (e: "update:modelValue", value: TGApp.Plugins.Hutao.AbyssOverview): void;
}

const props = defineProps<HtaOverlayOverviewProps>();
const emits = defineEmits<HtaOverlayOverviewEmits>();

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emits("update:modelValue", value),
});

function onCancel () {
  visible.value = false;
}
</script>
<style lang="css" scoped>
.hta-oo-box {
  width: 300px;
  padding: 10px;
  border-radius: 5px;
  background: rgb(255 255 255/30%);
}
</style>
