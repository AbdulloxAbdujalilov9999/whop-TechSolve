/* Money pages — one settings file for all four sites.
 * Change a value here, push, and every site redeploys on Render.
 * Empty strings hide the button that needs them.
 */
window.MONEY_CFG = {
  // Where every form and page event is sent (Supabase Edge Function in the qabul-admissions project).
  leadUrl: "https://ewuxolpgwwfbikuxutbw.supabase.co/functions/v1/sales-lead",

  // Telegram sales bot username, without @. Fill in after you create the bot in @BotFather.
  botUsername: "",

  // Your own Telegram, used as the backup contact if a form can't be sent.
  contactTelegram: "Jordan_722",

  // Whop checkout links. Paste each product's link after you create it on Whop.
  whop: {
    trucktalkMonthly: "",
    trucktalk3m: "",
    dispatchKit: ""
  },

  // The four sites (Render static sites).
  sites: {
    trucktalk: "https://trucktalk-classes.onrender.com",
    dispatch: "https://haulwise-dispatch.onrender.com",
    dslhelp: "https://dslhelp-fleets.onrender.com",
    centers: "https://speakup-centers.onrender.com"
  },

  // Live demos you already run.
  demos: {
    trucktalkApp: "https://truck-talk-webapp.vercel.app",
    speakup1: "https://speakup-v1.onrender.com",
    ielts: "https://ielts-self-preparation.onrender.com"
  },

  // Prices shown on the pages and in the bot. Change them here.
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
      { max: 100000, price: 1200000 }
    ],
    ieltsPerStudent: 20000,
    centerSite: 1800000
  }
};
