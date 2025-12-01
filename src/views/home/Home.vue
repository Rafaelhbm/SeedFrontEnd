<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import api from '@/services/api';

// Interfaces Atualizadas
interface Gasto {
  gastoId: number;
  itemId: number;
  quantidade: number;
  valor: number;
  dataCadastro: string; 
  compId: number;
  setorId: number;
  aprovadorId: number | null;
  comboId: number | null;
  solicitCompra: number | null;
}

interface ItemCatalogo {
  itemId: number;
  nome: string;
  unidadeDeMedida: string;
}

interface Competencia {
  compId: number;
  ano: number;
  mes: number;
  dataAbertura: string | null;
  dataFechamento: string | null;
  abertaPor: number;
  fechadaPor: number | null;
}

interface Setor {
  setorId: number;
  nome: string;
  tipoCodigo: string;
  setorPaiId: number | null;
}

interface Usuario {
  userId: number;
  nome: string;
}

// Interface para o retorno da API de alunos
interface AlunoRegistro {
  setorId: number;
  compId: number;
  quantidade: number;
}

// Variáveis de Estado
const gastos = ref<Gasto[]>([]);
const itensCatalogo = ref<ItemCatalogo[]>([]);
const isLoading = ref(true);
const errorMessage = ref('');
const userSession = ref<any>(null);

// Total de Alunos para o cálculo
const totalAlunos = ref<number>(0); 
const isLoadingAlunos = ref(false);

// Filtros
const competencias = ref<Competencia[]>([]);
const selectedCompetenciaId = ref<number | null>(null);
const isLoadingCompetencias = ref(true);

const setores = ref<Setor[]>([]);
const selectedSetorId = ref<number | null>(null);
const isLoadingSetores = ref(true);
const usuarios = ref<Usuario[]>([]);

// Definição da Tabela
const headers = [
  { title: 'ID', key: 'gastoId', width: '80px' },
  { title: 'Item / Produto', key: 'item' }, 
  { title: 'Qtd.', key: 'quantidade', align: 'center' as const }, 
  { title: 'Valor Total', key: 'valor', align: 'end' as const },
  { title: 'Setor', key: 'setorId' },
  { title: 'Data', key: 'dataCadastro' },
  { title: 'Status', key: 'aprovadorId' },
];

// Cálculos de Totais (KPIs)
const totalValorMes = computed(() => {
  return gastos.value.reduce((acc, curr) => acc + curr.valor, 0);
});

const totalItensMes = computed(() => {
  return gastos.value.reduce((acc, curr) => acc + curr.quantidade, 0);
});

// Custo por Aluno
const custoPorAluno = computed(() => {
  if (!totalAlunos.value || totalAlunos.value === 0) return 0;
  return totalValorMes.value / totalAlunos.value;
});

// Funções de Busca

const fetchGastos = async () => {
  isLoading.value = true;
  errorMessage.value = '';

  const params: any = {};
  if (selectedCompetenciaId.value) params.compId = selectedCompetenciaId.value;
  
  // LÓGICA DE SEGURANÇA
  if (userSession.value && 
      userSession.value.perfil !== 'ADMIN' && 
      userSession.value.perfil !== 'GESTOR_SEED' &&
      userSession.value.perfil !== 'ANALISTA_COMPRAS') {
      
      // Se for Escola (Diretor/Usuário), FORÇA o setor dele
      params.setorId = userSession.value.setorId;
  } else {
      // Se for Admin/Gestor/Analista, usa o filtro do dropdown (se selecionado)
      if (selectedSetorId.value) params.setorId = selectedSetorId.value;
  }

  try {
    const response = await api.get('/api/v1/gastos', { params });
    gastos.value = response.data;
  } catch (error: any) {
    console.error("Erro ao buscar gastos:", error);
    errorMessage.value = "Não foi possível carregar os gastos recentes.";
  } finally {
    isLoading.value = false;
  }
};

// Busca qtd de alunos
const fetchAlunosCount = async () => {
  let setorParaBuscar: number | null = null;

  // 1. Define qual setor usar
  if (userSession.value && 
      userSession.value.perfil !== 'ADMIN' && 
      userSession.value.perfil !== 'GESTOR_SEED' &&
      userSession.value.perfil !== 'ANALISTA_COMPRAS') {
      // Se for escola, usa o próprio setor
      setorParaBuscar = userSession.value.setorId;
  } else {
      // Se for gestão, usa o selecionado no dropdown
      setorParaBuscar = selectedSetorId.value;
  }

  // Se não tiver setor específico (ex: Admin vendo tudo) ou sem competência, zera
  if (!setorParaBuscar || !selectedCompetenciaId.value) {
    totalAlunos.value = 0;
    return;
  }

  isLoadingAlunos.value = true;
  try {
    const params = { 
      compId: selectedCompetenciaId.value, 
      setorId: setorParaBuscar 
    };
    
    // O endpoint retorna uma lista
    const response = await api.get<AlunoRegistro[]>('/api/v1/alunos', { params });
    
    if (response.data && response.data.length > 0) {
      totalAlunos.value = response.data[0].quantidade;
    } else {
      totalAlunos.value = 0;
    }
  } catch (error) {
    console.error("Erro ao buscar alunos:", error);
    totalAlunos.value = 0;
  } finally {
    isLoadingAlunos.value = false;
  }
};

