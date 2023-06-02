<template>
  <div class="tuao-box">
    <div class="tuao-title">
      <slot name="title">
        {{ props.title }}
      </slot>
    </div>
    <div v-if="props.valText" class="tuao-val-text">
      <slot name="val-text">
        {{ props.valText }}
      </slot>
    </div>
    <div v-if="props.valIcons" class="tuao-val-icons">
      <slot name="val-icons">
        <TibAbyssOverview
          v-for="avatar in JSON.parse(props.valIcons) as TGApp.Sqlite.Abyss.Character[]"
          :key="avatar.id" :model-value="avatar"
        />
      </slot>
    </div>
  </div>
</template>
<script lang="ts" setup>
// vue
import TibAbyssOverview from "../itembox/tib-abyss-overview.vue";

interface TAOProps {
  title: string,
  valText?: string | number,
  valIcons?: string,
  iconNum: number,
}

const props = withDefaults(defineProps<TAOProps>(), {
  iconNum: 1,
});
</script>
<style lang="css" scoped>
.tuao-box {
  width: 33%;
  height: auto;
  padding: 10px;
  margin-bottom: 10px;
  border-radius: 5px;
  background: rgb(0 0 0 / 10%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.tuao-title {
  font-family: Genshin, serif;
  font-size: 20px;
  color: rgb(255 255 255 / 80%);
  text-shadow: 0 0 10px rgb(0 0 0 / 80%);
}

.tuao-val-text {
  font-family: Genshin-Light, serif;
  font-size: 20px;
  font-weight: bold;
  margin-top: 10px;
  color: rgb(255 255 255 / 80%);
  text-shadow: #fec90b 0 0 5px;
}

.tuao-val-icons {
  display: grid;
  grid-template-columns: repeat(v-bind(iconNum), 1fr);
  column-gap: 10px;
}
</style>
