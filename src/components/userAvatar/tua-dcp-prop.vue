<!-- 角色详情，TPS属性 -->
<template>
  <div class="tua-dcpp-box">
    <div class="tua-dcpp-left">
      <img :src="props.prop.icon" alt="icon" />
      <span>{{ props.prop.name }}</span>
    </div>
    <div class="tua-dcpp-right">
      {{ props.prop.final }}
    </div>
  </div>
</template>
<script lang="ts" setup>
type TuaDcpPropProps = { prop: TGApp.Game.Avatar.TpsProp };

const props = defineProps<TuaDcpPropProps>();
</script>
<style lang="scss" scoped>
.tua-dcpp-box {
  position: relative;
  display: flex;
  width: 160px;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  border: 1px solid #ffffff33;
  border-radius: 4px;
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  background: #0000001c;
  color: var(--tgc-white-1);
  column-gap: 4px;
  font-size: 12px;
}

.tua-dcpp-left {
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 4px;

  img {
    width: 16px;
    height: 16px;
    object-fit: contain;
  }
}

.tua-dcpp-right {
  padding-right: 16px;
}
</style>
