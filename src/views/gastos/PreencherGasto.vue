<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import api from '@/services/api';
import { PhFloppyDisk, PhCurrencyCircleDollar, PhPackage, PhCalendarBlank } from "@phosphor-icons/vue";

// Tipos
interface Competencia {
  compId: number;
  ano: number;
  mes: number;
  situacao?: string;
}

interface Combo {
  comboId: number;
  descricao: string;
  setorId: number;
}

interface ItemCatalogo {
  itemId: number;
  nome: string;
  unidadeDeMedida: string;
}

// Interface para a tabela na tela (O que a escola digita)
interface ItemTela {
  itemId: number;
  nome: string;
  unidade: string;
  quantidadeReal: number | null; // O que ela digitou
  valorTotal: number | null;     // O que ela digitou
}

// Estado
const competencias = ref<Competencia[]>([]);
const combos = ref<Combo[]>([]);
const catalogoItens = ref<ItemCatalogo[]>([]); // Para saber o nome dos produtos

const selectedComp = ref<number | null>(null);
const selectedCombo = ref<number | null>(null);
const itensNaTela = ref<ItemTela[]>([]);

const isLoading = ref(false);
const isSaving = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

// Sessão
const userSession = ref<any>(null);

// Helpers
const mesesDoAno = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const formatarCompetencia = (comp: Competencia) => {
  return `${mesesDoAno[comp.mes - 1]}/${comp.ano}`;
};

// Carregamento Inicial
const fetchDadosIniciais = async () => {
  isLoading.value = true;
  try {
    const [compRes, comboRes, itemRes] = await Promise.all([
      api.get('/api/v1/competencias'),
      api.get('/api/v1/combos'), // Traz os templates
      api.get('/api/v1/itens')   // Traz os nomes dos itens
    ]);

    // Filtra competencias abertas/recentes
    competencias.value = compRes.data.sort((a: any, b: any) => b.ano - a.ano || b.mes - a.mes);
    combos.value = comboRes.data;
    catalogoItens.value = itemRes.data;

  } catch (error) {
    console.error("Erro ao carregar dados", error);
    errorMessage.value = "Erro ao carregar listas iniciais.";
  } finally {
    isLoading.value = false;
  }
};

// Lógica ao Selecionar Combo
const handleComboChange = async () => {
  if (!selectedCombo.value) {
    itensNaTela.value = [];
    return;
  }

  isLoading.value = true;
  try {
    // Busca os detalhes do combo (quais itens tem nele)
    const response = await api.get(`/api/v1/combos/${selectedCombo.value}`);
    const itensDoCombo = response.data.itens; // Vem do backend: { itemId, quantidade }

    // Monta a tabela misturando com o nome do item
    itensNaTela.value = itensDoCombo.map((ic: any) => {
      const infoItem = catalogoItens.value.find(i => i.itemId === ic.itemId);
      return {
        itemId: ic.itemId,
        nome: infoItem ? infoItem.nome : `Item ${ic.itemId}`,
        unidade: infoItem ? infoItem.unidadeDeMedida : 'UN',
        quantidadeReal: null, // Começa vazio pra obrigar a digitar
        valorTotal: null      // Começa vazio
      };
    });

  } catch (error) {
    console.error("Erro ao buscar itens do combo", error);
    errorMessage.value = "Erro ao carregar itens deste combo.";
  } finally {
    isLoading.value = false;
  }
};

