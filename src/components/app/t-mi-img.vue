<template>
  <img
    :src="localUrl"
    :alt="props.alt"
    :title="props.title"
    v-if="localUrl"
    @click="emits('click')"
    :class="props.class"
  />
  <div class="progress" v-else>
    <v-progress-circular indeterminate color="primary" size="25" />
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
};
type TMiImgEmits = (e: "click") => void;
const props = defineProps<TMiImgProps>();
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
    localUrl.value = await saveImgLocal(link);
  },
);

onUnmounted(() => {
  if (localUrl.value) URL.revokeObjectURL(localUrl.value);
});
</script>
<style lang="scss" scoped>
.progress {
  width: 25px;
  height: 25px;
  display: flex;
  position: relative;
  justify-content: center;
  align-items: center;
}
</style>
