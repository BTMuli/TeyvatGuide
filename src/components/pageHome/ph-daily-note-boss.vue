<!-- 周本 BOSS 显示组件 -->
<template>
  <div class="ph-dnb-box">
    <div class="pdb-boss-icon">
      <img alt="周本 BOSS" src="/UI/daily/domain.webp" />
    </div>
    <div class="pdb-boss-info">
      <div class="pdb-boss-title">周本 BOSS</div>
      <div class="pdb-boss-desc">剩余减半次数 {{ current }}/{{ max }}</div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed } from "vue";

type PhDailyNoteBossProps = {
  remainResinDiscountNum?: number;
  resinDiscountNumLimit?: number;
};

const props = defineProps<PhDailyNoteBossProps>();

const current = computed((): number => {
  return props.remainResinDiscountNum ?? 0;
});

const max = computed((): number => {
  return props.resinDiscountNumLimit ?? 0;
});
</script>
<style lang="scss" scoped>
.ph-dnb-box {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  padding: 6px;
  border-radius: 4px;
  background: var(--box-bg-2);
  gap: 4px;
}

.pdb-boss-icon {
  position: relative;
  overflow: hidden;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 4px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.pdb-boss-info {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
}

.pdb-boss-title {
  font-family: var(--font-title);
  font-size: 13px;
  font-weight: bold;
  white-space: nowrap;
}

.pdb-boss-desc {
  overflow: hidden;
  color: var(--box-text-2);
  font-size: 10px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