const fetchItensCatalogo = async () => {
  try {
    const response = await api.get('/api/v1/itens');
    itensCatalogo.value = response.data;
  } catch (error) {
    console.warn("Erro ao carregar itens");
  }
};

const fetchCompetencias = async () => {
  isLoadingCompetencias.value = true;
  try {
    const response = await api.get<Competencia[]>('/api/v1/competencias');
    competencias.value = response.data;

    if (competencias.value.length > 0) {
      const abertas = competencias.value.filter(c => c.dataFechamento === null);
      const sorted = [...competencias.value].sort((a, b) => b.ano - a.ano || b.mes - a.mes);
      
      if (abertas.length > 0) selectedCompetenciaId.value = abertas[0].compId;
      else if (sorted.length > 0) selectedCompetenciaId.value = sorted[0].compId;
    }
  } catch (error) {
    console.error("Erro ao buscar competências:", error);
  } finally {
    isLoadingCompetencias.value = false;
  }
};

const fetchSetores = async () => {
  isLoadingSetores.value = true;
  try {
    const response = await api.get<Setor[]>('/api/v1/setores');
    setores.value = response.data;
  } catch (error) {
    console.error("Erro ao buscar setores:", error);
  } finally {
    isLoadingSetores.value = false;
  }
};

const fetchUsuarios = async () => {
  try {
    const response = await api.get<Usuario[]>('/api/v1/usuarios');
    usuarios.value = response.data;
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);
  }
};

// Watchers
watch(selectedCompetenciaId, (newVal, oldVal) => {
  if (newVal !== oldVal) {
    fetchGastos();
    fetchAlunosCount(); // Atualiza alunos ao mudar mês
  }
});

watch(selectedSetorId, (newVal, oldVal) => {
  if (newVal !== oldVal) {
    fetchGastos();
    fetchAlunosCount(); // Atualiza alunos ao mudar escola
  }
});

// Formatadores

