<!-- 角色详情卡片 -->
<template>
  <div class="tua-dc-container">
    <img :src="bg" alt="bg" class="tua-dc-bg" />
    <div class="tua-dc-avatar">
      <img :src="fullIcon" alt="avatar" />
    </div>
    <v-btn
      :loading
      class="tua-dc-share"
      data-html2canvas-ignore
      prepend-icon="mdi-share-variant"
      size="small"
      variant="outlined"
      @click="share"
    >
      分享
    </v-btn>
    <v-btn
      v-if="props.avatar.avatar.tps"
      :prepend-icon="showTps ? 'mdi-account' : 'mdi-pistol'"
      class="tua-dc-tps"
      data-html2canvas-ignore
      size="small"
      variant="outlined"
      @click="showTps = !showTps"
    >
      切换
    </v-btn>
    <!-- TPS视图 -->
    <template v-if="props.avatar.avatar.tps && showTps">
      <!-- 底部角色属性 -->
      <div class="tua-dcp-lb">
        <TuaDcpProp
          v-for="(prop, index) in props.avatar.avatar.tps.properties"
          :key="index"
          :prop
        />
      </div>
      <!-- 右侧配装方案列表 -->
      <div class="tua-dcp-r">
        <!-- 配枪方案说明 -->
        <div class="tua-dcp-rt">
          <span>当前配枪方案</span>
          <span>页面内仅展示配件装配解锁栏位，枪械图片不随配件动态变化，请以游戏内表现为准。</span>
        </div>
        <TuaDcpWeapon
          v-for="(weapon, index) in props.avatar.avatar.tps.weapons"
          :key="index"
          :weapon
        />
        <div class="tua-dcp-share">
          <span>UID:{{ props.avatar.uid }}</span>
          <span>TeyvatGuide v{{ version }}</span>
        </div>
      </div>
    </template>
    <!-- 普通视图 -->
    <template v-else>
      <!-- 右上整体属性&角色-->
      <div class="tua-dc-rt">
        <div class="tua-dcr-avatar">
          <span>{{ props.avatar.avatar.name }}</span>
          <span>Lv.{{ props.avatar.avatar.level }}</span>
          <span v-if="hasFetter">好感{{ props.avatar.avatar.fetter }}</span>
          <v-icon
            v-if="props.avatar.costumes.length !== 0"
            :title="`解锁衣装：${props.avatar.costumes.map((i) => i.name).join(',')}`"
            size="14"
          >
            mdi-tshirt-crew
          </v-icon>
        </div>
        <div v-for="(prop, index) in props.avatar.propSelected" :key="index">
          <div v-if="propMain[index] !== false" class="tua-dc-prop">
            <TuaDcProp
              :highlight="recommendedPropertyTypes.has(prop.property_type)"
              :model-value="prop"
              :prop="propMain[index]"
            />
          </div>
        </div>
      </div>
      <!-- 右侧武器跟圣遗物具体属性 -->
      <div class="tua-dc-detail">
        <TuaDcWeapon
          :model-value="props.avatar.weapon"
          :uid="props.avatar.uid"
          :updated="props.avatar.updated"
        />
        <TuaDcRelic
          :model-value="relicList[0]"
          :recommend="props.avatar.propRecommend.recommend_properties"
          pos="1"
        />
        <TuaDcRelic
          :model-value="relicList[1]"
          :recommend="props.avatar.propRecommend.recommend_properties"
          pos="2"
        />
        <TuaDcRelic
          :model-value="relicList[2]"
          :recommend="props.avatar.propRecommend.recommend_properties"
          pos="3"
        />
        <TuaDcRelic
          :model-value="relicList[3]"
          :recommend="props.avatar.propRecommend.recommend_properties"
          pos="4"
        />
        <TuaDcRelic
          :model-value="relicList[4]"
          :recommend="props.avatar.propRecommend.recommend_properties"
          pos="5"
        />
      </div>
      <!-- 左下命座跟天赋 -->
      <div class="tua-dc-lb">
        <TuaDcTalents :model-value="props.avatar.skills" />
        <TuaDcConstellations :model-value="props.avatar.constellations" />
      </div>
    </template>
  </div>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import TSUserAvatar from "@Sqlm/userAvatar.js";
import { app } from "@tauri-apps/api";
import TGShare from "@utils/TGShare.js";
import wikiUtils from "@utils/wikiUtils.js";
import { computed, onMounted, ref } from "vue";

import TuaDcConstellations from "./tua-dc-constellations.vue";
import TuaDcProp from "./tua-dc-prop.vue";
import TuaDcRelic from "./tua-dc-relic.vue";
import TuaDcTalents from "./tua-dc-talents.vue";
import TuaDcWeapon from "./tua-dc-weapon.vue";
import TuaDcpProp from "./tua-dcp-prop.vue";
import TuaDcpWeapon from "./tua-dcp-weapon.vue";

type fixedLenArr<T, N extends number> = [T, ...Array<T>] & { length: N };
type RelicList = fixedLenArr<TGApp.Game.Avatar.Relic | false, 5>;
type TuaDetailCardProps = {
  avatar: TGApp.Sqlite.Character.TableTrans;
  costume: TGApp.App.Character.Costume | false;
};

