<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import api from '@/services/api';
import { PhPencilSimple, PhTrash, PhPlus, PhX } from "@phosphor-icons/vue";

// Tipos
interface Combo {
  comboId: number;
  descricao: string;
  setorId: number;
  competenciaId: number | null; 
}

interface ComboItem {
  itemId: number;
  quantidade: number;
}

interface Setor {
  setorId: number;
  nome: string;
}

interface Competencia {
  compId: number;
  ano: number;
  mes: number;
}

interface Item {
  itemId: number;
  nome: string;
  descricao: string;
}

// Estado
const combos = ref<Combo[]>([]);
const isLoading = ref(true);
const errorMessage = ref('');

// Catálogos
const allSetores = ref<Setor[]>([]);
const allCompetencias = ref<Competencia[]>([]);
const allItens = ref<Item[]>([]); 
const isLoadingCatalogs = ref(true); 

// Modal
const dialogCreate = ref(false); 
const isSubmitting = ref(false);
const formError = ref(''); 

// Estado da Edição
const editingId = ref<number | null>(null);
const isEditMode = computed(() => !!editingId.value);

const form = ref({
  descricao: '',
  setorId: null as number | null, 
  competenciaId: null as number | null,
  itens: [] as ComboItem[]
});

const newItem = ref({
  itemId: null as number | null,
  quantidade: 1
});

// Tabela
const headers = [
  { title: 'Descrição do combo', key: 'descricao' },
  { title: 'Setor', key: 'setorId' }, 
  { title: 'Competência', key: 'competenciaId' }, 
  { title: 'Ações', key: 'actions', sortable: false, align: 'end' as const },
];

// Helpers
const mesesDoAno = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const formatarNomeCompetencia = (comp: Competencia) => {
  if (!comp) return 'N/A';
  const nomeMes = mesesDoAno[comp.mes - 1] || 'Mês Inválido';
  return `${nomeMes}, ${comp.ano}`;
};

const getSetorNome = (id: number) => {
  const setor = allSetores.value.find(s => s.setorId === id);
  return setor ? setor.nome : `Setor ID: ${id}`;
};

const getCompetenciaNome = (id: number | null) => {
  if (id === null) return 'N/A'; 
  const comp = allCompetencias.value.find(c => c.compId === id);
  return comp ? formatarNomeCompetencia(comp) : `Comp. ID: ${id}`;
};

const getItemNome = (id: number | null) => {
  if (id === null) return 'N/A';
  const item = allItens.value.find(i => i.itemId === id);
  return item ? item.nome : `Item ID: ${id}`;
};

// API
const fetchCombos = async () => {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const response = await api.get('/api/v1/combos');
    combos.value = response.data;
  } catch (error: any) {
    console.error("Erro ao buscar combos:", error);
    errorMessage.value = "Não foi possível carregar os combos.";
  } finally {
    isLoading.value = false;
  }
};

const fetchCatalogs = async () => {
  isLoadingCatalogs.value = true;
  try {
    const [setoresRes, compRes, itensRes] = await Promise.all([
      api.get<Setor[]>('/api/v1/setores'),
      api.get<Competencia[]>('/api/v1/competencias'),
      api.get<Item[]>('/api/v1/itens') 
    ]);
    allSetores.value = setoresRes.data;
    allCompetencias.value = compRes.data.sort((a, b) => b.ano - a.ano || b.mes - a.mes);
    allItens.value = itensRes.data; 
  } catch (error) {
    console.error("Erro ao buscar catálogos:", error);
    errorMessage.value = "Erro ao carregar dados de referência.";
  } finally {
    isLoadingCatalogs.value = false;
  }
};

// Dropdowns
const competenciaOptions = computed(() => {
  return allCompetencias.value.map(comp => ({
    value: comp.compId,
    title: formatarNomeCompetencia(comp) 
  }));
});

const setorOptions = computed(() => {
  return allSetores.value.map(setor => ({
    value: setor.setorId,
    title: setor.nome 
  }));
});

const itemOptions = computed(() => {
  return allItens.value.map(item => ({
    value: item.itemId,
    title: item.nome 
  }));
});

