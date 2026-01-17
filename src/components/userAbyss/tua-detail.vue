<!-- 楼层组件 -->
<template>
  <div ref="floorEl" class="tuad-box">
    <div class="tuad-title">
      <div class="title" @click="shareFloor()">第{{ props.floor.id }}层</div>
      <div class="append">
        <span>{{ props.floor.winStar }}</span>
        <span>/{{ props.floor.maxStar }}</span>
        <img alt="Abyss" src="/icon/star/Abyss.webp" />
      </div>
    </div>
    <div class="tuad-mid">
      <div v-if="show" class="tuad-share">UID {{ props.uid }} | 第{{ props.id }}期</div>
      <div class="tuad-buff">
        <span>地脉异常:</span>
        <template v-if="props.floor.buff === undefined">
          <span>数据缺失</span>
        </template>
        <template v-else-if="props.floor.buff.length > 0">
          <span v-for="(b, i) in props.floor.buff" :key="i">{{ b }}</span>
        </template>
        <template v-else>
          <span>无地脉异常</span>
        </template>
      </div>
    </div>
    <div class="tuad-index-box">
      <TuaDetailLevel v-for="level in props.floor.levels" :key="level.id" :level />
    </div>
  </div>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import { generateShareImg } from "@utils/TGShare.js";
import { nextTick, ref, useTemplateRef } from "vue";

import TuaDetailLevel from "./tua-detail-level.vue";

type TuaDetailProps = { floor: TGApp.Sqlite.Abyss.Floor; uid?: string; id: number };

const props = defineProps<TuaDetailProps>();
const show = ref<boolean>(false);
const floorRef = useTemplateRef<HTMLDivElement>("floorEl");

async function shareFloor(): Promise<void> {
  if (!floorRef.value) {
    showSnackbar.warn("未捕获到Floor Dom");
    return;
  }
  show.value = true;
  await nextTick();
  const fileName = `深境螺旋_第${props.id}期_${props?.uid ?? ""}_${props.floor.id}`;
  await generateShareImg(fileName, floorRef.value);
  show.value = false;
}
</script>
<style lang="css" scoped>
.tuad-box {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 8px;
  border-radius: 4px;
  background: var(--box-bg-1);
  row-gap: 4px;
}

.tuad-title {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding: 4px;
  border-bottom: 1px solid var(--common-shadow-4);
  font-size: 20px;
  line-height: 24px;

  .title {
    cursor: pointer;
  }

  .append {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    column-gap: 4px;

    span:first-child {
      color: var(--tgc-od-orange);
      font-family: var(--font-title);
    }

    img {
      width: 28px;
      height: 28px;
      padding: 2px;
      border-radius: 50%;
      background: #2c313c;
    }
  }
}

.tuad-mid {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
}

.tuad-share {
  position: relative;
  z-index: -1;
  color: var(--box-text-1);
  font-size: 14px;
  opacity: 0.8;
}

.tuad-buff {
  position: relative;
  margin-left: auto;
  color: var(--box-text-1);
  font-size: 14px;
  font-style: italic;
}

.tuad-index-box {
  display: grid;
  width: 100%;
  gap: 8px;
  grid-template-columns: repeat(3, 1fr);
}
</style>
