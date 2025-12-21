<!-- 留影叙佳期页面卡片 -->
<template>
  <div class="pac-bc-box">
    <div class="pac-bc-cover" @click="handleClick()">
      <div class="pac-bc-img">
        <TMiImg
          v-if="!props.isAether"
          :alt="item.word_text"
          :ori="true"
          :src="item.unread_picture[0]"
        />
        <TMiImg v-else :alt="item.word_text" :ori="true" :src="item.unread_picture[1]" />
      </div>
      <div class="pac-bc-hide" />
      <v-icon class="pac-bc-icon">mdi-magnify</v-icon>
    </div>
    <div class="pac-bc-info">
      <div class="pac-bc-title">
        <span>{{ item.year }}/{{ item.birthday }}</span>
        <span>{{ item.role_name }}</span>
      </div>
      <div :title="item.word_text" class="pac-bc-desc">{{ item.word_text }}</div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";

type PacBirthCardProps = {
  /** 元数据 */
  item: TGApp.Archive.Birth.DrawItem;
  /**是否为空 */
  isAether: boolean;
};
type PacBirthCardEmits = (e: "open") => void;
const props = defineProps<PacBirthCardProps>();
const emits = defineEmits<PacBirthCardEmits>();

function handleClick(): void {
  emits("open");
}
</script>
<style lang="scss" scoped>
.pac-bc-box {
  position: relative;
  display: flex;
  height: fit-content;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  row-gap: 4px;
  transition: all 0.3s ease-in-out;
}

.pac-bc-cover {
  position: relative;
  overflow: hidden;
  width: 100%;
  max-width: 100%;
  border-radius: 4px;
  aspect-ratio: 125 / 54;
  cursor: pointer;
}

.pac-bc-img {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
}

.pac-bc-hide {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 4px;
  background: var(--common-shadow-t-2);
}

.pac-bc-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  transition: all 0.3s ease-in-out;

  &:hover {
    transform: scale(1.1);
    transition: all 0.3s ease-in-out;
  }
}

.pac-bc-cover:hover {
  img {
    overflow: hidden;
    cursor: pointer;
    transform: scale(1.2);
    transition: all 0.5s ease-in-out;
  }

  .pac-bc-hide {
    background: var(--common-shadow-2);
    cursor: pointer;
    transition: all 0.3s ease-in-out;
  }
}

.pac-bc-info {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.pac-bc-title {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--common-text-title);
  column-gap: 8px;
  font-family: var(--font-title);
  font-size: 16px;
}

.pac-bc-desc {
  position: relative;
  width: fit-content;
  color: var(--tgc-od-white);
  font-size: 14px;
  font-style: italic;
  text-align: center;
}
</style>
