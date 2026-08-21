import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { network, phoneNumber, amount } = await req.json();

    // 1. Get user session from Authorization header
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ success: false, message: 'Invalid session' }, { status: 401 });
    }

    // 2. Validate request payload
    if (!phoneNumber || !amount || !network) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    const numAmount = Number(amount);

    // 3. Fetch user wallet balance
    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.wallet_balance || 0) < numAmount) {
      return NextResponse.json({ success: false, message: 'Insufficient wallet balance' }, { status: 400 });
    }

    // 4. Map network string to VTPass serviceID
    const serviceMap: Record<string, string> = {
      mtn: 'mtn',
      glo: 'glo',
      airtel: 'airtel',
      '9mobile': 'etisalat',
    };

    const serviceID = serviceMap[network.toLowerCase()];
    if (!serviceID) {
      return NextResponse.json({ success: false, message: 'Invalid network selected' }, { status: 400 });
    }

    // Generate unique Request ID
    const requestId = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 12) + Math.random().toString(36).substring(2, 7);

    // 5. Send request to VTPass API
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
        amount: numAmount,
        phone: phoneNumber,
      }),
    });

    const vtpassData = await vtpassRes.json();

    // 6. Verify success ("000" means success in VTPass)
    if (vtpassData.code === '000') {
      const updatedBalance = profile.wallet_balance - numAmount;

      // Deduct balance
      await supabase
        .from('profiles')
        .update({ wallet_balance: updatedBalance })
        .eq('id', user.id);

      // Record transaction
      await supabase.from('transactions').insert([
        {
          user_id: user.id,
          type: 'airtime',
          details: `${network.toUpperCase()} Airtime to ${phoneNumber}`,
          amount: numAmount,
          status: 'success',
        },
      ]);

      return NextResponse.json({
        success: true,
        message: 'Airtime purchase successful',
        newBalance: updatedBalance,
      }, { status: 200 });
    } else {
      return NextResponse.json({
        success: false,
        message: vtpassData.response_description || 'VTU provider error',
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('VTU Airtime error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}