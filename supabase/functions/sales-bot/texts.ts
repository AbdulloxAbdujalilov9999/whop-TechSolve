// Everything the sales bot says, in Uzbek, Russian and English,
// plus the default links and prices (overridable with the bot_config setting).

export type Lang = "uz" | "ru" | "en";
export const LANGS: Lang[] = ["uz", "ru", "en"];

export type Cfg = {
  sites: Record<string, string>;
  demos: Record<string, string>;
  whop: Record<string, string>;
  prices: {
    ttMonthly: number;
    tt3m: number;
    ttCompany: number;
    dispatchFee: string;
    dslSmall: number;
    dslFleet: number;
    dslSetup: number;
    centerTiers: { max: number; price: number }[];
    ieltsPerStudent: number;
    centerSite: number;
  };
};

// Keep in step with shared/config.js on the sites.
export const DEFAULT_CFG: Cfg = {
  sites: {
    trucktalk: "https://trucktalk-classes.onrender.com",
    dispatch: "https://haulwise-dispatch.onrender.com",
    dslhelp: "https://dslhelp-fleets.onrender.com",
    centers: "https://speakup-centers.onrender.com",
  },
  demos: {
    trucktalkApp: "https://truck-talk-webapp.vercel.app",
    speakup1: "https://speakup-v1.onrender.com",
    ielts: "https://ielts-self-preparation.onrender.com",
  },
  whop: { trucktalkMonthly: "", trucktalk3m: "", dispatchKit: "" },
  prices: {
    ttMonthly: 149,
    tt3m: 399,
    ttCompany: 600,
    dispatchFee: "6%",
    dslSmall: 99,
    dslFleet: 299,
    dslSetup: 300,
    centerTiers: [
      { max: 50, price: 300000 },
      { max: 150, price: 600000 },
      { max: 300, price: 900000 },
      { max: 100000, price: 1200000 },
    ],
    ieltsPerStudent: 20000,
    centerSite: 1800000,
  },
};

type Entry = Record<Lang, string>;

