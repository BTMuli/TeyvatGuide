<template>
  <div class="achi-container" :title="getAchiTitle()">
    <div class="achi-version">v{{ data.version }}</div>
    <div class="achi-pre">
      <div class="achi-pre-icon">
        <v-icon v-if="!data.isCompleted" color="var(--tgc-blue-3)" @click="setAchiStat(true)">
          mdi-circle
        </v-icon>
        <v-icon v-else class="achi-finish" @click="setAchiStat(false)">
          <img alt="finish" src="/source/UI/finish.webp" />
        </v-icon>
      </div>
      <div class="achi-pre-info" @click="selectAchi()">
        <span>
          <span>{{ data.name }}</span>
          <span v-if="data.progress !== 0">
            {{ data.progress }}
          </span>
        </span>
        <span>{{ data.description }}</span>
      </div>
    </div>
    <div class="achi-append">
      <span v-show="data.isCompleted">{{ data.completedTime }}</span>
      <div class="achi-append-icon">
        <img alt="icon" src="/icon/material/201.webp" />
        <span>{{ data.reward }}</span>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { event } from "@tauri-apps/api";
import { toRaw, ref, watch } from "vue";

import { AppAchievementSeriesData } from "../../data/index.js";
import TSUserAchi from "../../plugins/Sqlite/modules/userAchi.js";
import { timestampToDate } from "../../utils/toolFunc.js";
import showConfirm from "../func/confirm.js";
import showSnackbar from "../func/snackbar.js";

interface TuaAchiProps {
  modelValue: TGApp.Sqlite.Achievement.RenderAchi;
}

interface TuaAchiEmits {
  (e: "update:modelValue", data: TGApp.Sqlite.Achievement.RenderAchi): void;

  (e: "update:update", data: boolean): void;

  (e: "select-achi", data: TGApp.Sqlite.Achievement.RenderAchi): void;
}

const props = defineProps<TuaAchiProps>();
const emits = defineEmits<TuaAchiEmits>();
const data = ref<TGApp.Sqlite.Achievement.RenderAchi>(toRaw(props.modelValue));

watch(
  () => props.modelValue,
  (newVal: TGApp.Sqlite.Achievement.RenderAchi) => {
    data.value = toRaw(newVal);
  },
);

function getAchiTitle(): string {
  const seriesFind = AppAchievementSeriesData.find((s) => s.id === data.value.series);
  if (!seriesFind) return "未知";
  return seriesFind.name;
}

function selectAchi(): void {
  emits("select-achi", props.modelValue);
}

async function setAchiStat(stat: boolean): Promise<void> {
  if (!stat) {
    data.value.isCompleted = false;
    await TSUserAchi.updateAchi(data.value);
    emits("update:modelValue", data.value);
    await event.emit("updateAchi", data.value.series);
    showSnackbar.success(`已将成就 ${data.value.name}(${data.value.id}) 状态设为未完成`);
    return;
  }
  let progress: boolean | undefined | string = await showConfirm({
    mode: "input",
    title: "请输入成就进度",
    text: "进度",
    input: data.value.progress,
  });
  if (progress === false) {
    showSnackbar.cancel("已取消成就编辑");
    return;
  }
  if (progress === undefined) progress = data.value.progress.toString();
  if (isNaN(Number(progress)) || progress === "0") {
    showSnackbar.warn("请输入有效数字！");
    return;
  }
  data.value.progress = Number(progress);
  data.value.completedTime = timestampToDate(new Date().getTime());
  data.value.isCompleted = true;
  await TSUserAchi.updateAchi(data.value);
  await event.emit("updateAchi", data.value.series);
  showSnackbar.success(`已将成就 ${data.value.name}(${data.value.id}) 状态设为已完成`);
  emits("update:modelValue", data.value);
}
</script>
<style lang="css" scoped>
.achi-container {
  position: relative;
  display: flex;
  height: 60px;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  border-radius: 10px;
  background: var(--box-bg-1);
  color: var(--box-text-7);
  cursor: pointer;
}

.achi-version {
  position: absolute;
  top: 0;
  left: 0;
  width: 50px;
  border-right: 1px solid var(--common-shadow-1);
  border-bottom: 1px solid var(--common-shadow-1);
  background: var(--box-bg-2);
  border-bottom-right-radius: 20px;
  border-top-left-radius: 10px;
  color: var(--tgc-pink-1);
  font-family: var(--font-title);
  font-size: 10px;
  text-align: center;
}

.achi-pre {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  column-gap: 10px;
}

.achi-pre-icon {
  display: flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
}

.achi-finish img {
  width: 30px;
  height: 30px;
  filter: invert(51%) sepia(100%) saturate(353%) hue-rotate(42deg) brightness(107%) contrast(91%);
}

.achi-pre-info {
  display: flex;
  width: 100%;
  flex-flow: column wrap;
  align-items: flex-start;
  justify-content: center;
  text-align: left;
}

.achi-pre-info :nth-child(1) {
  display: flex;
  align-items: flex-end;
  column-gap: 5px;
  font-family: var(--font-title);
  font-size: 14px;
}

.achi-pre-info :nth-child(1) :nth-child(2) {
  color: var(--tgc-blue-2);
  font-size: 12px;
}

.achi-pre-info :nth-child(2) {
  font-size: 12px;
  opacity: 0.8;
}

.achi-append-icon span {
  position: absolute;
  bottom: 0;
  left: 0;
  display: flex;
  width: 100%;
  height: 10px;
  align-items: center;
  justify-content: center;
  background: rgb(0 0 0 / 50%);
  border-bottom-left-radius: 5px;
  border-bottom-right-radius: 5px;
  color: var(--tgc-white-1);
  font-size: 8px;
}

.achi-append {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  column-gap: 10px;
}

.achi-append :nth-last-child(2) {
  margin-right: 10px;
  color: var(--box-text-4);
  font-size: small;
}

.achi-append-icon {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 5px;
  background-image: url("/icon/bg/5-Star.webp");
  background-size: cover;
}

.achi-append-icon img {
  width: 40px;
  height: 40px;
}
</style>
