<template>
  <div class="tj-box">
    {{ JSON.stringify(props.data, null, 2) }}
  </div>
</template>
<script lang="ts" setup>
interface TJsonProps {
  data: JSON;
}

const props = defineProps<TJsonProps>();
</script>
<style lang="css" scoped>
.tj-box {
  overflow: auto;
  width: 100%;
  height: 100%;
  padding: 10px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 10px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
