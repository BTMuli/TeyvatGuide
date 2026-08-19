<template>
  <div class="tua-dct-box">
    <div v-for="skill in props.modelValue" :key="skill.skill_id" class="tua-dct-item">
      <TMiImg :ori="true" :src="skill.icon" alt="talent" class="tua-dct-icon" />
      <div v-if="!skill.is_unlock" class="tua-dct-lock">
        <v-icon size="10px" color="var(--tgc-od-white)">mdi-lock</v-icon>
      </div>
      <div v-if="skill.is_unlock && skill.skill_type === 1" class="tua-dct-level">
        {{ skill.level === 0 ? 1 : skill.level }}
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
              <TMiImg :ori="true" :src="skill.icon" alt="talent" class="tua-dct-icon" />
              <div v-if="!skill.is_unlock" class="tua-dct-lock">
                <v-icon size="10px" color="var(--tgc-od-white)">mdi-lock</v-icon>
              </div>
            </div>
            <span>{{ skill.name }}</span>
            <small>Lv.{{ skill.level === 0 ? 1 : skill.level }}</small>
          </div>
          <div class="tua-dct-menu-body">
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div class="tua-dct-menu-desc" v-html="toHtml(skill.desc)" />
            <div
              v-for="(affix, index) in skill.skill_affix_list"
              :key="index"
              class="tua-dct-menu-row"
            >
              <span>{{ affix.name }}</span>
              <span>{{ affix.value }}</span>
            </div>
          </div>
        </div>
      </v-menu>
    </div>
  </div>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import { parseHtmlText } from "@utils/toolFunc.js";

type TuaDcTalentsProps = { modelValue: Array<TGApp.Game.Avatar.Skill> };

const props = defineProps<TuaDcTalentsProps>();

function toHtml(desc: string): string {
  if (desc.trim() === "") return "暂无说明";
  return parseHtmlText(desc);
}
</script>
<style lang="css" scoped>
.tua-dct-box {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
}

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
  -webkit-backdrop-filter: blur(8px);
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
  top: 0;
  left: 0;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  padding: 5px;
  border-radius: 50%;
  background: #00000080;
}

.tua-dct-lock v-icon {
  color: var(--tgc-white-1);
}

.tua-dct-level {
  position: absolute;
  right: 0;
  bottom: -15px;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  padding-top: 1px;
  border-radius: 4px;
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  background: #00000080;
  color: var(--tgc-white-1);
  font-size: 8px;
  text-shadow: 0 0 5px #00000080;
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
  font-weight: normal;
  gap: 8px;

  .tua-dct-item {
    flex-shrink: 0;
    cursor: default;
  }

  span {
    min-width: 0;
    flex: 1;
  }

  small {
    flex-shrink: 0;
    color: var(--box-text-2);
    font-size: 12px;
    opacity: 0.85;
  }
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

  :deep(span) {
    filter: var(--gs-filter);
  }
}

.tua-dct-menu-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--box-text-2);
  font-size: 12px;
  gap: 8px;
}
</style>
