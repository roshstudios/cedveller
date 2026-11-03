/** Render Word table geometry before OCR; plain text would lose merged cells. */
export async function docxToImages(file: File) {
  const [{ renderAsync }, { toCanvas }] = await Promise.all([import('docx-preview'), import('html-to-image')]);
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-100000px;top:0;width:1100px;background:white;color:black;pointer-events:none;';
  host.setAttribute('aria-hidden', 'true');
  document.body.appendChild(host);
  try {
    await renderAsync(await file.arrayBuffer(), host, undefined, {
      inWrapper: false, ignoreHeight: true, breakPages: true,
      useBase64URL: true, renderAltChunks: false, renderComments: false,
      className: 'timetable-docx',
    });
    await document.fonts.ready;
    const sections = [...host.querySelectorAll<HTMLElement>('section.timetable-docx')];
    if (!sections.length) throw new Error('DOCX-də oxuna bilən səhifə tapılmadı. Faylı PDF kimi ixrac edib yenidən yüklə.');
    if (sections.length > 8) throw new Error('DOCX ən çox 8 səhifə ola bilər. Lazım olan səhifələri ayrıca fayla çıxar.');
    const images: string[] = [];
    let text = '';
    for (const section of sections) {
      // All fonts/images remain within this temporary DOM; nothing is stored.
      const width = Math.ceil(Math.max(section.scrollWidth, section.getBoundingClientRect().width));
      const height = Math.ceil(Math.max(section.scrollHeight, section.getBoundingClientRect().height));
      if (!width || !height || width * height > 16_000_000 || height > 5000) {
        throw new Error('Word səhifəsi çox böyükdür. Səhifə sonları əlavə et və ya PDF kimi ixrac et.');
      }
      const canvas = await toCanvas(section, {
        backgroundColor: '#ffffff', width, height,
        pixelRatio: Math.min(2, 2200 / Math.max(width, height)),
        skipFonts: true,
      });
      images.push(canvas.toDataURL('image/jpeg', 0.85));
      text += section.innerText + '\n';
    }
    return { images, text: text.slice(0, 100000), pages: sections.length };
  } finally {
    host.remove();
  }
}
