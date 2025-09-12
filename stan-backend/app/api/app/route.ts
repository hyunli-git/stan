import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const htmlPath = path.join(process.cwd(), 'public', 'app', 'index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Error serving mobile app:', error);
    return new NextResponse('Mobile app not found', { status: 404 });
  }
}