import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { country, service, amount } = await req.json();

    if (!country || !service || !amount) {
      return NextResponse.json({ message: 'All fields are required' }, { status: 400 });
    }

    const price = Number(amount);

    // 1. Authenticate
    const authHeader = req.headers.get('Authorization');
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;

    const { data: { user }, error: authError } = token 
      ? await supabase.auth.getUser(token)
      : await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch Profile & Check Balance
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, wallet_balance')
      .eq('id', user.id)
      .single();

    if (!profile || profile.wallet_balance < price) {
      return NextResponse.json({ message: 'Insufficient wallet balance' }, { status: 400 });
    }

    // 3. Deduct Balance
    const newBalance = profile.wallet_balance - price;
    await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', profile.id);

    // 4. Call Fleexa API
    const fleexaRes = await fetch(`https://api.fleexa.com/v1/get-number?country=${country}&service=${service}`, {
      headers: { 'Authorization': `Bearer ${process.env.FLEEXA_API_KEY}` }
    });
    const fleexaData = await fleexaRes.json();

    if (!fleexaRes.ok || !fleexaData?.phone_number) {
      await supabase.from('profiles').update({ wallet_balance: profile.wallet_balance }).eq('id', profile.id);
      return NextResponse.json({ message: 'Failed to rent number from provider' }, { status: 400 });
    }

    // 5. Record Transaction
    await supabase.from('transactions').insert({
      user_id: profile.id,
      type: 'debit',
      details: `OTP Number Rental (${service.toUpperCase()} - ${country.toUpperCase()})`,
      amount: price,
      status: 'success',
    });

    return NextResponse.json({
      success: true,
      phoneNumber: fleexaData.phone_number,
      orderId: fleexaData.order_id,
      newBalance,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error?.message || 'Server error' }, { status: 500 });
  }
}