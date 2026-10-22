<template>
  <el-button
    :type="type"
    :size="size"
    :plain="plain"
    :round="round"
    :circle="circle"
    :loading="loading"
    :disabled="disabled"
    :icon="icon"
    @click="handleClick"
  >
    <slot />
  </el-button>
</template>

<script setup>
defineOptions({
  name: 'BaseButton',
})

const props = defineProps({
  /** 按钮类型：primary / success / warning / danger / info / default */
  type: {
    type: String,
    default: 'primary',
  },
  /** 按钮尺寸：large / default / small */
  size: {
    type: String,
    default: 'default',
  },
  /** 图标名称或图标组件，例如 Search、Edit、Delete */
  icon: {
    type: [String, Object],
    default: '',
  },
  plain: {
    type: Boolean,
    default: false,
  },
  round: {
    type: Boolean,
    default: false,
  },
  circle: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['click'])

function handleClick(event) {
  if (!props.disabled && !props.loading) {
    emit('click', event)
  }
}
</script>
