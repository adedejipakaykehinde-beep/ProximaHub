import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { userId, phone, amount, network } = await req.json();

    // 1. Validate request payload
    if (!userId || !phone || !amount || !network) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const numAmount = Number(amount);

    // 2. Fetch user wallet balance
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', userId)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ message: 'User profile not found' }, { status: 404 });
    }

    if (profile.wallet_balance < numAmount) {
      return NextResponse.json({ message: 'Insufficient wallet balance' }, { status: 400 });
    }

    // 3. Map network string to VTPass serviceID
    const serviceMap: Record<string, string> = {
      mtn: 'mtn',
      glo: 'glo',
      airtel: 'airtel',
      '9mobile': 'etisalat',
    };

    const serviceID = serviceMap[network.toLowerCase()];
    if (!serviceID) {
      return NextResponse.json({ message: 'Invalid network selected' }, { status: 400 });
    }

    // Generate unique Request ID (YYYYMMDDHHMM + random str)
    const requestId = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 12) + Math.random().toString(36).substring(2, 7);

    // 4. Send purchase request to VTPass API
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
        phone: phone,
      }),
    });

    const vtpassData = await vtpassRes.json();

    // 5. Verify VTPass success response ("000" means success)
    if (vtpassData.code === '000') {
      const updatedBalance = profile.wallet_balance - numAmount;

      // Deduct from user wallet balance
      await supabase
        .from('profiles')
        .update({ wallet_balance: updatedBalance })
        .eq('id', userId);

      // Log successful transaction
      await supabase.from('transactions').insert([
        {
          user_id: userId,
          type: 'airtime',
          details: `${network.toUpperCase()} Airtime to ${phone}`,
          amount: numAmount,
          status: 'success',
        },
      ]);

      return NextResponse.json({
        message: 'Airtime recharge successful',
        newBalance: updatedBalance,
      }, { status: 200 });
    } else {
      return NextResponse.json({
        message: vtpassData.response_description || 'VTU provider error',
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('VTU Airtime error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}