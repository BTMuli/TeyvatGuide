<template>
  <div aria-label="文字颜色" class="tgpe-color-panel" role="dialog">
    <div class="tgpe-color-head">
      <span class="tgpe-color-title">文字颜色</span>
      <div class="tgpe-color-value">
        <span
          aria-hidden="true"
          class="tgpe-color-preview"
          :style="{ backgroundColor: draftColor }"
        />
        <input
          ref="hexInputElement"
          :value="hexInput"
          aria-label="文字颜色十六进制值"
          autocomplete="off"
          class="tgpe-color-hex"
          maxlength="7"
          spellcheck="false"
          type="text"
          @blur="handleHexBlur"
          @input="handleHexInput"
          @keydown.enter.prevent="handleHexEnter"
        />
      </div>
    </div>
    <div
      ref="svArea"
      aria-hidden="true"
      class="tgpe-color-sv"
      :style="{ backgroundColor: hueColor }"
      @pointercancel="handleSvPointerUp"
      @pointerdown="handleSvPointerDown"
      @pointermove="handleSvPointerMove"
      @pointerup="handleSvPointerUp"
    >
      <span
        class="tgpe-color-sv-thumb"
        :style="{
          backgroundColor: draftColor,
          left: saturationPosition + '%',
          top: valuePosition + '%',
        }"
      />
    </div>
    <div
      ref="hueTrack"
      :aria-valuenow="Math.round(hue)"
      :aria-valuetext="Math.round(hue) + ' 度'"
      aria-label="色相"
      aria-valuemax="360"
      aria-valuemin="0"
      class="tgpe-color-hue"
      role="slider"
      tabindex="0"
      @keydown="handleHueKeydown"
      @pointercancel="handleHuePointerUp"
      @pointerdown="handleHuePointerDown"
      @pointermove="handleHuePointerMove"
      @pointerup="handleHuePointerUp"
    >
      <span
        class="tgpe-color-hue-thumb"
        :style="{ backgroundColor: hueColor, left: huePosition + '%' }"
      />
    </div>
    <div class="tgpe-color-presets">
      <span class="tgpe-color-presets-title">快捷取色</span>
      <div aria-label="快捷取色" class="tgpe-color-grid" role="group">
        <button
          v-for="color in presetColors"
          :key="color"
          :aria-label="'使用颜色 ' + color.toUpperCase()"
          :aria-pressed="isPresetActive(color)"
          :style="{ backgroundColor: color }"
          :title="color.toUpperCase()"
          class="tgpe-color-cell"
          type="button"
          @click="selectPreset(color)"
        />
      </div>
    </div>
    <div class="tgpe-color-actions">
      <v-btn size="small" variant="text" @click="handleCancel">取消</v-btn>
      <v-btn
        color="var(--tgc-btn-1)"
        size="small"
        type="button"
        variant="flat"
        @click="handleConfirm"
        >确认</v-btn
      >
    </div>
  </div>
</template>

<script lang="ts" setup>
import { hexToHsv, hsvToHex, normalizeHexColor } from "@utils/display/colorFunc.js";
import { computed, ref, useTemplateRef, watch } from "vue";

type PostColorPickerProps = {
  /** 展开弹层时正在使用的文字颜色。 */
  initialColor: string;
};

const { initialColor } = defineProps<PostColorPickerProps>();
const emits = defineEmits<{
  confirm: [color: string];
  cancel: [];
}>();

const presetColors: ReadonlyArray<string> = [
  "#ffffff",
  "#fca5a5",
  "#fdba74",
  "#fcd34d",
  "#86efac",
  "#5eead4",
  "#93c5fd",
  "#a5b4fc",
  "#d8b4fe",
  "#f9a8d4",
  "#9ca3af",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#111827",
  "#b91c1c",
  "#c2410c",
  "#b45309",
  "#15803d",
  "#0f766e",
  "#1d4ed8",
  "#4338ca",
  "#7e22ce",
  "#be185d",
];

