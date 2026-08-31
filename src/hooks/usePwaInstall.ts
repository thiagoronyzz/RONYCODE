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
export function usePwaInstall() {
  const [evento, setEvento] = useState<BeforeInstallPromptEvent | null>(null);
  const [instalado, setInstalado] = useState(false);
  const [plataforma, setPlataforma] = useState<Plataforma>("desktop");

  useEffect(() => {
    setPlataforma(detectarPlataforma());

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // Safari iOS
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalado(standalone);

    const aoPoderInstalar = (e: Event) => {
      e.preventDefault();
      setEvento(e as BeforeInstallPromptEvent);
    };
    const aoInstalar = () => {
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
    if (outcome === "accepted") setInstalado(true);
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
