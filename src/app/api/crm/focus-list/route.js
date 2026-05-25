import { NextResponse } from 'next/server';
const db = require('../../../../lib/database');
const path = require('path');
const fs = require('fs');

export async function GET() {
  try {
    const database = db.initDB();
    const tables = database.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const stats = {};
    for (const t of tables) {
      const countRes = database.prepare(`SELECT count(*) as count FROM ${t.name}`).get();
      stats[t.name] = countRes.count;
    }
    
    return NextResponse.json({
      success: true,
      cwd: process.cwd(),
      pid: process.pid,
      hostname: process.env.HOSTNAME,
      uptime: process.uptime(),
      dbPath: path.join(process.cwd(), 'sales-voice-bot.db'),
      tables: stats
    });
  } catch (err) {
    console.error('Error fetching debug info:', err);
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500 });
  }
}






