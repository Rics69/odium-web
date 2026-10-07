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
      "Каждая наша игра — шаг к мечте: создать игру, поставленную как кино, — с режиссурой, светом и историей, от которой невозможно оторваться.",
  },
  footer: {
    missionLabel: "Наша цель",
    piggyBank: "Копилка мечты",
    linksLabel: "Ссылки",
    socialsLabel: "Мы в соцсетях",
    copyright: "© {year} Odium",
  },
  home: {
    gamesCta: "Наши игры",
    gamesLabel: "Игры",
    gamesTitle: "Во что поиграть",
    aboutLabel: "О студии",
    statGames: { one: "игра", few: "игры", many: "игр", other: "игры" },
    statTeam: {
      one: "человек",
      few: "человека",
      many: "человек",
      other: "человека",
    },
    statPlatforms: "Платформы",
    statGenres: "Жанры",
    teamLabel: "Команда",
    teamTitle: "Кто делает игры",
  },
  gameStatus: {
    released: "Вышла",
    in_development: "В разработке",
  },
  platforms: {
    android: "Android",
    ios: "iOS",
    pc: "ПК",
    browser: "Браузер",
  },
  game: {
    comingSoonTitle: "Страница игры уже в пути",
    comingSoonText:
      "Скоро здесь будут описание, скриншоты, трейлер и доска пожеланий.",
  },
  games: {
    title: "Игры",
    description: "Все игры студии Odium: что уже вышло и что мы делаем сейчас.",
    wishes: {
      one: "{count} пожелание",
      few: "{count} пожелания",
      many: "{count} пожеланий",
      other: "{count} пожелания",
    },
    noWishes: "Пока без пожеланий",
    noGamesTitle: "Игр пока нет",
    noGamesText: "Первая выйдет совсем скоро — загляните чуть позже.",
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
