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
  game: {
    wishCta: "Оставить пожелание",
    aboutLabel: "Об игре",
    status: "Статус",
    releaseDate: "Дата выхода",
    genre: "Жанр",
    platforms: "Платформы",
    soonIn: "Скоро в {store}",
    screenshots: "Скриншоты",
    trailer: "Трейлер",
    playTrailer: "Смотреть трейлер «{game}»",
    wishesTitle: "Пожелания игроков",
    wishesEmpty:
      "Пожеланий пока нет. Расскажите первым, что добавить в игру или убрать из неё.",
    coverAlt: "Обложка игры «{game}»",
    ogAlt: "Игра студии Odium",
  },
  gallery: {
    open: "Открыть скриншот {number} из {total}",
    title: "Скриншоты «{game}»",
    previous: "Предыдущий скриншот",
    next: "Следующий скриншот",
    counter: "{current} из {total}",
  },
  stores: {
    google_play: "Google Play",
    rustore: "RuStore",
    appgallery: "AppGallery",
    app_store: "App Store",
    yandex_games: "Яндекс Игры",
    steam: "Steam",
    web: "Сайт игры",
  },
  board: {
    title: "Доска пожеланий",
    soonTitle: "Доска откроется совсем скоро",
    soonText:
      "Здесь можно будет предлагать, что добавить в игру или убрать из неё, и голосовать за идеи других игроков.",
    back: "К игре",
  },
  common: {
    close: "Закрыть",
  },
  notFound: {
    title: "Такой страницы нет",
    text: "Может, она ещё в разработке. А может, в ссылке опечатка.",
    home: "На главную",
  },
  errors: {
    validation: "Проверьте, что всё заполнено правильно.",
    forbidden: "Нет доступа.",
    notFound: "Ничего не нашлось.",
    rateLimitedMinutes: {
      one: "Слишком часто, попробуйте через {count} минуту.",
      few: "Слишком часто, попробуйте через {count} минуты.",
      many: "Слишком часто, попробуйте через {count} минут.",
      other: "Слишком часто, попробуйте через {count} минуты.",
    },
    rateLimitedHours: {
      one: "Слишком часто, попробуйте через {count} час.",
      few: "Слишком часто, попробуйте через {count} часа.",
      many: "Слишком часто, попробуйте через {count} часов.",
      other: "Слишком часто, попробуйте через {count} часа.",
    },
    internal: "У нас что-то сломалось. Попробуйте ещё раз чуть позже.",
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
