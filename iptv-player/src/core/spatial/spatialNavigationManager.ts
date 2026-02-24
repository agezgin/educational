/**
 * Spatial Navigation Manager
 *
 * react-tv-space-navigation ve @noriginmedia/norigin-spatial-navigation
 * kutuphanelerinden esinlenen JS tabanli focus agaci.
 *
 * Platform-native focus engine yerine JS'de spatial hesaplama yaparak
 * hem Android TV hem Samsung Tizen'de ayni davranisi garanti eder.
 *
 * Ozellikler:
 * - LRUD (Left/Right/Up/Down) spatial navigasyon
 * - Focus memory (son focus'u hatirla)
 * - Focus trapping (modal/overlay icin)
 * - Focus grupları (horizontal/vertical)
 * - Nearest-neighbor hesaplama (en yakin elemana git)
 *
 * Kullanim:
 *   spatialNav.registerNode({ id: 'ch_1', ... })
 *   spatialNav.setFocus('ch_1')
 *   spatialNav.move('right')
 */

// ─── Types ──────────────────────────────────────────────

export type Direction = 'left' | 'right' | 'up' | 'down';

export interface SpatialNode {
  /** Benzersiz ID */
  id: string;
  /** Ust node ID (grup icin) */
  parentId?: string;
  /** Ekrandaki konum (layout'tan alinir) */
  layout: { x: number; y: number; width: number; height: number };
  /** Focusable mi? */
  focusable: boolean;
  /** Focus olunca callback */
  onFocus?: () => void;
  /** Focus kaybolunca callback */
  onBlur?: () => void;
  /** Select (OK tusu) callback */
  onSelect?: () => void;
  /** Long-press callback */
  onLongPress?: () => void;
  /** Bu node focus'u yakalasin mi (modal icin) */
  trapFocus?: boolean;
  /** Navigasyon yonu kisitlamasi */
  orientation?: 'horizontal' | 'vertical';
  /** Son focuslanan cocuk node ID */
  lastFocusedChild?: string;
}

export interface FocusEvent {
  /** Onceki focus node */
  from: string | null;
  /** Yeni focus node */
  to: string;
  /** Hangi yonle gelindi */
  direction?: Direction;
}

type FocusChangeListener = (event: FocusEvent) => void;

// ─── Manager ────────────────────────────────────────────

class SpatialNavigationManager {
  private nodes = new Map<string, SpatialNode>();
  private currentFocusId: string | null = null;
  private listeners: FocusChangeListener[] = [];
  private focusHistory: string[] = [];
  private maxHistory = 50;

  // ─── Node Kayit ─────────────────────────────

  /** Yeni focusable node kaydet */
  registerNode(node: SpatialNode): void {
    this.nodes.set(node.id, node);

    // Ilk kayit edilen focusable node'a otomatik focus
    if (!this.currentFocusId && node.focusable) {
      this.setFocus(node.id);
    }
  }

  /** Node kaydini sil */
  unregisterNode(id: string): void {
    const wasCurrentFocus = this.currentFocusId === id;
    this.nodes.delete(id);

    // Silinen node focus'taysa en yakin node'a gec
    if (wasCurrentFocus) {
      const nearest = this.findNearestFocusable();
      if (nearest) {
        this.setFocus(nearest.id);
      } else {
        this.currentFocusId = null;
      }
    }
  }

  /** Node layout'unu guncelle (scroll/resize sonrasi) */
  updateLayout(id: string, layout: SpatialNode['layout']): void {
    const node = this.nodes.get(id);
    if (node) {
      node.layout = layout;
    }
  }

  // ─── Focus Yonetimi ─────────────────────────

