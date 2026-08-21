import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    // 1. Read the raw text body to compute the HMAC hash
    const rawBody = await req.text();
    const signature = req.headers.get('x-paystack-signature');

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey || !signature) {
      return NextResponse.json({ message: 'Missing secret or signature' }, { status: 400 });
    }

    // 2. Verify HMAC SHA-512 signature from Paystack
    const hash = crypto
      .createHmac('sha512', secretKey)
      .update(rawBody)
      .digest('hex');

    if (hash !== signature) {
      return NextResponse.json({ message: 'Invalid signature' }, { status: 401 });
    }

    // 3. Parse event data after verification
    const event = JSON.parse(rawBody);

    // 4. Handle successful payments
    if (event.event === 'charge.success') {
      const { amount, customer, reference } = event.data;
      const userEmail = customer.email;
      const fundedAmount = amount / 100; // Convert kobo to Naira

      // Check if reference was already processed to prevent duplicate funding
      const { data: existingTx } = await supabase
        .from('transactions')
        .select('id')
        .eq('details', `Paystack funding ref: ${reference}`)
        .single();

      if (existingTx) {
        return NextResponse.json({ message: 'Transaction already processed' }, { status: 200 });
      }

      // Fetch user profile by email
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, wallet_balance')
        .eq('email', userEmail)
        .single();

      if (profile) {
        const currentBalance = profile.wallet_balance || 0;
        const newBalance = currentBalance + fundedAmount;

        // Credit user wallet balance
        await supabase
          .from('profiles')
          .update({ wallet_balance: newBalance })
          .eq('id', profile.id);

        // Record successful funding transaction
        await supabase.from('transactions').insert([
          {
            user_id: profile.id,
            type: 'funding',
            details: `Paystack funding ref: ${reference}`,
            amount: fundedAmount,
            status: 'success',
          },
        ]);
      }
    }

    // Acknowledge receipt to Paystack immediately
    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}