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

   Seus apps em HTML puro ficam em "public/RONYCODE/...". Tudo que está
   dentro de "public" é servido na raiz do site, então o arquivo
   public/RONYCODE/Estudos/funcoes(01)/index.html
   abre em  →  /RONYCODE/Estudos/funcoes(01)/index.html

   Importante: aponte sempre para o arquivo final (".../index.html").
   Sem o "index.html" o Vite devolve a página do site em vez do app.

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
        link: "/RONYCODE/Estudos/funcoes(01)/index.html",
      },
      {
        nome: "Calculadora",
        descricao: "Calculadora padrão com botões interativos e suporte ao teclado físico para resolver contas rápidas.",
        imagem: "/apps/estudos-calculadora.jpg",
        link: "/RONYCODE/Estudos/calculadorabasica(02)/index.html",
      },
      {
        nome: "Tabela Periódica",
        descricao: "Uma tabela periódica interativa.",
        imagem: "/apps/tabela-periodica.jpg",
        link: "/RONYCODE/Estudos/tabelaperiodica(03)/index.html",
      },
      {
        nome: "Dicionário de fórmulas",
        descricao: "As fórmulas mais importantes do ensino médio.",
        imagem: "/apps/estudos-formulas.jpg",
        link: "/RONYCODE/Estudos/formulas(04)/index.html",
      },
      {
        nome: "Células — Explorador 3D",
        descricao: "Explorador 3D interativo de células procariontes e eucariontes (animal e vegetal), com estruturas clicáveis.",
        imagem: "/apps/estudos-citologia.jpg",
        link: "/RONYCODE/Estudos/citologia(05)/index.html",
      },
      {
        nome: "Corpo Humano — Atlas 3D",
        descricao: "Atlas interativo com modelo 3D do corpo humano, destaque por sistema, estruturas clicáveis e doenças.",
        imagem: "/apps/estudos-sistemas.jpg",
        link: "/RONYCODE/Estudos/sistemas(06)/index.html",
      },
      {
        nome: "Atlas Geográfico",
        descricao: "Mapa-múndi interativo com países, filtro por continente e mapa do Brasil com todos os estados.",
        imagem: "/apps/estudos-atlas.jpg",
        link: "/RONYCODE/Estudos/Atlas(07)/index.html",
      },
      {
        nome: "Eras Geológicas",
        descricao: "Linha do tempo da Terra do Hadeano ao Holoceno, com vida, clima, eventos e extinções em massa.",
        imagem: "/apps/estudos-eras.jpg",
        link: "/RONYCODE/Estudos/eras(08)/index.html",
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
        nome: "Roleta da Fortuna",
        descricao: "Treinamento para a sorte",
        imagem: "/apps/roleta-fortuna.jpg",
        link: "/RONYCODE/Jogos/rodafortuna(02)/index.html",
      },
      {
        nome: "Jogo dos países",
        descricao: "Um jogo para governantes.",
        imagem: "/apps/jogo-paises.jpg",
        link: "/RONYCODE/Jogos/jogopaises(01)/index.html",
      },
      {
        nome: "Minicraft",
        descricao: "Clássico.",
        imagem: "/apps/jogos-minicraft.jpg",
        link: "/RONYCODE/Jogos/minicraft(03)/craft.html",
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
        nome: "Sons dos animais",
        descricao: "Ouça o som desses animais.",
        imagem: "/apps/sons-animais.jpg",
        link: "/RONYCODE/Úteis/Sons(01)/fauna.html",
      },
      {
        nome: "Encurtador de Link",
        descricao: "Diminua seu link rapidamente.",
        imagem: "/apps/encurtador-link.jpg",
        link: "/RONYCODE/Úteis/diminuilink(02)/index.html",
      },
      {
        nome: "Lançador de Dados 3D",
        descricao: "Escolha o número de lados e role o dado: precisão garantida e chances iguais.",
        imagem: "/apps/uteis-dados.jpg",
        link: "/RONYCODE/Úteis/dados(03)/index.html",
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
        nome: "Romanov",
        descricao: "Rede social para filósofos.",
        imagem: "/apps/social-1.jpg",
        link: "shorturl.sh/romanov",
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