  /** Belirli node'a focus ver */
  setFocus(id: string, direction?: Direction): void {
    const targetNode = this.nodes.get(id);
    if (!targetNode || !targetNode.focusable) return;

    const previousId = this.currentFocusId;
    if (previousId === id) return;

    // Onceki node'u blur et
    if (previousId) {
      const prevNode = this.nodes.get(previousId);
      prevNode?.onBlur?.();

      // Ust node'un lastFocusedChild'ini guncelle
      if (prevNode?.parentId) {
        const parent = this.nodes.get(prevNode.parentId);
        if (parent) {
          parent.lastFocusedChild = previousId;
        }
      }

      // History'ye ekle
      this.focusHistory = [
        previousId,
        ...this.focusHistory.slice(0, this.maxHistory - 1),
      ];
    }

    // Yeni node'u focus et
    this.currentFocusId = id;
    targetNode.onFocus?.();

    // Listener'lari bilgilendir
    const event: FocusEvent = { from: previousId, to: id, direction };
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  /** Mevcut focus'u getir */
  getCurrentFocus(): string | null {
    return this.currentFocusId;
  }

  /** Onceki focus'a don */
  focusBack(): boolean {
    if (this.focusHistory.length === 0) return false;

    const previousId = this.focusHistory[0];
    const node = this.nodes.get(previousId);
    if (node?.focusable) {
      this.focusHistory = this.focusHistory.slice(1);
      this.setFocus(previousId);
      return true;
    }
    // Gecersiz kayit, bir sonrakini dene
    this.focusHistory = this.focusHistory.slice(1);
    return this.focusBack();
  }

  // ─── Spatial Navigasyon ─────────────────────

  /**
   * Belirtilen yone dogru hareket et.
   * Nearest-neighbor algoritmasi ile en uygun node'u bulur.
   */
  move(direction: Direction): boolean {
    if (!this.currentFocusId) {
      const first = this.findNearestFocusable();
      if (first) {
        this.setFocus(first.id);
        return true;
      }
      return false;
    }

    const current = this.nodes.get(this.currentFocusId);
    if (!current) return false;

    // Focus trap kontrolu - trap icindeyken disari cikilamaz
    const trapNode = this.findTrapAncestor(current);
    const candidates = this.getCandidatesInDirection(current, direction, trapNode);

    if (candidates.length === 0) return false;

    // En yakin node'u bul (mesafe + hizalama skoruyla)
    const best = candidates.reduce((a, b) =>
      this.calculateScore(current, a, direction) <
      this.calculateScore(current, b, direction)
        ? a : b
    );

    this.setFocus(best.id, direction);
    return true;
  }

  /** OK tusuna basma */
  select(): void {
    if (!this.currentFocusId) return;
    const node = this.nodes.get(this.currentFocusId);
    node?.onSelect?.();
  }

  /** Uzun basma */
  longPress(): void {
    if (!this.currentFocusId) return;
    const node = this.nodes.get(this.currentFocusId);
    node?.onLongPress?.();
  }

  // ─── Listener'lar ───────────────────────────

  /** Focus degisim dinleyicisi ekle */
  addListener(listener: FocusChangeListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // ─── Spatial Hesaplama ──────────────────────

  /** Belirtilen yone gore adaylari filtrele */
  private getCandidatesInDirection(
    current: SpatialNode,
    direction: Direction,
    trapNode?: SpatialNode,
  ): SpatialNode[] {
    const cx = current.layout.x + current.layout.width / 2;
    const cy = current.layout.y + current.layout.height / 2;

    const candidates: SpatialNode[] = [];

    for (const [id, node] of this.nodes) {
      if (id === current.id || !node.focusable) continue;

      // Trap icindeyse sadece trap cocuklarini degerlendir
      if (trapNode && !this.isDescendantOf(node, trapNode)) continue;

      const nx = node.layout.x + node.layout.width / 2;
      const ny = node.layout.y + node.layout.height / 2;

      switch (direction) {
        case 'right': if (nx > cx) candidates.push(node); break;
        case 'left':  if (nx < cx) candidates.push(node); break;
        case 'down':  if (ny > cy) candidates.push(node); break;
        case 'up':    if (ny < cy) candidates.push(node); break;
      }
    }

    return candidates;
  }

  /**
   * Mesafe + hizalama skoru.
   * Ayni satir/sutundaki elemanlara oncelik verir.
   */
  private calculateScore(
    from: SpatialNode,
    to: SpatialNode,
    direction: Direction,
  ): number {
    const fx = from.layout.x + from.layout.width / 2;
    const fy = from.layout.y + from.layout.height / 2;
    const tx = to.layout.x + to.layout.width / 2;
    const ty = to.layout.y + to.layout.height / 2;

    const dx = tx - fx;
    const dy = ty - fy;

    // Ana yon mesafesi + capraz ceza
    const isHorizontal = direction === 'left' || direction === 'right';
    const primaryDist = isHorizontal ? Math.abs(dx) : Math.abs(dy);
    const crossDist = isHorizontal ? Math.abs(dy) : Math.abs(dx);

    // Capraz mesafeye ceza (3x) - ayni satirda kalmayi tesvik
    return primaryDist + crossDist * 3;
  }

  /** Trap ancestor'u bul */
  private findTrapAncestor(node: SpatialNode): SpatialNode | undefined {
    if (node.trapFocus) return node;
    if (node.parentId) {
      const parent = this.nodes.get(node.parentId);
      if (parent) return this.findTrapAncestor(parent);
    }
    return undefined;
  }

  /** Node baska bir node'un cocugu mu? */
  private isDescendantOf(node: SpatialNode, ancestor: SpatialNode): boolean {
    if (node.id === ancestor.id) return true;
    if (node.parentId) {
      const parent = this.nodes.get(node.parentId);
      if (parent) return this.isDescendantOf(parent, ancestor);
    }
    return false;
  }

  /** En yakin focusable node'u bul */
  private findNearestFocusable(): SpatialNode | undefined {
    for (const node of this.nodes.values()) {
      if (node.focusable) return node;
    }
    return undefined;
  }

  /** Tum kayitlari temizle */
  clear(): void {
    this.nodes.clear();
    this.currentFocusId = null;
    this.listeners = [];
    this.focusHistory = [];
  }
}

// Singleton instance
export const spatialNav = new SpatialNavigationManager();
