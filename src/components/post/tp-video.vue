<template>
  <div class="tp-video-box">
    {{ props.data }}
  </div>
</template>
<script lang="ts" setup>
import { ref } from "vue";

// todo https://zhuanlan.zhihu.com/p/450632587
interface TpVideo {
  insert: {
    video: string;
  };
}

interface TpVideoProps {
  data: TpVideo;
}

const props = defineProps<TpVideoProps>();
const videoAspectRatio = ref<number>(16 / 9);

console.log("tpVideo", props.data.insert.video);
</script>
<style lang="css" scoped>
.tp-video-box {
  position: relative;
  max-width: 100%;
  margin: 10px auto;
  aspect-ratio: v-bind(videoAspectRatio);
}
</style>
