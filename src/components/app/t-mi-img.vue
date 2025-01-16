<template>
  <img
    :src="localUrl"
    :alt="props.alt"
    :title="props.title"
    v-if="localUrl"
    @click="emits('click')"
    :class="props.class"
  />
  <v-progress-circular v-else indeterminate color="primary" size="25" />
</template>
<script lang="ts" setup>
import { onMounted, onUnmounted, ref, watch } from "vue";

import { useAppStore } from "@/store/modules/app.js";
import { saveImgLocal } from "@/utils/TGShare.js";

type TMiImgProps = {
  src: string;
  alt: string;
  title?: string;
  class?: string;
  ori?: boolean;
};
type TMiImgEmits = {
  (e: "click"): void;
};
const props = defineProps<TMiImgProps>();
const emits = defineEmits<TMiImgEmits>();

const appStore = useAppStore();
const localUrl = ref<string>();

onMounted(async () => {
  if (!props.src) return;
  const link = props.ori ? props.src : appStore.getImageUrl(props.src);
  localUrl.value = await saveImgLocal(link);
});

watch(
  () => props.src,
  async () => {
    if (!props.src) return;
    if (localUrl.value) URL.revokeObjectURL(localUrl.value);
    const link = props.ori ? props.src : appStore.getImageUrl(props.src);
    localUrl.value = await saveImgLocal(link);
  },
);

onUnmounted(() => {
  if (localUrl.value) URL.revokeObjectURL(localUrl.value);
});
</script>
