<template>
  <img
    v-if="localUrl"
    :alt="props.alt"
    :class="props.class"
    :src="localUrl"
    :title="props.title"
    @click="emits('click')"
  />
  <div v-else class="progress">
    <v-progress-circular :size="props.size" color="primary" indeterminate />
  </div>
</template>
<script lang="ts" setup>
import useAppStore from "@store/app.js";
import { onMounted, onUnmounted, ref, watch } from "vue";

import { saveImgLocal } from "@/utils/TGShare.js";

type TMiImgProps = {
  src: string;
  alt: string;
  title?: string;
  class?: string;
  ori?: boolean;
  size?: number;
};
type TMiImgEmits = (e: "click") => void;
const props = withDefaults(defineProps<TMiImgProps>(), { size: 25 });
const emits = defineEmits<TMiImgEmits>();

const appStore = useAppStore();
const localUrl = ref<string>();

onMounted(async () => {
  if (!props.src) return;
  if (!props.src.startsWith("http")) {
    localUrl.value = props.src;
    return;
  }
  const link = props.ori ? props.src : appStore.getImageUrl(props.src);
  localUrl.value = await saveImgLocal(link);
});

watch(
  () => props.src,
  async () => {
    if (!props.src) return;
    if (localUrl.value) URL.revokeObjectURL(localUrl.value);
    localUrl.value = undefined;
    const link = props.ori ? props.src : appStore.getImageUrl(props.src);
    if (!props.src.startsWith("http")) localUrl.value = props.src;
    else localUrl.value = await saveImgLocal(link);
  },
);

onUnmounted(() => {
  if (localUrl.value) URL.revokeObjectURL(localUrl.value);
});
</script>
<style lang="scss" scoped>
.progress {
  position: relative;
  display: flex;
  width: v-bind("`${props.size}px`");
  height: v-bind("`${props.size}px`");
  align-items: center;
  justify-content: center;
}
</style>
