<!-- 背包材料物品浮窗 -->
<template>
  <TOverlay v-model="visible">
    <div v-if="props.data" class="pbom-container">
      <slot name="left"></slot>
      <div class="pbom-box">
        <div class="pbom-share">
          {{ dbInfo.updated }} | UID {{ props.uid }} | TeyvatGuide v{{ version }}
        </div>
        <div class="pbom-top">
          <div class="pbom-icon">
            <img :src="`/icon/bg/${props.data.info.star}-BGC.webp`" alt="bg" class="bg" />
            <img :src="`/icon/material/${props.data.info.id}.webp`" alt="icon" class="icon" />
            <span class="cnt">{{ dbInfo.count }}</span>
          </div>
          <div class="pbom-name" @click="shareMaterial()">{{ props.data.info.name }}</div>
          <div class="pbom-type">{{ props.data.info.type }}</div>
        </div>
        <div class="pbom-mid">
          <div class="pbom-desc" v-html="parseHtmlText(props.data.info.description)" />
          <div v-if="props.data.info.source.length > 0" class="pbom-source">
            <TwoSource v-for="(item, index) in props.data.info.source" :key="index" :data="item" />
          </div>
          <div v-if="props.data.info.convert.length > 0" class="pbom-convert">
            <TwoConvert
              v-for="(item, index) in props.data.info.convert"
              :key="index"
              :data="item"
            />
          </div>
        </div>
        <div class="pbom-bottom">
          <div class="pbom-bt-title">
            <v-icon color="var(--tgc-od-white)" size="16">mdi-clock-edit-outline</v-icon>
            <span>更新记录</span>
            <span class="edit" @click="tryEdit()">手动更新</span>
          </div>
          <div class="pbom-bt-records">
            <div v-for="record in dbInfo.records" :key="record.time" class="pbom-record">
              <span class="time">[{{ timestampToDate(record.time * 1000) }}]</span>
              <span class="cnt">{{ record.count }}</span>
              <span class="type">{{ record.manual ? "手动更新" : "自动导入" }}</span>
            </div>
          </div>
        </div>
      </div>
      <slot name="right"></slot>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import TOverlay from "@comp/app/t-overlay.vue";
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import TwoConvert from "@comp/pageWiki/two-convert.vue";
import TwoSource from "@comp/pageWiki/two-source.vue";
import TSUserBagMaterial from "@Sqlm/userBagMaterial.js";
import { getVersion } from "@tauri-apps/api/app";
import { generateShareImg } from "@utils/TGShare.js";
import { parseHtmlText, timestampToDate } from "@utils/toolFunc.js";
import { onMounted, ref, shallowRef, watch } from "vue";

import type { MaterialInfo } from "@/pages/common/PageBagMaterial.vue";

type PboMaterialProps = { data: MaterialInfo; uid: string };
type PboMaterialEmits = (e: "updateDB", v: MaterialInfo) => void;

const props = defineProps<PboMaterialProps>();
const emits = defineEmits<PboMaterialEmits>();
const visible = defineModel<boolean>();
const version = ref<string>();

onMounted(async () => (version.value = await getVersion()));

const dbInfo = shallowRef<TGApp.Sqlite.UserBag.TableMaterial>(props.data.tb);

watch(
  () => props.data.info,
  async () => await refreshDb(),
);

async function refreshDb(): Promise<void> {
  const list = await TSUserBagMaterial.getMaterial(Number(props.uid), props.data.info.id);
  dbInfo.value = list[0];
}

async function shareMaterial(): Promise<void> {
  const element = document.querySelector<HTMLElement>(".pbom-box");
  if (element === null) {
    showSnackbar.error("未获取到分享内容");
    return;
  }
  const fileName = `materialBag_${props.data.info.id}_${dbInfo.value.count}`;
  const zoom = window.outerWidth / window.innerWidth;
  await generateShareImg(fileName, element, zoom, true);
}

