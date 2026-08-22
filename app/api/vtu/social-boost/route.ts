import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { platform, serviceType, targetUrl, quantity, amount } = await req.json();

    if (!platform || !targetUrl || !quantity || !amount) {
      return NextResponse.json({ message: 'All fields required' }, { status: 400 });
    }

    const price = Number(amount);

    const authHeader = req.headers.get('Authorization');
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;
    const { data: { user } } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser();

    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('id, wallet_balance').eq('id', user.id).single();
    if (!profile || profile.wallet_balance < price) {
      return NextResponse.json({ message: 'Insufficient wallet balance' }, { status: 400 });
    }

    await supabase.from('profiles').update({ wallet_balance: profile.wallet_balance - price }).eq('id', profile.id);
    await supabase.from('transactions').insert({
      user_id: profile.id,
      type: 'debit',
      details: `Social Boost: ${quantity} ${serviceType} on ${platform.toUpperCase()}`,
      amount: price,
      status: 'success',
    });

    return NextResponse.json({ success: true, message: 'Order placed successfully and processing!' });
  } catch (error: any) {
    return NextResponse.json({ message: error?.message || 'Server error' }, { status: 500 });
  }
}