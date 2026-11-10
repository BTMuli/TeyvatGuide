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
    :eyebrow
  >
    <template #left>
      <slot name="left" />
    </template>
    <template #right>
      <slot name="right" />
    </template>
    <template v-if="slots.footer" #footer>
      <slot name="footer" />
    </template>
    <template #meta>
      <span v-if="showRecord" class="pbom-count">
        <v-icon size="14">mdi-package-variant-closed</v-icon>
        持有 {{ fmtUtil.num(dbInfo.count) }}
      </span>
    </template>
    <template #convert>
      <PboConvert v-for="item in props.data.info.convert" :key="item.id" :data="item" :uid />
    </template>
    <template #after-content>
      <slot name="before-record" />
      <section v-if="showRecord" class="pbom-record-panel">
        <header class="pbom-record-header">
          <v-icon size="18">mdi-clock-edit-outline</v-icon>
          <h3>更新记录</h3>
          <span>{{ records.length }} 条</span>
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
              color="var(--tgc-od-red)"
              density="comfortable"
              prepend-icon="mdi-delete-outline"
              size="small"
              variant="text"
              @click="tryDelete"
            >
              清理记录
            </v-btn>
          </div>
        </header>
        <div v-if="records.length > 5" class="pbom-chart-controls" data-html2canvas-ignore="true">
          <v-btn-toggle
            v-model="showRecordDiff"
            :mandatory="true"
            aria-label="材料记录图表"
            class="pbom-chart-toggle"
            color="var(--tgc-od-orange)"
            density="compact"
            variant="outlined"
          >
            <v-btn :value="false" aria-label="数量折线图" size="small" title="数量折线图">
              <v-icon size="16">mdi-chart-line</v-icon>
            </v-btn>
            <v-btn :value="true" aria-label="数量变化图" size="small" title="数量变化图">
              <v-icon size="16">mdi-chart-bar</v-icon>
            </v-btn>
          </v-btn-toggle>
          <v-btn-toggle
            v-model="showRecordDaily"
            :mandatory="true"
            aria-label="记录统计方式"
            class="pbom-chart-toggle"
            color="var(--tgc-od-orange)"
            density="compact"
            variant="outlined"
          >
            <v-btn :value="false" size="small" title="按每次导入记录展示">按次数</v-btn>
            <v-btn :value="true" size="small" title="每天保留最后一次库存">按天</v-btn>
          </v-btn-toggle>
          <v-btn-toggle
            v-if="showRecordDiff"
            v-model="useRecordLogScale"
            :mandatory="true"
            aria-label="变化图刻度"
            class="pbom-chart-toggle"
            color="var(--tgc-od-orange)"
            density="compact"
            variant="outlined"
          >
            <v-btn :value="false" size="small" title="线性刻度">线性</v-btn>
            <v-btn :value="true" size="small" title="带符号的对数刻度">对数</v-btn>
          </v-btn-toggle>
        </div>
        <PbMaterialRecordChart
          v-if="records.length > 5"
          :daily="showRecordDaily"
          :diff="showRecordDiff"
          :logScale="useRecordLogScale"
          :records
          @select-record="tryDeleteRecord"
        />
        <div v-else class="pbom-record-list">
          <div v-for="record in records" :key="record.time" class="pbom-record">
            <time>{{ fmtUtil.dateTime(record.time * 1000) }}</time>
            <span>{{ record.manual ? "手动更新" : "自动导入" }}</span>
            <strong>{{ fmtUtil.num(record.count) }}</strong>
            <v-btn
              :aria-label="'删除 ' + fmtUtil.dateTime(record.time * 1000) + ' 的记录'"
              :disabled="records.length <= 1 || deletingRecordTime !== undefined"
              :loading="deletingRecordTime === record.time"
              :title="records.length <= 1 ? '至少保留一条记录' : '删除这条记录'"
              color="var(--tgc-od-red)"
              data-html2canvas-ignore="true"
              icon="mdi-delete-outline"
              size="x-small"
              variant="text"
              @click="tryDeleteRecord(record)"
            />
          </div>
          <div v-if="records.length === 0" class="pbom-record-empty">暂无更新记录</div>
        </div>
      </section>
    </template>
  </TwoMaterial>
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import TwoMaterial from "@comp/pageWiki/two-material.vue";
import TSUserBagMaterial, { isTrackableBagMaterial } from "@Sqlm/userBagMaterial.js";
import fmtUtil from "@utils/display/fmtUtil.js";
import { maskUid } from "@utils/display/TGUid.js";
import TGLogger from "@utils/system/TGLogger.js";
import { computed, shallowRef, useSlots, watch } from "vue";

import PbMaterialRecordChart from "./pb-material-record-chart.vue";
import PboConvert from "./pbo-convert.vue";

