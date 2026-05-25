import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * Rep Config API
 * Stores the sales rep's name and email in a shared file so the
 * standalone WebSocket server (ws-server.js) can read them.
 */
export async function POST(req) {
  try {
    const { name, email } = await req.json();
    
    if (!name) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }
    
    const configPath = path.join(process.cwd(), '.rep-config.json');
    fs.writeFileSync(configPath, JSON.stringify({ name, email, updatedAt: new Date().toISOString() }, null, 2));
    
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const configPath = path.join(process.cwd(), '.rep-config.json');
    if (!fs.existsSync(configPath)) {
      return NextResponse.json({ name: null, email: null });
    }
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return NextResponse.json({ name: config.name, email: config.email });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
