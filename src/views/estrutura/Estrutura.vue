<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import api from '@/services/api';
import { PhPencilSimple, PhTrash } from "@phosphor-icons/vue";

// Tipos
interface Setor {
  setorId: number;
  nome: string;
  tipo: string;
  setorPaiId: number | null;
}

interface TipoSetor {
  codigo: string;
  nome: string;
}

// Variáveis de Estado
const setores = ref<Setor[]>([]);
const tiposSetor = ref<TipoSetor[]>([]); 
const isLoading = ref(true);
const errorMessage = ref('');
const successMessage = ref('');

// Estado dos Modais
const dialogForm = ref(false); // Modal de Criar/Editar
const dialogDelete = ref(false); // Modal de Deletar

const isSubmitting = ref(false);
const formError = ref('');

// Lógica de Edição
const editingSetor = ref<Setor | null>(null); // Guarda o item sendo editado
const isEditMode = computed(() => !!editingSetor.value);

// Lógica de Deleção
const deletingSetor = ref<Setor | null>(null); // Guarda o item sendo deletado
const isDeleting = ref(false);

// Formulário (usado para Criar e Editar)
const form = ref({
  nome: '',
  tipoCodigo: null as string | null, 
  setorPaiId: null as number | null, 
});

// Definição da Tabela
const headers = [
  { title: 'ID', key: 'setorId', width: '80px' },
  { title: 'Nome do Setor', key: 'nome' },
  { title: 'Tipo', key: 'tipo' }, 
  { title: 'Setor Pai (Estrutura)', key: 'setorPaiId' },
  { title: 'Ações', key: 'actions', sortable: false, align: 'end' as const },
] as const; 

// Funções de API

const fetchSetores = async () => {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const response = await api.get<Setor[]>('/api/v1/setores');
    setores.value = response.data.sort((a, b) => a.setorId - b.setorId);
  } catch (error: any) {
    console.error("Erro ao buscar setores:", error);
    errorMessage.value = "Não foi possível carregar os setores.";
  } finally {
    isLoading.value = false;
  }
};

const fetchTiposSetor = async () => {
  try {
    const response = await api.get<TipoSetor[]>('/api/v1/tipos-setor');
    tiposSetor.value = response.data;
  } catch (error: any) {
    console.error("Erro ao buscar tipos de setor:", error);
    formError.value = "Não foi possível carregar os tipos de setor para o formulário.";
  }
};

// Salva (Cria ou Edita)
const handleSaveSetor = async () => {
  // 1. Validação
  if (!form.value.nome || !form.value.tipoCodigo) {
    formError.value = "Nome e Tipo de Setor são obrigatórios.";
    return;
  }
  
  isSubmitting.value = true;
  formError.value = '';
  successMessage.value = '';

  // 2. Monta o objeto EXATAMENTE como o DTO do C# pede (Sem ID)
  const dto = {
    nome: form.value.nome,
    tipoCodigo: form.value.tipoCodigo,
    setorPaiId: form.value.setorPaiId || null, // Garante null se estiver vazio
  };

  try {
    if (isEditMode.value && editingSetor.value) {
      // MODO EDITAR (PUT)
      // O ID vai na URL, o DTO vai no corpo
      const id = editingSetor.value.setorId;
      await api.put(`/api/v1/setores/${id}`, dto);
      
      successMessage.value = `Setor "${dto.nome}" atualizado com sucesso!`;

    } else {
      // MODO CRIAR (POST)
      await api.post('/api/v1/setores', dto);
      
      successMessage.value = `Setor "${dto.nome}" criado com sucesso!`;
    }
    
    closeFormDialog();
    await fetchSetores(); // Atualiza a lista

  } catch (error: any) {
    console.error("Erro ao salvar setor:", error);
    if (error.response && error.response.data && error.response.data.error) {
      formError.value = error.response.data.error;
    } else {
      formError.value = "Ocorreu um erro ao tentar salvar. Verifique se o nome já existe.";
    }
  } finally {
    isSubmitting.value = false;
  }
};

// Deletar
const handleDeleteConfirm = async () => {
  if (!deletingSetor.value) return;

  isDeleting.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    const id = deletingSetor.value.setorId;
    await api.delete(`/api/v1/setores/${id}`);
    successMessage.value = `Setor "${deletingSetor.value.nome}" deletado com sucesso.`;
    closeDeleteDialog();
    await fetchSetores(); // Recarrega a tabela
  } catch (error: any) {
    console.error("Erro ao deletar setor:", error);
    errorMessage.value = "Ocorreu um erro ao tentar deletar o setor.";
  } finally {
    isDeleting.value = false;
  }
};


// Funções de Formatação (Helpers)
const formatarSetorPai = (setorPaiId: number | null) => {
  if (!setorPaiId) return '— (Raiz)';
  const setorPai = setores.value.find(s => s.setorId === setorPaiId);
  return setorPai ? setorPai.nome : `ID ${setorPaiId}`;
};

