<template>
  <div
    class="tua-item-box"
    :style="{
      width: modelValue.size,
      height: modelValue.size,
      cursor: modelValue.clickable ? 'pointer' : 'default',
    }"
  >
    <div
      class="tib-bg"
      :style="{
        width: modelValue.size,
        height: modelValue.size,
      }"
    >
      <img :src="`/icon/bg/${props.modelValue.star}-Star.webp`" alt="bg" />
    </div>
    <div
      class="tib-icon"
      :style="{
        width: modelValue.size,
        height: modelValue.size,
      }"
    >
      <img :src="`/WIKI/${props.modelValue.type}/${props.modelValue.id}.webp`" alt="icon" />
    </div>
    <div
      class="tib-cover"
      :style="{
        width: modelValue.size,
        height: modelValue.size,
      }"
    >
      <div
        class="tib-lt"
        :style="{
          width: modelValue.ltSize,
          height: modelValue.ltSize,
        }"
      >
        <img :src="modelValue.lt" alt="lt" />
      </div>
      <div
        class="tib-rt"
        :style="{
          width: modelValue.rtSize,
          height: modelValue.rtSize,
        }"
      >
        {{ modelValue.rt }}
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
export interface TuaItemBoxType {
  star: number;
  type: "character" | "weapon";
  id: number;
  size: string;
  lt: string;
  ltSize: string;
  rt: string;
  rtSize: string;
  clickable: boolean;
}

interface TuaItemBoxProps {
  modelValue: TuaItemBoxType;
}

const props = defineProps<TuaItemBoxProps>();
</script>
<style lang="css" scoped>
.tua-item-box {
  position: relative;
}

.tib-bg {
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  border-radius: 5px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.tib-icon {
  position: relative;
  overflow: hidden;
  border-radius: 5px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.tib-cover {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
}

.tib-lt {
  position: absolute;
  top: 3%;
  left: 3%;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.tib-rt {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(0 0 0 / 40%);
  border-bottom-left-radius: 5px;
  border-top-right-radius: 5px;
  color: var(--tgc-white-1);
  font-family: var(--font-title);
}
</style>
