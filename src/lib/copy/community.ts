/** Community feed, composer and sidebar copy. */

import type { CopyDict } from "./index";

export const COMMUNITY_COPY: CopyDict = {
  "nav.community": { en: "Community", ru: "Сообщество", kk: "Қауымдастық" },
  "nav.sCommunity": { en: "Feed", ru: "Лента", kk: "Тізбек" },
  "side.social": { en: "Community", ru: "Сообщество", kk: "Қауымдастық" },

  "community.title": { en: "Community", ru: "Сообщество", kk: "Қауымдастық" },
  "community.subtitle": {
    en: "Learn together. Improve together.",
    ru: "Учитесь вместе. Растите вместе.",
    kk: "Бірге оқыңыз. Бірге өсіңіз.",
  },

  "community.tabForYou": { en: "For You", ru: "Для вас", kk: "Сізге" },
  "community.tabFollowing": { en: "Following", ru: "Подписки", kk: "Жазылымдар" },
  "community.tabQuestions": { en: "Questions", ru: "Вопросы", kk: "Сұрақтар" },
  "community.tabWins": { en: "Wins", ru: "Победы", kk: "Жетістіктер" },

  "community.composerPrompt": {
    en: "Share something with the community…",
    ru: "Поделитесь чем-то с сообществом…",
    kk: "Қауымдастықпен бөлісіңіз…",
  },

  "community.postTypeQuestion": { en: "Ask a Question", ru: "Задать вопрос", kk: "Сұрақ қою" },
  "community.postTypeProgress": { en: "Share Progress", ru: "Поделиться прогрессом", kk: "Үлгерімді бөлісу" },
  "community.postTypeAchievement": { en: "Achievement", ru: "Достижение", kk: "Жетістік" },
  "community.postTypeExplanation": { en: "Explain Something", ru: "Объяснить тему", kk: "Тақырыпты түсіндіру" },
  "community.postTypeStudyUpdate": { en: "Study Update", ru: "Итоги занятия", kk: "Сабақ қорытындысы" },
  "community.postTypeResource": { en: "Share Resource", ru: "Поделиться материалом", kk: "Материалмен бөлісу" },

  "community.postTypeQuestionHint": {
    en: "Get help with an exam problem",
    ru: "Попросите помощь с заданием экзамена",
    kk: "Емтихан тапсырмасына көмек сұраңыз",
  },
  "community.postTypeProgressHint": {
    en: "Score improvement, streaks, practice progress",
    ru: "Рост балла, серия дней, прогресс практики",
    kk: "Балл өсуі, серия, жаттығу үлгерімі",
  },
  "community.postTypeAchievementHint": {
    en: "A personal milestone",
    ru: "Личный рубеж или рекорд",
    kk: "Жеке белес немесе рекорд",
  },
  "community.postTypeExplanationHint": {
    en: "A useful explanation for others",
    ru: "Полезное объяснение для других",
    kk: "Басқаларға пайдалы түсіндірме",
  },
  "community.postTypeStudyUpdateHint": {
    en: "A summary of a practice session",
    ru: "Итоги сессии практики",
    kk: "Жаттығу сессиясының қорытындысы",
  },
  "community.postTypeResourceHint": {
    en: "Useful notes or a resource",
    ru: "Конспект или полезная ссылка",
    kk: "Конспект немесе пайдалы сілтеме",
  },

  "community.composerChooseType": {
    en: "What would you like to share?",
    ru: "Что хотите опубликовать?",
    kk: "Немен бөліскіңіз келеді?",
  },
  "community.composerSubject": { en: "Subject", ru: "Предмет", kk: "Пән" },
  "community.composerTopic": { en: "Topic (optional)", ru: "Тема (необязательно)", kk: "Тақырып (қажет болса)" },
  "community.composerBody": { en: "Details", ru: "Текст", kk: "Мәтін" },
  "community.composerMyAnswer": { en: "My answer", ru: "Мой ответ", kk: "Менің жауабым" },
  "community.composerCorrectAnswer": { en: "Correct answer", ru: "Правильный ответ", kk: "Дұрыс жауап" },
  "community.composerFromScore": { en: "Previous score", ru: "Было", kk: "Бұрын" },
  "community.composerToScore": { en: "New score", ru: "Стало", kk: "Қазір" },
  "community.composerMathScore": { en: "Math", ru: "Математика", kk: "Математика" },
  "community.composerRwScore": { en: "Reading & Writing", ru: "Чтение и письмо", kk: "Оқу және жазу" },
  "community.composerMockLabel": { en: "Mock test label", ru: "Название теста", kk: "Тест атауы" },
  "community.composerAchievementTitle": { en: "Achievement title", ru: "Название достижения", kk: "Жетістік атауы" },
  "community.composerExplanationTitle": { en: "Headline", ru: "Заголовок объяснения", kk: "Түсіндірме тақырыбы" },
  "community.composerDetail": { en: "Detail (optional)", ru: "Детали (необязательно)", kk: "Толығырақ (қажет болса)" },
  "community.composerQuestionsCount": { en: "Questions completed", ru: "Количество вопросов", kk: "Сұрақ саны" },
  "community.composerAccuracy": { en: "Accuracy, %", ru: "Точность, %", kk: "Дәлдік, %" },
  "community.composerResourceTitle": { en: "Resource title", ru: "Название материала", kk: "Материал атауы" },
  "community.composerBodyPlaceholderQuestion": {
    en: "What's the question you got stuck on?",
    ru: "Какое задание вызвало затруднение?",
    kk: "Қандай тапсырма қиынға соқты?",
  },
  "community.composerBodyPlaceholderExplanation": {
    en: "Explain it in a few sentences…",
    ru: "Объясните в нескольких предложениях…",
    kk: "Бірнеше сөйлеммен түсіндіріңіз…",
  },
  "community.composerBodyPlaceholderGeneric": {
    en: "Add a short note…",
    ru: "Добавьте короткую заметку…",
    kk: "Қысқаша жазба қосыңыз…",
  },
  "community.composerCancel": { en: "Cancel", ru: "Отмена", kk: "Болдырмау" },
  "community.composerPost": { en: "Post", ru: "Опубликовать", kk: "Жариялау" },
  "community.composerBack": { en: "Back", ru: "Назад", kk: "Артқа" },

  "community.reactionHelpful": { en: "Helpful", ru: "Полезно", kk: "Пайдалы" },
  "community.reactionCongrats": { en: "Congrats", ru: "Поздравить", kk: "Құттықтау" },
  "community.actionComment": { en: "Comment", ru: "Комментировать", kk: "Пікір қалдыру" },
  "community.actionSave": { en: "Save", ru: "Сохранить", kk: "Сақтау" },
  "community.actionSaved": { en: "Saved", ru: "Сохранено", kk: "Сақталды" },

  "community.viewAllComments": { en: "View all comments", ru: "Показать все комментарии", kk: "Барлық пікірді көрсету" },
  "community.hideComments": { en: "Hide comments", ru: "Скрыть комментарии", kk: "Пікірлерді жасыру" },
  "community.commentPlaceholder": { en: "Write a comment…", ru: "Написать комментарий…", kk: "Пікір жазу…" },
  "community.commentSend": { en: "Send", ru: "Отправить", kk: "Жіберу" },
  "community.noComments": { en: "No comments yet.", ru: "Пока нет комментариев.", kk: "Әзірге пікір жоқ." },

  "community.myAnswerLabel": { en: "My answer", ru: "Мой ответ", kk: "Менің жауабым" },
  "community.correctAnswerLabel": { en: "Correct answer", ru: "Правильный ответ", kk: "Дұрыс жауап" },
  "community.scoreGrowth": { en: "SAT score growth", ru: "Рост балла SAT", kk: "SAT балының өсуі" },
  "community.studySessionResults": { en: "Session results", ru: "Итоги сессии", kk: "Сессия қорытындысы" },
  "community.accuracyLabel": { en: "Accuracy", ru: "Точность", kk: "Дәлдік" },
  "community.sharedResource": { en: "Resource", ru: "Материал", kk: "Материал" },
  "community.sharedExplanation": { en: "Explanation", ru: "Объяснение", kk: "Түсіндірме" },

  "community.emptyQuestionsTitle": { en: "No questions yet", ru: "Пока нет вопросов", kk: "Әзірге сұрақ жоқ" },
  "community.emptyQuestionsBody": {
    en: "Be the first to ask the community for help.",
    ru: "Задайте первый вопрос — сообщество поможет разобраться.",
    kk: "Бірінші болып сұраңыз — қауымдастық көмектеседі.",
  },
  "community.emptyQuestionsAction": { en: "Ask a question", ru: "Задать вопрос", kk: "Сұрақ қою" },
  "community.emptyWinsTitle": { en: "No wins yet", ru: "Пока нет побед", kk: "Әзірге жетістік жоқ" },
  "community.emptyWinsBody": {
    en: "Score improvements and achievements will show up here.",
    ru: "Рост баллов и достижения будут появляться здесь.",
    kk: "Балл өсуі мен жетістіктер осында шығады.",
  },
  "community.emptyFollowingTitle": {
    en: "You're not following anyone yet",
    ru: "Вы ни на кого не подписаны",
    kk: "Әлі ешкімге жазылмағансыз",
  },
  "community.emptyFollowingBody": {
    en: "Follow classmates to see their progress and questions in this tab.",
    ru: "Подписывайтесь на одноклассников, чтобы видеть их успехи в этой вкладке.",
    kk: "Сыныптастарға жазылып, олардың үлгерімін осы бөлімнен көріңіз.",
  },

  "community.sidebarLeaders": { en: "Weekly Leaders", ru: "Лидеры недели", kk: "Апта көшбасшылары" },
  "community.sidebarViewLeaderboard": { en: "View leaderboard", ru: "Открыть рейтинг", kk: "Рейтингті ашу" },
  "community.sidebarChallenge": { en: "Weekly Challenge", ru: "Испытание недели", kk: "Апталық сынақ" },
  "community.sidebarChallengeContinue": { en: "Continue challenge", ru: "Продолжить испытание", kk: "Сынақты жалғастыру" },
  "community.sidebarTrending": { en: "Trending in Community", ru: "В тренде", kk: "Трендте" },

  "community.homeTitle": { en: "From your community", ru: "Из вашего сообщества", kk: "Қауымдастығыңыздан" },
  "community.homeSeeAll": { en: "See all", ru: "Смотреть всё", kk: "Барлығын көру" },

  "community.questionsCount": { en: "explanations", ru: "объяснений", kk: "түсіндірме" },
};
