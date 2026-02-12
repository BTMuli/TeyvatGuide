<!-- 月谕圣牌浮窗 -->
<template>
  <TOverlay v-model="visible">
    <div v-if="data" :class="{ share: isShare }" class="tuc-ovt-box">
      <div class="tuc-ovt-top">
        <div class="tuc-ovt-title" @click="share()">月谕圣牌</div>
        <div class="tuc-ovt-append">
          <span>已解锁：</span>
          <span>{{ finish }}/{{ total }}</span>
        </div>
      </div>
      <div class="tuc-ovt-list">
        <TucOvtItem v-for="(item, index) in data.list" :key="index" :item />
      </div>
      <div class="tuc-ovt-share">
        <span>UID {{ props.uid }}</span>
        <span>|</span>
        <span>TeyvatGuide v{{ version }}</span>
      </div>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import TOverlay from "@comp/app/t-overlay.vue";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import TucOvtItem from "@comp/userCombat/tuc-ovt-item.vue";
import { getVersion } from "@tauri-apps/api/app";
import { generateShareImg } from "@utils/TGShare.js";
import { computed, nextTick, onMounted, ref } from "vue";

type TucOvTarotProps = { data: TGApp.Game.Combat.TarotState | undefined; uid: string | undefined };

const visible = defineModel<boolean>();
const props = defineProps<TucOvTarotProps>();

const isShare = ref<boolean>(false);
const version = ref<string>("");
const finish = computed<number>(() => props.data?.curr_num ?? 0);
const total = computed(() => props.data?.total_num ?? 22);

onMounted(async () => {
  version.value = await getVersion();
});

async function share(): Promise<void> {
  const element = document.querySelector<HTMLElement>(".tuc-ovt-box");
  if (element === null) {
    showSnackbar.warn("未获取到分享内容");
    return;
  }
  const fileName = `月谕圣牌_${props.uid}_${new Date().getTime()}.png`;
  await showLoading.start("正在生成分享图", fileName);
  isShare.value = true;
  await nextTick();
  await generateShareImg(fileName, element, 1.2, true);
  isShare.value = false;
  await showLoading.end();
}
</script>
<style lang="scss" scoped>
.tuc-ovt-box {
  position: relative;
  display: flex;
  width: 800px;
  max-height: 600px;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 8px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 4px;
  background: var(--app-page-bg);
  gap: 8px;

  &.share {
    overflow-y: auto;

    .tuc-ovt-list {
      overflow-y: unset;
    }
  }
}

.tuc-ovt-top {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
}

.tuc-ovt-title {
  position: relative;
  cursor: pointer;
  font-family: var(--font-title);
  font-size: 20px;
}

.tuc-ovt-append {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 8px;
}

.tuc-ovt-list {
  position: relative;
  display: grid;
  width: 100%;
  padding-right: 4px;
  gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  overflow-y: auto;
}

.tuc-ovt-share {
  position: absolute;
  z-index: -1;
  right: 4px;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 2px;
  font-size: 12px;
}
</style>
