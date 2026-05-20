import sharp from 'sharp';

export interface PreprocessOptions {
  inputSize: number;
  mean: [number, number, number];
  std: [number, number, number];
}

/**
 * Decode an image buffer and convert it to a normalized NCHW Float32Array
 * ready to feed into an ONNX classification model.
 *
 * Output layout: [1, 3, H, W] with each channel = (pixel/255 - mean) / std.
 */
export const imageBufferToTensor = async (
  buffer: Buffer,
  { inputSize, mean, std }: PreprocessOptions,
): Promise<Float32Array> => {
  // Match the training-time preprocessing exactly:
  //   transforms.Resize((IMG_SIZE, IMG_SIZE)) in PyTorch stretches the image
  //   to a fixed square. We must do the same (fit: 'fill') instead of cropping,
  //   otherwise the model sees different content than it learned on.
  const { data } = await sharp(buffer)
    .removeAlpha()
    .resize(inputSize, inputSize, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = inputSize * inputSize;
  const tensor = new Float32Array(3 * pixels);

  // sharp gives us HWC interleaved RGB; we need CHW.
  for (let i = 0; i < pixels; i++) {
    const r = data[i * 3] / 255;
    const g = data[i * 3 + 1] / 255;
    const b = data[i * 3 + 2] / 255;
    tensor[i] = (r - mean[0]) / std[0];
    tensor[i + pixels] = (g - mean[1]) / std[1];
    tensor[i + pixels * 2] = (b - mean[2]) / std[2];
  }

  return tensor;
};
