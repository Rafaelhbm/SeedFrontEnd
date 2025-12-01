<script setup lang="ts">
import {
  PhHouse,
  PhPackage,
  PhClockCounterClockwise,
  PhUserGear,
  PhSignOut,
  PhCalendarBlank,
  PhTreeStructure,
  PhToolbox,
  PhStudent,
  PhCurrencyCircleDollar
} from "@phosphor-icons/vue";
import { useRoute, useRouter } from "vue-router";
import { computed, ref, onMounted, watch } from "vue";

const route = useRoute();
const router = useRouter();

// LÓGICA DE PERMISSÃO ATUALIZADA (Ler o Crachá)
const userPerfil = ref<string | null>(null);
const userName = ref<string | null>(null);

// Função para ler os dados da Sessão
const updateUserData = () => {
  const sessionData = localStorage.getItem('user_session'); // 1. Pega o crachá

  if (sessionData) {
    // 2. Se o crachá existe, lê ele
    try {
      const userData = JSON.parse(sessionData); // Converte o texto de volta para objeto
      userPerfil.value = userData.perfil; // Ex: 'ADMIN'
      userName.value = userData.name;     // Ex: 'Admin SEED'
    } catch (e) {
      console.error("Erro ao ler dados da sessão:", e);
      clearSession(); // Limpa se estiver corrompido
    }
  } else {
    // 3. Se não há crachá, limpa os dados
    userPerfil.value = null;
    userName.value = null;
  }
};

// Função de Logout (agora limpa o crachá também)
const clearSession = () => {
  localStorage.removeItem('user_token');
  localStorage.removeItem('user_session'); // Limpa o crachá
  userPerfil.value = null;
  userName.value = null;
};

const handleLogout = () => {
  clearSession();
  router.push('/login');
};

// Roda a função quando monta (F5)
onMounted(() => {
  updateUserData();
});

// Roda a função quando a rota muda (pós-login)
watch(
  () => route.name,
  () => {
    updateUserData();
  }
);

// Lógica para esconder a Sidebar
const layoutlessRouteNames = [
  "Login",
  "Register",
  "NotAuthorized",
  "RequestedCreateAccount"
];
const isLayoutlessPage = computed(() => layoutlessRouteNames.includes((route.name as string) || ""));
const isActiveRoute = (routePath: string) => {
  return route.path === routePath;
};
</script>

