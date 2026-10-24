// The shared Reformer Dijital kit (served by the CRM): Fullmatik sign-in gate, "Hata bildir", visit beacons and
// the hand-placed waiting ads. Loaded on the builder only, never on the studios' own sites (/s/…).
export const KIT_SRC = "https://bsgkg4wwk0g8oko8g04w4ggw.mavrosai.site/kit/fm-kit.js";

type Kit = {
  ready: Promise<unknown>;
  token(): string | null;
  logout(): void;
  requireLogin(): Promise<unknown>;
  showAd(placement: string, opts: { container: HTMLElement }): Promise<{ shown: boolean }>;
};
declare global {
  interface Window {
    FMKit?: Kit;
  }
}

const PROFILE_KEY = "fullmatik-profile-v1";

/** The member's session token: from the kit, or (pages without the kit, e.g. a preview's editor) from storage. */
export function memberToken(): string | null {
  try {
    if (window.FMKit) return window.FMKit.token();
    const p = JSON.parse(localStorage.getItem(PROFILE_KEY) || sessionStorage.getItem(PROFILE_KEY) || "null");
    return p && typeof p.token === "string" ? p.token : null;
  } catch {
    return null;
  }
}

/** Our server did not accept the session: show the sign-in again and resolve once they are back in. */
export async function signInAgain() {
  const kit = window.FMKit;
  if (!kit) return;
  kit.logout();
  await kit.requireLogin();
}

/** An unskippable 5-15 s ad inside `box` while a site builds; resolves at once when there is none. */
export function waitingAd(box: HTMLElement | null): Promise<void> {
  const kit = window.FMKit;
  if (!kit || !box) return Promise.resolve();
  return kit.showAd("arac_bekleme", { container: box }).then(
    () => undefined,
    () => undefined,
  );
}
