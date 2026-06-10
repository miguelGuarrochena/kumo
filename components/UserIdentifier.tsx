'use client';

import { useEffect } from 'react';
import { identify } from '@/lib/analytics';

type UserIdentifierProps = {
  userId: string;
  email?: string;
  name?: string;
};

export const UserIdentifier = ({ userId, email, name }: UserIdentifierProps) => {
  useEffect(() => {
    identify(userId, { email, name });
  }, [userId, email, name]);

  return null;
};
