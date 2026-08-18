<template>
  <div class="tua-dcr-box">
    <div class="tua-dcr-main">
      <div v-if="props.modelValue !== false" class="tua-dcr-left">
        <div class="tua-dcr-bg">
          <img :src="`/icon/bg/${props.modelValue.rarity}-Star.webp`" :alt="`relic${props.pos}`" />
        </div>
        <div class="tua-dcr-icon">
          <TMiImg :ori="true" :src="props.modelValue.icon" :alt="props.modelValue.name" />
        </div>
        <v-menu
          :close-on-content-click="false"
          :z-index="2400"
          activator="parent"
          location="top"
          offset="8"
          open-on-click
        >
          <div class="tua-dcr-menu">
            <div class="tua-dcr-menu-title">
              <TMiImg :ori="true" :src="props.modelValue.icon" :alt="props.modelValue.name" />
              <span>{{ props.modelValue.name }}</span>
              <small>Lv.{{ props.modelValue.level }} · {{ getRelicPos() }}</small>
            </div>
            <div class="tua-dcr-menu-set">{{ props.modelValue.set.name }}</div>
            <div
              v-for="affix in props.modelValue.set.affixes"
              :key="affix.activation_number"
              class="tua-dcr-menu-affix"
            >
              <span class="tua-dcr-menu-n">{{ affix.activation_number }}件套</span>
              <span>{{ affix.effect }}</span>
            </div>
          </div>
        </v-menu>
      </div>
      <div v-else class="tua-dcr-left">
        <div class="tua-dcr-bg" />
        <div class="tua-dcr-icon">
          <img :src="`/icon/relic/${props.pos}.webp`" :alt="`relic${props.pos}`" class="empty" />
        </div>
      </div>
      <div class="tua-dcr-right">
        <span class="tua-dcr-title">{{ getRelicTitle() }}</span>
        <span v-if="props.modelValue !== false" class="tua-dcr-sub">
          <span>Lv.{{ props.modelValue.level }}</span>
          <span>{{ getRelicPos() }}</span>
        </span>
      </div>
    </div>
    <div class="tua-dcr-props" v-if="props.modelValue !== false">
      <div class="tua-dcr-prop-main">
        <span>
          <img
            v-if="propMain !== false && propMain.icon !== ''"
            :src="propMain.icon"
            alt="propMain"
          />
          <v-icon v-else class="icon" size="14">mdi-adjust</v-icon>
          <span :style="getPropMainStyle()">
            {{ propMain !== false ? propMain.name : "未知属性" }}
          </span>
        </span>
        <span>{{ props.modelValue.main_property.value }}</span>
      </div>
      <div v-for="(prop, index) in propSubs" :key="index" class="tua-dcr-prop">
        <span class="tua-prop-sub">
          <img v-if="prop !== false && prop.icon !== ''" :src="prop.icon" alt="propSub" />
          <v-icon v-else class="icon" size="14">mdi-information-outline</v-icon>
          <span :style="getPropSubStyle(prop, props.recommend.sub_property_list)">
            {{ prop !== false ? prop.name : "未知属性" }}
          </span>
          <span class="tua-prop-time" v-if="props.modelValue.sub_property_list[index].times !== 0">
            {{ props.modelValue.sub_property_list[index].times }}
          </span>
        </span>
        <span>{{ props.modelValue.sub_property_list[index].value }}</span>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import wikiUtils from "@utils/wikiUtils.js";
import { computed } from "vue";

type TuaDcRelicProps = {
  modelValue: TGApp.Game.Avatar.Relic | false;
  pos: "1" | "2" | "3" | "4" | "5";
  recommend: TGApp.Game.Avatar.PropRecommend;
};

const props = defineProps<TuaDcRelicProps>();

const propMain = computed<TGApp.Game.Avatar.PropMapItem | false>(() => {
  if (props.modelValue === false) return false;
  return wikiUtils.getProp(props.modelValue.main_property.property_type);
});
const propSubs = computed<Array<TGApp.Game.Avatar.PropMapItem | false>>(() => {
  if (props.modelValue === false) return [];
  return props.modelValue.sub_property_list.map((item) => wikiUtils.getProp(item.property_type));
});

function getRelicPos(): string {
  const relicPos = ["生之花", "死之羽", "时之沙", "空之杯", "理之冠"];
  return relicPos[parseInt(props.pos) - 1];
}

function getRelicTitle(): string {
  if (props.modelValue === false) return getRelicPos();
  return props.modelValue.name;
}

function getPropMainStyle(): string {
  if (props.modelValue === false) return "";
  if (props.pos === "3") {
    if (
      props.recommend.sand_main_property_list.includes(props.modelValue.main_property.property_type)
    ) {
      return "color: var(--tgc-yellow-1);";
    }
  }
  if (props.pos === "4") {
    if (
      props.recommend.goblet_main_property_list.includes(
        props.modelValue.main_property.property_type,
      )
    ) {
      return "color: var(--tgc-yellow-1);";
    }
  }
  if (props.pos === "5") {
    if (
      props.recommend.circlet_main_property_list.includes(
        props.modelValue.main_property.property_type,
      )
    ) {
      return "color: var(--tgc-yellow-1);";
    }
  }
  return "";
}

function getPropSubStyle(
  propItem: TGApp.Game.Avatar.PropMapItem | false,
  propsR: Array<number>,
): string {
  if (propItem === false) return "";
  if (propsR.includes(propItem.property_type)) return "color: var(--tgc-yellow-1);";
  return "";
}
</script>
<style lang="css" scoped>
.tua-dcr-box {
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
  row-gap: 5px;
  text-shadow: 0 0 5px #00000080;
}

.tua-dcr-main {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-start;
  column-gap: 5px;
}

.tua-dcr-left {
  position: relative;
  display: flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  cursor: pointer;
}

.tua-dcr-bg {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  background: var(--box-bg-3);

  img {
    width: 100%;
    height: 100%;
    border-radius: 5px;
    object-fit: cover;
  }
}

.tua-dcr-icon {
  position: relative;
  display: flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .empty {
    padding: 5px;
  }
}

.tua-dcr-right {
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
}

.tua-dcr-title {
  width: 100%;
  font-family: var(--font-title);
}

.tua-dcr-sub {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  column-gap: 5px;
}

.tua-dcr-props {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  column-gap: 5px;
}

.tua-dcr-prop-main {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #ffffff33;
  column-gap: 5px;
  font-family: var(--font-title);

  span {
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

.tua-dcr-prop {
  display: flex;
  width: 100%;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  column-gap: 5px;
}

.tua-prop-sub {
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 5px;

  img {
    width: 14px;
    height: 14px;
  }

  .icon {
    opacity: 0.4;
  }
}

.tua-prop-time {
  display: inline-flex;
  width: 14px;
  height: 14px;
  box-sizing: border-box;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid #ffffff33;
  border-radius: 4px;
  background: #00000033;
  font-size: 10px;
  line-height: 1;
  text-align: center;
  text-shadow: 0 0 5px #00000080;
}

.tua-dcr-menu {
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

.tua-dcr-menu-title {
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

.tua-dcr-menu-set {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 12px;
  font-weight: normal;
}

.tua-dcr-menu-affix {
  display: flex;
  flex-direction: column;
  color: var(--box-text-2);
  font-size: 12px;
  gap: 4px;
  line-height: 1.6;
}

.tua-dcr-menu-n {
  color: var(--tgc-od-orange);
}
</style>
