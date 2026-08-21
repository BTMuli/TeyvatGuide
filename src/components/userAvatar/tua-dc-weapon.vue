<template>
  <div class="tua-dcw-box">
    <div class="tua-dcw-main">
      <div class="tua-dcw-left">
        <img :src="`/icon/bg/${props.modelValue.rarity}-Star.webp`" alt="star" />
        <img :src="`/WIKI/weapon/${props.modelValue.id}.webp`" alt="weapon" />
        <v-menu
          :close-on-content-click="false"
          :z-index="2400"
          activator="parent"
          location="end"
          offset="8"
          open-on-click
        >
          <div class="tua-dcw-menu">
            <div class="tua-dcw-menu-title">
              <div class="tua-dcw-menu-icon">
                <img :src="`/icon/bg/${props.modelValue.rarity}-Star.webp`" alt="star" />
                <img :src="`/WIKI/weapon/${props.modelValue.id}.webp`" alt="weapon" />
              </div>
              <span>{{ props.modelValue.name }}</span>
              <small>
                Lv.{{ props.modelValue.level }} ·
                <span :class="{ 'tua-dcw-refine--max': props.modelValue.affix_level === 5 }">
                  精炼{{ props.modelValue.affix_level }}
                </span>
              </small>
            </div>
            <div class="tua-dcw-menu-body">
              <!-- eslint-disable-next-line vue/no-v-html -->
              <div class="tua-dcw-menu-desc" v-html="toHtml(props.modelValue.desc)" />
            </div>
          </div>
        </v-menu>
      </div>
      <div class="tua-dcw-right">
        <span class="tua-dcw-title">{{ props.modelValue.name }}</span>
        <span class="tua-dcw-sub">
          <span>Lv.{{ props.modelValue.level }}</span>
          <span :class="{ 'tua-dcw-refine--max': props.modelValue.affix_level === 5 }">
            精炼{{ props.modelValue.affix_level }}
          </span>
        </span>
      </div>
    </div>
    <div class="tua-dcw-props">
      <div class="tua-prop-main">
        <span>
          <img
            v-if="propMain !== false && propMain.icon !== ''"
            :src="propMain.icon"
            alt="propMain"
          />
          <span>{{ propMain !== false ? propMain.name : "未知属性" }}</span>
        </span>
        <span>{{ props.modelValue.main_property.final }}</span>
      </div>
      <div class="tua-prop-sub" v-if="props.modelValue.sub_property">
        <span>
          <img v-if="propSub !== false && propSub.icon !== ''" :src="propSub.icon" alt="propSub" />
          <v-icon class="icon" v-else size="14">mdi-adjust</v-icon>
          <span>{{ propSub !== false ? propSub.name : "未知属性" }}</span>
        </span>
        <span>{{ props.modelValue.sub_property.final }}</span>
      </div>
    </div>
    <div class="tua-dcw-share">
      <span class="tua-share-title">UID:{{ props.uid }}</span>
      <span class="tua-share-sub">更新于{{ props.updated }}</span>
      <span class="tua-share-sub">Render by TeyvatGuide v{{ version }}</span>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { app } from "@tauri-apps/api";
import { parseHtmlText } from "@utils/toolFunc.js";
import wikiUtils from "@utils/wikiUtils.js";
import { computed, onMounted, ref } from "vue";

type TuaDcWeaponProps = {
  modelValue: TGApp.Game.Avatar.WeaponDetail;
  updated: string;
  uid: number;
};

const props = defineProps<TuaDcWeaponProps>();
const version = ref<string>();

onMounted(async () => {
  version.value = await app.getVersion();
});

const propMain = computed<TGApp.Game.Avatar.PropMapItem | false>(() => {
  return wikiUtils.getProp(props.modelValue.main_property.property_type);
});
const propSub = computed<TGApp.Game.Avatar.PropMapItem | false>(() => {
  if (props.modelValue.sub_property === undefined) return false;
  return wikiUtils.getProp(props.modelValue.sub_property.property_type);
});

function toHtml(desc: string): string {
  if (desc.trim() === "") return "暂无说明";
  return parseHtmlText(desc);
}
</script>
<style lang="css" scoped>
.tua-dcw-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 5px;
  border: 1px solid #ffffff33;
  border-radius: 5px;
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  background: #00000033;
  color: var(--tgc-white-1);
  font-size: 12px;
  text-shadow: 0 0 5px #00000080;
}

.tua-dcw-main {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-start;
  column-gap: 5px;
}

.tua-dcw-right {
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
}

.tua-dcw-title {
  overflow: hidden;
  font-family: var(--font-title);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tua-dcw-sub {
  display: flex;
  width: 117px;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
}

.tua-dcw-props {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.tua-prop-main {
  display: flex;
  width: 100%;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;

  span:first-child {
    display: flex;
    align-items: center;
    justify-content: center;
    column-gap: 5px;
  }

  img {
    width: 14px;
    height: 14px;
  }
}

.tua-prop-sub {
  display: flex;
  width: 100%;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #ffffff33;

  img {
    width: 14px;
    height: 14px;
  }

  span:first-child {
    display: flex;
    align-items: center;
    justify-content: center;
    column-gap: 5px;

    .icon {
      opacity: 0.4;
    }
  }
}

.tua-dcw-left,
.tua-dcw-menu-icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 36px;
    height: 36px;
    border-radius: 5px;
  }

  img:last-of-type {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
  }
}

.tua-dcw-left {
  cursor: pointer;
}

.tua-dcw-share {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  margin-top: auto;
}

.tua-share-title {
  font-family: var(--font-title);
  font-size: 14px;
}

.tua-share-sub {
  margin-left: auto;
  font-size: 9px;
  opacity: 0.8;
}

.tua-dcw-menu {
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

.tua-dcw-menu-title {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--common-shadow-1);
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-weight: normal;
  gap: 8px;

  .tua-dcw-menu-icon {
    flex-shrink: 0;
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

.tua-dcw-sub .tua-dcw-refine--max,
.tua-dcw-menu-title small .tua-dcw-refine--max {
  color: var(--tgc-yellow-1);
}

.tua-dcw-menu-body {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  overflow-y: auto;
}

.tua-dcw-menu-desc {
  color: var(--box-text-2);
  font-size: 12px;
  line-height: 1.6;
  word-break: break-all;

  :deep(span) {
    filter: var(--gs-filter);
  }
}
</style>
