const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

// Width in characters per paper size at standard font
export const PRINTER_WIDTH = 32; // 58mm default
export const PRINTER_WIDTHS: Record<string, number> = {
  "58mm": 32,
  "80mm": 48,
};

export class EscPos {
  private buf: number[] = [];

  init(): this {
    this.buf.push(ESC, 0x40); // ESC @ — initialize
    return this;
  }

  text(str: string): this {
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      // Map common Spanish chars to CP437 equivalents
      switch (str[i]) {
        case "á": this.buf.push(0xa0); break;
        case "é": this.buf.push(0x82); break;
        case "í": this.buf.push(0xa1); break;
        case "ó": this.buf.push(0xa2); break;
        case "ú": this.buf.push(0xa3); break;
        case "ñ": this.buf.push(0xa4); break;
        case "Á": this.buf.push(0xb5); break;
        case "É": this.buf.push(0x90); break;
        case "Í": this.buf.push(0xd6); break;
        case "Ó": this.buf.push(0xe0); break;
        case "Ú": this.buf.push(0xe9); break;
        case "Ñ": this.buf.push(0xa5); break;
        case "¡": this.buf.push(0xad); break;
        case "¿": this.buf.push(0xa8); break;
        default: this.buf.push(c <= 255 ? c : 0x3f); // '?' fallback
      }
    }
    return this;
  }

  feed(lines = 1): this {
    for (let i = 0; i < lines; i++) this.buf.push(LF);
    return this;
  }

  align(a: "left" | "center" | "right"): this {
    const n = a === "left" ? 0 : a === "center" ? 1 : 2;
    this.buf.push(ESC, 0x61, n);
    return this;
  }

  bold(on: boolean): this {
    this.buf.push(ESC, 0x45, on ? 1 : 0);
    return this;
  }

  // Double height only (width stays 1 for receipt readability)
  double_height(on: boolean): this {
    this.buf.push(GS, 0x21, on ? 0x01 : 0x00);
    return this;
  }

  separator(char = "-", width = PRINTER_WIDTH): this {
    return this.text(char.repeat(width)).feed();
  }

  cut(): this {
    this.buf.push(GS, 0x56, 0x41, 0x00); // GS V A 0 — full cut with feed
    return this;
  }

  build(): Uint8Array {
    return new Uint8Array(this.buf);
  }
}
