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

// Map custom codes/slugs to actual Bigisub Plan IDs
function parsePlanId(planId: string | number): number {
  if (typeof planId === 'number') return planId;
  if (!isNaN(Number(planId))) return Number(planId);

  // Bigisub Plan ID mappings
  const planMap: Record<string, number> = {
    'mtn-20mb': 201,
    'mtn-20mb-wa': 202,
    'mtn-200mb-soc': 203,
    'mtn-200mb': 204,
    'mtn-1gb-awoof': 217, // 1GB Awoof @ 269
    'mtn-1gb-daily': 218,
    'mtn-500mb-sme': 205,
    'mtn-1gb-sme': 206,
    'mtn-2gb-sme': 207,
    'mtn-3gb-sme': 208,
    'mtn-5gb-sme': 209,
    'mtn-10gb-sme': 210,
    'airtel-100mb': 301,
    'airtel-300mb': 302,
    'airtel-1gb': 303,
    'airtel-2gb': 304,
    'glo-200mb': 401,
    'glo-1gb': 402,
    '9mob-1gb': 501,
  };

  return planMap[planId] || 217;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { network, planId, phoneNumber, amount } = body;

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
    const numericPlanId = parsePlanId(planId);
    const baseUrl = process.env.BIGISUB_BASE_URL || 'https://bigisub.ng/api';

    let bigisubData: any = {};
    let isSuccessful = false;

    try {
      const bigisubRes = await fetch(`${baseUrl}/data/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${process.env.BIGISUB_API_KEY}`,
        },
        body: JSON.stringify({
          network: networkId,
          mobile_number: phoneNumber,
          plan: numericPlanId,
          Ported_number: true,
        }),
      });

      const responseText = await bigisubRes.text();

      // Safely parse JSON response
      try {
        bigisubData = JSON.parse(responseText);
      } catch (jsonErr) {
        console.error('Bigisub non-JSON response:', responseText);
        bigisubData = { error: 'Invalid response from data provider API.' };
      }

      isSuccessful = 
        bigisubRes.ok && 
        (bigisubData?.status === 'success' || 
         bigisubData?.Status === 'successful' || 
         bigisubData?.status === true);

    } catch (apiErr: any) {
      console.error('Bigisub fetch network error:', apiErr);
      bigisubData = { error: 'Network error connecting to data provider.' };
    }

    // 6. Handle failure & refund user
    if (!isSuccessful) {
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
        { success: false, message: errorReason },
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
    return NextResponse.json({ success: false, message: error?.message || 'Server error' }, { status: 500 });
  }
}