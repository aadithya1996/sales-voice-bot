import { NextResponse } from 'next/server';
import { getClassifiedFocusList } from '../../../../lib/classifier';

export async function GET() {
  try {
    const list = getClassifiedFocusList();
    return NextResponse.json({
      success: true,
      focusList: list
    });
  } catch (err) {
    console.error('Error fetching focus list:', err);
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500 });
  }
}





