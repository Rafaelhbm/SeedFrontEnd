<script setup lang="ts">
import { ref, onMounted } from 'vue';
import api from '@/services/api';
import { PhCheck, PhX, PhPencilSimple, PhTrash, PhFloppyDisk } from "@phosphor-icons/vue";

// Interfaces
interface Solicitacao {
  solicitacaoAcessoId: number;
  nomeCompleto: string;
  email: string;
  perfilDesejadoId: number;
  status: string;
}

interface Usuario {
  userId: number;
  nome: string;
  email: string;
  perfilId: number;
  perfilNome?: string;
  setorId?: number | null;
}

// Interface para a lista de setores (para o novo combo)
interface Setor {
  setorId: number;
  nome: string; 
}

interface UsuarioEdicao {
  userId: number;
  nome: string;
  email: string;
  perfilId: number | null;
  setorId: number | null;
}

// Variáveis de Estado
const solicitacoes = ref<Solicitacao[]>([]);
const isLoadingSolicitacoes = ref(true);
const solicitacoesError = ref('');

const usuarios = ref<Usuario[]>([]);
const isLoadingUsuarios = ref(true);
const usuariosError = ref('');

// Estado para os Setores
const setores = ref<Setor[]>([]);
const isLoadingSetores = ref(false);

// Variáveis de Edição
const dialogEditar = ref(false);
const loadingSalvar = ref(false);

const usuarioEmEdicao = ref<UsuarioEdicao>({
  userId: 0,
  nome: '',
  email: '',
  perfilId: null,
  setorId: null
});

// Configuração de Perfis
const perfisDisponiveis = [
  { title: 'ADMIN', value: 1 },
  { title: 'Gestor SEED', value: 2 },
  { title: 'RH', value: 3 },
  { title: 'Diretor IE', value: 4 },
  { title: 'Analista Compras', value: 5 },
  { title: 'Usuário', value: 6 },
];

const adminId = ref<number | null>(null);

// Helpers
const formatarPerfilId = (id: number | null | undefined): string => {
  if (id === null || id === undefined) return 'Sem Perfil';
  const idNum = Number(id);
  const perfil = perfisDisponiveis.find(p => p.value === idNum);
  return perfil ? perfil.title : `Desconhecido (${id})`;
};

// Headers
const headersSolicitacoes = [
  { title: 'Usuário', key: 'nomeCompleto' },
  { title: 'Email', key: 'email' },
  { title: 'Perfil Desejado', key: 'perfilDesejadoId' },
  { title: 'Ações', key: 'actions', sortable: false, align: 'end' as const },
];

const headersUsuarios = [
  { title: 'Usuário', key: 'nome' },
  { title: 'Email', key: 'email' },
  { title: 'Cargo Atual', key: 'perfilNome' },
  { title: 'Ações', key: 'actions', sortable: false, align: 'end' as const },
];

// Auth e Fetchs
const getAdminId = (): number | null => {
  if (adminId.value) return adminId.value;
  try {
    const sessionData = localStorage.getItem('user_session');
    if (sessionData) {
      const userData = JSON.parse(sessionData);
      if (userData.userId) adminId.value = userData.userId;
    }
  } catch (e) { console.error(e); }
  return adminId.value; 
};

// Busca Setores para preencher o Combo e evitar erro 500 de FK
const fetchSetores = async () => {
  isLoadingSetores.value = true;
  try {
    const response = await api.get('/api/v1/setores');
    setores.value = response.data;
  } catch (error) {
    console.error("Erro ao carregar setores:", error);
    // Não bloqueia a tela, apenas o combo ficará vazio
  } finally {
    isLoadingSetores.value = false;
  }
};

const fetchSolicitacoes = async () => {
  isLoadingSolicitacoes.value = true;
  try {
    const response = await api.get('/api/v1/solicitacoes-acesso?status=PENDENTE');
    solicitacoes.value = response.data;
  } catch (error) {
    solicitacoesError.value = "Erro ao carregar solicitações.";
  } finally {
    isLoadingSolicitacoes.value = false;
  }
};

