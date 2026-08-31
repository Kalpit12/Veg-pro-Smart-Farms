const ROOT_THEME_VARS = [
  "--background",
  "--foreground",
  "--card",
  "--card-foreground",
  "--popover",
  "--popover-foreground",
  "--primary",
  "--primary-foreground",
  "--secondary",
  "--secondary-foreground",
  "--muted",
  "--muted-foreground",
  "--accent",
  "--accent-foreground",
  "--destructive",
  "--border",
  "--input",
  "--ring",
  "--chart-1",
  "--chart-2",
  "--chart-3",
  "--chart-4",
  "--chart-5",
  "--sidebar",
  "--sidebar-foreground",
  "--sidebar-primary",
  "--sidebar-primary-foreground",
  "--sidebar-accent",
  "--sidebar-accent-foreground",
  "--sidebar-border",
  "--sidebar-ring",
] as const;

function resolveCssVariable(doc: Document, name: string, probe: HTMLElement) {
  probe.style.setProperty("background-color", `var(${name})`);
  const value = doc.defaultView?.getComputedStyle(probe).backgroundColor;
  return value && value !== "rgba(0, 0, 0, 0)" ? value : null;
}

/** RGB overrides so embedded export styles never parse raw oklch() text. */
function buildResolvedThemeCss(doc: Document) {
  const probe = doc.createElement("div");
  probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none";
  doc.body.appendChild(probe);

  const declarations = ROOT_THEME_VARS.flatMap((name) => {
    const value = resolveCssVariable(doc, name, probe);
    return value ? [`${name}: ${value};`, `--color-${name.slice(2)}: ${value};`] : [];
  });

  doc.body.removeChild(probe);
  return `:root, :host, .dark { ${declarations.join(" ")} }`;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load report image."));
    image.src = src;
  });
}

export async function downloadElementAsPdf(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const { domToPng } = await import("modern-screenshot");
  const { jsPDF } = await import("jspdf");

  const backgroundColor = element.ownerDocument.defaultView
    ?.getComputedStyle(element)
    .backgroundColor;
  const scale = 2;
  const themeCss = buildResolvedThemeCss(element.ownerDocument);

  const dataUrl = await domToPng(element, {
    scale,
    backgroundColor:
      backgroundColor && backgroundColor !== "rgba(0, 0, 0, 0)"
        ? backgroundColor
        : "#ffffff",
    width: element.scrollWidth,
    height: element.scrollHeight,
    onCloneNode: (cloned) => {
      const doc = cloned.ownerDocument;
      if (!doc || doc.getElementById("vegpro-pdf-theme")) return;
      const style = doc.createElement("style");
      style.id = "vegpro-pdf-theme";
      style.textContent = themeCss;
      doc.head.appendChild(style);
    },
  });

  const image = await loadImage(dataUrl);
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const contentWidth = pageWidth - margin * 2;
  const imgHeight = (image.height * contentWidth) / image.width;

  let heightLeft = imgHeight;
  let position = margin;

  pdf.addImage(dataUrl, "PNG", margin, position, contentWidth, imgHeight);
  heightLeft -= pageHeight - margin * 2;

  while (heightLeft > 0) {
    pdf.addPage();
    position = margin - (imgHeight - heightLeft);
    pdf.addImage(dataUrl, "PNG", margin, position, contentWidth, imgHeight);
    heightLeft -= pageHeight - margin * 2;
  }

  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}
