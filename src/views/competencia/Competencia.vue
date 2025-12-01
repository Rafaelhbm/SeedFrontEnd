<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import api from '@/services/api';

const getAdminData = () => {
  const sessionData = localStorage.getItem('user_session');
  if (sessionData) {
    try {
      const userData = JSON.parse(sessionData);
      return {
        userId: userData.userId as number,
        userName: userData.name as string
      };
    } catch (e) {
      console.error("Erro ao ler dados da sessão:", e);
    }
  }
  return { userId: null, userName: 'Admin' };
};

const adminUserId = ref<number | null>(getAdminData().userId);
const adminUserName = ref<string>(getAdminData().userName);

interface Competencia {
  compId: number;
  ano: number;
  mes: number;
  dataAbertura: string | null;
  dataFechamento: string | null;
  abertaPor: number;
  fechadaPor: number | null;
  dataFim: string; 
  dataLimite: string;
}

const competencias = ref<Competencia[]>([]);
const isLoading = ref(true);
const errorMessage = ref('');
const successMessage = ref('');

// Estado do Modal de Criar
const dialogCreate = ref(false);
const isSubmittingCreate = ref(false);
const createError = ref('');

// Estado do Modal de Fechar
const dialogCloseConfirmVisible = ref(false); 
const itemToClose = ref<Competencia | null>(null);
const isSubmittingClose = ref(false);

const newCompetenciaForm = ref({
  ano: new Date().getFullYear(),
  mes: new Date().getMonth() + 1, 
  dataFim: '',
  dataLimite: '',
});

const headers = [
  { title: 'Status', key: 'status' },
  { title: 'Competência', key: 'nome' },
  { title: 'Período (Início)', key: 'dataAbertura' },
  { title: 'Período (Fim)', key: 'dataFim' },
  { title: 'Prazo (Limite)', key: 'dataLimite' },
  { title: 'Ações', key: 'actions', sortable: false },
];

const mesesDoAno = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const fetchCompetencias = async () => {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    // A API agora retorna os campos 'dataFim' e 'dataLimite'
    const response = await api.get<Competencia[]>('/api/v1/competencias');
    competencias.value = response.data.sort((a, b) => b.ano - a.ano || b.mes - a.mes);
  } catch (error: any) {
    console.error("Erro ao buscar competências:", error);
    errorMessage.value = "Não foi possível carregar as competências.";
  } finally {
    isLoading.value = false;
  }
};

const handleAbrirCompetencia = async () => {
  if (!adminUserId.value) {
    createError.value = "Usuário admin não encontrado. Faça login novamente.";
    return;
  }
  // Validação simples
  if (!newCompetenciaForm.value.dataFim || !newCompetenciaForm.value.dataLimite) {
     createError.value = "Data Fim e Data Limite são obrigatórias.";
     return;
  }
  
  isSubmittingCreate.value = true;
  createError.value = '';
  successMessage.value = '';

  const dto = {
    ano: newCompetenciaForm.value.ano,
    mes: newCompetenciaForm.value.mes,
    abertaPor: adminUserId.value,
    dataAbertura: null, // Backend cuida disso
    dataFim: newCompetenciaForm.value.dataFim,
    dataLimite: newCompetenciaForm.value.dataLimite
  };

  try {
    await api.post('/api/v1/competencias', dto);
    successMessage.value = `Competência ${formatarNome(newCompetenciaForm.value)} aberta com sucesso!`;
    dialogCreate.value = false; 
    await fetchCompetencias(); 
  } catch (error: any) {
    console.error("Erro ao abrir competência:", error);
    if (error.response && error.response.data.error) {
      createError.value = error.response.data.error; 
    } else {
      createError.value = "Ocorreu um erro ao tentar abrir a competência.";
    }
  } finally {
    isSubmittingCreate.value = false;
  }
};

const handleFecharCompetencia = async () => {
  if (!itemToClose.value || !adminUserId.value) {
    errorMessage.value = "Erro interno: ID do usuário ou da competência não encontrado.";
    return;
  }

  isSubmittingClose.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  const compId = itemToClose.value.compId;
  const dto = {
    fechadaPor: adminUserId.value,
    dataFechamento: null
  };

  try {
    await api.post(`/api/v1/competencias/${compId}/fechar`, dto);
    successMessage.value = `Competência ${formatarNome(itemToClose.value)} fechada com sucesso.`;
    await fetchCompetencias(); // Recarrega a tabela
  } catch (error: any) {
    console.error("Erro ao fechar competência:", error);
    if (error.response && error.response.data.error) {
      errorMessage.value = error.response.data.error;
    } else {
      errorMessage.value = "Ocorreu um erro ao tentar fechar a competência.";
    }
  } finally {
    isSubmittingClose.value = false;
    dialogCloseConfirmVisible.value = false; 
    itemToClose.value = null; 
  }
};

const formatarNome = (comp: { ano: number, mes: number }) => {
  if (!comp) return 'N/A';
  const nomeMes = mesesDoAno[comp.mes - 1] || 'Mês Inválido';
  return `${nomeMes}, ${comp.ano}`;
};

const formatarData = (dataISO: string | null) => {
  if (!dataISO) return '—';
  const data = new Date(dataISO);
  return data.toLocaleDateString('pt-BR', { timeZone: 'UTC' }); 
};

