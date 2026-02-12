<template>
  <div class="tp-vc-box">
    <div class="tp-vc-lock">
      <img src="/UI/app/empty.webp" alt="empty" />
      <span>该功能已下线</span>
    </div>
    <div class="tp-vc-cover">
      <TMiImg :src="props.data.insert.villa_card.villa_cover" :ori="true" alt="bg" />
    </div>
    <div class="tp-vc-info">
      <div class="tp-vci-top">
        <div class="tp-vc-name">{{ props.data.insert.villa_card.villa_name }}</div>
        <span>|</span>
        <div class="tp-vc-owner">
          <TMiImg alt="topIcon" :src="props.data.insert.villa_card.owner_avatar_url" :ori="true" />
          <span>{{ props.data.insert.villa_card.owner_nickname }}</span>
        </div>
      </div>
      <div class="tp-vc-tags">
        <div class="tp-vc-tag">
          <v-icon>mdi-account-group</v-icon>
          <span>{{ props.data.insert.villa_card.villa_member_num }}</span>
        </div>
        <div
          v-for="(tag, index) in props.data.insert.villa_card?.tag_list"
          :key="index"
          class="tp-vc-tag"
        >
          <v-icon>mdi-tag</v-icon>
          <span>{{ tag }}</span>
        </div>
      </div>
      <span class="tp-vc-desc">{{ props.data.insert.villa_card.villa_introduce }}</span>
    </div>
    <div class="tp-vc-icon">
      <TMiImg alt="icon" :src="props.data.insert.villa_card.villa_avatar_url" :ori="true" />
    </div>
  </div>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";

type VillaRoom = {
  room_id: string;
  room_name: string;
  sender_avatar_list: Array<string>;
  sender_num: string;
};
type TpVillaCard = {
  insert: {
    villa_card: {
      villa_id: string;
      villa_name: string;
      villa_avatar_url: string;
      villa_cover: string;
      owner_uid: string;
      owner_nickname: string;
      owner_avatar_url: string;
      villa_introduce?: string;
      tag_list?: Array<string>;
      villa_member_num: string;
      is_official?: boolean;
      is_available: boolean;
      hot_member_avatar?: Array<string>;
      hot_room?: VillaRoom;
    };
  };
};
type TpVillaCardProps = { data: TpVillaCard };

const props = defineProps<TpVillaCardProps>();
console.warn("tpVillaCard[Deprecated]", props.data.insert);
</script>
<style lang="css" scoped>
.tp-vc-box {
  position: relative;
  display: flex;
  overflow: hidden;
  height: 120px;
  box-sizing: border-box;
  align-items: center;
  justify-content: space-between;
  border: 1px solid var(--common-shadow-2);
  border-radius: 10px;
  margin: 10px auto;
}

.tp-vc-lock {
  position: absolute;
  z-index: 2;
  top: 0;
  left: 0;
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(1px);
  background: var(--common-shadow-t-2);
  color: var(--tgc-od-red);
  font-family: var(--font-title);

  img {
    width: 80px;
    height: 80px;
  }
}

.tp-vc-cover {
  position: relative;
  z-index: 1;
  height: 100%;
  opacity: 0.3;

  img {
    height: 100%;
    object-fit: contain;
  }
}

.tp-vc-info {
  position: relative;
  z-index: 1;
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 8px;
  background: var(--box-bg-1);
  opacity: 0.3;
  row-gap: 4px;
}

.tp-vci-top {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 28px;
}

.tp-vc-name {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 20px;
}

.tp-vc-owner {
  display: flex;
  color: var(--common-text-title);
  column-gap: 4px;
}

.tp-vc-owner img {
  width: 28px;
  height: 28px;
  border-radius: 50%;
}

.tp-vc-owner span {
  color: var(--common-text-title);
  font-family: var(--box-text-1);
  font-size: 20px;
}

.tp-vc-tags {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tp-vc-tag {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  border-radius: 5px;
  background: var(--box-bg-2);
  color: var(--tgc-pink-1);
  column-gap: 2px;
  font-family: var(--font-title);
  font-size: 12px;
}

.tp-vc-desc {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  border-radius: 5px;
  margin-top: auto;
  background: var(--box-bg-2);
  color: var(--box-text-1);
}

.tp-vc-icon {
  position: relative;
  z-index: 1;
  height: 100%;
  opacity: 0.3;

  img {
    height: 100%;
    object-fit: contain;
  }
}
</style>
