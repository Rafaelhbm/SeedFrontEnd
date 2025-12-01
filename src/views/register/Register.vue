<script setup lang="ts">
import { ref, computed } from "vue";
import {
  PhUser,
  PhLock,
  PhEnvelope,
  PhPhone,
  PhMapPin,
  PhCalendar,
  PhCaretRight,
  PhChatText,
} from "@phosphor-icons/vue";
import { useRouter } from "vue-router";
import axios from 'axios';

const router = useRouter();
const API_URL = 'http://localhost:5046';

// O form de acordo com o DTO do Backend
const form = ref({
  nomeCompleto: "",
  email: "",
  perfilDesejadoId: null,
  justificativa: "" 
});

const year = new Date().getFullYear();
const isLoading = ref(false);
const isValid = ref(false);
const errorMessage = ref('');

// IDs corretos do mock_insert.sql
const perfisDisponiveis = ref([
  { id: 4, nome: 'Diretor de IE' },
  { id: 5, nome: 'Analista de Compras' },
  { id: 6, nome: 'Usuário Padrão (IE)' }
]);

// Regras de validação
const required = (v: string) => !!v || "Obrigatório";
const emailRule = (v: string) => /.+@.+\..+/.test(v) || "E-mail inválido";

// Computada atualizada para o novo formulário
const isFormComplete = computed(() => {
  return form.value.nomeCompleto && form.value.email && form.value.perfilDesejadoId && form.value.justificativa;
});

const handleRequestAccess = async () => {
  if (!isFormComplete.value) return;
  
  isLoading.value = true;
  errorMessage.value = '';

  try {
    await axios.post(
      `${API_URL}/api/v1/solicitacoes-acesso`,
      {
        NomeCompleto: form.value.nomeCompleto,
        Email: form.value.email,
        Justificativa: form.value.justificativa,
        PerfilDesejadoId: form.value.perfilDesejadoId 
      }
    );

    // Sucesso - Redireciona
    router.push({ path: "/requested-account" });

  } catch (error: any) {
    console.error(error);
    if (error.response && error.response.status === 409) {
      errorMessage.value = 'Este e-mail já está cadastrado ou possui uma solicitação pendente.';
    } else {
      errorMessage.value = 'Erro ao enviar solicitação. Tente novamente mais tarde.';
    }
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen bg-white flex w-[100%]">
    <div
      class="flex flex-col h-auto justify-center p-8 w-[34%] bg-[linear-gradient(180deg,var(--color-primary)_0%,var(--color-secondary)_23.44%,var(--color-terciary)_100%)]"
    >
      <div class="w-full flex justify-center h-[97%] align-center">
        <img
          src="/src/assets/images/logo.svg"
          alt="Login illustration"
          class="w-[70%] h-auto"
        />
      </div>
      <div class="flex w-full justify-center h-[3%] align-bottom">
        <p class="text-gray-400 text-center mt-2 text-md">
          Dashboard @ Central de Custos - {{ year }}
        </p>
      </div>
    </div>

    <div
      class="flex-1 flex items-center justify-center px-8 lg:px-16 bg-white w-[66%]"
    >
      <div class="w-full max-w-4xl">
        <div class="flex flex-col items-center mb-8">
          <h1 class="font-bold text-4xl text-center">Solicitar Acesso</h1>
        </div>

        <VForm @submit.prevent="handleRequestAccess" v-model="isValid">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            
            <VTextField
              v-model="form.nomeCompleto"
              label="Nome completo"
              type="text"
              variant="outlined"
              :rules="[required]"
            >
              <template #prepend-inner>
                <PhUser class="w-5 h-5 text-gray-500" />
              </template>
            </VTextField>

            <VTextField
              v-model="form.email"
              label="E-mail"
              type="email"
              variant="outlined"
              :rules="[required, emailRule]"
            >
              <template #prepend-inner>
                <PhEnvelope class="w-5 h-5 text-gray-500" />
              </template>
            </VTextField>

            <VSelect
              v-model="form.perfilDesejadoId"
              label="Perfil desejado"
              :items="perfisDisponiveis"
              item-title="nome"
              item-value="id"
              variant="outlined"
              :rules="[required]"
              class="md:col-span-2"
            >
              <template #prepend-inner>
                <PhUser class="w-5 h-5 text-gray-500" />
              </template>
            </VSelect>

            <VTextarea
              v-model="form.justificativa"
              label="Justificativa"
              variant="outlined"
              :rules="[required]"
              class="md:col-span-2"
              rows="3"
            >
              <template #prepend-inner>
                <PhChatText class="w-5 h-5 text-gray-500" />
              </template>
            </VTextarea>

          </div>

          <VAlert
            v-if="errorMessage"
            type="error"
            variant="tonal"
            class="mb-4"
          >
            {{ errorMessage }}
          </VAlert>

          <div class="w-full justify-center">
              <VBtn
                @click="handleRequestAccess"
                @keydown.enter="handleRequestAccess"
                type="submit"
                :loading="isLoading"
                color="primary"
                class="w-full rounded-lg font-medium hover:bg-primary transition"
                :disabled="!isFormComplete || isLoading"
                size="large"
              >
                Solicitar acesso
                <PhCaretRight size="22" />
              </VBtn>
          </div>

        </VForm>
      </div>
    </div>
  </div>
</template>