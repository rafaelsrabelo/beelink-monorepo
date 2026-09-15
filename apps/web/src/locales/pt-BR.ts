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
    navDashboard: "Painel",
    cardRevenue: "Receita total",
    cardNewAccounts: "Novas contas",
    cardActiveAccounts: "Contas ativas",
    cardGrowth: "Crescimento",
    cardRevenueFootnote: "Comparado ao mês passado",
    cardNewAccountsFootnote: "Queda no período",
    cardActiveAccountsFootnote: "Retenção acima da meta",
    cardGrowthFootnote: "Dentro da projeção",
    welcome: "Bem-vindo de volta, {name}",
    unverifiedBadge: "E-mail não confirmado",
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
    RATE_LIMITED: "Muitas tentativas. Espere um minuto e tente de novo.",
    UNKNOWN: "Algo deu errado. Tente de novo em instantes.",
  },
}
