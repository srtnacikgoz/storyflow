declare module "subset-font" {
  function subsetFont(
    font: Buffer,
    text: string,
    options?: { targetFormat?: "woff2" | "woff" | "sfnt" | "truetype" }
  ): Promise<Buffer>;
  export default subsetFont;
}
