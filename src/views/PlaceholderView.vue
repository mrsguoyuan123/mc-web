<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const title = computed(() => route.meta.title || '功能模块')
const forbidden = computed(() => route.name === 'forbidden')
</script>

<template>
  <div class="page-panel placeholder-panel">
    <el-result
      :icon="forbidden ? 'warning' : 'info'"
      :title="forbidden ? '暂无访问权限' : title"
      :sub-title="forbidden ? '当前角色未被分配该页面，请切换管理员账号访问。' : '该模块页面已纳入角色路由，业务功能可在此继续扩展。'"
    >
      <template #extra>
      <el-tag type="info" effect="plain">当前路由：{{ route.path }}</el-tag>
      </template>
    </el-result>
  </div>
</template>

<style scoped>
.placeholder-panel {
  min-height: 420px;
  display: grid;
  place-items: center;
}
</style>
