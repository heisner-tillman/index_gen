import JSZip from 'jszip';
import PptxGenJS from 'pptxgenjs';
import { Lecture, Flashcard } from '../types';

// Regex for file sanitization as per spec Phase 5
const sanitizeFilename = (name: string): string => {
  // Replace forbidden characters with hyphen
  let sanitized = name.replace(/[<>:"\\/\\|?*]/g, '-');
  // Strip leading/trailing whitespace and dots
  sanitized = sanitized.replace(/(^\s+|\s+$|\.+$)/g, '');
  // Collapse multiple hyphens
  sanitized = sanitized.replace(/-+/g, '-');
  return sanitized || 'Untitled';
};

/**
 * Convert a data URL (data:image/jpeg;base64,...) to a Uint8Array.
 */
const dataUrlToBytes = (dataUrl: string): Uint8Array => {
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const generateMarkdownContent = (card: Flashcard, lectureTitle: string, imageFilename?: string): string => {
  const imageEmbed = imageFilename ? `\n![[assets/${imageFilename}]]\n` : '';
  return `# ${card.front}
  
[[${lectureTitle}]] (Page ${card.pageNumber})
${imageEmbed}
## Front
${card.front}

## Back
${card.back}
`;
};

/**
 * Generate a PowerPoint (.pptx) file from the lecture data and trigger download.
 * Each slide contains the original slide image (if available) and the concept text.
 * The generated file is compatible with Google Slides, PowerPoint, and Keynote.
 */
export const generatePowerPoint = async (lecture: Lecture): Promise<void> => {
  const pptx = new PptxGenJS();
  const title = sanitizeFilename(lecture.filename.replace('.pdf', ''));
  pptx.title = title;
  pptx.author = 'LectureSynth';
  pptx.subject = `Concepts from ${lecture.filename}`;

  const completedCards = lecture.cards.filter(c => c.status === 'completed');

  for (const card of completedCards) {
    const slide = pptx.addSlide();
    slide.background = { color: 'FFFFFF' };

    if (card.originalImage) {
      // Image on left half of the slide
      slide.addImage({
        data: card.originalImage,
        x: 0.3,
        y: 0.8,
        w: 4.5,
        h: 3.5,
        rounding: true,
      });

      // Title on the right side
      slide.addText(card.front, {
        x: 5.1,
        y: 0.3,
        w: 4.5,
        h: 0.8,
        fontSize: 20,
        bold: true,
        color: '1a1a2e',
        fontFace: 'Arial',
        valign: 'top',
        wrap: true,
      });

      // Body on the right side below title
      slide.addText(card.back, {
        x: 5.1,
        y: 1.2,
        w: 4.5,
        h: 3.1,
        fontSize: 13,
        color: '3d3d5c',
        fontFace: 'Arial',
        valign: 'top',
        wrap: true,
      });
    } else {
      // No image: full-width layout
      slide.addText(card.front, {
        x: 0.5,
        y: 0.4,
        w: 9.0,
        h: 0.9,
        fontSize: 24,
        bold: true,
        color: '1a1a2e',
        fontFace: 'Arial',
        valign: 'top',
        wrap: true,
      });

      slide.addText(card.back, {
        x: 0.5,
        y: 1.5,
        w: 9.0,
        h: 3.0,
        fontSize: 14,
        color: '3d3d5c',
        fontFace: 'Arial',
        valign: 'top',
        wrap: true,
      });
    }

    // Footer with page reference
    slide.addText(`Source: Page ${card.pageNumber}`, {
      x: 0.3,
      y: 4.8,
      w: 3.0,
      h: 0.3,
      fontSize: 9,
      color: '999999',
      fontFace: 'Arial',
    });
  }

  // Trigger download
  await pptx.writeFile({ fileName: `${title}.pptx` });
};

/**
 * Build unique filename for a card and return it along with its image filename.
 */
const resolveCardFilename = (card: Flashcard, usedFilenames: Set<string>): string => {
  let filename = sanitizeFilename(card.front);
  if (usedFilenames.has(filename)) {
    let counter = 1;
    while (usedFilenames.has(`${filename}-${counter}`)) counter++;
    filename = `${filename}-${counter}`;
  }
  usedFilenames.add(filename);
  return filename;
};

export const generateObsidianVault = async (lecture: Lecture) => {
  const zip = new JSZip();
  const folderName = sanitizeFilename(lecture.filename.replace('.pdf', ''));
  const folder = zip.folder(folderName);
  
  if (!folder) throw new Error("Could not create ZIP folder");

  // Create assets subfolder for images
  const assetsFolder = folder.folder('assets');

  // Create the "Master" lecture note
  const masterNoteContent = `# ${folderName}\n\nProcessed on: ${new Date(lecture.uploadDate).toLocaleDateString()}\nTotal Slides: ${lecture.totalSlides}\n\n## Concepts\n`;
  folder.file(`${folderName}.md`, masterNoteContent);

  const usedFilenames = new Set<string>();

  lecture.cards.forEach(card => {
    if (card.status !== 'completed') return;

    const filename = resolveCardFilename(card, usedFilenames);

    // Save slide image if available
    let imageFilename: string | undefined;
    if (card.originalImage && assetsFolder) {
      imageFilename = `slide-${card.pageNumber}.jpg`;
      assetsFolder.file(imageFilename, dataUrlToBytes(card.originalImage), { binary: true });
    }

    folder.file(`${filename}.md`, generateMarkdownContent(card, folderName, imageFilename));
  });



  const content = await zip.generateAsync({ type: "blob" });
  
  // Trigger download
  const url = window.URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${folderName}-obsidian-vault.zip`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

/**
 * Build the file map for the vault (shared between ZIP and directory save).
 * Returns text files and binary image files separately.
 */
const buildVaultFiles = (lecture: Lecture): { textFiles: Map<string, string>; imageFiles: Map<string, Uint8Array> } => {
  const textFiles = new Map<string, string>();
  const imageFiles = new Map<string, Uint8Array>();
  const folderName = sanitizeFilename(lecture.filename.replace('.pdf', ''));

  // Master note
  textFiles.set(`${folderName}.md`,
    `# ${folderName}\n\nProcessed on: ${new Date(lecture.uploadDate).toLocaleDateString()}\nTotal Slides: ${lecture.totalSlides}\n\n## Concepts\n`
  );

  const usedFilenames = new Set<string>();
  lecture.cards.forEach(card => {
    if (card.status !== 'completed') return;
    const filename = resolveCardFilename(card, usedFilenames);

    // Save slide image if available
    let imageFilename: string | undefined;
    if (card.originalImage) {
      imageFilename = `slide-${card.pageNumber}.jpg`;
      imageFiles.set(`assets/${imageFilename}`, dataUrlToBytes(card.originalImage));
    }

    textFiles.set(`${filename}.md`, generateMarkdownContent(card, folderName, imageFilename));
  });


  return { textFiles, imageFiles };
};

/**
 * Save vault files directly to a user-chosen directory using File System Access API.
 * Falls back to ZIP download if the API is not supported.
 */
export const saveVaultToDirectory = async (lecture: Lecture): Promise<{ saved: boolean; path?: string }> => {
  // Check if File System Access API is available
  if (!('showDirectoryPicker' in window)) {
    // Fallback: download as ZIP
    await generateObsidianVault(lecture);
    return { saved: true, path: '(downloaded as ZIP)' };
  }

  try {
    const dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
    const folderName = sanitizeFilename(lecture.filename.replace('.pdf', ''));

    // Create a subfolder for this lecture
    const vaultFolder = await dirHandle.getDirectoryHandle(folderName, { create: true });

    const { textFiles, imageFiles } = buildVaultFiles(lecture);

    // Write text files
    for (const [filename, content] of textFiles) {
      const fileHandle = await vaultFolder.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
    }

    // Write image files (in assets/ subfolder)
    if (imageFiles.size > 0) {
      const assetsFolder = await vaultFolder.getDirectoryHandle('assets', { create: true });
      for (const [path, bytes] of imageFiles) {
        const imgName = path.replace('assets/', '');
        const fileHandle = await assetsFolder.getFileHandle(imgName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(bytes);
        await writable.close();
      }
    }

    return { saved: true, path: `${dirHandle.name}/${folderName}` };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      // User cancelled the picker
      return { saved: false };
    }
    throw err;
  }
};