const props = defineProps<TuaDetailCardProps>();

const hasFetter = computed<boolean>(
  () => ![10000005, 10000007, 10000117, 10000118].includes(props.avatar.avatar.id),
);
const fullIcon = computed<string>(() => {
  if (props.avatar.avatar.tps && showTps.value) return props.avatar.avatar.tps!.bg_pic!;
  if (props.costume) return `/WIKI/costume/${props.costume.id}_full.webp`;
  return props.avatar.avatar.image;
});
const relicList = computed<RelicList>(() => {
  return [
    props.avatar.relics.find((item) => item.pos === 1) || false,
    props.avatar.relics.find((item) => item.pos === 2) || false,
    props.avatar.relics.find((item) => item.pos === 3) || false,
    props.avatar.relics.find((item) => item.pos === 4) || false,
    props.avatar.relics.find((item) => item.pos === 5) || false,
  ];
});
const propMain = computed<Array<TGApp.Game.Avatar.PropMapItem | false>>(() =>
  props.avatar.propSelected.map((item) => wikiUtils.getProp(item.property_type)),
);
const recommendedPropertyTypes = computed<ReadonlySet<number>>(() => {
  const recommend = props.avatar.propRecommend.recommend_properties;
  return new Set([
    ...recommend.sand_main_property_list,
    ...recommend.goblet_main_property_list,
    ...recommend.circlet_main_property_list,
    ...recommend.sub_property_list,
  ]);
});
const bg = computed<string>(() => {
  const card = TSUserAvatar.getAvatarCard(props.avatar.cid);
  return `/WIKI/nameCard/profile/${card}.webp`;
});

const loading = ref<boolean>(false);
const showTps = ref<boolean>(false);
const version = ref<string>();

onMounted(async () => {
  version.value = await app.getVersion();
});

async function share(): Promise<void> {
  const shareBox = document.querySelector<HTMLElement>(".tua-dc-container");
  if (shareBox === null) {
    showSnackbar.error("分享失败，未找到分享内容");
    return;
  }
  const fileName = `【角色详情】${props.avatar.avatar.name}`;
  loading.value = true;
  try {
    await TGShare.modern(fileName, shareBox, 2.5);
  } finally {
    loading.value = false;
  }
}
</script>
<style lang="scss" scoped>
.tua-dc-container {
  position: relative;
  overflow: hidden;
  width: 800px;
  border-radius: 5px;
  aspect-ratio: 21 / 10;
  background: var(--box-bg-1);
}

.tua-dc-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

.tua-dc-share {
  position: absolute;
  top: 5px;
  left: 5px;
  border: 1px solid #ffffff33;
  border-radius: 4px;
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  color: var(--tgc-white-1);
}

.tua-dc-tps {
  position: absolute;
  top: 40px;
  left: 5px;
  border: 1px solid #ffffff33;
  border-radius: 4px;
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  color: var(--tgc-white-1);
}

.tua-dc-avatar {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  width: 300px;
  height: 100%;
  align-items: center;
  justify-content: center;
  object-fit: contain;

  img {
    height: 100%;
    object-fit: contain;
  }
}

.tua-dcp-lb {
  position: absolute;
  bottom: 8px;
  left: 4px;
  display: grid;
  padding: 8px;
  border-radius: 4px;
  background: #ffffff1c;
  gap: 4px;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: repeat(2, 1fr);
}

.tua-dcp-r {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  width: 440px;
  height: 364px;
  flex-direction: column;
  padding: 8px;
  border-radius: 4px;
  background: #ffffff1c;
  gap: 8px;
}

.tua-dcp-rt {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;

  :first-child {
    color: var(--tgc-od-orange);
    font-family: var(--font-title);
    font-size: 14px;
  }

  :last-child {
    color: var(--tgc-od-white);
    font-size: 12px;
  }
}

.tua-dcp-share {
  position: absolute;
  right: 8px;
  bottom: 0;
  display: flex;
  color: var(--tgc-white-1);
  column-gap: 4px;
  font-size: 12px;
  opacity: 0.4;
}

.tua-dcp-share-title {
  font-family: var(--font-title);
  font-size: 14px;
  font-weight: normal;
}

.tua-dcp-share-sub {
  margin-left: auto;
  font-size: 9px;
  opacity: 0.8;
}

.tua-dc-rt {
  position: absolute;
  top: 5px;
  right: 5px;
  display: flex;
  width: 520px;
  height: 80px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  padding: 5px;
  border: 1px solid #ffffff33;
  border-radius: 5px;
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  background: #00000033;
  gap: 0;
}

.tua-dcr-avatar {
  position: absolute;
  bottom: 5px;
  left: 14px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  color: var(--tgc-white-1);
  column-gap: 10px;
  font-family: var(--font-title);
  font-size: 14px;
  text-shadow: 0 0 5px #00000080;
}

.tua-dc-detail {
  position: absolute;
  right: 0;
  bottom: 0;
  display: grid;
  padding: 5px;
  gap: 5px;
  grid-template-columns: repeat(3, 170px);
  grid-template-rows: repeat(2, 140px);
}

.tua-dc-lb {
  position: absolute;
  bottom: 5px;
  left: 5px;
  display: flex;
  width: 260px;
  height: 90px;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 5px;
}
</style>
