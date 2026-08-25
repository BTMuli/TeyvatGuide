<!-- 角色详情，TPS武器 -->
<template>
  <div class="tua-dcpw-box" @click="console.log(props.weapon)">
    <div class="tua-dcpw-left">
      <div class="tua-dcpw-li">
        <div class="tua-dcpw-lil">
          <span class="tua-dcpw-name">{{ props.weapon.weapon_name }}</span>
          <span class="tua-dcpw-type">{{ typeLabel }}</span>
        </div>
        <div class="tua-dcpw-lir">
          <div class="tua-dcpw-elements">
            <template v-for="element in elementList" :key="element.id">
              <img
                v-if="element.icon !== ''"
                :alt="element.label"
                :src="element.icon"
                class="tua-dcpw-element"
              />
              <span v-else class="tua-dcpw-element">{{ element.label }}</span>
            </template>
          </div>
          <div v-if="props.weapon.slot !== 2" class="tua-dcpw-access">
            <span
              v-for="dot in accessDots"
              :key="dot"
              :class="{ active: dot <= unlockInfo }"
              class="tua-dcpw-dot"
            />
          </div>
        </div>
      </div>
      <img
        :alt="props.weapon.weapon_name"
        :class="`slot${props.weapon.slot}`"
        :src="props.weapon.weapon_icon"
      />
    </div>
    <div class="tua-dcpw-right">
      <div
        v-for="(prop, idx) in props.weapon.weapon_properties"
        :key="idx"
        :class="{ main: prop.is_main }"
        class="tua-dcpw-prop"
      >
        <span>{{ prop.property_name }}</span>
        <span>{{ prop.property_value }}</span>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed } from "vue";

const TpsWeaponElementMap = new Map<number, string>([
  [1, "火"],
  [2, "水"],
  [3, "风"],
  [4, "雷"],
  [5, "冰"],
  [6, "草"],
  [7, "岩"],
]);
const TpsWeaponTypeMap = new Map<string, string>([
  ["WeaponTypeRifle", "突击步枪"],
  ["WeaponTypeGrenadeLauncher", "榴弹发射器"],
  ["WeaponTypeGrenade", "榴晶"],
]);

type TuaDcpWeaponProps = { weapon: TGApp.Game.Avatar.TpsWeapon };
type TpsWeaponElementItem = { id: number; label: string; icon: string };

const props = defineProps<TuaDcpWeaponProps>();

const elementList = computed<Array<TpsWeaponElementItem>>(() =>
  props.weapon.element_type.map((element) => {
    const label = TpsWeaponElementMap.get(element);
    return {
      id: element,
      label: label ?? "未知",
      icon: label === undefined ? "" : `/icon/element/${label}元素.webp`,
    };
  }),
);
const typeLabel = computed<string>(() => {
  const label = TpsWeaponTypeMap.get(props.weapon.weapon_type);
  return label ?? props.weapon.weapon_type;
});
const unlockInfo = computed<number>(() => props.weapon.accessory_unlock_info.unlock_info);
const accessDots = computed<Array<number>>(() =>
  Array.from(
    { length: props.weapon.accessory_unlock_info.unlock_info_max },
    (_, index) => index + 1,
  ),
);
</script>
<style lang="scss" scoped>
.tua-dcpw-box {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  border: 1px solid #ffffff33;
  border-radius: 4px;
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  background: #0000001c;
  color: var(--tgc-white-1);
  column-gap: 8px;
  font-size: 12px;
}

.tua-dcpw-left {
  position: relative;
  display: flex;
  width: 200px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  row-gap: 4px;

  img {
    &.slot1 {
      width: 160px;
      transform: translateY(12px);
    }

    &.slot2 {
      width: 40px;
    }
  }
}

.tua-dcpw-li {
  position: absolute;
  z-index: 1;
  top: 0;
  left: 0;
  display: flex;
  width: 100%;
  align-items: flex-start;
  justify-content: space-between;
  column-gap: 4px;
}

.tua-dcpw-lil {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;

  .tua-dcpw-name {
    overflow: hidden;
    width: 100%;
    color: var(--tgc-white-1);
    font-family: var(--font-title);
    font-size: 14px;
    font-weight: normal;
    line-height: 18px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tua-dcpw-type {
    overflow: hidden;
    width: 100%;
    color: var(--tgc-od-white);
    font-size: 12px;
    line-height: 16px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.tua-dcpw-lir {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  row-gap: 4px;
}

.tua-dcpw-elements {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
}

.tua-dcpw-element {
  display: flex;
  width: 16px;
  height: 16px;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  color: var(--tgc-white-1);
  font-size: 10px;
  object-fit: contain;
}

.tua-dcpw-access {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  column-gap: 2px;
}

.tua-dcpw-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffffff33;

  &.active {
    background: var(--tgc-white-1);
  }
}

.tua-dcpw-right {
  position: relative;
  display: flex;
  width: 200px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
}

.tua-dcpw-prop {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding: 4px;
  border-radius: 2px;

  &.main {
    background: #ffffff1c;
  }

  :last-child {
    font-family: var(--font-title);
    font-weight: normal;
  }
}
</style>
