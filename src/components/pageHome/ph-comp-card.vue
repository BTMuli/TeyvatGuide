<template>
  <div class="thc-container">
    <div class="thc-title">
      <slot name="title"></slot>
    </div>
    <div v-if="props.append" class="thc-append">
      <slot name="title-append"></slot>
    </div>
    <div class="thc-box">
      <slot name="default"></slot>
    </div>
  </div>
</template>
<script lang="ts" setup>
type THomeCardProps = { append?: boolean };
const props = defineProps<THomeCardProps>();
</script>
<style lang="css" scoped>
.thc-container {
  position: relative;
  min-height: 100px;
  padding: 20px 10px 10px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 5px;
  margin-top: 30px;
  box-shadow: 2px 2px 5px var(--common-shadow-1);
}

.thc-title,
.thc-append {
  position: absolute;
  top: -20px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  border-radius: 5px;
  background: var(--tgc-od-blue);
  font-family: var(--font-title);
}

.thc-title {
  left: 10px;
  color: var(--tgc-white-4);
  font-size: 20px;
}

.thc-append {
  right: 10px;
  color: var(--tgc-white-1);
  font-size: 16px;
}
</style>