// 弹层每次展开都会重新挂载，因此初始化时固定当前颜色。
const initial = normalizeHexColor(initialColor) ?? "#000000";
const initialHsv = hexToHsv(initial);
const hue = ref<number>(initialHsv.h);
const saturation = ref<number>(initialHsv.s);
const value = ref<number>(initialHsv.v);
const hexInput = ref<string>(initial.toUpperCase());
const svArea = useTemplateRef<HTMLDivElement>("svArea");
const hueTrack = useTemplateRef<HTMLDivElement>("hueTrack");
const hexInputElement = useTemplateRef<HTMLInputElement>("hexInputElement");
let svPointerId: number | undefined;
let huePointerId: number | undefined;

const draftColor = computed<string>(() =>
  hsvToHex({ h: hue.value, s: saturation.value, v: value.value }),
);
const hueColor = computed<string>(() => hsvToHex({ h: hue.value, s: 1, v: 1 }));
const huePosition = computed<number>(() => (hue.value / 360) * 100);
const saturationPosition = computed<number>(() => saturation.value * 100);
const valuePosition = computed<number>(() => (1 - value.value) * 100);

watch(draftColor, (color) => {
  if (document.activeElement === hexInputElement.value) return;
  hexInput.value = color.toUpperCase();
});

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function setColorFromHex(color: string): void {
  const next = hexToHsv(color);
  if (next.s > 0) hue.value = next.h;
  saturation.value = next.s;
  value.value = next.v;
}

function isPresetActive(color: string): boolean {
  return draftColor.value === color;
}

function selectPreset(color: string): void {
  setColorFromHex(color);
  hexInput.value = color.toUpperCase();
}

function handleHexInput(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  hexInput.value = target.value;
  const color = normalizeHexColor(target.value);
  if (color) setColorFromHex(color);
}

function handleHexBlur(): void {
  const color = normalizeHexColor(hexInput.value);
  if (!color) {
    hexInput.value = draftColor.value.toUpperCase();
    return;
  }
  setColorFromHex(color);
  hexInput.value = color.toUpperCase();
}

function handleHexEnter(): void {
  handleHexBlur();
}

function syncHexInput(): void {
  hexInput.value = draftColor.value.toUpperCase();
}

function updateSvFromPointer(event: PointerEvent): void {
  const area = svArea.value;
  if (!area) return;
  const rect = area.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;
  saturation.value = clamp((event.clientX - rect.left) / rect.width, 0, 1);
  value.value = clamp(1 - (event.clientY - rect.top) / rect.height, 0, 1);
  syncHexInput();
}

function handleSvPointerDown(event: PointerEvent): void {
  if (event.button !== 0) return;
  svPointerId = event.pointerId;
  svArea.value?.setPointerCapture(event.pointerId);
  updateSvFromPointer(event);
}

function handleSvPointerMove(event: PointerEvent): void {
  if (event.pointerId !== svPointerId) return;
  updateSvFromPointer(event);
}

function handleSvPointerUp(event: PointerEvent): void {
  if (event.pointerId !== svPointerId) return;
  svPointerId = undefined;
  const area = svArea.value;
  if (area?.hasPointerCapture(event.pointerId)) area.releasePointerCapture(event.pointerId);
}

function updateHueFromPointer(event: PointerEvent): void {
  const track = hueTrack.value;
  if (!track) return;
  const rect = track.getBoundingClientRect();
  if (rect.width <= 0) return;
  hue.value = clamp((event.clientX - rect.left) / rect.width, 0, 1) * 360;
  syncHexInput();
}

function handleHuePointerDown(event: PointerEvent): void {
  if (event.button !== 0) return;
  huePointerId = event.pointerId;
  hueTrack.value?.setPointerCapture(event.pointerId);
  updateHueFromPointer(event);
}

function handleHuePointerMove(event: PointerEvent): void {
  if (event.pointerId !== huePointerId) return;
  updateHueFromPointer(event);
}

