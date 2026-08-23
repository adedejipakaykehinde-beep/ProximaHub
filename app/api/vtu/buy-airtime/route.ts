import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function getBigisubNetworkId(network: string | number): number {
  if (typeof network === 'number') return network;
  const net = String(network).toLowerCase().trim();
  switch (net) {
    case 'mtn': return 1;
    case 'glo': return 2;
    case 'airtel': return 3;
    case '9mobile':
    case 'etisalat': return 4;
    default: return 1;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { network, phoneNumber, amount } = body;

    if (!network || !phoneNumber || !amount) {
      return NextResponse.json({ success: false, message: 'All fields are required' }, { status: 400 });
    }

    const numAmount = Number(amount);
    if (numAmount < 25) {
      return NextResponse.json({ success: false, message: 'Minimum airtime purchase is ₦25' }, { status: 400 });
    }

    // 1. Authenticate user session
    const authHeader = req.headers.get('Authorization');
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;

    const { data: { user }, error: authError } = token 
      ? await supabase.auth.getUser(token)
      : await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: 'Unauthorized. Please log in again.' }, { status: 401 });
    }

    // 2. Fetch User Profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, wallet_balance')
      .eq('id', user.id)
      .single();

    if (!profile || profile.wallet_balance < numAmount) {
      return NextResponse.json({ 
        success: false, 
        message: `Insufficient wallet balance. Balance: ₦${profile?.wallet_balance || 0}` 
      }, { status: 400 });
    }

    // 3. Deduct balance temporarily
    await supabase
      .from('profiles')
      .update({ wallet_balance: profile.wallet_balance - numAmount })
      .eq('id', profile.id);

    // 4. Send Request to Bigisub
    const networkId = getBigisubNetworkId(network);
    const baseUrl = process.env.BIGISUB_BASE_URL || 'https://api.bigisub.ng';
    const apiKey = process.env.BIGISUB_API_KEY || '1e34035a5330a62c7066697df8cb485c92d85285';
    const cleanPhone = String(phoneNumber).trim();

    const payload = {
      network: networkId,
      mobile_number: cleanPhone,
      phone_number: cleanPhone,
      amount: numAmount,
      airtime_type: 'VTU',
      ported_number: false,
      pin: "1234",
    };

    const bigisubRes = await fetch(`${baseUrl}/api/v2/vtu/airtime/purchase/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await bigisubRes.text();
    let bigisubData: any = {};

    try {
      bigisubData = JSON.parse(responseText);
    } catch {
      bigisubData = { error: responseText };
    }

    const topStatus = String(bigisubData?.status || bigisubData?.Status || '').toLowerCase();
    const innerStatus = String(bigisubData?.data?.status || bigisubData?.data?.Status || '').toLowerCase();
    const isSuccessFlag = bigisubData?.success === true || bigisubData?.data?.success === true;

    const isExplicitFailure = 
      topStatus === 'failed' || topStatus === 'fail' || topStatus === 'reversed' ||
      innerStatus === 'failed' || innerStatus === 'fail' || innerStatus === 'reversed';

    const isSuccessful = 
      bigisubRes.ok && 
      !isExplicitFailure && 
      (topStatus === 'success' || topStatus === 'successful' || innerStatus === 'success' || isSuccessFlag);

    if (!isSuccessful) {
      // Refund user balance on local DB
      await supabase
        .from('profiles')
        .update({ wallet_balance: profile.wallet_balance })
        .eq('id', profile.id);

      let errorReason = 'Validation failed on provider network.';
      if (typeof bigisubData === 'object') {
        errorReason = 
          bigisubData?.message || 
          bigisubData?.detail || 
          bigisubData?.data?.api_response || 
          bigisubData?.error || 
          JSON.stringify(bigisubData);
      } else if (responseText) {
        errorReason = responseText;
      }

      return NextResponse.json({ success: false, message: errorReason }, { status: 400 });
    }

    // 5. Insert successful transaction
    const newBalance = profile.wallet_balance - numAmount;
    const reference = bigisubData?.data?.reference || bigisubData?.reference || Date.now().toString();

    await supabase.from('transactions').insert({
      user_id: profile.id,
      type: 'debit',
      details: `Airtime (₦${numAmount}) to ${cleanPhone}`,
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