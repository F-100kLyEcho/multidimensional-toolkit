import { createRouter, createWebHashHistory } from 'vue-router'

const 总路由 = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: '首页',
      meta: { title: '首页 - 多维工具箱' },
      component: () => import('@/页面/首页/视图.vue'),
    },
    {
      path: '/Q1',
      name: '启动',
      meta: { title: '启动 - 多维工具箱' },
      component: () => import('@/页面/启动/视图.vue'),
    },
    {
      path: '/图标库管理',
      name: '图标库管理',
      meta: { title: '图标库管理 - 多维工具箱' },
      component: () => import('@/页面/启动/组件/图标库/图标库管理视图.vue'),
    },
    {
      path: '/H1',
      name: '获取路径',
      meta: { title: '获取路径 - 多维工具箱' },
      component: () => import('@/页面/获取路径/视图.vue'),
    },
    {
      path: '/多维记忆',
      name: '多维记忆',
      meta: { title: '多维记忆 - 多维工具箱' },
      component: () => import('@/页面/多维记忆/记忆首页/视图.vue'),
    },
    {
      path: '/多维记忆/泡',
      name: '记忆泡',
      meta: { title: '记忆泡 - 多维工具箱' },
      component: () => import('@/页面/多维记忆/记忆泡/视图.vue'),
    },
    {
      path: '/多维记忆/新建',
      name: '新建记忆',
      meta: { title: '新建记忆 - 多维工具箱' },
      component: () => import('@/页面/多维记忆/新建记忆/视图.vue'),
    },
    {
      path: '/manual/:id',
      name: '手册',
      meta: { title: '使用手册 - 多维工具箱' },
      component: () => import('@/页面/手册/视图.vue'),
    },
    // 通配符路由（404）放在最后
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      meta: { title: '404 - 页面未找到' },
      component: () => import('@/页面/404/视图.vue'),
    },
  ],
})

export default 总路由
