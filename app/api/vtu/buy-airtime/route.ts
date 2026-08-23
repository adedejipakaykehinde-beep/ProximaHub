import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

function getBigisubNetworkId(network: string): number {
  const net = network.toLowerCase().trim();
  switch (net) {
    case 'mtn': return 1;
    case 'glo': return 2;
    case '9mobile':
    case 'etisalat': return 3;
    case 'airtel': return 4;
    default: return 1;
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

    // Extract User ID directly or through Authorization header
    let targetUserId = userId;

    if (!targetUserId) {
      const authHeader = req.headers.get('Authorization');
      const token = authHeader ? authHeader.replace('Bearer ', '') : null;
      if (token && token !== 'undefined' && token !== 'null') {
        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        targetUserId = user?.id;
      }
    }

    if (!targetUserId) {
      return NextResponse.json({ message: 'Authentication required. Please log in again.' }, { status: 401 });
    }

    // 1. Fetch user wallet balance
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, wallet_balance')
      .eq('id', targetUserId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ message: 'User profile not found' }, { status: 404 });
    }

    if (profile.wallet_balance < numAmount) {
      return NextResponse.json({ message: `Insufficient balance. Required: ₦${numAmount}, Available: ₦${profile.wallet_balance}` }, { status: 400 });
    }

    // 2. Temporarily deduct wallet balance
    const newBalance = profile.wallet_balance - numAmount;
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', profile.id);

    if (updateError) {
      return NextResponse.json({ message: 'Failed to process wallet deduction' }, { status: 500 });
    }

    // 3. Send request to Bigisub Airtime API
    const networkId = getBigisubNetworkId(network);
    const apiKey = process.env.BIGISUB_API_KEY || '';

    let bigisubData: any = {};
    let isSuccessful = false;

    try {
      const bigisubRes = await fetch('https://bigisub.ng/api/v2/airtime/purchase', {
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

      const responseText = await bigisubRes.text();

      try {
        bigisubData = JSON.parse(responseText);
      } catch (e) {
        // Fallback to primary endpoint if needed
        const fallbackRes = await fetch('https://bigisub.ng/api/topup/', {
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
        const fallbackText = await fallbackRes.text();
        try {
          bigisubData = JSON.parse(fallbackText);
        } catch (err) {
          bigisubData = { error: 'Invalid response from Bigisub API.' };
        }
      }

      isSuccessful = 
        bigisubData?.status === 'success' || 
        bigisubData?.Status === 'successful' || 
        bigisubData?.status === true;

    } catch (apiErr: any) {
      bigisubData = { error: 'Network error connecting to airtime provider.' };
    }

    // 4. Refund user if order failed
    if (!isSuccessful) {
      await supabaseAdmin
        .from('profiles')
        .update({ wallet_balance: profile.wallet_balance })
        .eq('id', profile.id);

      const errorReason = bigisubData?.error || bigisubData?.message || bigisubData?.detail || 'Airtime top-up failed on network provider.';
      return NextResponse.json({ success: false, message: errorReason }, { status: 400 });
    }

    // 5. Log transaction
    const reference = bigisubData?.id || Date.now().toString();
    await supabaseAdmin.from('transactions').insert({
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
    return NextResponse.json({ success: false, message: error?.message || 'Server error' }, { status: 500 });
  }
}