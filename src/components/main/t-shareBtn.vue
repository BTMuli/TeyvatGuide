<template>
  <ToLoading v-model="loading" title="正在生成分享图片" :subtitle="`${props.title}.png`" />
  <div class="share-box">
    <div class="share-btn" @click="shareContent()">
      <v-icon style="color: var(--theme-switch-icon)"> mdi-share-variant </v-icon>
    </div>
  </div>
</template>
<script lang="ts" setup>
// vue
import { ref, onMounted } from "vue";
import ToLoading from "../overlay/to-loading.vue";
// utils
import { generateShareImg } from "../../utils/TGShare";

// loading
const loading = ref<boolean>();

interface TShareBtnProps {
  modelValue: HTMLElement;
  title: string;
}

const props = defineProps<TShareBtnProps>();

onMounted(() => (loading.value = false));

async function shareContent() {
  loading.value = true;
  await generateShareImg(props.title, props.modelValue);
  loading.value = false;
}
</script>
<style lang="css" scoped>
.share-box {
  position: absolute;
  top: 20px;
  right: 20px;
  border: var(--theme-switch-icon) 2px solid;
  border-radius: 50%;
  cursor: pointer;
}

.share-box:hover {
  opacity: 0.8;
}

.share-btn {
  display: flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  padding-right: 2px;
  margin: 5px;
}
</style>
