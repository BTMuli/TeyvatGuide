<template>
  <div class="tur-ri-box">
    <div class="tur-ri-avatar">
      <img alt="avatar" :src="props.modelValue.avatar" />
    </div>
    <div class="tur-ri-content">
      <div class="tur-ri-title">
        <span>{{ props.modelValue.nickname }}</span>
        <span>{{ props.modelValue.level }}</span>
      </div>
      <div class="tur-ri-subtitle">
        <span>UID:{{ props.uid }}</span>
        <span>({{ props.modelValue.region }})</span>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
interface TurRoleInfoProps {
  uid: number;
  modelValue: TGApp.Sqlite.Record.Role;
}

const props = defineProps<TurRoleInfoProps>();
</script>
<style lang="css" scoped>
.tur-ri-box {
  display: flex;
  height: 40px;
  align-items: center;
  justify-content: center;
}

.tur-ri-avatar {
  display: flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;

  img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
  }
}

.tur-ri-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
}

.tur-ri-title {
  display: flex;
  height: 25px;
  align-items: center;
  justify-content: flex-start;
  column-gap: 5px;

  :first-child {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 18px;
  }

  :last-child {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 5px;
    border-radius: 5px;
    background: var(--tgc-od-blue);
    color: var(--tgc-white-1);
    font-size: 12px;
    line-height: 20px;
  }
}

.tur-ri-subtitle {
  display: flex;
  height: 15px;
  align-items: center;
  justify-content: flex-start;
  column-gap: 10px;
  opacity: 0.8;
}
</style>
