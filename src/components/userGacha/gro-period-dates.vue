<!-- 祈愿时期日期分段输入 -->
<template>
  <v-input class="gro-pd" density="compact" hide-details>
    <v-field
      :active="isActive"
      :clearable="hasValue"
      :dirty="hasValue"
      :focused="isFocused"
      :label
      density="compact"
      prepend-inner-icon="mdi-calendar-range"
      variant="outlined"
      @click:clear="handleClear"
      @click:prepend-inner="handleOpenCalendar"
    >
      <template #default="{ props: fieldProps }">
        <div
          ref="segmentBox"
          :class="{ 'gro-pd-box--idle': !isActive }"
          class="gro-pd-box"
          v-bind="fieldProps"
          @mousedown.capture="onBoxMouseDown"
        >
          <div class="gro-pd-date">
            <input
              :value="values[0]"
              aria-label="开始年"
              autocomplete="off"
              class="gro-pd-seg gro-pd-seg--year"
              inputmode="numeric"
              maxlength="4"
              placeholder="yyyy"
              spellcheck="false"
              type="text"
              @blur="onSegmentBlur(0, $event)"
              @focus="onSegmentFocus(0)"
              @input="onSegmentInput(0, $event)"
              @keydown="onSegmentKeydown(0, $event)"
              @paste="onSegmentPaste(0, $event)"
            />
            <span class="gro-pd-hyphen">-</span>
            <input
              :value="values[1]"
              aria-label="开始月"
              autocomplete="off"
              class="gro-pd-seg gro-pd-seg--md"
              inputmode="numeric"
              maxlength="2"
              placeholder="mm"
              spellcheck="false"
              type="text"
              @blur="onSegmentBlur(1, $event)"
              @focus="onSegmentFocus(1)"
              @input="onSegmentInput(1, $event)"
              @keydown="onSegmentKeydown(1, $event)"
              @paste="onSegmentPaste(1, $event)"
            />
            <span class="gro-pd-hyphen">-</span>
            <input
              :value="values[2]"
              aria-label="开始日"
              autocomplete="off"
              class="gro-pd-seg gro-pd-seg--md"
              inputmode="numeric"
              maxlength="2"
              placeholder="dd"
              spellcheck="false"
              type="text"
              @blur="onSegmentBlur(2, $event)"
              @focus="onSegmentFocus(2)"
              @input="onSegmentInput(2, $event)"
              @keydown="onSegmentKeydown(2, $event)"
              @paste="onSegmentPaste(2, $event)"
            />
          </div>
          <span class="gro-pd-range">~</span>
          <div class="gro-pd-date">
            <input
              :value="values[3]"
              aria-label="结束年"
              autocomplete="off"
              class="gro-pd-seg gro-pd-seg--year"
              inputmode="numeric"
              maxlength="4"
              placeholder="yyyy"
              spellcheck="false"
              type="text"
              @blur="onSegmentBlur(3, $event)"
              @focus="onSegmentFocus(3)"
              @input="onSegmentInput(3, $event)"
              @keydown="onSegmentKeydown(3, $event)"
              @paste="onSegmentPaste(3, $event)"
            />
            <span class="gro-pd-hyphen">-</span>
            <input
              :value="values[4]"
              aria-label="结束月"
              autocomplete="off"
              class="gro-pd-seg gro-pd-seg--md"
              inputmode="numeric"
              maxlength="2"
              placeholder="mm"
              spellcheck="false"
              type="text"
              @blur="onSegmentBlur(4, $event)"
              @focus="onSegmentFocus(4)"
              @input="onSegmentInput(4, $event)"
              @keydown="onSegmentKeydown(4, $event)"
              @paste="onSegmentPaste(4, $event)"
            />
            <span class="gro-pd-hyphen">-</span>
            <input
              :value="values[5]"
              aria-label="结束日"
              autocomplete="off"
              class="gro-pd-seg gro-pd-seg--md"
              inputmode="numeric"
              maxlength="2"
              placeholder="dd"
              spellcheck="false"
              type="text"
              @blur="onSegmentBlur(5, $event)"
              @focus="onSegmentFocus(5)"
              @input="onSegmentInput(5, $event)"
              @keydown="onSegmentKeydown(5, $event)"
              @paste="onSegmentPaste(5, $event)"
            />
          </div>
        </div>
      </template>
    </v-field>
  </v-input>
</template>
<script lang="ts" setup>
import { formatGachaPeriodDate, parseGachaIsoDate } from "@utils/gachaVersion.js";
import { computed, nextTick, ref, useTemplateRef, watch } from "vue";

type GroPeriodDatesProps = {
  end: string;
  label: string;
  start: string;
};

