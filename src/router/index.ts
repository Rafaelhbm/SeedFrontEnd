import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "Home",
      component: () => import("@/views/home/Home.vue"),
    },
    {
      path: "/combo",
      name: "Combo",
      component: () => import("@/views/combo/Combo.vue"),
    },
    {
      path: "/audit",
      name: "Audit",
      component: () => import("@/views/audit/Audit.vue"),
    },
    {
      path: "/institution",
      name: "Institution",
      component: () => import("@/views/institution/Institution.vue"),
    },
    {
      path: "/permissions",
      name: "Permissions",
      component: () => import("@/views/permissions/Permissions.vue"),
    },
    {
      path: "/competencias",
      name: "Competencias",
      component: () => import("@/views/competencia/Competencia.vue"),
      meta: {
        requiresAuth: true,
      }
    },
    {
      path: "/estrutura",
      name: "Estrutura",
      component: () => import("@/views/estrutura/Estrutura.vue"),
      meta: {
        requiresAuth: true,
        // roles: ['ADMIN', 'GESTOR_SEED'] // Restringir se necessário
      }
    },
    {
      path: '/itens',
      name: 'GerenciarItens',
      component: () => import("@/views/itens/GerenciarItens.vue"), 
      meta: { requiresAuth: true }
    },
    {
      path: "/alunos",
      name: "Alunos",
      component: () => import("@/views/alunos/Alunos.vue"),
      meta: { requiresAuth: true }
    },
    {
      path: "/lancamento-gastos",
      name: "LancamentoGastos",
      component: () => import("@/views/gastos/PreencherGasto.vue"),
      meta: { requiresAuth: true }
    },
    {
      path: "/not-authorized",
      name: "NotAuthorized",
      component: () => import("@/views/defaults/NotAuthorized401.vue"),
    },
    {
      path: "/login",
      name: "Login",
      component: () => import("@/views/login/Login.vue"),
    },
    {
      path: "/register",
      name: "Register",
      component: () => import("@/views/register/Register.vue"),
    },
    {
      path: "/requested-account",
      name: "RequestedCreateAccount",
      component: () => import("@/views/defaults/RequestedCreateAccount.vue"),
    },
  ],
});

export default router;