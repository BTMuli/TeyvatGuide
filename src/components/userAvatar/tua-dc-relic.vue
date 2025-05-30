<template>
  <div class="tua-dcr-box">
    <div class="tua-dcr-main">
      <div class="tua-dcr-left">
        <div class="tua-dcr-bg">
          <img
            :src="`/icon/bg/${props.modelValue.rarity}-Star.webp`"
            v-if="props.modelValue !== false"
            :alt="`relic${props.pos}`"
          />
        </div>
        <div class="tua-dcr-icon">
          <img
            :src="`/icon/relic/${props.pos}.webp`"
            :alt="`relic${props.pos}`"
            v-if="props.modelValue === false"
            class="empty"
          />
          <TMiImg :ori="true" :src="props.modelValue.icon" :alt="props.modelValue.name" v-else />
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
import useUserStore from "@store/user.js";
import { computed } from "vue";

type TuaDcRelicProps = {
  modelValue: TGApp.Game.Avatar.Relic | false;
  pos: "1" | "2" | "3" | "4" | "5";
  recommend: TGApp.Game.Avatar.PropRecommend;
};

const props = defineProps<TuaDcRelicProps>();
const userStore = useUserStore();

const propMain = computed<TGApp.Game.Avatar.PropMapItem | false>(() => {
  if (props.modelValue === false) return false;
  return userStore.getProp(props.modelValue.main_property.property_type);
});
const propSubs = computed<Array<TGApp.Game.Avatar.PropMapItem | false>>(() => {
  if (props.modelValue === false) return [];
  return props.modelValue.sub_property_list.map((item) => userStore.getProp(item.property_type));
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
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
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
  width: 14px;
  height: 14px;
  border: 1px solid #ffffff33;
  border-radius: 4px;
  background: #00000033;
  font-size: 10px;
  line-height: 14px;
  text-align: center;
  text-shadow: 0 0 5px #00000080;
}
</style>
