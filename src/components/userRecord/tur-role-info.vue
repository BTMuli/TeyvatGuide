<template>
  <div class="tur-ri-box">
    <div class="tur-ri-avatar">
      <TMiImg :ori="true" :src="role.avatar" alt="avatar" />
    </div>
    <div class="tur-ri-content">
      <div class="tur-ri-title">{{ role.nickname }}({{ uid }})</div>
      <div class="tur-ri-subtitle">Lv.{{ role.level }} {{ role.region }}</div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";

type TurRoleInfoProps = { uid: number; role: TGApp.Sqlite.Record.Role };

defineProps<TurRoleInfoProps>();
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.tur-ri-box {
  position: relative;
  display: flex;
  height: 48px;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  padding: 4px 12px 4px 4px;
  border-radius: 24px;
  column-gap: 4px;

  @include github-styles.github-card;
}

.dark .tur-ri-box {
  @include github-styles.github-card("dark");
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
  align-items: center;
  justify-content: flex-start;
  color: var(--common-text-title);
  column-gap: 4px;
  font-family: var(--font-title);
  font-size: 16px;
  line-height: 20px;
}

.tur-ri-subtitle {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  color: var(--box-text-1);
  column-gap: 10px;
  font-size: 14px;
  line-height: 16px;
}
</style>
