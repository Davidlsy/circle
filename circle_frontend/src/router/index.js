import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/login', name: 'Login', component: () => import('@/views/LoginView.vue'), meta: { guest: true } },
  { path: '/register', name: 'Register', component: () => import('@/views/RegisterView.vue'), meta: { guest: true } },
  { path: '/', component: () => import('@/views/LayoutView.vue'), meta: { auth: true }, children: [
    { path: '', name: 'Home', component: () => import('@/views/HomeView.vue') },
    { path: 'stars', name: 'Stars', component: () => import('@/views/StarsView.vue') },
    { path: 'stars/:id', name: 'StarDetail', component: () => import('@/views/StarDetailView.vue') },
    { path: 'fan-circles', name: 'FanCircles', component: () => import('@/views/FanCirclesView.vue') },
    { path: 'fan-circles/:id', name: 'FanCircleDetail', component: () => import('@/views/FanCircleDetailView.vue') },
    { path: 'posts/:id', name: 'PostDetail', component: () => import('@/views/PostDetailView.vue') },
    { path: 'messages', name: 'Messages', component: () => import('@/views/MessagesView.vue') },
    { path: 'groups', name: 'Groups', component: () => import('@/views/GroupsView.vue') },
    { path: 'groups/:id', name: 'GroupChat', component: () => import('@/views/GroupChatView.vue') },
    { path: 'profile/:id?', name: 'Profile', component: () => import('@/views/ProfileView.vue') },
  ]},
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  if (to.meta.auth && !token) return next('/login')
  if (to.meta.guest && token) return next('/')
  next()
})

export default router
