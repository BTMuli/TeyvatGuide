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
    <v-progress-circular :size="props.size" color="blue" indeterminate />
  </div>
</template>
<script lang="ts" setup>
import useAppStore from "@store/app.js";
import { onMounted, onUnmounted, ref, watch } from "vue";

import { saveImgBlob } from "@/utils/TGShare.js";

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
const link = ref<string>(getRemoteLink());

onMounted(async () => {
  if (!props.src) return;
  if (!props.src.startsWith("http")) {
    localUrl.value = props.src;
    return;
  }
  link.value = getRemoteLink();
  localUrl.value = await saveImgBlob(link.value);
});

function getRemoteLink(): string {
  return props.ori ? props.src : appStore.getImageUrl(props.src);
}

watch(
  () => props.src,
  async () => {
    if (!props.src) return;
    if (localUrl.value && localUrl.value !== link.value) URL.revokeObjectURL(localUrl.value);
    localUrl.value = undefined;
    if (!props.src.startsWith("http")) localUrl.value = props.src;
    else {
      link.value = getRemoteLink();
      localUrl.value = await saveImgBlob(link.value);
    }
  },
);

onUnmounted(() => {
  if (localUrl.value && localUrl.value !== link.value) URL.revokeObjectURL(localUrl.value);
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
