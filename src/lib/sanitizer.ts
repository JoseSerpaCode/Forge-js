import DOMPurify from 'isomorphic-dompurify';

// 1. Hook de sanitización: Se ejecuta a nivel de módulo, una sola vez.
DOMPurify.addHook('afterSanitizeAttributes', function (node) {
  // Validación de Protocolos en Href
  if (node.hasAttribute('href')) {
    const href = node.getAttribute('href') || '';
    // Protocolos seguros (http/https/mailto), rutas absolutas (/), o anclas (#)
    // El doble slash (//) se rechaza explícitamente para evitar protocol-relative URLs engañosas (ej. //evil.com)
    if (!/^(https?|mailto):/i.test(href) && !(href.startsWith('/') && !href.startsWith('//')) && !href.startsWith('#')) {
      node.removeAttribute('href');
    }
  }
  
  // Prevención de Reverse Tabnabbing
  if (node.hasAttribute('target')) {
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

const sanitizeOptions = {
  ALLOWED_TAGS: ['b', 'i', 'mark', 'code', 'a'],
  ALLOWED_ATTR: ['href', 'target'],
  ALLOW_DATA_URI: false 
};

const cleanHTML = (dirty: string) => DOMPurify.sanitize(dirty, sanitizeOptions);

export function sanitizeEditorBlocks(blocks: any[]) {
  if (!Array.isArray(blocks)) return [];
  
  const safeBlocks = [];

  for (const block of blocks) {
    // Clon superficial para no mutar los originales en memoria
    const safeBlock = { ...block, data: { ...block.data } };
    
    switch (block.type) {
      case 'paragraph':
      case 'header':
        if (typeof safeBlock.data.text === 'string') {
          safeBlock.data.text = cleanHTML(safeBlock.data.text);
        }
        safeBlocks.push(safeBlock);
        break;
        
      case 'quote':
        if (typeof safeBlock.data.text === 'string') {
          safeBlock.data.text = cleanHTML(safeBlock.data.text);
        }
        if (typeof safeBlock.data.caption === 'string') {
          safeBlock.data.caption = cleanHTML(safeBlock.data.caption);
        }
        safeBlocks.push(safeBlock);
        break;
        
      case 'list':
        if (Array.isArray(safeBlock.data.items)) {
          safeBlock.data.items = safeBlock.data.items.map((item: any) => {
            if (typeof item === 'string') {
              return cleanHTML(item);
            } else {
              console.warn(`[Sanitizer] Ítem de lista no válido descartado (no era string)`);
              return '';
            }
          });
        }
        safeBlocks.push(safeBlock);
        break;
        
      case 'checklist':
        if (Array.isArray(safeBlock.data.items)) {
          safeBlock.data.items = safeBlock.data.items.map((item: any) => ({
            ...item,
            text: typeof item.text === 'string' ? cleanHTML(item.text) : ''
          }));
        }
        safeBlocks.push(safeBlock);
        break;

      default:
        // Cierre crítico de brecha: Cualquier tipo de bloque desconocido o el peligroso 'raw'
        // es descartado completamente. No entra en el array safeBlocks.
        console.warn(`[Sanitizer] Bloque no soportado o potencialmente malicioso descartado: ${block.type}`);
        break;
    }
  }
  
  return safeBlocks;
}
