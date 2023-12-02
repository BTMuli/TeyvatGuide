<template>
  <div class="mys-post-div">
    <img
      class="mys-post-img"
      :src="props.data.insert.image"
      :alt="props.data.insert.image"
      :title="props.data.insert.image"
    />
  </div>
</template>
<script lang="ts" setup>
interface TpImage {
  insert: {
    image: string;
  };
  attributes?: {
    width: number;
    height: number;
    size: number | undefined;
    ext: string | undefined;
  };
}

interface TpImageProps {
  data: TpImage;
}

const props = defineProps<TpImageProps>();
</script>
