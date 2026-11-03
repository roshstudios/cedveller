import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export async function fileToImages(file: File, group = ''): Promise<{ images: string[]; text: string; pages: number }> {
  if (file.size > 15 * 1024 * 1024) throw new Error('Fayl ən çox 15 MB ola bilər.');
  if (file.name.toLowerCase().endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const { docxToImages } = await import('./docx');
    try {
      return await docxToImages(file);
    } catch (error) {
      if (error instanceof Error && /DOCX|Word/.test(error.message)) throw error;
      throw new Error('DOCX faylını oxumaq mümkün olmadı. Şifrəsiz .docx faylı yüklə və ya Word-dən PDF kimi ixrac et.');
    }
  }
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const n = Math.min(doc.numPages, 8);
    const images: string[] = [];
    let text = '';
    for (let i = 1; i <= n; i++) {
      const page = await doc.getPage(i);
      const vp0 = page.getViewport({ scale: 1 });
      const scale = Math.min(2.5, 2600 / Math.max(vp0.width, vp0.height));
      const vp = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = vp.width; canvas.height = vp.height;
      await page.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport: vp }).promise;
      const tc = await page.getTextContent();
      const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const items = tc.items.filter((it): it is Extract<(typeof tc.items)[number], { str: string }> => 'str' in it);
      let sourceText = items.map((it) => it.str).join(' ');
      const header = group ? items.find((it) => norm(it.str) === norm(group)) : undefined;
      if (header) {
        // Keep the time/day gutter and neighbouring group columns in ONE image.
        // Full-width multi-group tables otherwise make cell borders too small.
        const row = items.filter((it) => Math.abs(it.transform[5] - header.transform[5]) < 3 && /\d/.test(it.str))
          .sort((a, b) => a.transform[4] - b.transform[4]);
        const index = row.indexOf(header);
        const at = (i: number) => row[i].transform[4] + row[i].width / 2;
        if (index > 0 && index < row.length - 1) {
          const colWidth = Math.min(at(index) - at(index - 1), at(index + 1) - at(index));
          const x0 = Math.max(70, at(index) - colWidth * 1.5);
          const x1 = Math.min(vp0.width, at(index) + colWidth * 1.5);
          const gutter = Math.min(70, x0);
          const focused = document.createElement('canvas');
          focused.width = Math.ceil((gutter + x1 - x0 + 8) * scale);
          focused.height = canvas.height;
          const context = focused.getContext('2d')!;
          context.fillStyle = '#ffffff'; context.fillRect(0, 0, focused.width, focused.height);
          context.drawImage(canvas, 0, 0, gutter * scale, canvas.height, 0, 0, gutter * scale, canvas.height);
          context.drawImage(canvas, x0 * scale, 0, (x1 - x0) * scale, canvas.height,
            (gutter + 8) * scale, 0, (x1 - x0) * scale, canvas.height);
          images.push(focused.toDataURL('image/jpeg', 0.9));
          const targetLeft = (at(index - 1) + at(index)) / 2;
          const targetRight = (at(index) + at(index + 1)) / 2;
          sourceText = `Seçilmiş qrup: ${group}. Şəkildə solda gün/saat sütunu, sağda seçilmiş qrup və qonşu sütunlar var. Qonşu sütunlardan yalnız seçilmiş qrupla birləşmiş hüceyrələri daxil et.\n` +
            items.filter((it) => it.transform[4] < gutter ||
              (it.transform[4] < targetRight && it.transform[4] + it.width > targetLeft))
              .map((it) => it.str).join(' ');
        } else images.push(canvas.toDataURL('image/jpeg', 0.9));
      } else images.push(canvas.toDataURL('image/jpeg', 0.9));
      text += sourceText + '\n';
    }
    return { images, text: text.slice(0, 100000), pages: doc.numPages };
  }
  if (/^image\/(png|jpe?g)$/.test(file.type)) {
    const url = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = () => rej(new Error('Faylı oxumaq mümkün olmadı'));
      r.readAsDataURL(file);
    });
    return { images: [url], text: '', pages: 1 };
  }
  throw new Error('Yalnız PDF, DOCX, PNG və ya JPEG yükləyə bilərsən. Köhnə .doc faylını əvvəl .docx və ya PDF kimi saxla.');
}
