import { fabric } from "fabric";

export class ExposureFilter extends fabric.Image.filters.BaseFilter {
  type: string = "Exposure";
  exposure: number;

  constructor(options: { exposure: number }) {
    super();
    this.exposure = options.exposure || 0;
  }

  // Apply the exposure filter to the image
  applyTo(canvasEl: HTMLCanvasElement) {
    const context = canvasEl.getContext("2d")!;
    const imageData = context.getImageData(
      0,
      0,
      canvasEl.width,
      canvasEl.height,
    );
    const data = imageData.data;

    const exposureFactor = Math.pow(2, this.exposure); // Exposure factor based on exposure value

    // Loop through all the pixels and adjust their RGB values based on the exposure factor
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i]; // Red channel
      let g = data[i + 1]; // Green channel
      let b = data[i + 2]; // Blue channel

      // Apply exposure effect to each color channel
      r = this.applyExposure(r, exposureFactor);
      g = this.applyExposure(g, exposureFactor);
      b = this.applyExposure(b, exposureFactor);

      // Update the pixel data with the new adjusted values
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }

    // Put the modified image data back to the canvas
    context.putImageData(imageData, 0, 0);
  }

  // Helper function to apply the exposure to an individual color channel
  private applyExposure(colorValue: number, exposureFactor: number): number {
    // Apply the exposure factor to the color channel
    let newColor = colorValue * exposureFactor;
    newColor = Math.min(255, Math.max(0, newColor)); // Clamp the color value
    return newColor;
  }

  // Method to adjust the exposure value
  setExposure(exposure: number) {
    this.exposure = exposure;
  }
}
