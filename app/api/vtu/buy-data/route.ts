import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Helper function to generate VTpass-required Request ID (YYYYMMDDHHMM + random string)
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

// Map network frontend values to VTpass serviceIDs
function getServiceID(network: string): string {
  const net = network.toLowerCase().trim();
  switch (net) {
    case 'mtn':
      return 'mtn-data';
    case 'airtel':
      return 'airtel-data';
    case 'glo':
      return 'glo-data';
    case '9mobile':
    case 'etisalat':
      return 'etisalat-data';
    default:
      return `${net}-data`;
  }
}

export async function POST(req: Request) {
  try {
    const { network, planId, phoneNumber, amount } = await req.json();

    if (!network || !planId || !phoneNumber || !amount) {
      return NextResponse.json({ message: 'All fields are required' }, { status: 400 });
    }

    // 1. Get user using Authorization Bearer token or direct session fallback
    const authHeader = req.headers.get('Authorization');
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;

    const { data: { user }, error: authError } = token 
      ? await supabase.auth.getUser(token)
      : await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: 'Unauthorized. Please log in again.' }, { status: 401 });
    }

    // 2. Fetch user's current profile & balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, wallet_balance')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ message: 'User profile not found' }, { status: 404 });
    }

    // 3. Check if user has sufficient funds
    if (profile.wallet_balance < amount) {
      return NextResponse.json({ message: 'Insufficient wallet balance' }, { status: 400 });
    }

    // 4. Temporarily deduct funds before triggering provider
    const newBalance = profile.wallet_balance - amount;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', profile.id);

    if (updateError) {
      return NextResponse.json({ message: 'Failed to process balance deduction' }, { status: 500 });
    }

    // 5. CALL VTPASS API
    const requestId = generateRequestId();
    const serviceID = getServiceID(network);

    const vtpassRes = await fetch('https://sandbox.vtpass.com/api/pay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.VTPASS_API_KEY || '',
        'secret-key': process.env.VTPASS_SECRET_KEY || '',
      },
      body: JSON.stringify({
        request_id: requestId,
        serviceID: serviceID,
        billersCode: phoneNumber,
        variation_code: planId,
        amount: Number(amount),
        phone: phoneNumber,
      }),
    });

    const vtpassData = await vtpassRes.json();

    // 6. Log raw VTpass response and verify status ("000" means transaction successful)
    console.log('VTPass Raw Response:', vtpassData);

    if (vtpassData?.code !== '000') {
      // Refund user balance if VTpass failed
      await supabase
        .from('profiles')
        .update({ wallet_balance: profile.wallet_balance })
        .eq('id', profile.id);

      const errorReason = vtpassData?.response_description 
        || vtpassData?.message 
        || `VTpass Error Code: ${vtpassData?.code || 'UNKNOWN'}`;

      return NextResponse.json(
        { message: errorReason },
        { status: 400 }
      );
    }

    // 7. Log transaction history upon success
    await supabase.from('transactions').insert({
      user_id: profile.id,
      type: 'debit',
      details: `${network.toUpperCase()} Data Top-up (${phoneNumber}) - Ref: ${requestId}`,
      amount: amount,
      status: 'success',
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Data purchase successful!',
      newBalance,
      requestId 
    });

  } catch (error: any) {
    console.error('Data purchase error:', error);
    return NextResponse.json({ message: error?.message || 'Server error' }, { status: 500 });
  }
}