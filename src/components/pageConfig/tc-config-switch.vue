<template>
  <TcConfigItem :title :subtitle :icon @activate="emit('toggle')">
    <template #append>
      <v-checkbox-btn
        :model-value="modelValue"
        class="config-check"
        color="var(--tgc-od-orange)"
        density="compact"
        @click.stop
        @update:model-value="emit('toggle')"
      />
    </template>
  </TcConfigItem>
</template>
<script lang="ts" setup>
import TcConfigItem from "./tc-config-item.vue";

defineProps<{
  title: string;
  subtitle: string;
  icon: string;
  modelValue: boolean;
}>();

const emit = defineEmits<{ toggle: [] }>();
</script>
<style lang="scss" scoped>
.config-check {
  flex-shrink: 0;
}
</style>
