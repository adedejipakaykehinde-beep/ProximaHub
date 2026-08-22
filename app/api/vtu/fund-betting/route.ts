import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function generateRequestId() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const timestamp = `${year}${month}${day}${hours}${minutes}`;
  const randomStr = Math.random().toString(36).substring(2, 10);
  return `${timestamp}${randomStr}`;
}

export async function POST(req: Request) {
  try {
    const { platform, customerId, amount, phoneNumber } = await req.json();

    if (!platform || !customerId || !amount || !phoneNumber) {
      return NextResponse.json({ message: 'All fields are required' }, { status: 400 });
    }

    const rechargeAmount = Number(amount);
    if (rechargeAmount < 100) {
      return NextResponse.json({ message: 'Minimum betting deposit is ₦100' }, { status: 400 });
    }

    // 1. Authenticate User
    const authHeader = req.headers.get('Authorization');
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;

    const { data: { user }, error: authError } = token 
      ? await supabase.auth.getUser(token)
      : await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: 'Unauthorized. Please log in again.' }, { status: 401 });
    }

    // 2. Fetch User Profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, wallet_balance')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ message: 'User profile not found' }, { status: 404 });
    }

    // 3. Check Wallet Balance
    if (profile.wallet_balance < rechargeAmount) {
      return NextResponse.json({ message: 'Insufficient wallet balance' }, { status: 400 });
    }

    // 4. Deduct Funds
    const newBalance = profile.wallet_balance - rechargeAmount;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', profile.id);

    if (updateError) {
      return NextResponse.json({ message: 'Failed to process wallet deduction' }, { status: 500 });
    }

    // 5. Call VTpass API
    const requestId = generateRequestId();
    const vtpassRes = await fetch('https://vtpass.com/api/pay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.VTPASS_API_KEY || '',
        'secret-key': process.env.VTPASS_SECRET_KEY || '',
      },
      body: JSON.stringify({
        request_id: requestId,
        serviceID: platform, // e.g., 'sportybet', 'bet9ja', '1xbet'
        billersCode: customerId,
        amount: rechargeAmount,
        phone: phoneNumber,
      }),
    });

    const vtpassData = await vtpassRes.json();

    if (vtpassData?.code !== '000') {
      // Refund user if provider fails
      await supabase
        .from('profiles')
        .update({ wallet_balance: profile.wallet_balance })
        .eq('id', profile.id);

      return NextResponse.json(
        { message: vtpassData?.response_description || 'Bet funding transaction failed' },
        { status: 400 }
      );
    }

    // 6. Record Transaction
    await supabase.from('transactions').insert({
      user_id: profile.id,
      type: 'debit',
      details: `${platform.toUpperCase()} Wallet Top-up (${customerId}) - Ref: ${requestId}`,
      amount: rechargeAmount,
      status: 'success',
    });

    return NextResponse.json({
      success: true,
      message: `Successfully funded ${platform.toUpperCase()} account!`,
      newBalance,
      requestId,
    });

  } catch (error: any) {
    return NextResponse.json({ message: error?.message || 'Server error' }, { status: 500 });
  }
}