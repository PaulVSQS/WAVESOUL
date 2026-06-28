import gsap from 'gsap';

/**
 * Módulo de animaciones GSAP para transiciones de estado.
 * Separa la lógica de animación de los componentes React.
 */

/**
 * Animación de entrada del logo y elementos iniciales.
 */
export function animateIntro(logoElement: HTMLElement | null): void {
  if (!logoElement) return;

  gsap.fromTo(logoElement, 
    { opacity: 0, y: -20 },
    { opacity: 0.7, y: 0, duration: 1.2, ease: 'power3.out', delay: 0.3 }
  );
}

/**
 * Animación de fade-out de la zona de upload.
 */
export function animateUploadHide(element: HTMLElement | null): gsap.core.Tween | null {
  if (!element) return null;

  return gsap.to(element, {
    opacity: 0,
    scale: 0.95,
    y: 20,
    duration: 0.5,
    ease: 'power2.in',
    onComplete: () => {
      element.style.display = 'none';
    },
  });
}

/**
 * Animación de entrada de los controles del player.
 */
export function animateControlsShow(element: HTMLElement | null): gsap.core.Tween | null {
  if (!element) return null;

  element.style.display = 'flex';

  return gsap.fromTo(element,
    { opacity: 0, y: 30 },
    { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
  );
}

/**
 * Pulso sutil en el botón de play al iniciar.
 */
export function animatePlayPulse(element: HTMLElement | null): void {
  if (!element) return;

  gsap.fromTo(element,
    { scale: 1 },
    { 
      scale: 1.15, 
      duration: 0.2, 
      ease: 'power2.out',
      yoyo: true,
      repeat: 1,
    }
  );
}

/**
 * Flash sutil del fondo en un peak/beat.
 */
export function animateBackgroundFlash(element: HTMLElement | null, color: string): void {
  if (!element) return;

  gsap.fromTo(element,
    { boxShadow: `inset 0 0 100px ${color}` },
    { 
      boxShadow: 'inset 0 0 100px transparent',
      duration: 0.8,
      ease: 'power2.out',
    }
  );
}
