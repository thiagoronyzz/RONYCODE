import { useCallback, useEffect, useState } from "react";

/** Evento nativo de instalação (ainda não tipado no TS padrão). */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type Plataforma = "android" | "ios" | "desktop";

function detectarPlataforma(): Plataforma {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  const iosClassico = /iPad|iPhone|iPod/.test(ua);
  const iPadOS = /Macintosh/.test(ua) && (navigator as Navigator).maxTouchPoints > 1;
  if (iosClassico || iPadOS) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

/**
 * Cuida de tudo que envolve "baixar o app":
 * guarda o evento beforeinstallprompt, sabe se já está instalado
 * e expõe uma função para disparar a instalação.
 */
const CHAVE_INSTALADO = "ronycode:instalado";

function marcarInstalado() {
  try {
    localStorage.setItem(CHAVE_INSTALADO, "1");
  } catch {
    /* modo privado / storage bloqueado */
  }
}

function jaMarcadoInstalado() {
  try {
    return localStorage.getItem(CHAVE_INSTALADO) === "1";
  } catch {
    return false;
  }
}

export function usePwaInstall() {
  const [evento, setEvento] = useState<BeforeInstallPromptEvent | null>(null);
  const [instalado, setInstalado] = useState(false);
  const [plataforma, setPlataforma] = useState<Plataforma>("desktop");

  useEffect(() => {
    setPlataforma(detectarPlataforma());

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: minimal-ui)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      // Safari iOS
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (standalone) marcarInstalado();

    // já instalado agora, ou instalado antes neste navegador
    setInstalado(standalone || jaMarcadoInstalado());

    // Chrome/Android: pergunta ao sistema se o app já está instalado
    const nav = navigator as Navigator & {
      getInstalledRelatedApps?: () => Promise<unknown[]>;
    };
    nav.getInstalledRelatedApps?.()
      .then((apps) => {
        if (apps && apps.length > 0) {
          marcarInstalado();
          setInstalado(true);
        }
      })
      .catch(() => undefined);

    const aoPoderInstalar = (e: Event) => {
      e.preventDefault();
      setEvento(e as BeforeInstallPromptEvent);
    };
    const aoInstalar = () => {
      marcarInstalado();
      setInstalado(true);
      setEvento(null);
    };

    window.addEventListener("beforeinstallprompt", aoPoderInstalar);
    window.addEventListener("appinstalled", aoInstalar);
    return () => {
      window.removeEventListener("beforeinstallprompt", aoPoderInstalar);
      window.removeEventListener("appinstalled", aoInstalar);
    };
  }, []);

  const instalar = useCallback(async () => {
    if (!evento) return "indisponivel" as const;
    await evento.prompt();
    const { outcome } = await evento.userChoice;
    if (outcome === "accepted") {
      marcarInstalado();
      setInstalado(true);
    }
    setEvento(null);
    return outcome;
  }, [evento]);

  return {
    /** true quando o navegador já liberou o instalador nativo */
    podeInstalar: Boolean(evento),
    instalado,
    plataforma,
    instalar,
  };
}