const getStatus = (comp: Competencia) => {
  if (comp.dataFechamento) return 'Fechada';

  if (!comp.dataFim) return 'Aberta';
  
  const hoje = new Date();
  const dataFim = new Date(comp.dataFim);
  if (hoje > dataFim) return 'Prazo Encerrado'; // Ex: Escolas não podem mais preencher

  return 'Aberta';
};

const getStatusColor = (comp: Competencia) => {
  if (comp.dataFechamento) return 'red';

  if (!comp.dataFim) return 'green';
  
  const hoje = new Date();
  const dataFim = new Date(comp.dataFim);
  if (hoje > dataFim) return 'orange';

  return 'green';
};

// Função para abrir o modal de confirmação
const openCloseConfirm = (item: Competencia) => {
  itemToClose.value = item;
  dialogCloseConfirmVisible.value = true;
};

// Ciclo de Vida
onMounted(() => {
  fetchCompetencias();
});
</script>

<template>
  <div class="pa-4">
    <VRow class="mb-4 align-center">
      <VCol cols="12" md="6">
        <h1 class="text-h4">Gerenciar Competências</h1>
      </VCol>
      <VCol cols="12" md="6" class="d-flex justify-end">
        <VBtn 
          color="primary" 
          @click="dialogCreate = true" 
          prepend-icon="mdi-plus-box"
        >
          Abrir Nova Competência
        </VBtn>
      </VCol>
    </VRow>

    <VAlert v-if="successMessage" type="success" variant="tonal" class="mb-4" closable>
      {{ successMessage }}
    </VAlert>
    <VAlert v-if="errorMessage" type="error" variant="tonal" class="mb-4" closable>
      {{ errorMessage }}
    </VAlert>

    <VCard class="rounded-lg">
      <VDataTable
        :headers="headers"
        :items="competencias"
        :loading="isLoading"
        item-value="compId"
        class="elevation-1"
        no-data-text="Nenhuma competência encontrada."
      >
        <template #item.status="{ item }">
          <VChip 
            :color="getStatusColor(item)" 
            variant="tonal" 
            size="small"
          >
            {{ getStatus(item) }}
          </VChip>
        </template>
        
        <template #item.nome="{ item }">
          <strong>{{ formatarNome(item) }}</strong>
        </template>

        <template #item.dataAbertura="{ item }">
          <span>{{ formatarData(item.dataAbertura) }}</span>
        </template>
        <template #item.dataFim="{ item }">
          <span>{{ formatarData(item.dataFim) }}</span>
        </template>
        <template #item.dataLimite="{ item }">
          <span>{{ formatarData(item.dataLimite) }}</span>
        </template>
        <template #item.dataFechamento="{ item }">
          <span>{{ formatarData(item.dataFechamento) }}</span>
        </template>

        <template #item.actions="{ item }">
          <VBtn
            v-if="!item.dataFechamento"
            color="warning"
            variant="tonal"
            size="small"
            @click="openCloseConfirm(item)"
            prepend-icon="mdi-lock"
          >
            Fechar
          </VBtn>
          <VChip
            v-else
            color="grey"
            variant="text"
            size="small"
          >
            Fechada
          </VChip>
        </template>
      </VDataTable>
    </VCard>

    <VDialog v-model="dialogCreate" max-width="500px">
      <VCard>
        <VCardTitle>Abrir Nova Competência</VCardTitle>
        <VCardText>
          <VAlert v-if="createError" type="error" variant="tonal" class="mb-4">
            {{ createError }}
          </VAlert>
          
          <VRow>
            <VCol cols="12" sm="6">
              <VTextField
                label="Ano"
                v-model.number="newCompetenciaForm.ano"
                type="number"
                :min="2020"
              />
            </VCol>
            <VCol cols="12" sm="6">
              <VTextField
                label="Mês"
                v-model.number="newCompetenciaForm.mes"
                type="number"
                :min="1"
                :max="12"
              />
            </VCol>
          </VRow>
          
          <VTextField
            label="Data Fim (Prazo Escolas)"
            v-model="newCompetenciaForm.dataFim"
            type="date"
            class="mt-4"
            hint="Até quando as escolas podem preencher."
            persistent-hint
          />
          <VTextField
            label="Data Limite (Prazo Admin)"
            v-model="newCompetenciaForm.dataLimite"
            type="date"
            class="mt-4"
            hint="Prazo final para o Admin fechar o mês."
            persistent-hint
          />

          <p class="text-caption text-medium-emphasis mt-4">
            Nota: O usuário '{{ adminUserName }}' será registrado como o responsável pela abertura.
          </p>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn text @click="dialogCreate = false">Cancelar</VBtn>
          <VBtn 
            color="primary" 
            @click="handleAbrirCompetencia" 
            :loading="isSubmittingCreate"
          >
            Abrir Competência
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog v-model="dialogCloseConfirmVisible" max-width="500px">
      <VCard>
        <VCardTitle>Confirmar Fechamento</VCardTitle>
        <VCardText v-if="itemToClose">
          Você tem certeza que deseja fechar a competência 
          <strong>{{ formatarNome(itemToClose) }}</strong>?
          <br />
          <strong class="text-warning">
            Esta ação não pode ser desfeita.
          </strong>
          Novos gastos não poderão ser adicionados a esta competência.
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn text @click="dialogCloseConfirmVisible = false; itemToClose = null;">Cancelar</VBtn>
          <VBtn 
            color="warning" 
            @click="handleFecharCompetencia" 
            :loading="isSubmittingClose"
          >
            Sim, Fechar
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

  </div>
</template>