// Ações
const openCreateDialog = () => {
  editingId.value = null;
  form.value = {
    descricao: '',
    setorId: null, 
    competenciaId: null,
    itens: []
  };
  newItem.value = { itemId: null, quantidade: 1 };
  formError.value = ''; 
  dialogCreate.value = true; 
};

const handleEdit = async (item: Combo) => {
  isSubmitting.value = true;
  formError.value = '';
  
  try {
    const response = await api.get(`/api/v1/combos/${item.comboId}`);
    const dadosCompletos = response.data;

    editingId.value = item.comboId;
    form.value = {
      descricao: dadosCompletos.descricao,
      setorId: dadosCompletos.setorId, 
      competenciaId: dadosCompletos.competenciaId,
      itens: dadosCompletos.itens || [] 
    };
    
    newItem.value = { itemId: null, quantidade: 1 };
    dialogCreate.value = true;

  } catch (error) {
    console.error("Erro ao carregar detalhes do combo:", error);
    alert("Erro ao carregar os itens deste combo.");
  } finally {
    isSubmitting.value = false;
  }
};

const handleDelete = async (item: Combo) => {
  if (!confirm(`Tem certeza que deseja deletar o combo "${item.descricao}"?`)) return;

  try {
    await api.delete(`/api/v1/combos/${item.comboId}`);
    combos.value = combos.value.filter(c => c.comboId !== item.comboId);
  } catch (error: any) {
    console.error("Erro ao deletar combo:", error);
    if (error.response?.data?.error) {
      alert("Erro: " + error.response.data.error);
    } else {
      alert("Não foi possível deletar o combo.");
    }
  } 
};

// Manipulação de Itens
const handleAddItemToCombo = () => {
  if (!newItem.value.itemId) {
    formError.value = "Selecione um Item.";
    return;
  }
  
  const jaExiste = form.value.itens.some(i => i.itemId === newItem.value.itemId);
  if(jaExiste) {
      formError.value = "Este item já está na lista.";
      return;
  }

  form.value.itens.push({
    itemId: newItem.value.itemId,
    quantidade: 1 
  });
  
  newItem.value = { itemId: null, quantidade: 1 };
  formError.value = '';
};

const handleRemoveItemFromCombo = (index: number) => {
  form.value.itens.splice(index, 1);
};

// SALVAR
const handleSave = async () => {
  formError.value = ''; 

  if (!form.value.descricao) { 
    formError.value = "Preencha a Descrição.";
    return;
  }
  
  if (!form.value.setorId) {
    formError.value = "Selecione um Setor para o Combo.";
    return;
  }
    
  if (form.value.itens.length === 0) {
     formError.value = "Adicione pelo menos um item ao combo.";
     return;
  }

  isSubmitting.value = true; 

  try {
    if (isEditMode.value) {
      await api.put(`/api/v1/combos/${editingId.value}`, form.value);
    } else {
      await api.post('/api/v1/combos', form.value);
    }
    
    dialogCreate.value = false; 
    fetchCombos(); 

  } catch (error: any) { 
    console.error("Erro ao salvar combo:", error);
    if (error.response?.data?.error) {
      formError.value = error.response.data.error;
    } else {
      formError.value = "Erro ao salvar. Verifique os dados.";
    }
  } finally { 
    isSubmitting.value = false; 
  }
};

onMounted(() => {
  fetchCombos();
  fetchCatalogs(); 
});
</script>