type DateSegmentKind = "day" | "month" | "year";

const SEGMENT_KINDS: Array<DateSegmentKind> = ["year", "month", "day", "year", "month", "day"];
const SEGMENT_MAX: Array<number> = [4, 2, 2, 4, 2, 2];
const LAST_INDEX = 5;
const SHORT_MONTHS: Array<number> = [4, 6, 9, 11];

const { end, start } = defineProps<GroPeriodDatesProps>();
const emit = defineEmits<{
  clear: [];
  commit: [start: string, end: string];
  openCalendar: [];
}>();

const segmentBox = useTemplateRef<HTMLElement>("segmentBox");
const values = ref<Array<string>>(["", "", "", "", "", ""]);
const isFocused = ref<boolean>(false);
const hasValue = computed<boolean>(() => values.value.some((item) => item !== ""));
const isActive = computed<boolean>(() => isFocused.value || hasValue.value);

watch(
  () => [start, end],
  () => {
    if (isFocused.value) return;
    loadFromProps();
  },
  { immediate: true },
);

function loadFromProps(): void {
  values.value = [...splitIso(start), ...splitIso(end)];
}

function splitIso(iso: string): [string, string, string] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (match === null) return ["", "", ""];
  return [match[1], match[2], match[3]];
}

function getInput(index: number): HTMLInputElement | undefined {
  const input = segmentBox.value?.querySelectorAll("input")[index];
  if (input instanceof HTMLInputElement) return input;
  return undefined;
}

function focusSegment(index: number): void {
  if (index < 0 || index > LAST_INDEX) return;
  void nextTick(() => {
    const input = getInput(index);
    if (input === undefined) return;
    input.focus();
    input.select();
  });
}

function setSegmentValue(index: number, next: string): void {
  const copy = [...values.value];
  copy[index] = next;
  values.value = copy;
}

function onBoxMouseDown(event: MouseEvent): void {
  if (!hasValue.value) {
    event.preventDefault();
    focusSegment(0);
    return;
  }
  if (event.target instanceof HTMLInputElement) return;
  event.preventDefault();
  const emptyIndex = values.value.findIndex((item) => item === "");
  focusSegment(emptyIndex === -1 ? 0 : emptyIndex);
}

function onSegmentFocus(index: number): void {
  isFocused.value = true;
  getInput(index)?.select();
}

function onSegmentBlur(index: number, event: FocusEvent): void {
  padSegment(index);
  const next = event.relatedTarget;
  if (next instanceof Node && segmentBox.value?.contains(next) === true) return;
  isFocused.value = false;
  tryCommit(true);
}

function onSegmentInput(index: number, event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  const kind = SEGMENT_KINDS[index];
  const maxLength = SEGMENT_MAX[index];
  let digits = target.value.replace(/\D/g, "").slice(0, maxLength);
  let shouldJump = false;
  if (kind === "month" && digits.length === 1 && Number(digits) >= 2) {
    digits = digits.padStart(2, "0");
    shouldJump = true;
  }
  if (kind === "day" && digits.length === 1 && Number(digits) >= 4) {
    digits = digits.padStart(2, "0");
    shouldJump = true;
  }
  if (kind === "month" && digits.length === 2) {
    digits = clampMonth(digits);
    shouldJump = true;
  }
  if (kind === "day" && digits.length === 2) {
    digits = clampDay(digits, yearOf(index), monthOf(index));
    shouldJump = true;
  }
  if (kind === "year" && digits.length === 4) shouldJump = true;
  setSegmentValue(index, digits);
  target.value = digits;
  if (!shouldJump) return;
  if (index < LAST_INDEX) {
    focusSegment(index + 1);
    return;
  }
  tryCommit(false);
}

function onSegmentKeydown(index: number, event: KeyboardEvent): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  if (event.key === "Enter") {
    event.preventDefault();
    padSegment(index);
    tryCommit(true);
    return;
  }
  if (event.key === "-" || event.key === "/" || event.key === ".") {
    event.preventDefault();
    padSegment(index);
    focusSegment(index + 1);
    return;
  }
  if (event.key === "ArrowLeft" && target.selectionStart === 0 && target.selectionEnd === 0) {
    event.preventDefault();
    focusSegment(index - 1);
    return;
  }
  if (
    event.key === "ArrowRight" &&
    target.selectionStart === target.value.length &&
    target.selectionEnd === target.value.length
  ) {
    event.preventDefault();
    focusSegment(index + 1);
    return;
  }
  if (event.key !== "Backspace") return;
  if (target.value !== "" && target.selectionStart !== 0) return;
  event.preventDefault();
  if (target.value !== "") {
    setSegmentValue(index, "");
    target.value = "";
    return;
  }
  focusSegment(index - 1);
}

