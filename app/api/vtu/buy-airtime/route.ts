import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

function getNetworkId(network: string): number {
  const net = String(network).toLowerCase().trim();
  if (net.includes('mtn')) return 1;
  if (net.includes('glo')) return 2;
  if (net.includes('9mobile') || net.includes('etisalat')) return 3;
  if (net.includes('airtel')) return 4;
  return 1;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { network, phoneNumber, phone, amount, userId } = body;

    const targetPhone = phoneNumber || phone;
    const numAmount = Number(amount);

    if (!network || !targetPhone || !numAmount) {
      return NextResponse.json({ success: false, message: 'Network, phone, and amount are required.' }, { status: 400 });
    }

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
      return NextResponse.json({ success: false, message: 'Session expired. Please log in again.' }, { status: 401 });
    }

    // 1. Verify Wallet Balance
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, wallet_balance')
      .eq('id', targetUserId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ success: false, message: 'User profile not found.' }, { status: 404 });
    }

    if (profile.wallet_balance < numAmount) {
      return NextResponse.json({ success: false, message: `Insufficient balance (₦${profile.wallet_balance}).` }, { status: 400 });
    }

    // 2. Call Bigisub API with redirect protection
    const apiKey = '1e34035a5330a62c7066697df8cb485c92d85285';
    const networkId = getNetworkId(network);

    const bigisubRes = await fetch('https://bigisub.ng/api/topup/', {
      method: 'POST',
      redirect: 'manual',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
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

    const responseText = await bigisubRes.text();

    // Catch redirects (301/302) or HTML responses
    if (bigisubRes.status >= 300 && bigisubRes.status < 400) {
      return NextResponse.json({ 
        success: false, 
        message: 'Bigisub redirected the request. Please verify topup endpoint in Bigisub API documentation.' 
      }, { status: 400 });
    }

    let bigisubData: any = {};
    try {
      bigisubData = JSON.parse(responseText);
    } catch (e) {
      return NextResponse.json({ 
        success: false, 
        message: `Provider error (${bigisubRes.status}): Received HTML instead of JSON.` 
      }, { status: 400 });
    }

    const isSuccessful = 
      bigisubData?.status === 'success' || 
      bigisubData?.Status === 'successful' || 
      bigisubData?.Status === 'delivered' || 
      bigisubData?.status === true;

    if (!isSuccessful) {
      const errorMsg = bigisubData?.error || bigisubData?.message || bigisubData?.detail || 'Airtime transaction failed.';
      return NextResponse.json({ success: false, message: String(errorMsg) }, { status: 400 });
    }

    // 3. Deduct Wallet & Save Transaction
    const newBalance = profile.wallet_balance - numAmount;
    await supabaseAdmin.from('profiles').update({ wallet_balance: newBalance }).eq('id', profile.id);

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