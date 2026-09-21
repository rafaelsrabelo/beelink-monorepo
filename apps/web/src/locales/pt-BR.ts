// Locales
import type { WebMessages } from "./messages"

export const ptBR: WebMessages = {
  metadata: {
    title: "Harness",
    description: "Starter de autenticação do harness-monorepo",
  },
  auth: {
    signupSuccessTitle: "Confira seu e-mail",
    signupSuccessDescription: "Enviamos um link para confirmar sua conta",
    signupSuccessBody: "O link vale por 24 horas e só pode ser usado uma vez. Não esqueça de olhar o spam.",
    resend: "Enviar novo link",
    resending: "Enviando…",
    resent: "Enviamos um novo link.",
    goToSignIn: "Ir para a tela de entrada",
    missingToken: "Este endereço não tem um link válido. Abra o link direto do e-mail.",
  },
  dashboard: {
    title: "Painel",
    welcome: "Bem-vindo de volta, {name}",
    unverifiedBadge: "E-mail não confirmado",
  },
  stores: {
    nav: {
      list: "Minhas lojas",
      overview: "Visão geral",
      settings: "Configurações da loja",
    },
    list: {
      description: "Escolha uma loja para gerenciar ou crie mais uma.",
      create: "Nova loja",
    },
    overview: {
      description: "É assim que os clientes chegam até a {name}.",
    },
    settings: {
      saved: "Alterações salvas.",
    },
  },
  locale: {
    label: "Idioma",
    ptBR: "Português",
    en: "English",
  },
  errors: {
    AUTH_EMAIL_TAKEN: "Este e-mail já está cadastrado.",
    AUTH_INVALID_CREDENTIALS: "E-mail ou senha incorretos.",
    AUTH_EMAIL_NOT_VERIFIED: "Confirme seu e-mail antes de entrar. Enviamos um link quando você criou a conta.",
    AUTH_TOKEN_INVALID: "Este link expirou ou já foi usado. Peça um novo.",
    AUTH_REFRESH_REUSED: "Sua sessão foi encerrada por segurança. Entre de novo.",
    AUTH_UNAUTHENTICATED: "Faça login para continuar.",
    STORE_NOT_FOUND: "Esta loja não existe mais.",
    STORE_SLUG_TAKEN: "Este endereço já está em uso. Escolha outro.",
    STORE_SLUG_RESERVED: "Este endereço é reservado pelo sistema. Escolha outro.",
    STORE_FORBIDDEN: "Esta loja não é sua.",
    STORE_CATEGORY_NOT_FOUND: "Esta categoria não existe mais. Escolha outra.",
    RATE_LIMITED: "Muitas tentativas. Espere um minuto e tente de novo.",
    BAD_REQUEST: "Algum campo não foi aceito. As abas com aviso são as que precisam de correção.",
    UNAUTHORIZED: "Faça login para continuar.",
    FORBIDDEN: "Você não tem permissão para fazer isso.",
    NOT_FOUND: "Não encontramos o que você pediu.",
    CONFLICT: "Isto já existe. Escolha outro valor.",
    PAYLOAD_TOO_LARGE: "O arquivo é grande demais. Envie uma imagem menor.",
    UNSUPPORTED_MEDIA_TYPE: "Este formato de arquivo não é aceito.",
    TOO_MANY_REQUESTS: "Muitas tentativas. Espere um minuto e tente de novo.",
    INTERNAL_ERROR: "Algo quebrou do nosso lado. Tente de novo em instantes.",
    INTERNAL_SERVER_ERROR: "Algo quebrou do nosso lado. Tente de novo em instantes.",
    BAD_GATEWAY: "Um serviço de que dependemos não respondeu. Tente de novo em instantes.",
    SERVICE_UNAVAILABLE: "O serviço está fora do ar no momento. Tente de novo em instantes.",
    CEP_INVALID: "Um CEP tem oito dígitos. Confira o que você digitou.",
    CEP_NOT_FOUND: "Não encontramos este CEP. Confira os números ou preencha o endereço à mão.",
    CEP_UNAVAILABLE: "A busca de CEP não respondeu. Preencha o endereço à mão — isso não impede de salvar.",
    UPLOAD_NOT_CONFIGURED: "O envio de imagens ainda não está configurado neste ambiente.",
    UNKNOWN: "Algo deu errado. Tente de novo em instantes.",
  },
}
