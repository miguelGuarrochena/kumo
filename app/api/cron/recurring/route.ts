import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

const handler = async (req: Request) => {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc('generate_recurring_expenses');
  if (error) {
    console.error('[cron/recurring] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ generated: data ?? 0 });
};

export const POST = handler;
export const GET = handler;