<template>
  <div class="combos-page pa-4">
    <VRow class="mb-4 align-center">
      <VCol cols="12" md="6">
        <h1 class="text-h4">Gerenciar Combos</h1>
      </VCol>
      <VCol cols="12" md="6" class="d-flex justify-end">
        <VBtn color="primary" @click="openCreateDialog" prepend-icon="mdi-plus-box">
          + Novo combo
        </VBtn>
      </VCol>
    </VRow>
    
    <VCard class="rounded-lg">
      <VCardTitle>Lista de Combos</VCardTitle>
      
      <VCardText>
        <div v-if="isLoading || isLoadingCatalogs" class="text-center py-8">
          <VProgressCircular indeterminate color="primary" />
          <p class="mt-4">Carregando dados...</p>
        </div>

        <VAlert v-if="errorMessage && !isLoading" type="error" variant="tonal" class="mb-4" closable>
          {{ errorMessage }}
        </VAlert>
        
        <VDataTable
          v-if="!isLoading && !isLoadingCatalogs"
          :headers="headers"
          :items="combos"
          item-value="comboId"
          class="elevation-1"
          no-data-text="Nenhum combo encontrado."
        >
          <template #item.setorId="{ item }">
            <span>{{ getSetorNome(item.setorId) }}</span>
          </template>
          
          <template #item.competenciaId="{ item }">
            <span>{{ getCompetenciaNome(item.competenciaId) }}</span>
          </template>
          
          <template #item.actions="{ item }">
            <VBtn icon color="blue" variant="text" size="small" @click="handleEdit(item)" title="Editar">
              <PhPencilSimple :size="20" />
            </VBtn>
            <VBtn icon color="red" variant="text" size="small" @click="handleDelete(item)" title="Deletar">
              <PhTrash :size="20" />
            </VBtn>
          </template>
        </VDataTable>
      </VCardText>
    </VCard>
    
    <VDialog v-model="dialogCreate" max-width="700px" persistent>
      <VCard :loading="isSubmitting || isLoadingCatalogs">
        <VCardTitle class="text-h5">
          {{ isEditMode ? 'Editar Combo' : 'Criar Novo Combo' }}
        </VCardTitle>
        
        <VCardText>
          <VAlert
            v-if="formError"
            type="error"
            variant="tonal"
            class="mb-4"
            closable
          >
            {{ formError }}
          </VAlert>

          <VRow>
            <VCol cols="12">
              <VTextField
                v-model="form.descricao"
                label="Descrição do Combo"
                variant="outlined"
                :disabled="isSubmitting"
              />
            </VCol>
            
            <VCol cols="12">
              <VSelect
                v-model="form.setorId"
                :items="setorOptions"
                label="Setor"
                variant="outlined"
                :loading="isLoadingCatalogs"
                :disabled="isSubmitting"
                no-data-text="Nenhum setor disponível"
              />
            </VCol>

            <VCol cols="12"> 
              <VSelect
                v-model="form.competenciaId"
                :items="competenciaOptions"
                label="Competência (Mês/Ano)"
                variant="outlined"
                :loading="isLoadingCatalogs"
                :disabled="isSubmitting"
              />
            </VCol>

            <VCol cols="12">
              <VDivider class="my-4" />
              <h3 class="text-h6 mb-2">Itens</h3>
            </VCol>

            <VCol cols="12" v-if="form.itens.length > 0">
              <VList lines="one" density="compact" class="rounded-lg border">
                <VListItem
                  v-for="(item, index) in form.itens"
                  :key="index"
                  :title="getItemNome(item.itemId)"
                >
                  <template v-slot:append>
                    <VBtn 
                      icon 
                      color="red" 
                      variant="text" 
                      size="small" 
                      @click="handleRemoveItemFromCombo(index)"
                    >
                      <PhX :size="16" />
                    </VBtn>
                  </template>
                </VListItem>
              </VList>
            </VCol>
            <VCol cols="12" v-else>
              <p class="text-caption text-center">Nenhum item adicionado.</p>
            </VCol>

            <VCol cols="12" sm="10">
              <VSelect
                v-model="newItem.itemId"
                :items="itemOptions"
                label="Selecione um Item"
                variant="outlined"
                :loading="isLoadingCatalogs"
                :disabled="isSubmitting"
              />
            </VCol>
            
            <VCol cols="12" sm="2" class="d-flex align-center">
              <VBtn 
                color="blue" 
                @click="handleAddItemToCombo" 
                :disabled="isSubmitting"
                icon
                title="Adicionar Item"
              >
                <PhPlus :size="20" />
              </VBtn>
            </VCol>

          </VRow>
        </VCardText>
        
        <VCardActions>
          <VSpacer />
          <VBtn color="grey" @click="dialogCreate = false" :disabled="isSubmitting">
            Cancelar
          </VBtn>
          <VBtn color="primary" @click="handleSave" :loading="isSubmitting">
            {{ isEditMode ? 'Salvar Alterações' : 'Criar Combo' }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
    
  </div>
</template>