function onSegmentPaste(index: number, event: ClipboardEvent): void {
  const text = event.clipboardData?.getData("text") ?? "";
  const dates = [...text.matchAll(/(\d{4})[-/.]?(\d{1,2})[-/.]?(\d{1,2})/g)];
  if (dates.length === 0) return;
  event.preventDefault();
  const first = toValidIso(dates[0][1], dates[0][2], dates[0][3]);
  if (first === undefined) return;
  const secondRaw = dates[1];
  const second =
    secondRaw === undefined
      ? first
      : (toValidIso(secondRaw[1], secondRaw[2], secondRaw[3]) ?? first);
  applyIsoRange(first, second);
  tryCommit(false);
  focusSegment(index > 2 ? LAST_INDEX : 2);
}

function padSegment(index: number): void {
  const kind = SEGMENT_KINDS[index];
  const current = values.value[index];
  if (current === "" || current.length !== 1) return;
  if (kind !== "month" && kind !== "day") return;
  const padded = current.padStart(2, "0");
  const next =
    kind === "month" ? clampMonth(padded) : clampDay(padded, yearOf(index), monthOf(index));
  setSegmentValue(index, next);
  const input = getInput(index);
  if (input !== undefined) input.value = next;
}

function yearOf(index: number): string {
  if (index === 2) return values.value[0];
  if (index === 5) return values.value[3];
  return "";
}

function monthOf(index: number): string {
  if (index === 2) return values.value[1];
  if (index === 5) return values.value[4];
  return "";
}

function clampMonth(value: string): string {
  const month = Number(value);
  if (!Number.isInteger(month) || month < 1) return "01";
  if (month > 12) return "12";
  return String(month).padStart(2, "0");
}

function maxDayOf(year: string, month: string): number {
  if (month === "02") {
    const y = Number(year);
    if (!Number.isInteger(y)) return 29;
    const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
    return leap ? 29 : 28;
  }
  if (SHORT_MONTHS.includes(Number(month))) return 30;
  return 31;
}

function clampDay(value: string, year: string, month: string): string {
  const day = Number(value);
  if (!Number.isInteger(day) || day < 1) return "01";
  const max = maxDayOf(year, month);
  if (day > max) return String(max).padStart(2, "0");
  return String(day).padStart(2, "0");
}

function toValidIso(year: string, month: string, day: string): string | undefined {
  const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const date = parseGachaIsoDate(iso);
  if (date === undefined) return undefined;
  if (formatGachaPeriodDate(date) !== iso) return undefined;
  return iso;
}

function buildIso(offset: number): string | undefined {
  const year = values.value[offset];
  const month = values.value[offset + 1];
  const day = values.value[offset + 2];
  if (year === "" && month === "" && day === "") return "";
  if (year.length !== 4 || month.length !== 2 || day.length !== 2) return undefined;
  return toValidIso(year, month, day);
}

function tryCommit(revertIfInvalid: boolean): void {
  const startIso = buildIso(0);
  const endIso = buildIso(3);
  if (startIso === "" && endIso === "") {
    if (start !== "" || end !== "") emit("clear");
    return;
  }
  if (startIso === undefined || endIso === undefined || startIso === "") {
    if (revertIfInvalid) loadFromProps();
    return;
  }
  const resolvedEnd = endIso === "" ? startIso : endIso;
  const first = startIso <= resolvedEnd ? startIso : resolvedEnd;
  const last = startIso <= resolvedEnd ? resolvedEnd : startIso;
  emit("commit", first, last);
}

function applyIsoRange(first: string, last: string): void {
  values.value = [...splitIso(first), ...splitIso(last)];
}

function handleClear(): void {
  values.value = ["", "", "", "", "", ""];
  emit("clear");
}

function handleOpenCalendar(): void {
  emit("openCalendar");
}
</script>
<style lang="scss" scoped>
.gro-pd {
  width: 100%;
  flex: none;
}

.gro-pd-box {
  display: flex;
  min-width: 0;
  flex-wrap: nowrap;
  align-items: center;
  gap: 4px;
}

.gro-pd-box--idle {
  opacity: 0;
}

.gro-pd-date {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0;
}

.gro-pd-seg {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0;
  line-height: 16px;
  outline: none;
  text-align: center;

  &--year {
    width: 4ch;
  }

  &--md {
    width: 2.2ch;
  }

  &::placeholder {
    color: var(--box-text-4);
    opacity: 0.8;
  }
}

.gro-pd-hyphen,
.gro-pd-range {
  flex-shrink: 0;
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 16px;
}

.gro-pd-range {
  padding: 0 2px;
}
</style>