// Lógica de Salvar
const handleSalvar = async () => {
  errorMessage.value = '';
  successMessage.value = '';
  
  if (!selectedComp.value || !selectedCombo.value) {
    errorMessage.value = "Selecione a Competência e o Combo.";
    return;
  }

  // Valida se tem algo preenchido
  const itensPreenchidos = itensNaTela.value.filter(i => i.quantidadeReal && i.quantidadeReal > 0 && i.valorTotal && i.valorTotal > 0);
  
  if (itensPreenchidos.length === 0) {
    errorMessage.value = "Preencha a Quantidade e o Valor de pelo menos um item.";
    return;
  }

  isSaving.value = true;

  try {
    // Manda um POST para cada linha preenchida
    for (const item of itensPreenchidos) {
      const payload = {
        compId: selectedComp.value,
        setorId: userSession.value.setorId, // Pega da sessão
        comboId: selectedCombo.value,
        
        // Dados da Linha
        itemId: item.itemId,
        quantidade: item.quantidadeReal,
        valor: item.valorTotal,
        
        // Campos opcionais que o backend pede
        solicitacaoId: null, 
        aprovadorId: null 
      };

      await api.post('/api/v1/gastos', payload);
    }

    successMessage.value = "Gasto lançado com sucesso! Todos os itens foram salvos.";
    
    // Limpa a tela ou reseta
    itensNaTela.value = [];
    selectedCombo.value = null;

  } catch (error: any) {
    console.error("Erro ao salvar gasto", error);
    if (error.response?.data?.error) {
        errorMessage.value = error.response.data.error;
    } else {
        errorMessage.value = "Erro ao salvar. Verifique se a competência está aberta.";
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
  fetchDadosIniciais();
});

// Computados para Dropdowns
const comboOptions = computed(() => combos.value.map(c => ({ value: c.comboId, title: c.descricao })));
const compOptions = computed(() => competencias.value.map(c => ({ value: c.compId, title: formatarCompetencia(c) })));

</script>

<template>
  <div class="pa-4">
    <VRow>
      <VCol cols="12">
        <h1 class="text-h4">Lançar Gastos</h1>
        <p class="text-grey">Selecione o combo e informe os valores.</p>
      </VCol>
    </VRow>

    <VCard class="pa-4 rounded-lg elevation-2">
      
      <VAlert v-if="errorMessage" type="error" variant="tonal" closable class="mb-4">{{ errorMessage }}</VAlert>
      <VAlert v-if="successMessage" type="success" variant="tonal" closable class="mb-4">{{ successMessage }}</VAlert>

      <VRow>
        <VCol cols="12" md="6">
          <VSelect
            v-model="selectedComp"
            :items="compOptions"
            label="Competência (Mês)"
            variant="outlined"
            prepend-inner-icon="mdi-calendar"
          />
        </VCol>
        <VCol cols="12" md="6">
          <VSelect
            v-model="selectedCombo"
            :items="comboOptions"
            label="Selecione o Combo Utilizado"
            variant="outlined"
            prepend-inner-icon="mdi-package-variant"
            @update:model-value="handleComboChange"
          />
        </VCol>
      </VRow>

      <div v-if="itensNaTela.length > 0" class="mt-4">
        <VDivider class="mb-4" />
        <h3 class="text-h6 mb-2">Itens do Combo</h3>
        
        <VTable class="border rounded-lg">
          <thead>
            <tr class="bg-grey-lighten-4">
              <th class="text-left">Item</th>
              <th class="text-center">Unidade</th>
              <th class="text-center" style="width: 150px;">Quantidade</th>
              <th class="text-center" style="width: 180px;">Valor Total (R$)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in itensNaTela" :key="item.itemId">
              <td>
                <strong>{{ item.nome }}</strong>
              </td>
              <td class="text-center">{{ item.unidade }}</td>
              
              <td class="pa-2">
                <VTextField
                  v-model.number="item.quantidadeReal"
                  type="number"
                  variant="outlined"
                  density="compact"
                  hide-details
                  placeholder="0"
                  min="0"
                />
              </td>

              <td class="pa-2">
                <VTextField
                  v-model.number="item.valorTotal"
                  type="number"
                  variant="outlined"
                  density="compact"
                  hide-details
                  placeholder="R$ 0,00"
                  min="0"
                  prefix="R$"
                />
              </td>
            </tr>
          </tbody>
        </VTable>

        <div class="d-flex justify-end mt-6">
          <VBtn 
            color="primary" 
            size="large" 
            prepend-icon="mdi-content-save"
            @click="handleSalvar"
            :loading="isSaving"
          >
            Salvar
          </VBtn>
        </div>

      </div>

      <div v-else-if="selectedCombo && isLoading" class="text-center py-8">
        <VProgressCircular indeterminate color="primary" />
        <p>Carregando itens...</p>
      </div>

      <div v-else-if="!selectedCombo" class="text-center py-8 text-grey">
        <PhPackage :size="48" class="mb-2" />
        <p>Selecione um combo acima para liberar a tabela.</p>
      </div>

    </VCard>
  </div>
</template>