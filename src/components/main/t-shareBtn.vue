<template>
  <div class="share-box">
    <div class="share-btn" @click="shareContent()">
      <v-icon style="color: var(--theme-switch-icon)"> mdi-share-variant </v-icon>
    </div>
  </div>
</template>
<script lang="ts" setup>
// utils
import { generateShareImg } from "../../utils/TGShare";

interface TShareBtnProps {
  modelValue: HTMLElement;
  title: string;
}

const props = defineProps<TShareBtnProps>();

async function shareContent() {
  await generateShareImg(props.title, props.modelValue);
}
</script>
<style lang="css" scoped>
.share-box {
  position: absolute;
  top: 20px;
  right: 20px;
  cursor: pointer;
  border-radius: 50%;
  border: var(--theme-switch-icon) 2px solid;
}

.share-box:hover {
  opacity: 0.8;
}

.share-btn {
  width: 24px;
  height: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 5px;
  padding-right: 2px;
}
</style>
