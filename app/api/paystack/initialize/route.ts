import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { amount, email } = body;

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ message: 'Invalid amount' }, { status: 400 });
    }

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecret) {
      return NextResponse.json(
        { message: 'Paystack secret key is missing in environment variables' },
        { status: 500 }
      );
    }

    // Call Paystack Initialize API
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email || 'user@proximahub.com',
        amount: Math.round(Number(amount) * 100), // Convert Naira to Kobo
        callback_url: 'http://localhost:3000/dashboard/fund-wallet',
      }),
    });

    const data = await response.json();

    if (!data.status) {
      return NextResponse.json({ message: data.message || 'Paystack error' }, { status: 400 });
    }

    return NextResponse.json({ authorization_url: data.data.authorization_url });
  } catch (error: any) {
    console.error('Paystack initialization error:', error);
    return NextResponse.json(
      { message: error?.message || 'Server error initializing payment' },
      { status: 500 }
    );
  }
}