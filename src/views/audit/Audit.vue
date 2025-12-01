<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import api from '@/services/api';
import { PhPrinter, PhMagnifyingGlass, PhDownloadSimple } from "@phosphor-icons/vue";

// Interfaces
interface GastoAPI {
  gastoId: number;
  itemId: number;
  quantidade: number;
  valor: number;
  dataCadastro: string;
  setorId: number;
  usuarioRegistro?: number;
}

interface Gasto extends GastoAPI {
  searchableText: string; 
}

interface Setor {
  setorId: number;
  nome: string;
}

interface ItemCatalogo {
  itemId: number;
  nome: string;
}

// Estado
const logs = ref<Gasto[]>([]); 
const setores = ref<Setor[]>([]);
const itens = ref<ItemCatalogo[]>([]);
const isLoading = ref(true);
const search = ref('');
const userSession = ref<any>(null);

const headers = [
  { title: 'Data/Hora', key: 'dataCadastro', align: 'start' as const, width: '180px' },
  { title: 'Origem (Escola/Setor)', key: 'setorId', align: 'start' as const },
  { title: 'Ação / Detalhe', key: 'acao', align: 'start' as const },
  { title: 'Valor Envolvido', key: 'valor', align: 'end' as const },
];

// Helpers
const formatDateTime = (isoDate: string) => {
  if (!isoDate) return '-';
  return new Date(isoDate).toLocaleString('pt-BR');
};

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const getSetorName = (id: number) => {
  const s = setores.value.find(x => x.setorId === id);
  return s ? s.nome : `Setor #${id}`;
};

const getItemName = (id: number) => {
  const i = itens.value.find(x => x.itemId === id);
  return i ? i.nome : `Item #${id}`;
};

// Filtro
const customFilter = (value: any, search: string | null, item: any): boolean => {
  if (!search) return true;
  const gastoItem: Gasto = item.raw || item;
  if (!gastoItem.searchableText) return false; 
  const lowerSearch = search.toLowerCase();
  return gastoItem.searchableText.includes(lowerSearch);
};

// Lógica de Carga
const fetchDados = async () => {
  isLoading.value = true;
  try {
    const [resSetores, resItens] = await Promise.all([
      api.get('/api/v1/setores'),
      api.get('/api/v1/itens')
    ]);
    setores.value = resSetores.data;
    itens.value = resItens.data;

    const params: any = {};
    
    if (userSession.value && 
        userSession.value.perfil !== 'ADMIN' && 
        userSession.value.perfil !== 'GESTOR_SEED' &&
        userSession.value.perfil !== 'ANALISTA_COMPRAS') {
        
        params.setorId = userSession.value.setorId;
    }

    const resGastos = await api.get('/api/v1/gastos', { params });
    
    const processedLogs = resGastos.data
        .map((gasto: GastoAPI) => { 
            const setorName = getSetorName(gasto.setorId);
            const itemName = getItemName(gasto.itemId);
            const valor = formatCurrency(gasto.valor);
            const searchableText = `${setorName} ${itemName} ${valor} ${gasto.gastoId}`.toLowerCase();

            return {
                ...gasto,
                searchableText: searchableText
            } as Gasto; 
        })
        .sort((a: any, b: any) => 
            new Date(b.dataCadastro).getTime() - new Date(a.dataCadastro).getTime()
        );
    
    logs.value = processedLogs;

  } catch (error) {
    console.error("Erro ao carregar auditoria", error);
  } finally {
    isLoading.value = false;
  }
};

const handlePrint = () => {
  window.print();
};

onMounted(() => {
  const s = localStorage.getItem('user_session');
  if (s) userSession.value = JSON.parse(s);
  fetchDados();
});
</script>

<template>
  <div class="audit-page pa-6">
    
    <div class="d-flex justify-space-between align-center mb-6">
      <div>
        <h1 class="text-h4 text-grey-darken-3">Histórico de Atividades</h1>
        <p class="text-body-2 text-grey">
          Registro cronológico de lançamentos e movimentações no sistema.
        </p>
      </div>
      <div class="d-flex gap-2">
        <VBtn variant="outlined" color="grey-darken-1" prepend-icon="mdi-printer" @click="handlePrint">
          Imprimir Relatório
        </VBtn>
      </div>
    </div>

    <VCard class="mb-4 pa-4 rounded-lg elevation-1">
      <VRow>
        <VCol cols="12" md="6">
          <VTextField
            v-model="search"
            label="Buscar por escola, item ou valor..."
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="compact"
            hide-details
            clearable
          />
        </VCol>
        <VCol cols="12" md="6" class="d-flex align-center text-caption text-grey">
          <span v-if="logs.length > 0">
            Exibindo <strong>{{ logs.length }}</strong> registros encontrados.
          </span>
        </VCol>
      </VRow>
    </VCard>

    <VCard class="rounded-lg elevation-2 border">
      <VDataTable
        :headers="headers"
        :items="logs"
        :search="search"
        :custom-filter="customFilter"
        :loading="isLoading"
        item-value="gastoId"
        density="comfortable"
        no-data-text="Nenhum registro encontrado no histórico."
      >
        <template #item.dataCadastro="{ item }">
          <div class="d-flex flex-column">
            <span class="font-weight-bold text-grey-darken-3">
              {{ formatDateTime(item.dataCadastro).split(' ')[0] }}
            </span>
            <span class="text-caption text-grey">
              {{ formatDateTime(item.dataCadastro).split(' ')[1] }}
            </span>
          </div>
        </template>

        <template #item.setorId="{ item }">
          <div class="d-flex align-center gap-2">
            <VAvatar size="24" color="primary" variant="tonal">
              <span class="text-caption">IE</span>
            </VAvatar>
            <span class="text-body-2">{{ getSetorName(item.setorId) }}</span>
          </div>
        </template>

        <template #item.acao="{ item }">
          <div>
            <span class="text-body-2">
              Lançamento de Despesa: <strong>{{ getItemName(item.itemId) }}</strong>
            </span>
            <div class="text-caption text-grey">
              Quantidade: {{ item.quantidade }} | ID Transação: #{{ item.gastoId }}
            </div>
          </div>
        </template>

        <template #item.valor="{ item }">
          <VChip color="grey-lighten-3" variant="flat" size="small" class="font-weight-bold text-grey-darken-4">
            {{ formatCurrency(item.valor) }}
          </VChip>
        </template>

      </VDataTable>
    </VCard>
  </div>
</template>

<style>
@media print {
  .v-navigation-drawer, .v-app-bar, .v-btn, .v-field {
    display: none !important;
  }
  .audit-page {
    padding: 0 !important;
  }
  .v-card {
    box-shadow: none !important;
    border: 1px solid #ddd !important;
  }
}
</style>