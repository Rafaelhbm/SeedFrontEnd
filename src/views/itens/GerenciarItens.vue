<template>
    <v-container fluid>
      <v-row>
        <v-col>
          <v-card>
            <v-card-title class="d-flex align-center">
              <v-icon icon="mdi-package-variant-closed" class="mr-2"></v-icon>
              Gerenciar Itens
              <v-spacer></v-spacer>
              <v-btn color="primary" @click="abrirModal(null)">
                <v-icon icon="mdi-plus" class="mr-2"></v-icon>
                Novo Item
              </v-btn>
            </v-card-title>
            
            <v-card-text>
              <v-data-table
                :headers="headers"
                :items="itens"
                :loading="loading"
                items-per-page-text="Itens por página"
              >
                <template v-slot:item.acoes="{ item }">
                  <v-tooltip location="top" text="Editar Item">
                    <template v-slot:activator="{ props }">
                      <VBtn
                        v-bind="props"
                        icon
                        color="blue"
                        variant="text"
                        size="small"
                        @click="abrirModal(item)"
                      >
                        <PhPencilSimple :size="20" />
                      </VBtn>
                    </template>
                  </v-tooltip>
                  
                  <v-tooltip location="top" text="Excluir Item">
                    <template v-slot:activator="{ props }">
                      <VBtn
                        v-bind="props"
                        icon
                        color="red"
                        variant="text"
                        size="small"
                        @click="abrirModalExcluir(item)"
                      >
                        <PhTrash :size="20" />
                      </VBtn>
                    </template>
                  </v-tooltip>
                </template>
                
                <template v-slot:no-data>
                  <v-alert :value="true" color="info" icon="mdi-information">
                    Nenhum item encontrado.
                  </v-alert>
                </template>
              </v-data-table>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
  
      <v-dialog v-model="dialog" max-width="600px" persistent>
        <v-card>
          <v-card-title>
            <span class="headline">{{ modalTitle }}</span>
          </v-card-title>
          <v-card-text>
            <v-form ref="form" v-model="valid" lazy-validation>
              <v-text-field
                v-model="itemEditado.nome"
                :rules="[rules.required]"
                label="Nome do Item"
                prepend-inner-icon="mdi-label"
                required
              ></v-text-field>
              
              <v-text-field
                v-model="itemEditado.unidadeDeMedida"
                :rules="[rules.required]"
                label="Unidade de Medida"
                prepend-inner-icon="mdi-ruler"
                placeholder="Ex: Litros, Watts, etc."
                required
              ></v-text-field>
  
              <v-text-field
                v-model="itemEditado.descricao"
                label="Descrição (Opcional)"
                prepend-inner-icon="mdi-text-box"
              ></v-text-field>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="blue darken-1" text @click="fecharModal">Cancelar</v-btn>
            <v-btn color="primary" :disabled="!valid" @click="salvarItem">Salvar</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
  
      <v-dialog v-model="dialogExcluir" max-width="500px">
        <v-card>
          <v-card-title class="headline">Confirmar Exclusão</v-card-title>
          <v-card-text>
            Tem certeza que deseja excluir o item <strong>{{ (itemEditado as Item).nome }}</strong>? Esta ação não pode ser desfeita.
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="blue darken-1" text @click="fecharModalExcluir">Cancelar</v-btn>
            <v-btn color="error" @click="excluirItemConfirmado">Excluir</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
  
    </v-container>
  </template>
  
  <script setup lang="ts">
  import { ref, onMounted, computed } from 'vue';
  import { PhPencilSimple, PhTrash } from "@phosphor-icons/vue";
  import api from '@/services/api';
  
  // Interface para tipar o objeto Item
  interface Item {
    itemId: number;
    nome: string;
    descricao: string | null;
    unidadeDeMedida: string;
  }
  
  // Estado reativo
  const itens = ref<Item[]>([]);
  const loading = ref(true);
  const dialog = ref(false);
  const dialogExcluir = ref(false);
  const valid = ref(false);
  const form = ref<any>(null); // Referência para o formulário
  
  // Modelo para o item sendo editado/criado
  const itemDefault: Omit<Item, 'itemId'> = {
    nome: '',
    descricao: null,
    unidadeDeMedida: ''
  };
  const itemEditado = ref<Item | Omit<Item, 'itemId'>>(JSON.parse(JSON.stringify(itemDefault)));
  const editando = ref(false);
  
  const headers = [
    { title: 'Nome do Item', key: 'nome', align: 'start', sortable: true },
    { title: 'Unidade de Medida', key: 'unidadeDeMedida', align: 'start', sortable: true },
    { title: 'Descrição', key: 'descricao', align: 'start', sortable: false },
    { title: 'Ações', key: 'acoes', align: 'center', sortable: false }
  ] as const;
  
  // Regras de validação
  const rules = {
    required: (v: string) => !!v || 'Campo obrigatório'
  };
  
  // Título do modal (Criar ou Editar)
  const modalTitle = computed(() => {
    return editando.value ? 'Editar Item' : 'Novo Item';
  });
  
  // Buscar todos os itens da API
  const carregarItens = async () => {
    loading.value = true;
    try {
      // 2. USA O 'api.get' (não precisa de token manual)
      const response = await api.get('/api/v1/itens'); 
      itens.value = response.data;
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
    } finally {
      loading.value = false;
    }
  };
  
  // Abrir o modal (para criar ou editar)
  const abrirModal = (item: Item | null) => {
    if (item) {
      itemEditado.value = JSON.parse(JSON.stringify(item));
      editando.value = true;
    } else {
      itemEditado.value = JSON.parse(JSON.stringify(itemDefault));
      editando.value = false;
    }
    dialog.value = true;
  };
  
  // Fechar o modal
  const fecharModal = () => {
    dialog.value = false;
    form.value?.resetValidation();
  };
  
  // Salvar (Criar ou Editar)
  const salvarItem = async () => {
    await form.value?.validate();
    if (!valid.value) return;
  
    const dto = {
      nome: (itemEditado.value as Item).nome,
      descricao: (itemEditado.value as Item).descricao,
      unidadeDeMedida: (itemEditado.value as Item).unidadeDeMedida
    };
  
    try {
      if (editando.value) {
        const itemId = (itemEditado.value as Item).itemId;
        // 3. USA O 'api.put'
        await api.put(`/api/v1/itens/${itemId}`, dto);
      } else {
        // 4. USA O 'api.post'
        await api.post('/api/v1/itens', dto);
      }
      
      fecharModal();
      await carregarItens(); // Recarrega a lista
      
    } catch (error) {
      console.error('Erro ao salvar item:', error);
    }
  };
  
  // Abrir modal de exclusão
  const abrirModalExcluir = (item: Item) => {
    itemEditado.value = JSON.parse(JSON.stringify(item));
    dialogExcluir.value = true;
  };
  
  // Fechar modal de exclusão
  const fecharModalExcluir = () => {
    dialogExcluir.value = false;
  };
  
  // Confirmar exclusão
  const excluirItemConfirmado = async () => {
    const itemId = (itemEditado.value as Item).itemId;
  
    try {
      // 5. USA O 'api.delete'
      await api.delete(`/api/v1/itens/${itemId}`);
      fecharModalExcluir();
      await carregarItens(); // Recarrega a lista
      
    } catch (error) {
      console.error('Erro ao excluir item:', error);
    }
  };
  
  // Carregar os itens ao montar a página
  onMounted(carregarItens);
  </script>