export enum AppMode {
  STYLE_REMIX = 'STYLE_REMIX',
  GENERATE = 'GENERATE',
  EDIT = 'EDIT',
  FACE_SWAP = 'FACE_SWAP'
}

export enum ModelVersion {
  GEMINI_3_PRO_IMAGE = 'gemini-3-pro-image-preview', // Nano Banana Pro
  GEMINI_2_5_FLASH_IMAGE = 'gemini-2.5-flash-image' // Nano Banana
}

export enum ImageResolution {
  RES_1K = '1K',
  RES_2K = '2K',
  RES_4K = '4K'
}

export enum AspectRatio {
  SQUARE = '1:1',
  PORTRAIT = '9:16',
  LANDSCAPE = '16:9',
  STANDARD_LANDSCAPE = '4:3',
  STANDARD_PORTRAIT = '3:4'
}

export interface GeneratedImage {
  url: string;
  prompt: string;
  timestamp: number;
}

export interface GenerationConfig {
  prompt: string;
  model: ModelVersion;
  resolution?: ImageResolution;
  aspectRatio: AspectRatio;
  referenceImages: File[]; // For remix/edit
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}