// Data shapes for comic pages. Content files (content/pages/*.json) follow these.

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A character/prop image layered inside a panel. Coordinates are panel-local (top-left = 0,0). */
export interface CutoutDef {
  key: string; // texture key
  x: number;
  y: number; // feet / bottom-centre of the image
  scale?: number;
  flipX?: boolean;
}

export interface PanelDef {
  id: string; // "P1".."P6" (Blueprint H3)
  frame: Rect; // where the panel sits on the 1920×1080 screen
  src: Rect; // which part of the page background shows in it (texture pixels); cover-fitted to the frame
  cutouts?: CutoutDef[];
}

export interface PageDef {
  id: string; // e.g. "mira"
  background: string; // texture key of the one wide scene this page is cut from
  bounds: Rect; // paper area behind the panels
  panels: PanelDef[];
}
