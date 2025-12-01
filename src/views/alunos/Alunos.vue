<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import api from '@/services/api';

// Interfaces
interface Competencia {
  compId: number;
  ano: number;
  mes: number;
}

// Estado
const competencias = ref<Competencia[]>([]);
const isLoading = ref(false);
const isSaving = ref(false);
const isFetching = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

// Formulário 
const form = ref({
  competenciaId: null as number | null,
  quantidade: null as number | null
});

// Dados da Sessão 
const userSession = ref<any>(null);

// Helpers
const mesesDoAno = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const formatarCompetencia = (comp: Competencia) => {
  return `${mesesDoAno[comp.mes - 1]}/${comp.ano}`;
};

// API

const fetchCompetencias = async () => {
  isLoading.value = true;
  try {
    const response = await api.get('/api/v1/competencias');
    // Ordena: Ano desc, Mês desc
    competencias.value = response.data.sort((a: any, b: any) => b.ano - a.ano || b.mes - a.mes);
    
    // Opcional: Já seleciona a primeira competência pra facilitar
    if (competencias.value.length > 0) {
        form.value.competenciaId = competencias.value[0].compId;
    }
  } catch (error) {
    console.error("Erro ao buscar competências", error);
    errorMessage.value = "Erro ao carregar lista de competências.";
  } finally {
    isLoading.value = false;
  }
};

const fetchQuantidadeSalva = async () => {
  // Só busca se tiver competência e setor definidos
  if (!form.value.competenciaId || !userSession.value?.setorId) return;

  isFetching.value = true;
  form.value.quantidade = null; // Limpa visualmente enquanto carrega

  try {
    // Faz um GET filtrando por Comp e Setor
    const response = await api.get('/api/v1/alunos', {
        params: {
            compId: form.value.competenciaId,
            setorId: userSession.value.setorId
        }
    });

    // O backend geralmente retorna uma lista. Pegamos o primeiro se existir.
    const dados = response.data;
    if (Array.isArray(dados) && dados.length > 0) {
        form.value.quantidade = dados[0].quantidade;
    } 
    // Se vier vazio, mantemos null (campo em branco)

  } catch (error) {
    console.error("Erro ao buscar alunos salvos:", error);
    // Não mostramos erro na tela aqui para não assustar, apenas assume que não tem dados.
  } finally {
    isFetching.value = false;
  }
};

watch(() => form.value.competenciaId, (novoId) => {
    if (novoId) {
        fetchQuantidadeSalva();
    }
});

const dropdownCompetencias = computed(() => {
  return competencias.value.map(c => ({
    value: c.compId,
    title: formatarCompetencia(c)
  }));
});

const handleSalvar = async () => {
  errorMessage.value = '';
  successMessage.value = '';
  isSaving.value = true;

  // 1. Validação Básica
  if (!form.value.competenciaId || form.value.quantidade === null) {
    errorMessage.value = "Preencha a competência e a quantidade.";
    isSaving.value = false;
    return;
  }

  if (form.value.quantidade < 0) {
    errorMessage.value = "A quantidade não pode ser negativa.";
    isSaving.value = false;
    return;
  }

  // 2. Validação de Sessão (Setor)
  if (!userSession.value || !userSession.value.setorId) {
    errorMessage.value = "ERRO CRÍTICO: Seu usuário não está vinculado a uma Escola/Setor. Faça logout e entre novamente.";
    isSaving.value = false;
    return;
  }

  try {
    const payload = {
      SetorId: userSession.value.setorId, // ID da Escola (automático)
      CompId: form.value.competenciaId,
      Quantidade: form.value.quantidade,
      UsuarioRegistro: userSession.value.userId // ID do Usuário (automático)
    };

    // Chama  backend para salvar
    await api.post('/api/v1/alunos/registrar', payload);
    
    successMessage.value = "Quantidade de alunos salva com sucesso!";

  } catch (error: any) {
    console.error("Erro ao salvar alunos:", error);

    if (error.response?.data?.error) {
      const msgBanco = error.response.data.error;
      if (msgBanco.includes('P0001') || msgBanco.includes('apenas setores do tipo IE')) {
        errorMessage.value = "Ação bloqueada: O perfil Administrativo (Sede) não possui alunos.";
      } else {
        errorMessage.value = msgBanco;
      }
    } else {
      errorMessage.value = "Erro ao salvar dados. Verifique sua conexão.";
    }
  } finally {
    isSaving.value = false;
  }
};

onMounted(() => {
  const sessionStr = localStorage.getItem('user_session');
  if (sessionStr) {
    userSession.value = JSON.parse(sessionStr);
  }
  fetchCompetencias();
});
</script>

<template>
  <div class="alunos-page pa-4">
    <VRow class="mb-4">
      <VCol cols="12">
        <h1 class="text-h4">Informar Número de Alunos</h1>
        <p class="text-body-1 text-grey-darken-1">
          Informe o quantitativo de alunos matriculados na competência selecionada.
        </p>
      </VCol>
    </VRow>

    <VCard class="rounded-lg pa-4" max-width="600">
      <VCardText>
        <VAlert v-if="errorMessage" type="error" variant="tonal" class="mb-4" closable @click:close="errorMessage = ''">
          {{ errorMessage }}
        </VAlert>
        <VAlert v-if="successMessage" type="success" variant="tonal" class="mb-4" closable @click:close="successMessage = ''">
          {{ successMessage }}
        </VAlert>

        <VRow>
          <VCol cols="12">
            <VSelect
              v-model="form.competenciaId"
              :items="dropdownCompetencias"
              label="Selecione a Competência (Mês/Ano)"
              variant="outlined"
              :loading="isLoading"
              no-data-text="Nenhuma competência cadastrada"
            />
          </VCol>

          <VCol cols="12">
            <VTextField
              v-model.number="form.quantidade"
              label="Quantidade de Alunos"
              type="number"
              variant="outlined"
              min="0"
              :loading="isFetching"
              :disabled="isFetching" 
              placeholder="Carregando..."
            />
          </VCol>
        </VRow>
      </VCardText>

      <VCardActions class="px-4 pb-4">
        <VSpacer />
        <VBtn 
          color="primary" 
          size="large" 
          variant="elevated" 
          @click="handleSalvar"
          :loading="isSaving"
          :disabled="isSaving || isFetching"
        >
          Salvar Informação
        </VBtn>
      </VCardActions>
    </VCard>
  </div>
</template>