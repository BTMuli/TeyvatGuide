<template>
  <div v-html="props.data.insert.table"></div>
</template>
<script lang="ts" setup>
interface TaTableType {
  insert: {
    table: string;
  };
}

interface TaTableProps {
  data: TaTableType;
}

const props = defineProps<TaTableProps>();
</script>
