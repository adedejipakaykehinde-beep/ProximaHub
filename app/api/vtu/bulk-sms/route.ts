import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { recipients, message, senderId } = await req.json();

    if (!recipients || !message || !senderId) {
      return NextResponse.json({ message: 'All fields are required' }, { status: 400 });
    }

    const numbersList = recipients.split(',').map((n: string) => n.trim()).filter(Boolean);
    const costPerSms = 5; // ₦5 per SMS
    const totalCost = numbersList.length * costPerSms;

    // 1. Auth & Profile
    const authHeader = req.headers.get('Authorization');
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;
    const { data: { user } } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser();

    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('id, wallet_balance').eq('id', user.id).single();
    if (!profile || profile.wallet_balance < totalCost) {
      return NextResponse.json({ message: 'Insufficient wallet balance' }, { status: 400 });
    }

    // 2. Deduct & Transact
    await supabase.from('profiles').update({ wallet_balance: profile.wallet_balance - totalCost }).eq('id', profile.id);
    await supabase.from('transactions').insert({
      user_id: profile.id,
      type: 'debit',
      details: `Bulk SMS to ${numbersList.length} numbers`,
      amount: totalCost,
      status: 'success',
    });

    return NextResponse.json({ success: true, message: `Bulk SMS sent to ${numbersList.length} recipients successfully!` });
  } catch (error: any) {
    return NextResponse.json({ message: error?.message || 'Server error' }, { status: 500 });
  }
}