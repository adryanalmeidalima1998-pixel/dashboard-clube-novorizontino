import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import AdmZip from 'adm-zip';
import { NextResponse } from 'next/server';

export const maxDuration = 60; 

export async function POST(req) {
  try {
    const { atletas } = await req.json();
    
    if (!atletas || atletas.length === 0) {
      return NextResponse.json({ error: 'Nenhum atleta selecionado' }, { status: 400 });
    }

    const zip = new AdmZip();

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    for (const atleta of atletas) {
      const page = await browser.newPage();
      
      await page.setViewport({ width: 1587, height: 1122, deviceScaleFactor: 2 });

      const url = `${baseUrl}/central-scouting/lista-preferencial/${encodeURIComponent(atleta.id)}`;
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

      await new Promise(resolve => setTimeout(resolve, 1500));

      await page.evaluate(() => {
        const noPrintElements = document.querySelectorAll('.no-print');
        noPrintElements.forEach(el => el.style.display = 'none');
      });

      const pdfBuffer = await page.pdf({
        format: 'A3',
        landscape: true,
        printBackground: true,
        margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' }
      });

      const nomeArquivo = `Relatorio_Scout_${atleta.nome.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      zip.addFile(nomeArquivo, pdfBuffer);

      await page.close();
    }

    await browser.close();

    const zipBuffer = zip.toBuffer();

    return new Response(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename=Relatorios_Diretoria.zip',
      },
    });

  } catch (error) {
    console.error('Erro na geração em lote:', error);
    return NextResponse.json({ error: 'Falha ao gerar PDFs em lote.' }, { status: 500 });
  }
}