const fetchUsuarios = async () => {
  isLoadingUsuarios.value = true;
  try {
    const response = await api.get('/api/v1/usuarios');
    usuarios.value = response.data;
  } catch (error) {
    usuariosError.value = "Erro ao carregar usuários.";
  } finally {
    isLoadingUsuarios.value = false;
  }
};

// Ações de Solicitação
const handleAnalyse = async (item: Solicitacao, newStatus: 'APROVADO' | 'REPROVADO') => {
  const currentAdminId = getAdminId();
  if (!currentAdminId) {
    solicitacoesError.value = "Erro: ID admin não encontrado.";
    return;
  }
  const body = { status: newStatus, analisadoPorId: currentAdminId };

  try {
    await api.patch(`/api/v1/solicitacoes-acesso/${item.solicitacaoAcessoId}/analise`, body);
    solicitacoes.value = solicitacoes.value.filter(
      s => s.solicitacaoAcessoId !== item.solicitacaoAcessoId
    );
  } catch (error: any) {
    console.error(`Erro ${newStatus}:`, error);
    solicitacoesError.value = "Erro ao processar solicitação.";
  }
};

const handleApprove = (item: Solicitacao) => handleAnalyse(item, 'APROVADO');
const handleDeny = (item: Solicitacao) => handleAnalyse(item, 'REPROVADO');

// Ações de Edição
const handleEdit = (item: Usuario) => {
  usuarioEmEdicao.value = {
    userId: item.userId,
    nome: item.nome,
    email: item.email,
    perfilId: Number(item.perfilId),
    setorId: item.setorId ? Number(item.setorId) : null
  };
  dialogEditar.value = true;
};

const handleSaveEdit = async () => {
  if (!usuarioEmEdicao.value.userId) return;
  
  // Validação simples: Se não tiver setor, avisa (pois o back quebra com 0)
  if (!usuarioEmEdicao.value.setorId) {
    alert("Por favor, selecione um Setor para salvar.");
    return;
  }

  loadingSalvar.value = true;
  usuariosError.value = '';

  try {
    const payload = {
      userId: usuarioEmEdicao.value.userId,
      nome: usuarioEmEdicao.value.nome,
      email: usuarioEmEdicao.value.email,
      perfilId: usuarioEmEdicao.value.perfilId,
      setorId: usuarioEmEdicao.value.setorId
    };

    console.log("Enviando PUT:", payload);

    await api.put(`/api/v1/usuarios/${usuarioEmEdicao.value.userId}`, payload);

    // Atualiza Lista Local
    const index = usuarios.value.findIndex(u => u.userId === usuarioEmEdicao.value.userId);
    if (index !== -1) {
      const novoPerfilNome = formatarPerfilId(usuarioEmEdicao.value.perfilId);
      
      usuarios.value[index] = { 
        ...usuarios.value[index],
        nome: payload.nome,
        perfilId: payload.perfilId as number,
        setorId: payload.setorId,
        perfilNome: novoPerfilNome 
      };
    }

    dialogEditar.value = false;
  } catch (error: any) {
    console.error("Erro PUT:", error);
    usuariosError.value = error.response?.data?.message || "Erro ao salvar usuário. Verifique se todos os campos estão preenchidos.";
  } finally {
    loadingSalvar.value = false;
  }
};

const handleDelete = async (item: Usuario) => {
  if (confirm(`Deletar ${item.nome}?`)) {
    try {
      await api.delete(`/api/v1/usuarios/${item.userId}`);
      usuarios.value = usuarios.value.filter(u => u.userId !== item.userId);
    } catch (error) {
      usuariosError.value = "Erro ao deletar usuário.";
    }
  }
};

onMounted(() => {
  getAdminId(); 
  fetchSetores(); // Busca os setores ao iniciar
  fetchSolicitacoes();
  fetchUsuarios();
});
</script>

