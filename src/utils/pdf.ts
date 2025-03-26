import puppeteer from "puppeteer";
import { formatReportPeriod, formatTimestamp } from "./formatTimestamp";
import { Activity, PdfOptions } from "../types";

/**
 * Gera um PDF com atividades registradas
 *
 * @param options Opções para geração do PDF
 * @returns Buffer contendo o PDF gerado
 */
export async function generatePdf(options: PdfOptions): Promise<Buffer> {
  const { activities, title, userName } = options;

  // Inicializa o navegador headless
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  try {
    const page = await browser.newPage();

    // Gera o HTML do relatório
    const html = generateHtml(activities, title, userName);

    // Carrega o HTML na página
    await page.setContent(html, { waitUntil: "networkidle0" });

    // Configurações de PDF
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "1cm",
        bottom: "1cm",
        left: "1cm",
        right: "1cm"
      }
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

/**
 * Gera o HTML para o relatório PDF
 *
 * @param activities Lista de atividades
 * @param title Título do relatório
 * @param userName Nome do usuário (opcional)
 * @returns String contendo o HTML formatado
 */
function generateHtml(
  activities: Activity[],
  title: string,
  userName?: string
): string {
  // Obtem as datas de início e fim do período
  const startDate =
    activities.length > 0
      ? activities.reduce(
          (min, act) => (act.timestamp < min ? act.timestamp : min),
          activities[0].timestamp
        )
      : new Date();

  const endDate =
    activities.length > 0
      ? activities.reduce(
          (max, act) => (act.timestamp > max ? act.timestamp : max),
          activities[0].timestamp
        )
      : new Date();

  // Constrói as linhas da tabela de atividades
  const activitiesHtml = activities
    .map(
      (activity) => `
    <tr>
      <td>${formatTimestamp(activity.timestamp)}</td>
      <td>${activity.message}</td>
    </tr>
  `
    )
    .join("");

  // Template HTML completo
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Bragfy - ${title}</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #333;
          line-height: 1.4;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          color: #2c3e50;
        }
        h1 {
          font-size: 24px;
          margin: 10px 0;
          color: #2c3e50;
        }
        .period {
          color: #7f8c8d;
          font-size: 16px;
          margin: 10px 0 30px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th {
          background-color: #f5f5f5;
          padding: 10px;
          text-align: left;
          border-bottom: 2px solid #ddd;
        }
        td {
          padding: 10px;
          border-bottom: 1px solid #eee;
        }
        .timestamp {
          width: 180px;
          font-family: monospace;
          color: #7f8c8d;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 12px;
          color: #95a5a6;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Bragfy</div>
          <h1>${title}</h1>
          <div class="period">
            ${formatReportPeriod(startDate, endDate)}
            ${userName ? `<br>Usuário: ${userName}` : ""}
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th class="timestamp">Data/Hora</th>
              <th>Atividade</th>
            </tr>
          </thead>
          <tbody>
            ${
              activities.length > 0
                ? activitiesHtml
                : `
              <tr>
                <td colspan="2" style="text-align: center; padding: 30px;">
                  Nenhuma atividade registrada neste período.
                </td>
              </tr>
            `
            }
          </tbody>
        </table>
        
        <div class="footer">
          Gerado por Bragfy em ${formatTimestamp(new Date())}
        </div>
      </div>
    </body>
    </html>
  `;
}
