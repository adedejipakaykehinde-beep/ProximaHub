import { NextResponse } from 'next/server';

function getServiceID(network: string): string {
  const net = network.toLowerCase().trim();
  switch (net) {
    case 'mtn':
      return 'mtn-data';
    case 'airtel':
      return 'airtel-data';
    case 'glo':
      return 'glo-data';
    case '9mobile':
    case 'etisalat':
      return 'etisalat-data';
    default:
      return `${net}-data`;
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const network = searchParams.get('network');

    if (!network) {
      return NextResponse.json({ message: 'Network is required' }, { status: 400 });
    }

    const serviceID = getServiceID(network);
    const vtpassRes = await fetch(`https://sandbox.vtpass.com/api/service-variations?serviceID=${serviceID}`, {
      method: 'GET',
      headers: {
        'public-key': process.env.VTPASS_PUBLIC_KEY || '',
      },
    });

    const data = await vtpassRes.json();

    if (data?.response_description === '000') {
      const variations = data.content?.varations || data.content?.variations || [];
      return NextResponse.json({ success: true, variations });
    }

    return NextResponse.json({ message: 'Failed to fetch variations' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ message: error?.message || 'Server error' }, { status: 500 });
  }
}