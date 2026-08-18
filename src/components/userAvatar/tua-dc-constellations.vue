<template>
  <div class="tua-dcc-box">
    <div v-for="constellation in props.modelValue" :key="constellation.pos" class="tua-dcc-item">
      <TMiImg :ori="true" :src="constellation.icon" alt="constellation" class="tua-dcc-icon" />
      <div v-if="!constellation.is_actived" class="tua-dcc-lock">
        <v-icon size="10px" color="var(--tgc-od-white)">mdi-lock</v-icon>
      </div>
      <v-menu
        :close-on-content-click="false"
        :z-index="2400"
        activator="parent"
        location="top"
        offset="8"
        open-on-click
      >
        <div class="tua-dcc-menu">
          <div class="tua-dcc-menu-title">
            <TMiImg :ori="true" :src="constellation.icon" alt="constellation" />
            <span>{{ constellation.name }}</span>
            <small>第{{ constellation.pos }}层</small>
          </div>
          <div class="tua-dcc-menu-row">
            <span>{{ constellation.is_actived ? "已激活" : "未激活" }}</span>
          </div>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="tua-dcc-menu-desc" v-html="toHtml(constellation.effect)" />
        </div>
      </v-menu>
    </div>
  </div>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import { parseHtmlText } from "@utils/toolFunc.js";

type TuaDcConstellationsProps = { modelValue: Array<TGApp.Game.Avatar.Constellation> };

const props = defineProps<TuaDcConstellationsProps>();

function toHtml(desc: string): string {
  if (desc.trim() === "") return "暂无说明";
  return parseHtmlText(desc);
}
</script>
<style lang="css" scoped>
.tua-dcc-box {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
}

.tua-dcc-item {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 40px;
  height: 40px;
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

.tua-dcc-icon {
  width: 100%;
  height: 100%;
}

.tua-dcc-lock {
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

.tua-dcc-menu {
  display: flex;
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
  overflow-y: auto;
}

.tua-dcc-menu-title {
  display: flex;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--common-shadow-1);
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-weight: normal;
  gap: 8px;

  img {
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    object-fit: contain;
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

.tua-dcc-menu-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--box-text-2);
  font-size: 12px;
  gap: 8px;
}

.tua-dcc-menu-desc {
  color: var(--box-text-2);
  font-size: 12px;
  line-height: 1.6;
  word-break: break-all;
}
</style>
