<!-- 月谕圣牌项 -->
<template>
  <div class="tuc-ovti-box" @click="console.log(props.item)">
    <div class="tuc-ovti-icon">
      <img v-if="!props.item.is_unlock" alt="lock" src="/UI/combat/tarotDefault.webp" />
      <img v-else :alt="props.item.name" :src="props.item.icon" />
    </div>
    <div class="tuc-ovti-name">{{ props.item.name }}</div>
  </div>
</template>
<script lang="ts" setup>
type TucOvtItemProps = { item: TGApp.Game.Combat.TarotCard };

const props = defineProps<TucOvtItemProps>();
</script>
<style lang="scss" scoped>
.tuc-ovti-box {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  row-gap: 12px;
}

.tuc-ovti-icon {
  position: relative;
  width: 100%;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.tuc-ovti-name {
  font-family: var(--font-title);
}
</style>
