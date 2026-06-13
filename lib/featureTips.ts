const PREFIX = 'kumo_tip_dismissed_';

export const isFeatureTipDismissed = (id: string): boolean => {
  try {
    return localStorage.getItem(`${PREFIX}${id}`) === '1';
  } catch {
    return false;
  }
};

export const dismissFeatureTip = (id: string): void => {
  try {
    localStorage.setItem(`${PREFIX}${id}`, '1');
  } catch {
    /* ignore */
  }
};

export const FEATURE_TIP_IDS = {
  expensesNlp: 'expenses-nlp',
  budgetsIntro: 'budgets-intro',
} as const;