<template>
  <div class="permissions-page">
    <h1 class="text-h4 mb-4">Gerenciar Perfis e Usuários</h1>

    <VCard class="mb-6">
      <VCardTitle>Solicitações Pendentes</VCardTitle>
      <VCardText>
        <div v-if="isLoadingSolicitacoes" class="text-center">
          <VProgressCircular indeterminate color="primary" />
        </div>
        <VAlert v-if="solicitacoesError" type="error" variant="tonal" class="mb-4">
          {{ solicitacoesError }}
        </VAlert>
        <VDataTable
          v-if="!isLoadingSolicitacoes"
          :headers="headersSolicitacoes"
          :items="solicitacoes"
          item-value="solicitacaoAcessoId"
          class="elevation-1"
          no-data-text="Nenhuma solicitação."
        >
          <template #item.perfilDesejadoId="{ item }">
            {{ formatarPerfilId(item.perfilDesejadoId) }}
          </template>
          <template #item.actions="{ item }">
            <VBtn icon color="green" variant="text" size="small" @click="handleApprove(item)">
              <PhCheck :size="20" />
            </VBtn>
            <VBtn icon color="red" variant="text" size="small" @click="handleDeny(item)">
              <PhX :size="20" />
            </VBtn>
          </template>
        </VDataTable>
      </VCardText>
    </VCard>

    <VCard>
      <VCardTitle>Usuários do Sistema</VCardTitle>
      <VCardText>
        <div v-if="isLoadingUsuarios" class="text-center">
          <VProgressCircular indeterminate color="primary" />
        </div>
        <VAlert v-if="usuariosError" type="error" variant="tonal" class="mb-4">
          {{ usuariosError }}
        </VAlert>
        <VDataTable
          v-if="!isLoadingUsuarios"
          :headers="headersUsuarios"
          :items="usuarios"
          item-value="userId"
          class="elevation-1"
          no-data-text="Nenhum usuário encontrado."
        >
          <template #item.perfilNome="{ item }">
            {{ formatarPerfilId(item.perfilId) }}
          </template>
          
          <template #item.actions="{ item }">
            <VBtn icon color="blue" variant="text" size="small" @click="handleEdit(item)">
              <PhPencilSimple :size="20" />
            </VBtn>
            <VBtn icon color="red" variant="text" size="small" @click="handleDelete(item)">
              <PhTrash :size="20" />
            </VBtn>
          </template>
        </VDataTable>
      </VCardText>
    </VCard>

    <VDialog v-model="dialogEditar" max-width="500px">
      <VCard>
        <VCardTitle class="bg-primary text-white pa-4">Editar Usuário</VCardTitle>
        <VCardText class="pt-6">
          <VRow>
            <VCol cols="12">
              <VTextField
                v-model="usuarioEmEdicao.nome"
                label="Nome Completo"
                variant="outlined"
              ></VTextField>
            </VCol>
            
            <VCol cols="12">
              <VTextField
                v-model="usuarioEmEdicao.email"
                label="E-mail"
                variant="outlined"
                readonly
                disabled
                hint="O e-mail não pode ser alterado"
                persistent-hint
              ></VTextField>
            </VCol>

            <VCol cols="12">
              <VSelect
                v-model="usuarioEmEdicao.perfilId"
                :items="perfisDisponiveis"
                item-title="title"
                item-value="value"
                label="Cargo / Perfil"
                variant="outlined"
              ></VSelect>
            </VCol>

            <VCol cols="12">
              <VSelect
                v-model="usuarioEmEdicao.setorId"
                :items="setores"
                item-title="nome"
                item-value="setorId"
                label="Setor"
                variant="outlined"
                :loading="isLoadingSetores"
                no-data-text="Nenhum setor encontrado"
                clearable
              ></VSelect>
            </VCol>
          </VRow>
        </VCardText>
        <VCardActions class="pa-4 pt-0">
          <VSpacer></VSpacer>
          <VBtn color="grey-darken-1" variant="text" @click="dialogEditar = false">Cancelar</VBtn>
          <VBtn color="primary" variant="elevated" @click="handleSaveEdit" :loading="loadingSalvar">
            <PhFloppyDisk :size="18" class="mr-2"/> Salvar
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<style scoped>
.v-card-title {
  display: flex;
  align-items: center;
}
</style>