const T: Record<string, Entry> = {
  /* ---------- menu ---------- */
  menu_hi: {
    uz: "Assalomu alaykum{name}! 👋\n\nQuyidagilarda yordam beramiz. Kerakli bo'limni tanlang:",
    ru: "Здравствуйте{name}! 👋\n\nВот чем мы можем помочь. Выберите раздел:",
    en: "Hi{name}! 👋\n\nHere's what we can help with. Pick one:",
  },
  b_tt: {
    uz: "🚛 Truck Talk — haydovchilar uchun ingliz tili",
    ru: "🚛 Truck Talk — английский для водителей",
    en: "🚛 Truck Talk — English for truck drivers",
  },
  b_disp: {
    uz: "🧭 Dispatch — owner-operatorlar uchun",
    ru: "🧭 Диспетчер для owner-operator",
    en: "🧭 Dispatch for owner-operators",
  },
  b_dsl: {
    uz: "🛠 DSL HELP — kompaniyangiz uchun bot",
    ru: "🛠 DSL HELP — бот для автопарка",
    en: "🛠 DSL HELP — help desk bot for fleets",
  },
  b_lc: {
    uz: "🎓 O'quv markazlari uchun kurs",
    ru: "🎓 Курс для учебных центров",
    en: "🎓 Course for learning centers",
  },
  b_ielts: {
    uz: "📝 IELTS mock test (kompyuterda)",
    ru: "📝 Пробный IELTS (на компьютере)",
    en: "📝 IELTS mock tests (computer)",
  },
  b_lang: { uz: "🌐 Til · Язык · Language", ru: "🌐 Til · Язык · Language", en: "🌐 Til · Язык · Language" },
  b_back: { uz: "⬅️ Orqaga", ru: "⬅️ Назад", en: "⬅️ Back" },
  b_menu: { uz: "🏠 Bosh menyu", ru: "🏠 Главное меню", en: "🏠 Main menu" },
  b_prices: { uz: "💵 Narxlar", ru: "💵 Цены", en: "💵 Prices" },
  b_ask: { uz: "💬 Savol berish", ru: "💬 Задать вопрос", en: "💬 Ask a question" },
  b_site: { uz: "🌐 Sayt", ru: "🌐 Сайт", en: "🌐 Website" },
  b_test: { uz: "📝 Bepul test — 3 daqiqa", ru: "📝 Бесплатный тест — 3 минуты", en: "📝 Free test — 3 minutes" },
  b_app: { uz: "📱 Ilova", ru: "📱 Приложение", en: "📱 The app" },
  b_su_tt: { uz: "✍️ Bepul darsga yozilish", ru: "✍️ Записаться на бесплатный урок", en: "✍️ Book a free class" },
  b_su_disp: { uz: "🚚 Dispetcherni ulash", ru: "🚚 Подключить диспетчера", en: "🚚 Start dispatch" },
  b_su_dsl: { uz: "📅 Bepul sinovni boshlash", ru: "📅 Начать бесплатный пилот", en: "📅 Start the free pilot" },
  b_su_lc: { uz: "🎁 30 kunlik bepul sinov", ru: "🎁 30 дней бесплатно", en: "🎁 30-day free pilot" },
  b_su_ielts: { uz: "✍️ Kirish olish", ru: "✍️ Получить доступ", en: "✍️ Get access" },
  b_demo_sp1: { uz: "🎯 SpeakUp-1 demosi", ru: "🎯 Демо SpeakUp-1", en: "🎯 SpeakUp-1 demo" },
  b_demo_ielts: { uz: "🎯 IELTS demosi", ru: "🎯 Демо IELTS", en: "🎯 IELTS demo" },
  b_cancel: { uz: "❌ Bekor qilish", ru: "❌ Отмена", en: "❌ Cancel" },
  b_skip: { uz: "➡️ O'tkazib yuborish", ru: "➡️ Пропустить", en: "➡️ Skip" },
  b_share_phone: { uz: "📱 Raqamimni yuborish", ru: "📱 Отправить мой номер", en: "📱 Share my number" },
  b_pay_m: { uz: "💳 1 oy — {m}", ru: "💳 1 месяц — {m}", en: "💳 1 month — {m}" },
  b_pay_q: { uz: "💳 3 oy — {q}", ru: "💳 3 месяца — {q}", en: "💳 3 months — {q}" },

  /* ---------- product screens ---------- */
  intro_tt: {
    uz:
      "🚛 <b>Truck Talk</b> — yo'lda kerak bo'ladigan ingliz tili\n\n" +
      "2025-yil 25-iyundan beri yo'l tekshiruvida inspektor savollariga ingliz tilida javob bera olmagan haydovchi <b>Out of Service</b> qilinishi mumkin. " +
      "Inspektor so'raydi: qayerdan va qayerga ketyapsiz, necha soat ishladingiz, logbook va yuk hujjatlari.\n\n" +
      "✅ Haftasiga 3 ta jonli onlayn dars, kichik guruh\n" +
      "✅ Har hafta mock-inspeksiya va yo'l belgilari\n" +
      "✅ Broker va dispetcher bilan telefonda gaplashish\n" +
      "✅ Darslar orasida mashq uchun Truck Talk ilovasi\n" +
      "✅ Birinchi dars bepul\n\n" +
      "💵 {m}/oy · 3 oy — {q}",
    ru:
      "🚛 <b>Truck Talk</b> — английский, который нужен в дороге\n\n" +
      "С 25 июня 2025 года водителя, который не может ответить инспектору по-английски, могут поставить <b>Out of Service</b>. " +
      "Инспектор спрашивает: откуда и куда едете, сколько часов за рулём, логбук и документы на груз.\n\n" +
      "✅ 3 живых онлайн-урока в неделю, маленькая группа\n" +
      "✅ Пробная инспекция и дорожные знаки каждую неделю\n" +
      "✅ Телефонные разговоры с брокером и диспетчером\n" +
      "✅ Приложение Truck Talk для практики между уроками\n" +
      "✅ Первый урок бесплатно\n\n" +
      "💵 {m}/мес · 3 месяца — {q}",
    en:
      "🚛 <b>Truck Talk</b> — the English you need on the road\n\n" +
      "Since June 25, 2025, a driver who can't answer a roadside inspector in English can be placed <b>Out of Service</b>. " +
      "The officer asks where you're coming from and going, your hours, your logbook and your shipping papers.\n\n" +
      "✅ 3 live online classes a week in small groups\n" +
      "✅ A mock inspection and road signs every week\n" +
      "✅ Phone English for brokers and dispatch\n" +
      "✅ The Truck Talk app for practice between classes\n" +
      "✅ First class free\n\n" +
      "💵 {m}/month · 3 months for {q}",
  },
  intro_disp: {
    uz:
      "🧭 <b>Haulwise Dispatch</b> — trakingiz bo'sh turmaydi\n\n" +
      "O'z MC raqami bor owner-operator va kichik kompaniyalar uchun.\n\n" +
      "✅ Yuk topamiz va narxini kelishamiz, har birini siz tasdiqlaysiz\n" +
      "✅ Broker paketlari, rate con, check call, detention\n" +
      "✅ O'z MC'ingiz ostida ishlaysiz, broker pulni sizga to'laydi\n" +
      "✅ Shartnoma yo'q, istalgan haftada to'xtatish mumkin\n\n" +
      "💵 Har bir yuk summasining {fee} qismi. Yuk yo'q — to'lov yo'q.",
    ru:
      "🧭 <b>Haulwise Dispatch</b> — ваш трак не простаивает\n\n" +
      "Для owner-operator и небольших автопарков со своим MC.\n\n" +
      "✅ Ищем грузы и торгуемся по ставке, каждый груз одобряете вы\n" +
      "✅ Пакеты для брокеров, rate con, check calls, detention\n" +
      "✅ Работаете под своим MC, брокер платит вам напрямую\n" +
      "✅ Без контракта, отменить можно в любую неделю\n\n" +
      "💵 {fee} от гросса каждого груза. Нет грузов — нет оплаты.",
    en:
      "🧭 <b>Haulwise Dispatch</b> — we keep your truck loaded\n\n" +
      "For owner-operators and small fleets with their own MC.\n\n" +
      "✅ We find and negotiate loads, you approve every one\n" +
      "✅ Broker setup packets, rate cons, check calls, detention\n" +
      "✅ You keep your MC and brokers pay you directly\n" +
      "✅ No contract, cancel any week\n\n" +
      "💵 {fee} of each load's gross. No loads, no fee.",
  },
  intro_dsl: {
    uz:
      "🛠 <b>DSL HELP</b> — butun kompaniya uchun bitta Telegram bot\n\n" +
      "Haydovchilar o'z guruhida yozadi, bot har bir so'rovni kerakli bo'limga yuboradi: Dispatch, Maintenance, ELD, Safety, Accounting yoki HR.\n\n" +
      "✅ Javob berilmaguncha eslatib turadigan ticketlar\n" +
      "✅ Hujjat muddati tugashi haqida ogohlantirish va kunlik hisobot\n" +
      "✅ O'zbekcha, driverlar uchun rus va ingliz tilidagi menyu bilan\n" +
      "✅ BOL rasmini o'qib, yo'naltiradigan sun'iy intellekt (ixtiyoriy)\n\n" +
      "💵 {small}/oydan · 14 kun bepul sinov",
    ru:
      "🛠 <b>DSL HELP</b> — один Telegram-бот для всего автопарка\n\n" +
      "Водители пишут в своей группе, бот отправляет каждый запрос нужному отделу: Dispatch, Maintenance, ELD, Safety, Accounting или HR.\n\n" +
      "✅ Тикеты с напоминаниями, пока кто-то не ответит\n" +
      "✅ Предупреждения об истечении документов и ежедневный отчёт\n" +
      "✅ На узбекском, меню для водителей также на русском и английском\n" +
      "✅ ИИ читает фото BOL и направляет их (по желанию)\n\n" +
      "💵 от {small}/мес · 14 дней бесплатно",
    en:
      "🛠 <b>DSL HELP</b> — one Telegram bot for your whole fleet\n\n" +
      "Drivers write in their own group. The bot routes every request to the right team: Dispatch, Maintenance, ELD, Safety, Accounting or HR.\n\n" +
      "✅ Tickets that keep reminding until someone answers\n" +
      "✅ Document expiry alerts and a daily report\n" +
      "✅ Uzbek-first, with Russian and English menus for drivers\n" +
      "✅ Optional AI that reads BOL photos and routes them\n\n" +
      "💵 from {small}/month · 14-day free pilot",
  },
  intro_lc: {
    uz:
      "🎓 <b>SpeakUp</b> — o'quv markazlari uchun tayyor ingliz tili kursi\n\n" +
      "<b>SpeakUp-1 «English from Zero»</b>: 30 ta dars slaydlari, 30 ta uy vazifasi, javoblar kaliti, avtomatik tekshiriladigan mashqlar va har bir o'quvchi natijasini ko'rsatadigan o'qituvchi paneli.\n" +
      "<b>IELTS CD Prep</b>: kompyuterdagi IELTS formatida 3 ta to'liq mock test va diagnostika.\n\n" +
      "✅ 30 kun bepul sinov\n" +
      "✅ Ishga tushirishda yordam beramiz\n\n" +
      "💵 {tier1} dan / oy (o'quvchilar soniga qarab)",
    ru:
      "🎓 <b>SpeakUp</b> — готовый курс английского для учебных центров\n\n" +
      "<b>SpeakUp-1 «English from Zero»</b>: слайды 30 уроков, 30 домашних заданий, ключи ответов, упражнения с автопроверкой и панель учителя с результатами каждого ученика.\n" +
      "<b>IELTS CD Prep</b>: 3 полных пробных теста в компьютерном формате IELTS и диагностика.\n\n" +
      "✅ 30 дней бесплатно\n" +
      "✅ Поможем запустить\n\n" +
      "💵 от {tier1} в месяц (зависит от числа учеников)",
    en:
      "🎓 <b>SpeakUp</b> — a ready English course for learning centers\n\n" +
      "<b>SpeakUp-1 \"English from Zero\"</b>: slides for 30 lessons, 30 homeworks, answer keys, auto-checked practice and a teacher dashboard with every pupil's results.\n" +
      "<b>IELTS CD Prep</b>: 3 full computer-delivered IELTS mock tests plus a diagnostic.\n\n" +
      "✅ 30-day free pilot\n" +
      "✅ We help you launch\n\n" +
      "💵 from {tier1} a month, by number of students",
  },
  intro_ielts: {
    uz:
      "📝 <b>IELTS CD Prep</b> — kompyuterda IELTS mashqi\n\n" +
      "O'zbekistonda IELTS hozir kompyuterda topshiriladi. Ilova aynan shu formatni takrorlaydi: Listening, Reading va Writing, taymer bilan.\n\n" +
      "✅ 3 ta to'liq mock test va diagnostik test\n" +
      "✅ Har bir urinish natijasi va tarixi\n" +
      "✅ O'quv markazlari uchun: o'quvchi boshiga {ielts} / oy",
    ru:
      "📝 <b>IELTS CD Prep</b> — тренировка IELTS на компьютере\n\n" +
      "В Узбекистане IELTS сейчас сдают на компьютере. Приложение повторяет этот формат: Listening, Reading и Writing с таймером.\n\n" +
      "✅ 3 полных пробных теста и диагностика\n" +
      "✅ Результат и история каждой попытки\n" +
      "✅ Для учебных центров: {ielts} за ученика в месяц",
    en:
      "📝 <b>IELTS CD Prep</b> — computer-delivered IELTS practice\n\n" +
      "In Uzbekistan IELTS is now taken on a computer, and this app works the same way: Listening, Reading and Writing, with a timer.\n\n" +
      "✅ 3 full mock tests and a diagnostic\n" +
      "✅ Score and history for every attempt\n" +
      "✅ For learning centers: {ielts} per student a month",
  },

  /* ---------- prices ---------- */
  prices_tt: {
    uz:
      "💵 <b>Truck Talk narxlari</b>\n\n• 1 oy — <b>{m}</b>\n• 3 oy — <b>{q}</b> ({save} tejaysiz)\n• Kompaniya uchun, 5 haydovchidan — <b>{c}+</b> / oy\n\n" +
      "Birinchi dars bepul. To'lov karta orqali.",
    ru:
      "💵 <b>Цены Truck Talk</b>\n\n• 1 месяц — <b>{m}</b>\n• 3 месяца — <b>{q}</b> (экономия {save})\n• Для компании, от 5 водителей — <b>{c}+</b> / мес\n\n" +
      "Первый урок бесплатно. Оплата картой.",
    en:
      "💵 <b>Truck Talk prices</b>\n\n• 1 month — <b>{m}</b>\n• 3 months — <b>{q}</b> (save {save})\n• For carriers, 5+ drivers — <b>{c}+</b> / month\n\n" +
      "First class free. Pay by card.",
  },
  prices_disp: {
    uz:
      "💵 <b>Dispetcher narxi</b>\n\n• Har bir yuk summasining <b>{fee}</b> qismi\n• Ulanish uchun to'lov yo'q, shartnoma yo'q\n• Yuk yo'q — to'lov yo'q\n\nMisol: yuk {ex_load} bo'lsa — {ex_fee}.",
    ru:
      "💵 <b>Стоимость диспетчера</b>\n\n• <b>{fee}</b> от гросса каждого груза\n• Без оплаты за подключение и без контракта\n• Нет грузов — нет оплаты\n\nПример: груз на {ex_load} → {ex_fee}.",
    en:
      "💵 <b>Dispatch pricing</b>\n\n• <b>{fee}</b> of each load's gross\n• No setup fee, no contract\n• No loads, no fee\n\nExample: a {ex_load} load → {ex_fee}.",
  },
  prices_dsl: {
    uz:
      "💵 <b>DSL HELP narxlari</b>\n\n• 25 tagacha trak — <b>{small}/oy</b>\n• 25–100 trak — <b>{fleet}/oy</b>\n• 100 dan ko'p — kelishilgan narx\n• Sozlash {setup} dan, bir marta\n\n14 kunlik bepul sinovdan boshlang.",
    ru:
      "💵 <b>Цены DSL HELP</b>\n\n• До 25 траков — <b>{small}/мес</b>\n• 25–100 траков — <b>{fleet}/мес</b>\n• Больше 100 — индивидуально\n• Настройка от {setup}, один раз\n\nНачните с бесплатного пилота на 14 дней.",
    en:
      "💵 <b>DSL HELP pricing</b>\n\n• Up to 25 trucks — <b>{small}/month</b>\n• 25–100 trucks — <b>{fleet}/month</b>\n• 100+ trucks — custom\n• Setup from {setup}, one time\n\nStart with a 14-day free pilot.",
  },
  prices_lc: {
    uz: "💵 <b>SpeakUp narxlari (oyiga)</b>\n\n{tiers}\n• IELTS CD Prep — o'quvchi boshiga <b>{ielts}</b>\n\nMarkazingiz uchun sayt — {site} dan.\nBirinchi 30 kun bepul.",
    ru: "💵 <b>Цены SpeakUp (в месяц)</b>\n\n{tiers}\n• IELTS CD Prep — <b>{ielts}</b> за ученика\n\nСайт для вашего центра — от {site}.\nПервые 30 дней бесплатно.",
    en: "💵 <b>SpeakUp prices (per month)</b>\n\n{tiers}\n• IELTS CD Prep — <b>{ielts}</b> per student\n\nA website for your center — from {site}.\nThe first 30 days are free.",
  },
  prices_ielts: {
    uz: "💵 <b>IELTS CD Prep narxi</b>\n\n• O'quv markazlari uchun — o'quvchi boshiga <b>{ielts}</b> / oy\n• O'zingiz tayyorlanayotgan bo'lsangiz — raqamingizni qoldiring, narx va kirishni yuboramiz.",
    ru: "💵 <b>Цена IELTS CD Prep</b>\n\n• Для учебных центров — <b>{ielts}</b> за ученика в месяц\n• Если готовитесь сами — оставьте номер, пришлём цену и доступ.",
    en: "💵 <b>IELTS CD Prep pricing</b>\n\n• For learning centers — <b>{ielts}</b> per student a month\n• Preparing on your own? Leave your number and we'll send the price and access.",
  },
  tier_upto: { uz: "{n} tagacha o'quvchi", ru: "До {n} учеников", en: "Up to {n} students" },
  tier_over: { uz: "{n} dan ko'p", ru: "Больше {n}", en: "Over {n}" },

  /* ---------- sign-up questions ---------- */
  q_tt_time: {
    uz: "🕐 Darslar uchun qaysi vaqt qulay? (AQSh vaqti bilan)",
    ru: "🕐 Когда вам удобно заниматься? (по времени США)",
    en: "🕐 When can you take classes? (US time)",
  },
  o_morning: { uz: "🌅 Ertalab", ru: "🌅 Утром", en: "🌅 Mornings" },
  o_evening: { uz: "🌙 Kechqurun", ru: "🌙 Вечером", en: "🌙 Evenings" },
  o_weekend: { uz: "📅 Dam olish kunlari", ru: "📅 В выходные", en: "📅 Weekends" },
  q_tt_level: { uz: "🗣 Ingliz tilingiz qanday?", ru: "🗣 Как у вас с английским?", en: "🗣 How is your English now?" },
  o_lvl0: { uz: "Umuman bilmayman", ru: "Совсем не знаю", en: "None yet" },
  o_lvl1: { uz: "Ozgina bilaman", ru: "Знаю немного", en: "A little" },
  o_lvl2: { uz: "Gaplasha olaman", ru: "Могу говорить", en: "I can talk" },
  q_disp_info: {
    uz: "🚚 MC raqamingiz va trak turi? Masalan: MC 123456, dry van 53'",
    ru: "🚚 Ваш MC и тип трака? Например: MC 123456, dry van 53'",
    en: "🚚 Your MC number and truck type? Example: MC 123456, 53' dry van",
  },
  q_dsl_trucks: {
    uz: "🚛 Kompaniyangizda nechta trak bor?",
    ru: "🚛 Сколько траков в вашей компании?",
    en: "🚛 How many trucks does your company run?",
  },
  q_dsl_company: { uz: "🏢 Kompaniya nomi?", ru: "🏢 Название компании?", en: "🏢 Company name?" },
  q_lc_students: {
    uz: "👩‍🎓 Markazingizda nechta o'quvchi bor?",
    ru: "👩‍🎓 Сколько учеников в вашем центре?",
    en: "👩‍🎓 How many students does your center have?",
  },
  q_lc_center: {
    uz: "🏫 Markaz nomi va shahar? Masalan: Smart English, Toshkent",
    ru: "🏫 Название центра и город? Например: Smart English, Ташкент",
    en: "🏫 Center name and city? Example: Smart English, Tashkent",
  },
  q_ielts_who: { uz: "Siz kimsiz?", ru: "Кто вы?", en: "Who are you?" },
  o_student: { uz: "🎓 IELTS topshiraman", ru: "🎓 Сдаю IELTS", en: "🎓 I'm taking IELTS" },
  o_teacher: { uz: "👩‍🏫 O'qituvchiman", ru: "👩‍🏫 Я преподаватель", en: "👩‍🏫 I'm a teacher" },
  o_center: { uz: "🏫 O'quv markaz", ru: "🏫 Учебный центр", en: "🏫 Learning center" },
  q_phone: {
    uz: "📱 Oxirgi qadam: telefon raqamingiz. Pastdagi tugmani bosing yoki raqamni yozing.\nRaqamsiz ham bo'ladi, unda shu yerda yozamiz.",
    ru: "📱 Последний шаг: номер телефона. Нажмите кнопку ниже или напишите номер.\nМожно и без номера, тогда ответим здесь.",
    en: "📱 Last step: your phone number. Tap the button below or type it.\nYou can skip it too, then we'll reply here.",
  },
  bad_phone: {
    uz: "Raqam noto'g'riga o'xshaydi. Masalan: +1 555 123 4567 yoki +998 90 123 45 67",
    ru: "Похоже, номер неверный. Пример: +1 555 123 4567 или +998 90 123 45 67",
    en: "That doesn't look like a phone number. Example: +1 555 123 4567",
  },
  need_text: {
    uz: "Iltimos, javobni matn bilan yozing.",
    ru: "Пожалуйста, напишите ответ текстом.",
    en: "Please type your answer as text.",
  },
  cancelled: {
    uz: "Bekor qilindi. Istalgan vaqtda qaytishingiz mumkin.",
    ru: "Отменено. Можно вернуться в любое время.",
    en: "Cancelled. Come back any time.",
  },
  thanks: {
    uz: "✅ Rahmat{name}! So'rovingiz qabul qilindi, tez orada bog'lanamiz.",
    ru: "✅ Спасибо{name}! Заявка принята, скоро свяжемся.",
    en: "✅ Thanks{name}! Got it. We'll be in touch soon.",
  },
  next_tt_pay: {
    uz: "Joyingizni hoziroq band qilmoqchi bo'lsangiz, karta bilan to'lashingiz mumkin:",
    ru: "Чтобы сразу закрепить место, можно оплатить картой:",
    en: "Want to lock in your spot now? You can pay by card:",
  },
  next_tt_test: {
    uz: "Darajangizni bilish uchun 3 daqiqalik bepul testni ishlab ko'ring:",
    ru: "Чтобы узнать свой уровень, пройдите бесплатный тест на 3 минуты:",
    en: "See where you stand with the free 3-minute test:",
  },
  next_disp: {
    uz: "📎 Tezroq boshlash uchun MC authority xati, W-9 va sug'urta sertifikatini (COI) shu yerga yuborishingiz mumkin.",
    ru: "📎 Чтобы начать быстрее, можете прислать сюда MC authority, W-9 и сертификат страховки (COI).",
    en: "📎 To start faster, you can send your MC authority letter, W-9 and certificate of insurance (COI) right here.",
  },
  next_dsl: {
    uz: "Pilotni sozlash uchun yozamiz. Hozircha saytda qanday ishlashini ko'ring:",
    ru: "Мы напишем, чтобы настроить пилот. А пока посмотрите на сайте, как это работает:",
    en: "We'll message you to set up the pilot. Meanwhile, see how it works on the site:",
  },
  next_lc: {
    uz: "Hozircha demolarni ko'rib chiqing:",
    ru: "А пока посмотрите демо:",
    en: "Meanwhile, try the demos:",
  },
  ask_prompt: {
    uz: "✍️ Savolingizni yozing: matn, ovozli xabar yoki rasm. Javob shu yerga keladi.",
    ru: "✍️ Напишите вопрос: текстом, голосовым или фото. Ответ придёт сюда.",
    en: "✍️ Send your question: text, voice or a photo. The answer will come here.",
  },
  msg_received: {
    uz: "✅ Xabaringiz yetkazildi. Tez orada javob beramiz.",
    ru: "✅ Сообщение получено. Скоро ответим.",
    en: "✅ Message received. We'll reply soon.",
  },
  choose_lang: {
    uz: "🌐 Tilni tanlang · Выберите язык · Choose a language",
    ru: "🌐 Tilni tanlang · Выберите язык · Choose a language",
    en: "🌐 Tilni tanlang · Выберите язык · Choose a language",
  },

  /* ---------- bot profile ---------- */
  cmd_start: { uz: "Boshlash", ru: "Начать", en: "Start" },
  cmd_menu: { uz: "Bosh menyu", ru: "Главное меню", en: "Main menu" },
  cmd_lang: { uz: "Tilni o'zgartirish", ru: "Сменить язык", en: "Change language" },
  desc: {
    uz:
      "Truck Talk — haydovchilar uchun ingliz tili darslari. Haulwise Dispatch — owner-operatorlar uchun dispetcher. " +
      "DSL HELP — trak kompaniyalari uchun Telegram bot. SpeakUp va IELTS mock testlar — o'quv markazlari uchun.\n\n" +
      "Start tugmasini bosing, kerakli xizmatni tanlang, javobni shu yerda olasiz.",
    ru:
      "Truck Talk — английский для водителей траков. Haulwise Dispatch — диспетчер для owner-operator. " +
      "DSL HELP — Telegram-бот для автопарков. SpeakUp и пробные тесты IELTS — для учебных центров.\n\n" +
      "Нажмите «Старт», выберите услугу, и мы ответим здесь.",
    en:
      "Truck Talk English classes for truck drivers. Haulwise Dispatch for owner-operators. " +
      "DSL HELP, a Telegram help desk for trucking fleets. SpeakUp and IELTS mock tests for learning centers.\n\n" +
      "Tap Start, pick what you need, and we'll answer right here.",
  },
  short_desc: {
    uz: "Haydovchilar uchun ingliz tili, dispetcher, fleet bot va o'quv markazlari uchun kurslar.",
    ru: "Английский для водителей, диспетчер, бот для автопарка и курсы для учебных центров.",
    en: "English for truck drivers, dispatch, a fleet help desk bot and courses for learning centers.",
  },
};

