import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
    const body = await req.json();
    const { network, phoneNumber, phone, amount, userId } = body;

    const targetPhone = phoneNumber || phone;
    if (!network || !targetPhone || !amount) {
      return NextResponse.json({ message: 'All fields are required' }, { status: 400 });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 50) {
      return NextResponse.json({ message: 'Minimum airtime amount is ₦50' }, { status: 400 });
    }

    // 1. Authenticate user
    const authHeader = req.headers.get('Authorization');
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;

    const { data: { user } } = token 
      ? await supabase.auth.getUser(token)
      : await supabase.auth.getUser();

    const targetUserId = user?.id || userId;

    if (!targetUserId) {
      return NextResponse.json({ message: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    // 2. Check profile balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, wallet_balance')
      .eq('id', targetUserId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ message: 'User profile not found' }, { status: 404 });
    }

    if (profile.wallet_balance < numAmount) {
      return NextResponse.json({ message: 'Insufficient wallet balance' }, { status: 400 });
    }

    // 3. Deduct balance temporarily
    const newBalance = profile.wallet_balance - numAmount;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', profile.id);

    if (updateError) {
      return NextResponse.json({ message: 'Failed to process balance deduction' }, { status: 500 });
    }

    // 4. Call Bigisub Airtime API
    const networkId = getBigisubNetworkId(network);
    const apiKey = process.env.BIGISUB_API_KEY || '';

    let bigisubData: any = {};
    let isSuccessful = false;

    try {
      // Try primary topup endpoint
      let bigisubRes = await fetch('https://bigisub.ng/api/topup/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${apiKey}`,
        },
        body: JSON.stringify({
          network: networkId,
          amount: numAmount,
          mobile_number: targetPhone,
          airtime_type: 'VTU',
          Ported_number: true,
        }),
      });

      let responseText = await bigisubRes.text();

      // If primary endpoint fails, fallback to v2 endpoint
      if (!bigisubRes.ok || responseText.trim().startsWith('<')) {
        bigisubRes = await fetch('https://bigisub.ng/api/v2/airtime/purchase', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            network: network.toUpperCase(),
            amount: numAmount,
            phone: targetPhone,
          }),
        });
        responseText = await bigisubRes.text();
      }

      try {
        bigisubData = JSON.parse(responseText);
      } catch (jsonErr) {
        console.error('Bigisub Raw Error Output:', responseText);
        bigisubData = { error: 'API Key invalid or provider service unavailable.' };
      }

      isSuccessful = 
        bigisubRes.ok && 
        (bigisubData?.status === 'success' || 
         bigisubData?.Status === 'successful' || 
         bigisubData?.status === true);

    } catch (apiErr: any) {
      console.error('Bigisub airtime network error:', apiErr);
      bigisubData = { error: 'Network error connecting to airtime provider.' };
    }

    // 5. Refund user if purchase fails
    if (!isSuccessful) {
      await supabase
        .from('profiles')
        .update({ wallet_balance: profile.wallet_balance })
        .eq('id', profile.id);

      const errorReason = 
        bigisubData?.error || 
        bigisubData?.message || 
        bigisubData?.detail || 
        'Airtime purchase failed on provider. Your wallet was not charged.';

      return NextResponse.json(
        { success: false, message: errorReason },
        { status: 400 }
      );
    }

    // 6. Log transaction history
    const reference = bigisubData?.id || bigisubData?.ident || Date.now().toString();
    await supabase.from('transactions').insert({
      user_id: profile.id,
      type: 'debit',
      details: `${network.toUpperCase()} Airtime (₦${numAmount}) to ${targetPhone} - Ref: ${reference}`,
      amount: numAmount,
      status: 'success',
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Airtime purchase successful!',
      newBalance,
      reference 
    });

  } catch (error: any) {
    console.error('Airtime purchase error:', error);
    return NextResponse.json({ success: false, message: error?.message || 'Server error' }, { status: 500 });
  }
}