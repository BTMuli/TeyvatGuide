<template>
  <div class="tur-box">
    <div class="tur-title">
      <slot name="title">
        {{ title }}
      </slot>
    </div>
    <div class="tur-text">
      <slot name="val-text">
        {{ text }}
      </slot>
    </div>
  </div>
</template>
<script lang="ts" setup>
interface TAOProps {
  title: string,
  text: string | number,
}

defineProps<TAOProps>();
</script>
<style lang="css" scoped>
.tur-box {
  width: 100%;
  height: auto;
  padding: 10px;
  margin-bottom: 10px;
  border-radius: 5px;
  background: rgb(0 0 0 / 10%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.tur-title {
  font-family: Genshin, serif;
  font-size: 20px;
  color: rgb(255 255 255 / 80%);
  text-shadow: 0 0 10px rgb(0 0 0 / 80%);
}

.tur-text {
  font-family: Genshin-Light, serif;
  font-size: 20px;
  font-weight: bold;
  margin-top: 10px;
  color: rgb(255 255 255 / 80%);
  text-shadow: #fec90b 0 0 5px;
}
</style>
