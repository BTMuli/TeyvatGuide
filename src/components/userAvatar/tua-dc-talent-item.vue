<template>
  <div class="tua-dct-item">
    <TMiImg :ori="true" :src="props.skill.icon" alt="talent" class="tua-dct-icon" />
    <div v-if="!props.skill.is_unlock" class="tua-dct-lock">
      <v-icon size="10px">mdi-lock</v-icon>
    </div>
    <div v-if="props.skill.is_unlock && props.skill.skill_type === 1" class="tua-dct-level">
      {{ props.skill.level === 0 ? 1 : props.skill.level }}
    </div>
    <v-menu
      :close-on-content-click="false"
      :z-index="2400"
      activator="parent"
      location="top"
      offset="8"
      open-on-click
    >
      <div class="tua-dct-menu">
        <div class="tua-dct-menu-title">
          <div class="tua-dct-item">
            <TMiImg :ori="true" :src="props.skill.icon" alt="talent" class="tua-dct-icon" />
          </div>
          <span>{{ props.skill.name }}</span>
          <small>Lv.{{ props.skill.level === 0 ? 1 : props.skill.level }}</small>
          <v-btn-toggle
            v-if="props.skill.skill_affix_list?.length > 0"
            v-model="showAffix"
            class="tua-dct-menu-toggle"
            density="compact"
            mandatory
            variant="outlined"
          >
            <v-btn
              aria-label="天赋介绍"
              icon="mdi-text-box-outline"
              title="天赋介绍"
              :value="false"
            />
            <v-btn
              aria-label="详细属性"
              icon="mdi-format-list-bulleted"
              title="详细属性"
              :value="true"
            />
          </v-btn-toggle>
        </div>
        <div class="tua-dct-menu-body">
          <div v-if="showAffix" class="tua-dct-menu-table">
            <div
              v-for="(affix, index) in props.skill.skill_affix_list"
              :key="index"
              class="tua-dct-menu-row"
            >
              <span class="tua-dct-menu-row-name">{{ affix.name }}</span
              ><span class="tua-dct-menu-row-value">{{ affix.value }}</span>
            </div>
          </div>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div v-else class="tua-dct-menu-desc" v-html="toHtml(props.skill.desc)" />
        </div>
      </div>
    </v-menu>
  </div>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import { parseHtmlText } from "@utils/toolFunc.js";
import { ref } from "vue";

type TuaDcTalentItemProps = { skill: TGApp.Game.Avatar.Skill };
const props = defineProps<TuaDcTalentItemProps>();
const showAffix = ref<boolean>(false);
function toHtml(desc: string): string {
  return desc.trim() === "" ? "暂无说明" : parseHtmlText(desc);
}
</script>
<style lang="scss" scoped>
.tua-dct-item {
  position: relative;
  display: flex;
  width: 35px;
  height: 35px;
  align-items: center;
  justify-content: center;
  padding: 2px;
  border: 1px solid #ffffff33;
  border-radius: 50%;
  backdrop-filter: blur(8px);
  background: #00000033;
  cursor: pointer;
}

.tua-dct-icon {
  width: 100%;
  height: 100%;
}

.tua-dct-lock {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5px;
  border-radius: 50%;
  background: #00000080;
  inset: 0;
}

.tua-dct-level {
  position: absolute;
  right: 0;
  bottom: -15px;
  display: flex;
  width: 100%;
  justify-content: center;
  border-radius: 4px;
  background: #00000080;
  color: var(--tgc-white-1);
  font-size: 8px;
}

.tua-dct-menu {
  display: flex;
  overflow: hidden;
  width: min(360px, calc(100vw - 48px));
  max-height: min(420px, calc(100vh - 160px));
  box-sizing: border-box;
  flex-direction: column;
  padding: 12px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 12px;
  background: var(--box-bg-1);
  box-shadow: 0 8px 24px var(--common-shadow-4);
  gap: 12px;
}

.tua-dct-menu-title {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--common-shadow-1);
  color: var(--common-text-title);
  font-family: var(--font-title);
  gap: 8px;
}

.tua-dct-menu-title .tua-dct-item {
  flex-shrink: 0;
  cursor: default;
}

.tua-dct-menu-title span {
  min-width: 0;
  flex: 1;
}

.tua-dct-menu-title small {
  flex-shrink: 0;
  color: var(--box-text-2);
  font-size: 12px;
  opacity: 0.85;
}

.tua-dct-menu-toggle {
  flex-shrink: 0;
}

.tua-dct-menu-toggle :deep(.v-btn) {
  min-width: 32px;
  padding: 0 6px;
}

.tua-dct-menu-body {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.tua-dct-menu-desc {
  color: var(--box-text-2);
  font-size: 12px;
  line-height: 1.6;
  word-break: break-all;
}

.tua-dct-menu-desc :deep(span) {
  filter: var(--gs-filter);
}

.tua-dct-menu-table {
  overflow: hidden;
  border: 1px solid var(--common-shadow-2);
  border-radius: 8px;
}

.tua-dct-menu-row {
  display: flex;
  min-height: 36px;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-bottom: 1px solid var(--common-shadow-1);
  color: var(--box-text-2);
  font-size: 12px;
  gap: 8px;
}

.tua-dct-menu-row:last-child {
  border-bottom: 0;
}

.tua-dct-menu-row:nth-child(even) {
  background: var(--common-shadow-1);
}

.tua-dct-menu-row-name {
  color: var(--common-text-title);
  font-weight: 600;
}

.tua-dct-menu-row-value {
  color: var(--box-text-1);
  font-family: var(--font-title);
  text-align: right;
}
</style>
