<!-- 含 ugc_master_tag 的 backup_text -->
<template>
  <span class="tut-box">
    {{ tagName }}
  </span>
</template>
<script lang="ts" setup>
import useAppStore from "@store/app.js";
import { str2Color } from "@utils/colorFunc.js";
import { storeToRefs } from "pinia";
import { computed } from "vue";

type TpUgcTag = {
  insert: {
    backup_text: string;
    ugc_master_tag: {
      id: number;
      name: string;
      is_available: boolean;
    };
  };
};
type TpUgcTagProps = { data: TpUgcTag };

const props = defineProps<TpUgcTagProps>();
const { theme } = storeToRefs(useAppStore());
const tagName = computed<string>(() => props.data.insert.ugc_master_tag.name);
const isDarkMode = computed<boolean>(() => theme.value === "dark");
const tagColor = computed<string>(() => tag2Color(tagName.value, isDarkMode.value));
const bgColor = computed<string>(() => `rgba(${tagColor.value.slice(4, -1)}, 0.18)`);

function tag2Color(str: string, isDarkMode: boolean = false): string {
  const adjust = isDarkMode ? 80 : -40;
  return str2Color(str, adjust);
}
</script>
<style lang="scss" scoped>
.tut-box {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  border-radius: 12px;
  margin-right: 4px;
  background: v-bind(bgColor); /* stylelint-disable-line value-keyword-case */
  color: v-bind(tagColor); /* stylelint-disable-line value-keyword-case */
  font-family: var(--font-title);
  font-size: 12px;
  gap: 2px;
}
</style>
