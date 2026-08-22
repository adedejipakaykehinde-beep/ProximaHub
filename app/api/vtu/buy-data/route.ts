import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Map network string to Bigisub Network IDs (1: MTN, 2: GLO, 3: 9MOBILE, 4: AIRTEL)
function getBigisubNetworkId(network: string): number {
  const net = network.toLowerCase().trim();
  switch (net) {
    case 'mtn':
      return 1;
    case 'glo':
      return 2;
    case '9mobile':
    case 'etisalat':
      return 3;
    case 'airtel':
      return 4;
    default:
      return 1;
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

    // 5. CALL BIGISUB API
    const networkId = getBigisubNetworkId(network);
    const baseUrl = process.env.BIGISUB_BASE_URL || 'https://bigisub.ng/api';

    const bigisubRes = await fetch(`${baseUrl}/data/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${process.env.BIGISUB_API_KEY}`,
      },
      body: JSON.stringify({
        network: networkId,
        mobile_number: phoneNumber,
        plan: planId,
        Ported_number: true,
      }),
    });

    const bigisubData = await bigisubRes.json();

    // 6. Verify status from Bigisub response
    const isSuccessful = 
      bigisubRes.ok && 
      (bigisubData?.status === 'success' || 
       bigisubData?.Status === 'successful' || 
       bigisubData?.status === true);

    if (!isSuccessful) {
      // Refund user balance if Bigisub transaction failed
      await supabase
        .from('profiles')
        .update({ wallet_balance: profile.wallet_balance })
        .eq('id', profile.id);

      const errorReason = 
        bigisubData?.error || 
        bigisubData?.message || 
        bigisubData?.detail || 
        'Data purchase failed on provider network.';

      return NextResponse.json(
        { message: errorReason },
        { status: 400 }
      );
    }

    // 7. Log transaction history upon success
    const reference = bigisubData?.id || bigisubData?.ident || Date.now().toString();
    await supabase.from('transactions').insert({
      user_id: profile.id,
      type: 'debit',
      details: `${network.toUpperCase()} Data Top-up (${phoneNumber}) - Ref: ${reference}`,
      amount: amount,
      status: 'success',
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Data purchase successful!',
      newBalance,
      reference 
    });

  } catch (error: any) {
    console.error('Data purchase error:', error);
    return NextResponse.json({ message: error?.message || 'Server error' }, { status: 500 });
  }
}