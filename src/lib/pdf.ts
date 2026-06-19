import puppeteer, { Browser } from "puppeteer"

const EDITOR_STYLES = `
  body {
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: #1a1a2e;
    padding: 40px;
    max-width: 800px;
    margin: 0 auto;
  }
  h1 { font-size: 20px; font-weight: 700; margin: 16px 0 8px; }
  h2 { font-size: 18px; font-weight: 600; margin: 14px 0 6px; }
  h3 { font-size: 16px; font-weight: 600; margin: 12px 0 4px; }
  p { margin: 8px 0; }
  ul, ol { padding-left: 24px; margin: 8px 0; }
  li { margin: 4px 0; }
  blockquote {
    border-left: 3px solid #d1d5db;
    margin: 8px 0;
    padding: 4px 16px;
    color: #6b7280;
  }
  code {
    background: #f3f4f6;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 13px;
  }
  pre code {
    display: block;
    padding: 12px;
    overflow-x: auto;
  }
`

let browserPromise: Promise<Browser> | null = null

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({ headless: true })
  }
  return browserPromise
}

const SKELETON = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${EDITOR_STYLES}</style>
</head>
<body id="pdf-content"></body>
</html>`

export async function generatePdf(html: string): Promise<Buffer> {
  const browser = await getBrowser()
  const page = await browser.newPage()
  try {
    await page.setContent(SKELETON, { waitUntil: "load" })
    await page.evaluate((content) => {
      document.getElementById("pdf-content")!.innerHTML = content
    }, html)

    const pdf = await page.pdf({
      format: "A4",
      margin: { top: "40px", bottom: "40px", left: "40px", right: "40px" },
      printBackground: true,
    })

    return Buffer.from(pdf)
  } finally {
    await page.close()
  }
}
