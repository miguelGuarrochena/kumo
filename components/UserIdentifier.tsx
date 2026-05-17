'use client';

import { useEffect } from 'react';
import { identify } from '@/lib/analytics';

export function UserIdentifier({
  userId,
  email,
  name,
}: {
  userId: string;
  email?: string;
  name?: string;
}) {
  useEffect(() => {
    identify(userId, { email, name });
  }, [userId, email, name]);

  return null;
}
