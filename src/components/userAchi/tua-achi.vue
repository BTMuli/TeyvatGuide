<template>
  <div :title="getAchiTitle()" class="achi-container" @click="selectAchi()">
    <div class="achi-version">v{{ data.version }}</div>
    <div class="achi-pre">
      <div class="achi-pre-icon">
        <v-icon v-if="!data.isCompleted" color="var(--tgc-blue-3)" @click.stop="setAchiStat(true)">
          mdi-circle
        </v-icon>
        <v-icon v-else class="achi-finish" @click.stop="setAchiStat(false)">
          <img alt="finish" src="/UI/app/finish.webp" />
        </v-icon>
      </div>
      <div class="achi-pre-info">
        <div class="achi-pre-info__title">
          <span>{{ data.name }}</span>
          <span v-if="data.progress !== 0" class="achi-pre-info__progress">
            {{ data.progress }}
          </span>
        </div>
        <div class="achi-pre-info__desc">{{ data.description }}</div>
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
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import TSUserAchi from "@Sqlm/userAchi.js";
import { event } from "@tauri-apps/api";
import { timestampToDate } from "@utils/toolFunc.js";
import { ref, toRaw, watch } from "vue";

import { AppAchievementSeriesData } from "@/data/index.js";

type TuaAchiProps = { modelValue: TGApp.App.Achievement.RenderItem };
type TuaAchiEmits = (e: "select-achi", data: TGApp.App.Achievement.RenderItem) => void;

const props = defineProps<TuaAchiProps>();
const emits = defineEmits<TuaAchiEmits>();
const model = defineModel<TGApp.App.Achievement.RenderItem>();
const data = ref<TGApp.App.Achievement.RenderItem>(toRaw(props.modelValue));

watch(
  () => props.modelValue,
  (newVal: TGApp.App.Achievement.RenderItem) => {
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
    model.value = data.value;
    await event.emit("updateAchi", data.value.series);
    showSnackbar.success(`已将成就 ${data.value.name}(${data.value.id}) 状态设为未完成`);
    return;
  }
  let progress = await showDialog.input("请输入成就进度", "进度", data.value.progress.toString());
  if (progress === false) {
    showSnackbar.cancel("已取消成就编辑");
    return;
  }
  if (progress === undefined) progress = data.value.progress.toString();
  if (isNaN(Number(progress))) {
    showSnackbar.warn("请输入有效数字！");
    return;
  }
  data.value.progress = Number(progress);
  data.value.completedTime = timestampToDate(new Date().getTime());
  data.value.isCompleted = true;
  await TSUserAchi.updateAchi(data.value);
  await event.emit("updateAchi", data.value.series);
  showSnackbar.success(`已将成就 ${data.value.name}(${data.value.id}) 状态设为已完成`);
  model.value = data.value;
}
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.achi-container {
  @include github-styles.github-card-shadow;

  position: relative;
  display: flex;
  height: 60px;
  box-sizing: border-box;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-1);
  cursor: pointer;
}

.dark .achi-container {
  @include github-styles.github-card-shadow("dark");
}

.achi-version {
  @include github-styles.github-tag-dark-gen(#fb7299);

  position: absolute;
  top: 0;
  left: 0;
  width: 48px;
  border-top: unset;
  border-left: unset;
  border-bottom-right-radius: 20px;
  border-top-left-radius: 4px;
  font-family: var(--font-title);
  font-size: 10px;
  text-align: center;
}

.achi-pre {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  column-gap: 8px;
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

  &__title {
    display: flex;
    align-items: center;
    column-gap: 4px;
    font-family: var(--font-title);
    font-size: 14px;
  }

  &__desc {
    font-size: 12px;
    opacity: 0.8;
  }

  &__progress {
    @include github-styles.github-tag-dark-gen(#00aeec);

    display: flex;
    height: 18px;
    box-sizing: border-box;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    border-radius: 9px;
    font-family: var(--font-text);
    font-size: 10px;

    &:hover {
      @include github-styles.github-tag-dark-gen(#7ab61f);
    }
  }
}

.achi-append {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  column-gap: 8px;

  :first-child:not(:last-child) {
    color: var(--box-text-4);
    font-size: small;
  }
}

.achi-append-icon {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 4px;
  background-image: url("/icon/bg/5-Star.webp");
  background-size: cover;

  img {
    width: 100%;
    height: 100%;
    flex-shrink: 0;
  }

  span {
    position: absolute;
    bottom: 0;
    left: 0;
    display: flex;
    width: 100%;
    height: 10px;
    align-items: stretch;
    justify-content: center;
    background: #00000080;
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
    color: var(--tgc-white-1);
    font-size: 8px;
  }
}
</style>