async function tryEdit(): Promise<void> {
  const input = await showDialog.input("请输入更新值", `物品：${props.data.info.name}`);
  if (!input) {
    showSnackbar.cancel(`已取消对${props.data.info.name}的数量编辑`);
    return;
  }
  if (input === "" || isNaN(Number(input)) || Number(input) < 0) {
    showSnackbar.warn("请输入有效正整数");
    return;
  }
  const check = await showDialog.check("确定更新?", `物品：${props.data.info.name}，数量:${input}`);
  if (!check) {
    showSnackbar.cancel(`已取消对${props.data.info.name}的数量编辑`);
    return;
  }
  await TSUserBagMaterial.insertMaterial(
    Number(props.uid),
    props.data.info.id,
    Number(input),
    dbInfo.value.records,
    true,
  );
  await refreshDb();
  emits("updateDB", { info: props.data.info, tb: dbInfo.value });
  showSnackbar.success("成功更新记录");
}
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.pbom-container {
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 12px;
}

.pbom-box {
  position: relative;
  display: flex;
  width: 800px;
  max-height: 600px;
  flex-direction: column;
  padding: 10px;
  border-radius: 10px;
  background: var(--box-bg-1);
  overflow-y: auto;
  row-gap: 10px;
}

.pbom-share {
  position: absolute;
  z-index: -1;
  top: 0;
  left: 0;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.pbom-top {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 10px;
  border-bottom: 1px solid var(--common-shadow-1);
  background-position: center;
  background-size: cover;
  column-gap: 10px;
}

.pbom-icon {
  position: relative;
  display: flex;
  width: 60px;
  height: 60px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;

  .bg {
    position: absolute;
    z-index: 0;
    width: 64px;
    height: 64px;
    flex-shrink: 0;
    border-radius: 50%;
  }

  .icon {
    position: relative;
    width: 56px;
    height: 56px;
  }

  .cnt {
    @include github-styles.github-tag-dark-gen(#ffcd0c);

    position: absolute;
    bottom: -4px;
    left: 40px;
    width: fit-content;
    padding: 0 4px;
    border-radius: 12px;
    backdrop-filter: blur(5px);
    font-size: 10px;
    text-align: center;
  }
}

.pbom-name {
  color: var(--common-text-title);
  cursor: pointer;
  font-family: var(--font-title);
  font-size: 30px;
}

.pbom-type {
  position: absolute;
  right: 10px;
  bottom: 10px;
  opacity: 0.8;
}

.pbom-mid {
  display: flex;
  flex-direction: column;
  row-gap: 8px;
}

.pbom-desc,
.pbom-source,
.pbom-convert {
  padding: 8px;
  border-radius: 4px;
  background: var(--box-bg-2);
  color: var(--box-text-2);
}

.pbom-desc {
  font-size: 16px;
  white-space: pre-wrap;
  word-break: break-all;
}

.pbom-source {
  display: flex;
  flex-direction: column;
  padding: 10px;
  font-size: 16px;
  row-gap: 5px;
  white-space: pre-wrap;
}

.pbom-convert {
  display: flex;
  flex-direction: column;
  padding: 10px;
  row-gap: 5px;
}

.pbom-bottom {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 8px;
  border-radius: 4px;
  background: var(--box-bg-2);
  row-gap: 8px;
}

.pbom-bt-title {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-start;
  column-gap: 4px;
  font-family: var(--font-title);
  font-size: 16px;

  .edit {
    margin-left: auto;
    color: var(--tgc-od-red);
    cursor: pointer;
  }
}

.pbom-bt-records {
  position: relative;
  display: flex;
  width: 100%;
  max-height: 120px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  overflow-y: auto;
}

.pbom-record {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  column-gap: 4px;

  .time {
    color: var(--tgc-od-white);
  }

  .cnt {
    color: var(--tgc-od-red);
    font-style: var(--font-title);
  }

  .type {
    font-style: italic;
  }
}
</style>
