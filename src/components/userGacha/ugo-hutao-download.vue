<!-- 胡桃悬浮层 -->
<template>
  <TOverlay v-model="visible" blur-val="5px">
    <div class="ugo-hutao-download">
      <div class="ugo-hd-title">请选择要下载的数据</div>
      <v-progress-circular v-if="loading" color="var(--tgc-od-blue)" indeterminate />
      <v-item-group v-else v-model="selectedUid" class="ugo-hd-list">
        <v-item
          v-for="(item, idx) in uploadInfo"
          :key="idx"
          v-slot="{ isSelected, toggle }"
          :value="item.uid"
        >
          <div class="ugo-hd-item" @click="toggle">
            <div class="ugo-hdi-check">
              <v-btn :class="{ active: isSelected }" class="ugo-hdi-btn" variant="elevated">
                <v-icon>{{ isSelected ? "mdi-check" : "mdi-checkbox-blank-outline" }}</v-icon>
              </v-btn>
            </div>
            <div class="ugo-hdi-info">
              <span>UID:{{ item.uid }}</span>
              <span>{{ item.cnt }}条</span>
            </div>
          </div>
        </v-item>
      </v-item-group>
      <div class="ugo-hd-acts">
        <v-btn :rounded="true" class="ugo-hdi-btn" @click="visible = false">取消</v-btn>
        <v-btn :rounded="true" class="ugo-hdi-btn" @click="handleSelected()">确定</v-btn>
      </div>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import TOverlay from "@comp/app/t-overlay.vue";
import showSnackbar from "@comp/func/snackbar.js";
import hutao from "@Hutao/index.js";
import useHutaoStore from "@store/hutao.js";
import { storeToRefs } from "pinia";
import { ref, shallowRef, watch } from "vue";

type UgoHutaoDownloadUid = { uid: string; cnt: number };

type UgoHutaoDownloadEmits = (e: "selected", v: Array<string>) => void;

const visible = defineModel<boolean>();
const emits = defineEmits<UgoHutaoDownloadEmits>();
const loading = ref<boolean>(false);
const uploadInfo = shallowRef<Array<UgoHutaoDownloadUid>>([]);
const selectedUid = shallowRef<Array<string>>([]);

const hutaoStore = useHutaoStore();
const { accessToken, isLogin } = storeToRefs(hutaoStore);

watch(
  () => visible.value,
  async () => {
    if (visible.value) {
      loading.value = true;
      selectedUid.value = [];
      uploadInfo.value = [];
      await loadOverview();
      loading.value = false;
    }
  },
  { immediate: true },
);

async function loadOverview(): Promise<void> {
  if (!isLogin.value) return;
  if (!hutaoStore.checkIsValid()) await hutaoStore.tryRefreshToken();
  if (!accessToken.value) return;
  try {
    const info = await hutao.Gacha.entry(accessToken.value);
    if ("retcode" in info) {
      showSnackbar.warn(`[${info.retcode}] ${info.message}`);
      return;
    }
    uploadInfo.value = info.map((i) => ({ uid: i.Uid, cnt: i.ItemCount }));
  } catch (e) {
    console.error(e);
  }
}

function handleSelected(): void {
  if (!selectedUid.value || selectedUid.value.length == 0) {
    showSnackbar.warn("请选择至少一个UID");
    return;
  }
  emits("selected", selectedUid.value);
  visible.value = false;
}
</script>
<style lang="scss" scoped>
.ugo-hutao-download {
  position: relative;
  display: flex;
  width: 400px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 4px;
  background: var(--app-page-bg);
  row-gap: 8px;
}

.ugo-hd-title {
  position: relative;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 18px;
}

.ugo-hd-list {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  max-height: 360px;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  overflow-y: auto;
}

.ugo-hd-item {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  align-items: center;
  justify-content: flex-start;
  column-gap: 8px;
}

.ugo-hdi-info {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;

  span:first-child {
    font-family: var(--font-title);
    font-size: 14px;
    line-height: 16px;
  }

  span:last-child {
    font-size: 12px;
    line-height: 16px;
  }
}

.ugo-hdi-btn {
  height: 40px;
  border: 1px solid var(--common-shadow-2);
  background: var(--tgc-btn-1);
  color: var(--btn-text);
  font-family: var(--font-title);

  &.active {
    color: var(--tgc-od-green);
  }
}

.ugo-hd-acts {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}
</style>