function handleHuePointerUp(event: PointerEvent): void {
  if (event.pointerId !== huePointerId) return;
  huePointerId = undefined;
  const track = hueTrack.value;
  if (track?.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
}

function handleHueKeydown(event: KeyboardEvent): void {
  const step = event.shiftKey ? 10 : 1;
  let next: number;
  switch (event.key) {
    case "ArrowLeft":
    case "ArrowDown":
      next = hue.value - step;
      break;
    case "ArrowRight":
    case "ArrowUp":
      next = hue.value + step;
      break;
    case "Home":
      next = 0;
      break;
    case "End":
      next = 360;
      break;
    default:
      return;
  }
  event.preventDefault();
  hue.value = clamp(next, 0, 360);
  syncHexInput();
}

function handleConfirm(): void {
  handleHexBlur();
  emits("confirm", draftColor.value);
}

function handleCancel(): void {
  emits("cancel");
}
</script>

<style lang="scss" scoped>
.tgpe-color-panel {
  display: flex;
  width: 300px;
  max-width: calc(100vw - 24px);
  box-sizing: border-box;
  flex-direction: column;
  padding: 12px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 12px;
  background: var(--app-page-bg);
  box-shadow: 0 8px 24px var(--common-shadow-2);
  gap: 12px;
}

.dark .tgpe-color-panel {
  box-shadow: 0 8px 24px var(--common-shadow-t-4);
}

.tgpe-color-head {
  display: flex;
  min-height: 28px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.tgpe-color-title {
  color: var(--common-text-title);
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
}

.tgpe-color-value {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tgpe-color-preview {
  width: 20px;
  height: 20px;
  box-sizing: border-box;
  flex: none;
  border: 1px solid var(--common-shadow-2);
  border-radius: 4px;
}

.tgpe-color-hex {
  width: 82px;
  height: 28px;
  box-sizing: border-box;
  padding: 0 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-2);
  color: var(--app-page-content);
  font-family: var(--font-text);
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.tgpe-color-hex:focus-visible {
  border-color: var(--common-text-title);
  outline: 2px solid var(--common-text-title);
  outline-offset: 0;
}

.tgpe-color-sv {
  position: relative;
  overflow: hidden;
  width: 100%;
  border-radius: 4px;
  aspect-ratio: 16 / 9;
  background-image:
    linear-gradient(to top, #000000ff, #00000000), linear-gradient(to right, #ffffffff, #ffffff00);
  cursor: crosshair;
  touch-action: none;
  user-select: none;
}

.tgpe-color-sv-thumb {
  position: absolute;
  width: 16px;
  height: 16px;
  border: 2px solid #ffffffff;
  border-radius: 50%;
  box-shadow:
    0 0 0 1px rgb(0 0 0 / 35%),
    0 1px 3px rgb(0 0 0 / 30%);
  pointer-events: none;
  transform: translate(-50%, -50%);
}

.tgpe-color-hue {
  position: relative;
  height: 12px;
  border-radius: 4px;
  background: linear-gradient(
    to right,
    #ff0000ff 0%,
    #ffff00ff 17%,
    #00ff00ff 33%,
    #00ffffff 50%,
    #0000ffff 67%,
    #ff00ffff 83%,
    #ff0000ff 100%
  );
  cursor: pointer;
  touch-action: none;
  user-select: none;
}

.tgpe-color-hue:focus-visible {
  outline: 2px solid var(--common-text-title);
  outline-offset: 2px;
}

.tgpe-color-hue-thumb {
  position: absolute;
  top: 50%;
  width: 16px;
  height: 16px;
  border: 2px solid #ffffffff;
  border-radius: 50%;
  box-shadow:
    0 0 0 1px rgb(0 0 0 / 35%),
    0 1px 3px rgb(0 0 0 / 30%);
  pointer-events: none;
  transform: translate(-50%, -50%);
}

.tgpe-color-presets {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tgpe-color-presets-title {
  color: var(--box-text-2);
  font-size: 12px;
  line-height: 16px;
}

.tgpe-color-grid {
  display: grid;
  gap: 4px;
  grid-template-columns: repeat(10, minmax(0, 1fr));
}

.tgpe-color-cell {
  min-width: 0;
  padding: 0;
  border: 0;
  border-radius: 4px;
  aspect-ratio: 1 / 1;
  box-shadow: inset 0 0 0 1px var(--common-shadow-1);
  cursor: pointer;
}

.tgpe-color-cell:hover,
.tgpe-color-cell[aria-pressed="true"] {
  outline: 2px solid var(--common-text-title);
  outline-offset: 1px;
}

.tgpe-color-cell:focus-visible {
  outline: 2px solid var(--common-text-title);
  outline-offset: 2px;
}

.tgpe-color-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
}
</style>
