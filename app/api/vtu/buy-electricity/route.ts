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
    const { serviceID, meterNumber, variationCode, amount, phoneNumber } = await req.json();

    if (!serviceID || !meterNumber || !variationCode || !amount || Number(amount) <= 0) {
      return NextResponse.json({ message: 'All fields are required' }, { status: 400 });
    }

    const authHeader = req.headers.get('Authorization');
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;

    const { data: { user }, error: authError } = token 
      ? await supabase.auth.getUser(token)
      : await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: 'Unauthorized. Please log in again.' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, wallet_balance')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ message: 'User profile not found' }, { status: 404 });
    }

    const numericAmount = Number(amount);

    if (profile.wallet_balance < numericAmount) {
      return NextResponse.json({ message: 'Insufficient wallet balance' }, { status: 400 });
    }

    // Temporarily deduct balance
    const newBalance = profile.wallet_balance - numericAmount;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', profile.id);

    if (updateError) {
      return NextResponse.json({ message: 'Failed to process balance deduction' }, { status: 500 });
    }

    const requestId = generateRequestId();

    const vtpassRes = await fetch('https://sandbox.vtpass.com/api/pay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.VTPASS_API_KEY || '',
        'secret-key': process.env.VTPASS_SECRET_KEY || '',
      },
      body: JSON.stringify({
        request_id: requestId,
        serviceID,
        billersCode: meterNumber,
        variation_code: variationCode,
        amount: numericAmount,
        phone: phoneNumber || '08000000000',
      }),
    });

    const vtpassData = await vtpassRes.json();
    console.log('VTPass Electricity Raw Response:', vtpassData);

    if (vtpassData?.code !== '000') {
      // Refund user on provider error
      await supabase
        .from('profiles')
        .update({ wallet_balance: profile.wallet_balance })
        .eq('id', profile.id);

      return NextResponse.json({ 
        message: vtpassData?.response_description || 'Electricity payment failed' 
      }, { status: 400 });
    }

    // Extract token from various possible VTPass response formats
    const tokenGenerated = 
      vtpassData?.token || 
      vtpassData?.mainToken || 
      vtpassData?.purchased_code || 
      vtpassData?.cards?.[0]?.Serial || 
      null;

    // Log transaction with token field
    await supabase.from('transactions').insert({
      user_id: profile.id,
      type: 'debit',
      details: `${serviceID.toUpperCase()} Electricity (${meterNumber}) - Ref: ${requestId}`,
      amount: numericAmount,
      status: 'success',
      token: tokenGenerated,
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Electricity payment successful!',
      token: tokenGenerated,
      newBalance,
      requestId 
    });

  } catch (error: any) {
    console.error('Electricity purchase error:', error);
    return NextResponse.json({ message: error?.message || 'Server error' }, { status: 500 });
  }
}