<template>
  <div v-if="isLayoutlessPage" class="h-screen">
    <router-view />
  </div>

  <VLayout v-else class="rounded-md border">
    
    <VNavigationDrawer
      class="bg-[linear-gradient(180deg,var(--color-primary)_0%,var(--color-secondary)_23.44%,var(--color-terciary)_100%)] text-white"
      permanent
    >
      <div class="w-full flex justify-start align-center h-[8rem] p-5">
        <img src="../src/assets/images/logo.svg" alt="" class="w-50 h-40" />
      </div>

      <VList nav>
        <div
          :class="{ 'nav-border-active': isActiveRoute('/') }"
          class="nav-border-container"
        >
          <VListItem
            to="/"
            :class="{ 'nav-item-active': isActiveRoute('/') }"
            class="nav-item"
          >
            <span class="flex align-center gap-3" :class="{ 'text-active': isActiveRoute('/') }">
              <PhHouse size="22" :class="{ 'icon-active': isActiveRoute('/') }" />
              <VListItemTitle :class="{ 'title-active': isActiveRoute('/') }">
                Principal
              </VListItemTitle>
            </span>
          </VListItem>
        </div>

        <div
          v-if=" userPerfil === 'DIRETOR_IE' || userPerfil === 'USUARIO'"
          :class="{ 'nav-border-active': isActiveRoute('/alunos') }"
          class="nav-border-container"
        >
          <VListItem
            to="/alunos"
            :class="{ 'nav-item-active': isActiveRoute('/alunos') }"
            class="nav-item"
          >
            <span class="flex align-center gap-3" :class="{ 'text-active': isActiveRoute('/alunos') }">
              <PhStudent size="22" :class="{ 'icon-active': isActiveRoute('/alunos') }" />
              <VListItemTitle :class="{ 'title-active': isActiveRoute('/alunos') }">
                Informar Alunos
              </VListItemTitle>
            </span>
          </VListItem>
        </div>

        <div
          v-if="userPerfil === 'DIRETOR_IE' || userPerfil === 'USUARIO'"
          :class="{ 'nav-border-active': isActiveRoute('/lancamento-gastos') }"
          class="nav-border-container"
        >
          <VListItem
            to="/lancamento-gastos"
            :class="{ 'nav-item-active': isActiveRoute('/lancamento-gastos') }"
            class="nav-item"
          >
            <span class="flex align-center gap-3" :class="{ 'text-active': isActiveRoute('/lancamento-gastos') }">
              <PhCurrencyCircleDollar size="22" :class="{ 'icon-active': isActiveRoute('/lancamento-gastos') }" />
              <VListItemTitle :class="{ 'title-active': isActiveRoute('/lancamento-gastos') }">
                Lançar Gastos
              </VListItemTitle>
            </span>
          </VListItem>
        </div>

        <div
          v-if="userPerfil === 'ADMIN' || userPerfil === 'GESTOR_SEED'"
          :class="{ 'nav-border-active': isActiveRoute('/combo') }"
          class="nav-border-container"
        >
          <VListItem
            to="/combo" :class="{ 'nav-item-active': isActiveRoute('/combo') }"
            class="nav-item"
          >
            <span class="flex align-center gap-3" :class="{ 'text-active': isActiveRoute('/combo') }">
              <PhPackage size="22" :class="{ 'icon-active': isActiveRoute('/combo') }" />
              <VListItemTitle :class="{ 'title-active': isActiveRoute('/combo') }">
                Combos
              </VListItemTitle>
            </span>
          </VListItem>
        </div>

        <div
          v-if="userPerfil === 'ADMIN'"
          :class="{ 'nav-border-active': isActiveRoute('/permissions') }"
          class="nav-border-container"
        >
          <VListItem
            to="/permissions" 
            :class="{ 'nav-item-active': isActiveRoute('/permissions') }"
            class="nav-item"
          >
            <span class="flex align-center gap-3" :class="{ 'text-active': isActiveRoute('/permissions') }">
              <PhUserGear size="22" :class="{ 'icon-active': isActiveRoute('/permissions') }" />
              <VListItemTitle :class="{ 'title-active': isActiveRoute('/permissions') }">
                Gerenciar Perfis
              </VListItemTitle>
            </span>
          </VListItem>
        </div>
        
        <div
          v-if="userPerfil === 'ADMIN' || userPerfil === 'GESTOR_SEED'"
          :class="{ 'nav-border-active': isActiveRoute('/competencias') }"
          class="nav-border-container"
        >
          <VListItem
            to="/competencias" 
            :class="{ 'nav-item-active': isActiveRoute('/competencias') }"
            class="nav-item"
          >
            <span class="flex align-center gap-3" :class="{ 'text-active': isActiveRoute('/competencias') }">
              <PhCalendarBlank size="22" :class="{ 'icon-active': isActiveRoute('/competencias') }" />
              <VListItemTitle :class="{ 'title-active': isActiveRoute('/competencias') }">
                Competências
              </VListItemTitle>
            </span>
          </VListItem>
        </div>

        <div
          v-if="userPerfil === 'ADMIN' || userPerfil === 'GESTOR_SEED'"
          :class="{ 'nav-border-active': isActiveRoute('/estrutura') }"
          class="nav-border-container"
        >
          <VListItem
            to="/estrutura" 
            :class="{ 'nav-item-active': isActiveRoute('/estrutura') }"
            class="nav-item"
          >
            <span class="flex align-center gap-3" :class="{ 'text-active': isActiveRoute('/estrutura') }">
              <PhTreeStructure size="22" :class="{ 'icon-active': isActiveRoute('/estrutura') }" />
              <VListItemTitle :class="{ 'title-active': isActiveRoute('/estrutura') }">
                Estrutura
              </VListItemTitle>
            </span>
          </VListItem>
        </div>

        <div
        v-if="userPerfil === 'ADMIN'"
        :class="{ 'nav-border-active': isActiveRoute('/itens') }"
        class="nav-border-container"
      >
        <VListItem
          to="/itens" 
          :class="{ 'nav-item-active': isActiveRoute('/itens') }"
          class="nav-item"
        >
          <span class="flex align-center gap-3" :class="{ 'text-active': isActiveRoute('/itens') }">
            <PhToolbox size="22" :class="{ 'icon-active': isActiveRoute('/itens') }" />
            <VListItemTitle :class="{ 'title-active': isActiveRoute('/itens') }">
              Gerenciar Itens
            </VListItemTitle>
          </span>
        </VListItem>
      </div>

        <div
          v-if="userPerfil === 'ADMIN' || userPerfil === 'GESTOR_SEED' || userPerfil === 'DIRETOR_IE' || userPerfil === 'ANALISTA_COMPRAS'"
          :class="{ 'nav-border-active': isActiveRoute('/audit') }"
          class="nav-border-container"
        >
          <VListItem
            to="/audit" :class="{ 'nav-item-active': isActiveRoute('/audit') }"
            class="nav-item"
          >
            <span class="flex align-center gap-3" :class="{ 'text-active': isActiveRoute('/audit') }">
              <PhClockCounterClockwise size="22" :class="{ 'icon-active': isActiveRoute('/audit') }" />
              <VListItemTitle :class="{ 'title-active': isActiveRoute('/audit') }">
                Histórico
              </VListItemTitle>
            </span>
          </VListItem>
        </div>

      </VList>

      <template v-slot:append>
        <div class="p-2 flex align-center justify-center ">
          <span class="flex flex-col align-start ">
            
            <VBtn @click="handleLogout" variant="plain" color="orange">
              <PhSignOut size="22" />
              Sair
            </VBtn>
          </span>
        </div>
      </template>
    </VNavigationDrawer>

    <VAppBar elevation="1">
      <div class="flex justify-end w-full">
        <VList>
          <VListItem>
            <p>{{ userName || 'Usuário' }}</p>
            <template #append>
            </template>
          </VListItem>
        </VList>
      </div>
    </VAppBar>

    <VMain class="flex justify-center h-screen">
      <VContainer>
        <router-view />
      </VContainer>
    </VMain>
  </VLayout>
</template>

<style>
.nav-border-container {
  position: relative;
  margin: 2px 0;
}

.nav-border-active {
  border-left: 4px solid #ffffff;
  border-radius: 1px;
}

.nav-item {
  margin: 0;
}

.nav-item-active {
  background-color: rgba(170, 174, 193, 0.1) !important;
}

.text-active {
  color: #ffffff !important;
}

.title-active {
  color: #ffffff !important;
}

.icon-active {
  color: #ffffff !important;
}

.nav-item:hover:not(.nav-item-active) {
  background-color: rgba(31, 55, 153, 0.05) !important;
}
</style>