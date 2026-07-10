import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:4321/login');
  
  // Inject the modal HTML into the body
  await page.evaluate(() => {
    document.body.innerHTML += `
<dialog id="docs-modal" class="bg-[#18181b] border border-[#27272a] rounded-lg p-0 w-[650px] text-white shadow-xl backdrop:bg-black/50 overflow-hidden" open style="position: fixed; inset: 0; margin: auto; z-index: 9999;">
  <div class="p-6 border-b border-[#27272a] bg-[#09090b]/50">
    <h2 class="text-xl font-bold flex items-center gap-2">
      About Forge JS
    </h2>
  </div>
  <div class="flex max-h-[60vh]">
    <div class="w-1/3 border-r border-[#27272a] bg-[#09090b]">
      <div class="flex flex-col">
        <button class="p-3 text-left text-sm border-l-2 border-[#8b5cf6] bg-[#18181b] font-bold">Guía de Uso</button>
        <button class="p-3 text-left text-sm text-[#a1a1aa] border-l-2 border-transparent">Documentación</button>
        <button class="p-3 text-left text-sm text-[#a1a1aa] border-l-2 border-transparent">Licencia & Legal</button>
      </div>
    </div>
    <div class="w-2/3 p-6 overflow-y-auto bg-[#18181b] min-h-[300px]">
      <div class="space-y-4">
        <div>
          <h3 class="font-bold text-[#8b5cf6] mb-1 text-sm">Kanban & Sprints</h3>
          <p class="text-xs text-[#a1a1aa]">Un tablero interactivo donde puedes arrastrar y soltar tarjetas (issues). Organiza tu trabajo en Sprints, asigna tareas y observa el progreso en tiempo real de tu equipo.</p>
        </div>
        <div>
          <h3 class="font-bold text-[#8b5cf6] mb-1 text-sm">Knowledge Base</h3>
          <p class="text-xs text-[#a1a1aa]">Un editor de documentos enriquecido para la redacción de wikis, manuales y notas. Permite la organización en páginas y sub-páginas de forma ilimitada.</p>
        </div>
      </div>
    </div>
  </div>
</dialog>
    `;
    
    // add tailwind for good measure
    const style = document.createElement('script');
    style.src = 'https://cdn.tailwindcss.com';
    document.head.appendChild(style);
  });
  
  await page.waitForTimeout(2000); // wait for tailwind to process
  
  const modal = await page.$('#docs-modal');
  if (modal) {
    await modal.screenshot({ path: '/home/jose/.gemini/antigravity-cli/brain/f4c5e6cd-4c4f-44a1-9de9-7ac17a5fa358/about_modal.png' });
  }
  
  await browser.close();
})();