import type { MaterialInfo } from "@/pages/common/PageBagMaterial.vue";

type PboMaterialProps = {
  /** 内容最大高度 */
  cmh?: string;
  data: MaterialInfo;
  /** 分享署名眉标 */
  eyebrow?: string;
  /** 覆盖默认分享署名（不含 eyebrow 前缀） */
  shareCaption?: string;
  topOffset?: string;
  uid: number;
};
type PboMaterialEmits = { updateDb: [v: MaterialInfo] };

const props = withDefaults(defineProps<PboMaterialProps>(), {
  cmh: "600px",
  eyebrow: "背包物品",
  topOffset: "0px",
});
const emits = defineEmits<PboMaterialEmits>();
const visible = defineModel<boolean>();
const slots = useSlots();
const showRecord = computed<boolean>(() => isTrackableBagMaterial(props.data.info));
const dbInfo = shallowRef<TGApp.Sqlite.UserBag.MaterialTable>(props.data.tb);
const records = shallowRef<Array<TGApp.Sqlite.UserBag.MaterialRecord>>([]);
const showRecordDiff = shallowRef<boolean>(false);
const showRecordDaily = shallowRef<boolean>(false);
const useRecordLogScale = shallowRef<boolean>(true);
const deletingRecordTime = shallowRef<number>();
let dbLoadVersion = 0;

defineSlots<{
  "before-record"?: () => unknown;
  footer?: () => unknown;
  left?: () => unknown;
  right?: () => unknown;
}>();
const shareCaption = computed<string>(
  () => props.shareCaption ?? `Material ${props.data.info.id} · UID ${maskUid(props.uid)}`,
);
const shareFileName = computed<string>(
  () => `materialBag_${props.data.info.id}_${dbInfo.value.count}`,
);
const shareScale = computed<number>(() => window.outerWidth / window.innerWidth);

watch(
  [visible, () => props.uid, () => props.data.info.id],
  async (_value, _oldValue, onCleanup) => {
    onCleanup(() => {
      dbLoadVersion++;
    });
    dbInfo.value = props.data.tb;
    records.value = [];
    if (visible.value && showRecord.value) await refreshDb();
  },
  { immediate: true },
);

async function refreshDb(): Promise<void> {
  const loadVersion = ++dbLoadVersion;
  const uid = props.uid;
  const id = props.data.info.id;
  const [list, materialRecords] = await Promise.all([
    TSUserBagMaterial.getMaterial(uid, id),
    TSUserBagMaterial.getRecords(uid, id),
  ]);
  if (
    loadVersion !== dbLoadVersion ||
    uid !== props.uid ||
    id !== props.data.info.id ||
    !visible.value
  ) {
    return;
  }
  dbInfo.value = list[0] ?? props.data.tb;
  records.value = materialRecords;
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
    true,
  );
  await refreshDb();
  emits("updateDb", { info: props.data.info, tb: dbInfo.value });
  showSnackbar.success("成功更新记录");
}

async function tryDeleteRecord(record: TGApp.Sqlite.UserBag.MaterialRecord): Promise<void> {
  if (deletingRecordTime.value !== undefined) return;
  if (records.value.length <= 1) {
    showSnackbar.warn("最少保留一条记录");
    return;
  }
  const uid = props.uid;
  const id = props.data.info.id;
  const text = [
    fmtUtil.dateTime(record.time * 1000) + " · 数量 " + fmtUtil.num(record.count),
    "不影响当前库存。",
  ].join("\n");
  deletingRecordTime.value = record.time;
  try {
    const check = await showDialog.check("删除这条记录？", text);
    if (!check) return;
    const deleted = await TSUserBagMaterial.deleteSingleRecord(uid, id, record.time);
    if (uid !== props.uid || id !== props.data.info.id || !visible.value) return;
    await refreshDb();
    if (deleted) showSnackbar.success("已删除这条记录");
    else showSnackbar.warn("记录已不存在或只剩最后一条记录");
  } catch (error) {
    await TGLogger.Error("[pboMaterial][deleteSingleRecord] " + String(error));
    showSnackbar.error("删除记录失败，请重试");
  } finally {
    deletingRecordTime.value = undefined;
  }
}

async function tryDelete(): Promise<void> {
  if (records.value.length === 0) {
    showSnackbar.warn("没有可以删除的记录");
    return;
  }
  if (records.value.length === 1) {
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
  flex-wrap: wrap;
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

.pbom-chart-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.pbom-chart-toggle.v-btn-toggle {
  height: 28px;
  flex: 0 0 auto;
  border-radius: 4px;
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
  grid-template-columns: minmax(160px, auto) 1fr auto auto;
  line-height: 16px;
  white-space: nowrap;

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
