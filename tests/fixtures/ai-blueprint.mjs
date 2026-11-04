export const blueprint = {
  name: "SaudeFIT",
  slug: "saudefit",
  template: "classic",
  design: {
    navigation: { layout: "hybrid" },
    contact: { mode: "compact", maxWidth: 420 },
    footer: { layout: "columns" },
    partners: { layout: "cards" },
  },
  rationale:
    "Portal editorial para movimento e bem-estar, com leitura clara e seções temáticas.",
  identity: {
    color: "#176848",
    accentColor: "#d5ef91",
    surfaceColor: "#ffffff",
    textColor: "#20352a",
    font: "sans",
    tagline: "Movimento para viver melhor.",
    description:
      "Conteúdo editorial sobre hábitos, movimento e qualidade de vida.",
    seoTitle: "SaudeFIT | Movimento e bem-estar",
    seoDescription:
      "Ideias para uma rotina mais ativa, com foco em hábitos e qualidade de vida.",
    welcomeTitle: "Conheça o SaudeFIT",
    welcomeText:
      "Um espaço editorial dedicado a explorar movimento, hábitos e bem-estar com uma linguagem acessível.",
    footer: "SaudeFIT — Informação e movimento.",
  },
  categories: [
    { name: "Movimento", slug: "movimento" },
    { name: "Bem-estar", slug: "bem-estar" },
  ],
  sections: [
    {
      type: "lead",
      title: "Em destaque",
      categorySlug: "",
      text: "",
      layout: "news",
      position: "header",
    },
    {
      type: "category",
      title: "Movimento",
      categorySlug: "movimento",
      text: "",
      layout: "news",
      position: "category",
    },
    {
      type: "category",
      title: "Bem-estar",
      categorySlug: "bem-estar",
      text: "",
      layout: "magazine",
      position: "category",
    },
  ],
  pages: [
    {
      title: "Sobre o SaudeFIT",
      slug: "sobre",
      body: "O SaudeFIT é um projeto editorial dedicado a informar e inspirar uma rotina mais ativa.",
    },
  ],
  articles: [
    {
      title: "Como organizar uma rotina de movimento",
      slug: "rotina-de-movimento",
      subtitle: "Um ponto de partida para pensar seus hábitos.",
      body: "Organizar a rotina começa com observar os próprios horários e interesses. Este texto editorial inicial convida à reflexão sobre possibilidades de movimento no cotidiano e deve ser revisado antes de sua publicação.",
      categorySlug: "movimento",
      tags: ["rotina"],
      seoTitle: "Rotina de movimento | SaudeFIT",
      seoDescription:
        "Uma reflexão editorial sobre hábitos de movimento no cotidiano.",
    },
  ],
};
