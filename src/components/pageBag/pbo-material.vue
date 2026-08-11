<!-- 背包材料物品浮窗 -->
<template>
  <TwoMaterial
    v-model="visible"
    :cmh
    :data="props.data.info"
    :shareCaption
    :shareFileName
    :shareScale
    :topOffset
    eyebrow="背包物品"
  >
    <template #left>
      <slot name="left" />
    </template>
    <template #right>
      <slot name="right" />
    </template>
    <template #meta>
      <span v-if="showRecord" class="pbom-count">
        <v-icon size="14">mdi-package-variant-closed</v-icon>
        持有 {{ dbInfo.count }}
      </span>
    </template>
    <template #convert>
      <PboConvert v-for="item in props.data.info.convert" :key="item.id" :data="item" :uid />
    </template>
    <template #after-content>
      <section v-if="showRecord" class="pbom-record-panel">
        <header class="pbom-record-header">
          <v-icon size="18">mdi-clock-edit-outline</v-icon>
          <h3>更新记录</h3>
          <span>{{ dbInfo.records.length }} 条</span>
          <div class="pbom-record-actions" data-html2canvas-ignore="true">
            <v-btn
              density="comfortable"
              prepend-icon="mdi-pencil-outline"
              size="small"
              variant="text"
              @click="tryEdit"
            >
              手动更新
            </v-btn>
            <v-btn
              density="comfortable"
              prepend-icon="mdi-delete-outline"
              size="small"
              variant="text"
              @click="tryDelete"
            >
              删除记录
            </v-btn>
          </div>
        </header>
        <div class="pbom-record-list">
          <div v-for="record in dbInfo.records" :key="record.time" class="pbom-record">
            <time>{{ timestampToDate(record.time * 1000) }}</time>
            <span>{{ record.manual ? "手动更新" : "自动导入" }}</span>
            <strong>{{ record.count }}</strong>
          </div>
          <div v-if="dbInfo.records.length === 0" class="pbom-record-empty">暂无更新记录</div>
        </div>
      </section>
    </template>
  </TwoMaterial>
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import TwoMaterial from "@comp/pageWiki/two-material.vue";
import TSUserBagMaterial, { SKIP_BAG_TYPES } from "@Sqlm/userBagMaterial.js";
import TGLogger from "@utils/TGLogger.js";
import { timestampToDate } from "@utils/toolFunc.js";
import { computed, shallowRef, watch } from "vue";

import PboConvert from "./pbo-convert.vue";

import type { MaterialInfo } from "@/pages/common/PageBagMaterial.vue";

type PboMaterialProps = {
  cmh?: string;
  data: MaterialInfo;
  topOffset?: string;
  uid: number;
};
type PboMaterialEmits = { updateDb: [v: MaterialInfo] };

const props = withDefaults(defineProps<PboMaterialProps>(), {
  cmh: "600px",
  topOffset: "0px",
});
const emits = defineEmits<PboMaterialEmits>();
const visible = defineModel<boolean>();
const showRecord = computed<boolean>(() => !SKIP_BAG_TYPES.includes(props.data.info.type));
const dbInfo = shallowRef<TGApp.Sqlite.UserBag.MaterialTable>(props.data.tb);
const shareCaption = computed<string>(() => `Material ${props.data.info.id} · UID ${props.uid}`);
const shareFileName = computed<string>(
  () => `materialBag_${props.data.info.id}_${dbInfo.value.count}`,
);
const shareScale = computed<number>(() => window.outerWidth / window.innerWidth);

watch(
  [() => props.uid, () => props.data.info.id],
  async () => {
    dbInfo.value = props.data.tb;
    await refreshDb();
  },
  { immediate: true },
);

async function refreshDb(): Promise<void> {
  const uid = props.uid;
  const id = props.data.info.id;
  const list = await TSUserBagMaterial.getMaterial(uid, id);
  if (uid !== props.uid || id !== props.data.info.id) return;
  dbInfo.value = list[0] ?? props.data.tb;
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
  emits("updateDb", { info: props.data.info, tb: dbInfo.value });
  showSnackbar.success("成功更新记录");
}

async function tryDelete(): Promise<void> {
  if (dbInfo.value.records.length === 0) {
    showSnackbar.warn("没有可以删除的记录");
    return;
  }
  if (dbInfo.value.records.length === 1) {
    showSnackbar.warn("最少保留一条记录");
    return;
  }
  const check = await showDialog.check("确定删除？", "删除后仅保留一条记录");
  if (!check) {
    showSnackbar.cancel("取消删除记录");
    return;
  }
  await TGLogger.Info(
    `[pboMaterial][${dbInfo.value.uid}][${dbInfo.value.id}] 删除 ${props.data.info.name} 记录`,
  );
  await TSUserBagMaterial.deleteRecord(props.uid, dbInfo.value.id, dbInfo.value.count);
  await refreshDb();
  emits("updateDb", { info: props.data.info, tb: dbInfo.value });
  showSnackbar.success("成功删除记录");
}
</script>
<style lang="scss" scoped>
.pbom-count {
  display: flex;
  align-items: center;
  padding: 2px 6px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-2);
  color: var(--tgc-od-red);
  column-gap: 4px;
}

.pbom-record-panel {
  display: flex;
  flex-direction: column;
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  gap: 8px;
}

.pbom-record-header {
  display: flex;
  align-items: center;
  color: var(--common-text-title);
  gap: 8px;

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    line-height: 22px;
  }

  > span {
    color: var(--box-text-4);
    font-size: 12px;
    line-height: 16px;
  }
}

.pbom-record-actions {
  display: flex;
  align-items: center;
  margin-left: auto;
  color: var(--box-text-2);
  column-gap: 4px;
}

.pbom-record-list {
  display: flex;
  max-height: 176px;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
}

.pbom-record {
  display: grid;
  align-items: center;
  padding: 8px;
  border-radius: 4px;
  background: var(--box-bg-3);
  color: var(--box-text-2);
  font-size: 12px;
  gap: 12px;
  grid-template-columns: minmax(160px, auto) 1fr auto;
  line-height: 16px;

  time {
    color: var(--box-text-4);
  }

  strong {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-weight: normal;
  }
}

.pbom-record-empty {
  padding: 16px;
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 16px;
  text-align: center;
}
</style>
