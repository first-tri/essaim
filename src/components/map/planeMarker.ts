export function createPlaneElement(): HTMLDivElement {
  const el = document.createElement("div");
  el.style.width = "34px";
  el.style.height = "34px";
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  el.style.filter = "drop-shadow(0 2px 5px rgba(0,0,0,0.4))";
  el.innerHTML = `
    <svg width="30" height="30" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="11" fill="var(--color-accent)" fill-opacity="0.16" />
      <polygon points="12,2 20,20 12,15.5 4,20" fill="var(--color-accent)" stroke="white" stroke-width="1" stroke-linejoin="round" />
    </svg>
  `;
  return el;
}
