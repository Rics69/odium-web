// Interface texts in Russian. Code never contains Russian strings: it takes
// them from here by key (a test checks both directions), so English later is
// one more file of the same shape.
export const ru = {
  site: {
    description: "Игровая студия Odium: наши игры и доска пожеланий игроков.",
  },
  nav: {
    skip: "Перейти к содержимому",
    label: "Основное меню",
    logo: "Odium — на главную",
    games: "Игры",
  },
  studio: {
    mission:
      "Мы делаем игры, чтобы накопить на мечту — игру, которая будет как искусство.",
  },
  footer: {
    missionLabel: "Наша цель",
    piggyBank: "Копилка мечты",
    linksLabel: "Ссылки",
    socialsLabel: "Мы в соцсетях",
    copyright: "© {year} Odium",
  },
  home: {
    comingSoon: "Скоро здесь будет сайт студии.",
  },
  games: {
    title: "Игры",
    comingSoonTitle: "Каталог уже в пути",
    comingSoonText:
      "Скоро здесь будут все игры Odium — с описаниями, скриншотами и доской пожеланий.",
  },
  notFound: {
    title: "Такой страницы нет",
    text: "Может, она ещё в разработке. А может, в ссылке опечатка.",
    home: "На главную",
  },
  error: {
    title: "Что-то сломалось",
    text: "Мы уже разбираемся. Попробуйте ещё раз — обычно помогает.",
    retry: "Попробовать ещё раз",
    home: "На главную",
  },
  time: {
    justNow: "только что",
  },
} as const;
