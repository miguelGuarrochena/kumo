import { after } from 'next/server';
import {
  deleteExpenseFromGoogle,
  deleteReminderFromGoogle,
  fullSyncToGoogle,
  syncExpenseToGoogle,
  syncReminderToGoogle,
} from './googleSync';

const run = (fn: () => Promise<void>) => {
  after(() => {
    void fn().catch((e) => {
      console.error('[google-calendar]', e);
    });
  });
};

export const scheduleReminderSync = (userId: string, reminderId: string) => {
  run(() => syncReminderToGoogle(userId, reminderId));
};

export const scheduleReminderDelete = (userId: string, reminderId: string) => {
  run(() => deleteReminderFromGoogle(userId, reminderId));
};

export const scheduleExpenseSync = (userId: string, expenseId: string) => {
  run(() => syncExpenseToGoogle(userId, expenseId));
};

export const scheduleExpenseDelete = (userId: string, expenseId: string) => {
  run(() => deleteExpenseFromGoogle(userId, expenseId));
};

export const scheduleFullGoogleSync = (userId: string) => {
  run(async () => {
    await fullSyncToGoogle(userId);
  });
};