export function t(lang: Lang, key: string, vars: Record<string, string | number> = {}): string {
  const e = T[key];
  const s = e ? (e[lang] ?? e.en) : key;
  return s.replace(/\{(\w+)\}/g, (_m, k: string) => (vars[k] !== undefined ? String(vars[k]) : ""));
}

/** The same button label in every language, used to recognise reply-keyboard taps. */
export function allLangs(key: string): string[] {
  const e = T[key];
  return e ? LANGS.map((l) => e[l]) : [];
}

export function usd(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

export function som(n: number, l: Lang): string {
  const s = String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return s + (l === "ru" ? " сум" : " so'm");
}

export function priceVars(c: Cfg, l: Lang): Record<string, string> {
  const p = c.prices;
  const feePct = parseFloat(String(p.dispatchFee).replace(",", ".")) || 0;
  const tiers = p.centerTiers
    .map((x, i, arr) => {
      const label = x.max >= 100000
        ? t(l, "tier_over", { n: arr[i - 1]?.max ?? 0 })
        : t(l, "tier_upto", { n: x.max });
      return `• ${label} — <b>${som(x.price, l)}</b>`;
    })
    .join("\n");
  return {
    m: usd(p.ttMonthly),
    q: usd(p.tt3m),
    c: usd(p.ttCompany),
    save: usd(p.ttMonthly * 3 - p.tt3m),
    fee: String(p.dispatchFee),
    ex_load: usd(3000),
    ex_fee: usd((3000 * feePct) / 100),
    small: usd(p.dslSmall),
    fleet: usd(p.dslFleet),
    setup: usd(p.dslSetup),
    tier1: som(p.centerTiers[0]?.price ?? 0, l),
    tiers,
    ielts: som(p.ieltsPerStudent, l),
    site: som(p.centerSite, l),
  };
}