const formatarValor = (valor: number) => {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatarData = (dataISO: string) => {
  if (!dataISO) return '-';
  const data = new Date(dataISO);
  return data.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const formatarSetor = (setorId: number) => {
  if (setores.value.length === 0) return `ID ${setorId}`;
  const setor = setores.value.find(s => s.setorId === setorId);
  return setor ? setor.nome : `ID ${setorId}`;
};

const formatarItem = (gasto: Gasto) => {
  const item = itensCatalogo.value.find(i => i.itemId === gasto.itemId);
  return item ? item.nome : `Item #${gasto.itemId}`;
};

const formatarAprovador = (aprovadorId: number | null) => {
  if (!aprovadorId) return 'Registrado'; 
  if (usuarios.value.length === 0) return `ID ${aprovadorId}`;
  const usuario = usuarios.value.find(u => u.userId === aprovadorId);
  return usuario ? usuario.nome : 'Aprovado';
};

const mesesDoAno = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
const formatarCompetenciaLabel = (comp: Competencia) => {
  if (!comp) return '';
  const nomeMes = mesesDoAno[comp.mes - 1] || 'Mês Inválido';
  return `${nomeMes}, ${comp.ano}`;
};

// Propriedades Computadas
const competenciaOptions = computed(() => {
  return competencias.value.map(comp => ({
    title: formatarCompetenciaLabel(comp),
    value: comp.compId,
  }));
});

const setorOptions = computed(() => {
  const options: { title: string, value: number | null }[] = setores.value.map(setor => ({
    title: setor.nome,
    value: setor.setorId,
  }));
  options.unshift({ title: 'Todos os setores', value: null as number | null });
  return options;
});

const isSetorFilterDisabled = computed(() => {
    return userSession.value && 
           userSession.value.perfil !== 'ADMIN' && 
           userSession.value.perfil !== 'GESTOR_SEED' &&
           userSession.value.perfil !== 'ANALISTA_COMPRAS';
});

// Ciclo de Vida
onMounted(async () => {
  const sessionStr = localStorage.getItem('user_session');
  if (sessionStr) userSession.value = JSON.parse(sessionStr);

  fetchItensCatalogo();
  // Aguarda carregar competências para ter o ID inicial
  await fetchCompetencias(); 
  fetchSetores();
  fetchUsuarios();
  // fetchGastos chamado pelo watch
  // Tenta buscar alunos na carga inicial
  fetchAlunosCount(); 
});
</script>

<template>
  <div class="dashboard-page pa-4">
    
    <VRow class="mb-4 align-center">
      <VCol cols="12" md="6">
        <h1 class="text-h4">Transações</h1>
      </VCol>
      <VCol cols="12" md="6" class="d-flex justify-end">
        <VSelect
          label="Competência"
          :items="competenciaOptions"
          v-model="selectedCompetenciaId"
          :loading="isLoadingCompetencias"
          variant="outlined"
          density="compact"
          style="max-width: 250px;"
          hide-details
        />
      </VCol>
    </VRow>

    <VRow align="stretch">
      <VCol cols="12" sm="6" md="3">
        <VCard elevation="2" class="pa-4 rounded-lg d-flex flex-column" style="height: 100%">
          <div class="text-caption text-medium-emphasis">Total de transações este mês</div>
          <div class="text-h5 font-weight-bold mt-1 text-primary">{{ formatarValor(totalValorMes) }}</div>
          <div class="text-caption text-grey mt-auto pt-1">Soma total lançada</div>
        </VCard>
      </VCol>
      
      <VCol cols="12" sm="6" md="3">
        <VCard elevation="2" class="pa-4 rounded-lg d-flex flex-column" style="height: 100%">
          <div class="text-caption text-medium-emphasis">Volume de Itens</div>
          <div class="text-h5 font-weight-bold mt-1">{{ totalItensMes }} un.</div>
          <div class="text-caption text-grey mt-auto pt-1">Produtos adquiridos</div>
        </VCard>
      </VCol>

      <VCol cols="12" sm="6" md="3">
        <VCard elevation="2" class="pa-4 rounded-lg d-flex flex-column" style="height: 100%">
          <div class="text-caption text-medium-emphasis">Custo por Aluno</div>
          
          <div v-if="totalAlunos > 0" class="text-h5 font-weight-bold mt-1 text-orange-darken-1">
            {{ formatarValor(custoPorAluno) }}
          </div>
          <div v-else class="text-h5 font-weight-bold mt-1 text-grey">
            -
          </div>

          <div class="text-caption text-grey mt-auto pt-1">
            <span v-if="totalAlunos > 0">Base: {{ totalAlunos }} alunos</span>
            <span v-else-if="isLoadingAlunos">Calculando...</span>
            <span v-else>Selecione uma escola</span>
          </div>
        </VCard>
      </VCol>

      <VCol cols="12" sm="6" md="3">
        <VCard elevation="2" class="pa-4 rounded-lg d-flex flex-column" style="height: 100%">
          <div class="text-caption text-medium-emphasis">Status</div>
          <div class="text-h5 font-weight-bold mt-1">Ativo</div>
          <div class="text-caption text-green mt-auto pt-1">Sistema operando normalmente</div>
        </VCard>
      </VCol>
    </VRow>

    <VCard class="mt-6 rounded-lg">
      <VCardTitle>
        Gastos Recentes
      </VCardTitle>
      <VCardText>
        <VRow class="mb-2">
          <VCol cols="12" md="8">
            <VTextField
              label="Pesquisar..."
              variant="outlined"
              density="compact"
              hide-details
              disabled
            />
          </VCol>
          <VCol cols="12" md="4">
            <VSelect
              label="Todos os setores"
              :items="setorOptions"
              v-model="selectedSetorId"
              :loading="isLoadingSetores"
              variant="outlined"
              density="compact"
              hide-details
              clearable 
              :disabled="isSetorFilterDisabled"
            />
          </VCol>
        </VRow>
        
        <VAlert v-if="errorMessage" type="error" variant="tonal" class="mb-4">
          {{ errorMessage }}
        </VAlert>
        
        <VDataTable
          :headers="headers"
          :items="gastos"
          :loading="isLoading"
          item-value="gastoId"
          class="elevation-1"
          no-data-text="Nenhum gasto encontrado."
        >
          <template #item.item="{ item }">
            <span class="font-weight-medium">{{ formatarItem(item) }}</span>
          </template>

          <template #item.quantidade="{ item }">
             <VChip size="small" variant="outlined">{{ item.quantidade }}</VChip>
          </template>

          <template #item.valor="{ item }">
            <span class="text-primary font-weight-bold">{{ formatarValor(item.valor) }}</span>
          </template>

          <template #item.setorId="{ item }">
            <span>{{ formatarSetor(item.setorId) }}</span>
          </template>

          <template #item.dataCadastro="{ item }">
            <span>{{ formatarData(item.dataCadastro) }}</span>
          </template>
          
          <template #item.aprovadorId="{ item }">
            <span>{{ formatarAprovador(item.aprovadorId) }}</span>
          </template>
        </VDataTable>

      </VCardText>
    </VCard>
  </div>
</template>