// Funções de Controle dos Modais
const openCreateDialog = () => {
  editingSetor.value = null;
  form.value = {
    nome: '',
    tipoCodigo: null,
    setorPaiId: null,
  };
  dialogForm.value = true;
};

const openEditDialog = (item: Setor) => {
  editingSetor.value = item;
  form.value = {
    nome: item.nome,
    tipoCodigo: item.tipo, // O backend envia 'tipo' (ex: 'IE'), que é o 'codigo'
    setorPaiId: item.setorPaiId,
  };
  dialogForm.value = true;
};

const closeFormDialog = () => {
  dialogForm.value = false;
};

const openDeleteDialog = (item: Setor) => {
  deletingSetor.value = item;
  dialogDelete.value = true;
};

const closeDeleteDialog = () => {
  dialogDelete.value = false;
  deletingSetor.value = null;
};


// Propriedades Computadas (para os Dropdowns do Modal)
const tipoSetorOptions = computed(() => {
  return tiposSetor.value.map(tipo => ({
    title: tipo.nome, 
    value: tipo.codigo, 
  }));
});

const setorPaiOptions = computed(() => {
  const options: { title: string, value: number | null }[] = setores.value.map(setor => ({
    title: `${setor.nome} (ID: ${setor.setorId})`,
    value: setor.setorId,
  }));
  options.unshift({ title: '— (Nenhum / Setor Raiz)', value: null as number | null });
  return options;
});


// Ciclo de Vida
onMounted(() => {
  fetchSetores(); 
  fetchTiposSetor(); 
});
</script>

<template>
  <div class="pa-4">
    <VRow class="mb-4 align-center">
      <VCol cols="12" md="6">
        <h1 class="text-h4">Gerenciar Estruturas (Setores)</h1>
      </VCol>
      <VCol cols="12" md="6" class="d-flex justify-end">
        <VBtn 
          color="primary" 
          @click="openCreateDialog" 
          prepend-icon="mdi-plus-box"
        >
          Novo Setor
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
        :items="setores"
        :loading="isLoading"
        item-value="setorId"
        class="elevation-1"
        no-data-text="Nenhum setor encontrado."
      >
        <template #item.tipo="{ item }">
          <VChip variant="tonal" size="small">
            {{ item.tipo }} 
          </VChip>
        </template>
        
        <template #item.setorPaiId="{ item }">
          <span>{{ formatarSetorPai(item.setorPaiId) }}</span>
        </template>

        <template #item.actions="{ item }">
          <v-tooltip location="top" text="Editar Setor">
            <template v-slot:activator="{ props }">
              <VBtn
                v-bind="props"
                icon
                color="blue"
                variant="text"
                size="small"
                @click="openEditDialog(item)"
              >
                <PhPencilSimple :size="20" />
              </VBtn>
            </template>
          </v-tooltip>

          <v-tooltip location="top" text="Deletar Setor">
            <template v-slot:activator="{ props }">
              <VBtn
                v-bind="props"
                icon
                color="red"
                variant="text"
                size="small"
                @click="openDeleteDialog(item)"
              >
                <PhTrash :size="20" />
              </VBtn>
            </template>
          </v-tooltip>
        </template>
        </VDataTable>
    </VCard>

    <VDialog v-model="dialogForm" max-width="600px" persistent>
      <VCard>
        <VCardTitle>
          <span class="text-h5">{{ isEditMode ? 'Editar Setor' : 'Criar Novo Setor' }}</span>
        </VCardTitle>
        <VCardText>
          <VAlert v-if="formError" type="error" variant="tonal" class="mb-4">
            {{ formError }}
          </VAlert>
          
          <VTextField
            label="Nome do Setor"
            v-model="form.nome"
            class="mb-4"
            hint="Ex: Escola Municipal Teste"
            persistent-hint
          />
          
          <VSelect
            label="Tipo de Setor"
            v-model="form.tipoCodigo"
            :items="tipoSetorOptions"
            class="mb-4"
            hint="Define o que esse setor é (Ex: 'IE' para escola)"
            persistent-hint
          />

          <VSelect
            label="Setor Pai (Opcional)"
            v-model="form.setorPaiId"
            :items="setorPaiOptions"
            hint="Selecione se este setor está 'dentro' de outro (Ex: SEED Central)"
            persistent-hint
            clearable
          />
          
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn text @click="closeFormDialog">Cancelar</VBtn>
          <VBtn 
            color="primary" 
            @click="handleSaveSetor" 
            :loading="isSubmitting"
          >
            Salvar Setor
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog v-model="dialogDelete" max-width="500px">
      <VCard>
        <VCardTitle class="text-h5">Confirmar Deleção</VCardTitle>
        <VCardText v-if="deletingSetor">
          Você tem certeza que deseja deletar o setor 
          <strong>"{{ deletingSetor.nome }}"</strong>?
          <br />
          <strong class="text-warning">
            Esta ação não pode ser desfeita.
          </strong>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn text @click="closeDeleteDialog">Cancelar</VBtn>
          <VBtn 
            color="red" 
            @click="handleDeleteConfirm" 
            :loading="isDeleting"
          >
            Sim, Deletar
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

  </div>
</template>