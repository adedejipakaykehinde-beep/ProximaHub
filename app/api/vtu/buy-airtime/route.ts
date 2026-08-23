import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Map network name to Bigisub network ID
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
      return NextResponse.json({ success: false, message: 'Network, phone number, and amount are required.' }, { status: 400 });
    }

    if (numAmount < 50) {
      return NextResponse.json({ success: false, message: 'Minimum airtime amount is ₦50.' }, { status: 400 });
    }

    // Identify user
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
      return NextResponse.json({ success: false, message: 'User session expired. Please log in again.' }, { status: 401 });
    }

    // 1. Check User Wallet Balance
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, wallet_balance')
      .eq('id', targetUserId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ success: false, message: 'User profile not found.' }, { status: 404 });
    }

    if (profile.wallet_balance < numAmount) {
      return NextResponse.json({ success: false, message: `Insufficient wallet balance. You have ₦${profile.wallet_balance}` }, { status: 400 });
    }

    // 2. Temporarily deduct wallet balance
    const newBalance = profile.wallet_balance - numAmount;
    await supabaseAdmin.from('profiles').update({ wallet_balance: newBalance }).eq('id', profile.id);

    // 3. Call Bigisub API
    const apiKey = process.env.BIGISUB_API_KEY || '1e34035a5330a62c7066697df8cb485c92d85285';
    const networkId = getNetworkId(network);

    const bigisubRes = await fetch('https://bigisub.ng/api/topup/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${apiKey.trim()}`,
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
    let bigisubData: any = {};

    try {
      bigisubData = JSON.parse(responseText);
    } catch (e) {
      // Refund if Bigisub returned raw HTML error
      await supabaseAdmin.from('profiles').update({ wallet_balance: profile.wallet_balance }).eq('id', profile.id);
      return NextResponse.json({ success: false, message: `Provider Error: ${responseText.slice(0, 100)}` }, { status: 400 });
    }

    const isSuccessful = 
      bigisubRes.ok && 
      (bigisubData?.status === 'success' || 
       bigisubData?.Status === 'successful' || 
       bigisubData?.Status === 'delivered' || 
       bigisubData?.status === true);

    // 4. Refund if failed
    if (!isSuccessful) {
      await supabaseAdmin.from('profiles').update({ wallet_balance: profile.wallet_balance }).eq('id', profile.id);

      const errorMsg = 
        bigisubData?.error || 
        bigisubData?.message || 
        bigisubData?.detail || 
        'Airtime purchase failed on Bigisub.';

      return NextResponse.json({ 
        success: false, 
        message: typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : String(errorMsg) 
      }, { status: 400 });
    }

    // 5. Save Successful Transaction
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