/* ══════════════════════════════════════════════════════════════════
   RONYCODE — EDITE SEUS APLICATIVOS AQUI ✦
   ──────────────────────────────────────────────────────────────────
   Para adicionar ou trocar um aplicativo, edite um bloco como este:

   {
     nome: "Nome do App",          → o nome que aparece no cartão
     descricao: "Frase curta...",  → uma frase sobre o app
     imagem: "/apps/meu-app.jpg",  → coloque a imagem na pasta
                                     "public/apps" e use "/apps/nome.jpg"
                                     (deixe "" para um placeholder azul)
     link: "https://seuapp.com",   → para onde o cartão aponta
   }

   Para criar um NOVO cartão, copie um bloco inteiro { ... } e cole
   dentro da categoria desejada. O site atualiza sozinho. ✦
   ══════════════════════════════════════════════════════════════════ */

export interface AppItem {
  nome: string;
  descricao: string;
  imagem: string;
  link: string;
}

export type CategoriaId = "estudos" | "jogos" | "uteis" | "social";

export interface Categoria {
  id: CategoriaId;
  rotulo: string;
  titulo: string;
  descricao: string;
  apps: AppItem[];
}

export const categorias: Categoria[] = [
  {
    id: "estudos",
    rotulo: "Categoria.01",
    titulo: "Estudos",
    descricao:
      "Ferramentas para aprender melhor: foco, revisão, quizzes e tudo que ajuda na hora de estudar.",
    apps: [
      {
        nome: "Funções Matemáticas",
        descricao: "Funções matemáticas com fórmulas, gráficos e principais propriedades para estudo e consulta rápida.",
        imagem: "/apps/estudos-1.jpg",
        link: "#",
      },
      {
        nome: "QuizMaster",
        descricao: "Quizzes rápidos para revisar qualquer matéria jogando.",
        imagem: "/apps/estudos-2.jpg",
        link: "#",
      },
      {
        nome: "Notas Rápidas",
        descricao: "Bloco de anotações direto no navegador, sem cadastro.",
        imagem: "",
        link: "#",
      },
    ],
  },
  {
    id: "jogos",
    rotulo: "Categoria.02",
    titulo: "Jogos",
    descricao:
      "Projetos jogáveis feitos por diversão e experimentação: clássicos repaginados e ideias novas.",
    apps: [
      {
        nome: "Neon Run",
        descricao: "Corredor infinito em neon com obstáculos gerados ao acaso.",
        imagem: "/apps/jogos-1.jpg",
        link: "#",
      },
      {
        nome: "Memória X",
        descricao: "Jogo da memória com níveis progressivos e ranking local.",
        imagem: "/apps/jogos-2.jpg",
        link: "#",
      },
      {
        nome: "Snake 2.0",
        descricao: "O clássico jogo da cobrinha com visual moderno e fases.",
        imagem: "",
        link: "#",
      },
    ],
  },
  {
    id: "uteis",
    rotulo: "Categoria.03",
    titulo: "Úteis",
    descricao:
      "Ferramentas do dia a dia: conversores, geradores e calculadoras que resolvem problemas reais.",
    apps: [
      {
        nome: "Conversor Pro",
        descricao: "Converta unidades, moedas e formatos em segundos.",
        imagem: "/apps/uteis-1.jpg",
        link: "#",
      },
      {
        nome: "CalcHub",
        descricao: "Calculadoras rápidas: porcentagem, IMC, juros e mais.",
        imagem: "/apps/uteis-2.jpg",
        link: "#",
      },
      {
        nome: "Gerador de Senha",
        descricao: "Senhas fortes e aleatórias com um clique, nada é salvo.",
        imagem: "",
        link: "#",
      },
    ],
  },
  {
    id: "social",
    rotulo: "Categoria.04",
    titulo: "Social",
    descricao:
      "Onde me encontrar e interagir: chats, links e experimentos comunitários da plataforma.",
    apps: [
      {
        nome: "ChatWave",
        descricao: "Sala de bate-papo em tempo real para conversar com amigos.",
        imagem: "/apps/social-1.jpg",
        link: "#",
      },
      {
        nome: "Meus Links",
        descricao: "Todos os meus perfis e redes sociais em uma página só.",
        imagem: "/apps/social-2.jpg",
        link: "#",
      },
      {
        nome: "Comenta Aí",
        descricao: "Mural aberto para deixar recados e sugestões de apps.",
        imagem: "",
        link: "#",
      },
    ],
  },
];

export const totalApps = categorias.reduce((acc, c) => acc + c.apps.length, 0);
