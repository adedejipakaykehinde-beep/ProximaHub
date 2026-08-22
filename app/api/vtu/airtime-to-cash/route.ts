import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { network, phoneNumber, amount } = await req.json();

    if (!network || !phoneNumber || !amount) {
      return NextResponse.json({ message: 'All fields required' }, { status: 400 });
    }

    const authHeader = req.headers.get('Authorization');
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;
    const { data: { user } } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser();

    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    // 80% Conversion Rate Example
    const cashValue = Number(amount) * 0.8;

    await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'airtime_to_cash',
      details: `Airtime to Cash Request (${network.toUpperCase()} ₦${amount})`,
      amount: cashValue,
      status: 'pending',
    });

    return NextResponse.json({
      success: true,
      message: `Request submitted! Transfer ₦${amount} ${network.toUpperCase()} airtime to 08123456789. Your wallet will be credited ₦${cashValue} upon verification.`,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error?.message || 'Server error' }, { status: 500 });
  }
}