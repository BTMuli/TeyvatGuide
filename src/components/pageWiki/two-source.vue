<template>
  <div class="twos-box">
    <v-icon>mdi-map-marker</v-icon>
    <span>{{ props.data.name }}</span>
  </div>
</template>
<script lang="ts" setup>
import { computed } from "vue";

type TwoConvertProps = { data: TGApp.App.Material.Source };

const props = defineProps<TwoConvertProps>();

const textColor = computed<string>(() => {
  if (!props.data || !props.data.days) return "var(--tgc-blue-2)";
  const days = props.data.days;
  const day = new Date().getDay();
  if (day === 0 || days.includes(day)) return "var(--tgc-pink-1)";
  return "var(--tgc-blue-2)";
});
</script>
<style lang="css" scoped>
.twos-box {
  display: flex;
  width: fit-content;
  align-items: center;
  color: v-bind(textColor); /* stylelint-disable-line value-keyword-case */
  column-gap: 5px;
}
</style>
