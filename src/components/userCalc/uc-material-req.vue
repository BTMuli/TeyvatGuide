<!-- 养成计算-材料需求项 -->
<template>
  <article
    :class="{
      missing: material.missing > 0,
      ready: weakenReady && material.missing === 0,
    }"
    class="ucmr-item"
    role="button"
    tabindex="0"
    title="查看材料详情"
    @click="emits('select')"
    @keydown.enter="emits('select')"
    @keydown.space.prevent="emits('select')"
  >
    <div class="ucmr-icon">
      <img :src="`/icon/bg/${material.star}-Star.webp`" alt="background" />
      <img :src="`/icon/material/${material.id}.webp`" :alt="material.name" />
    </div>
    <div class="ucmr-info">
      <div class="ucmr-text">
        <div class="ucmr-heading">
          <strong>{{ material.name }}</strong>
          <UcMaterialCount
            class="ucmr-count"
            :complete="material.missing === 0"
            :craftable="material.craftable"
            :current="material.owned"
            :required="material.required"
          />
        </div>
        <div class="ucmr-meta">{{ material.type }}</div>
      </div>
      <v-progress-linear
        :color="material.missing > 0 ? 'var(--tgc-od-red)' : 'var(--tgc-od-green)'"
        :model-value="material.progress"
        height="3"
        rounded
      />
    </div>
  </article>
</template>

<script lang="ts" setup>
import UcMaterialCount from "@comp/userCalc/uc-material-count.vue";

type UcMaterialReqProps = {
  material: TGApp.App.UserCalc.ResultMaterial;
  weakenReady?: boolean;
};

type UcMaterialReqEmits = { select: [] };

const { weakenReady = false } = defineProps<UcMaterialReqProps>();
const emits = defineEmits<UcMaterialReqEmits>();
</script>

<style lang="scss" scoped>
.ucmr-item {
  display: flex;
  overflow: hidden;
  min-width: 0;
  height: 48px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--common-shadow-t-1);
  cursor: pointer;
  transition: opacity 160ms ease;

  &:focus-visible {
    outline: 2px solid var(--tgc-od-blue);
    outline-offset: -2px;
  }

  &.missing {
    border-color: var(--tgc-od-red);
  }

  &.ready {
    opacity: 0.56;
  }
}

.ucmr-icon {
  position: relative;
  width: 48px;
  height: 48px;
  flex: 0 0 48px;
  background: var(--common-shadow-t-2);

  img {
    position: absolute;
    width: 100%;
    height: 100%;
    inset: 0;
  }

  img:first-child {
    object-fit: cover;
  }

  img:last-child {
    object-fit: contain;
  }
}

.ucmr-info {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  justify-content: space-between;
  padding: 5px 8px;
  gap: 0;
}

.ucmr-text {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0;
}

.ucmr-heading {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  line-height: 16px;

  > strong {
    overflow: hidden;
    color: var(--box-text-4);
    font-family: var(--font-title);
    font-size: 13px;
    font-weight: normal;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.ucmr-count {
  font-size: 11px;
}

.ucmr-meta {
  overflow: hidden;
  color: var(--box-text-4);
  font-size: 10px;
  opacity: 0.72;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
