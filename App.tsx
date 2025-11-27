import React, { useState, useRef } from 'react';
import { ApiKeyGuard } from './components/ApiKeyGuard';
import { Button } from './components/Button';
import { ImageUploader } from './components/ImageUploader';
import { generateImageContent } from './services/geminiService';
import { AppMode, AspectRatio, ImageResolution, ModelVersion } from './types';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.STYLE_REMIX);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);

  // Inputs
  const [refImage1, setRefImage1] = useState<File | null>(null); // Style or Face Ref
  const [refImage2, setRefImage2] = useState<File | null>(null); // Subject or Target Body
  const [prompt, setPrompt] = useState<string>('');
  const [resolution, setResolution] = useState<ImageResolution>(ImageResolution.RES_1K);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.SQUARE);

  // Previews
  const [preview1, setPreview1] = useState<string | null>(null);
  const [preview2, setPreview2] = useState<string | null>(null);

  const handleRef1Change = (file: File | null) => {
    setRefImage1(file);
    if (file) {
      setPreview1(URL.createObjectURL(file));
    } else {
      setPreview1(null);
    }
  };

  const handleRef2Change = (file: File | null) => {
    setRefImage2(file);
    if (file) {
      setPreview2(URL.createObjectURL(file));
    } else {
      setPreview2(null);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setResultImage(null);

    try {
      let finalPrompt = prompt;
      let model = ModelVersion.GEMINI_3_PRO_IMAGE;
      let images: File[] = [];

      if (mode === AppMode.STYLE_REMIX) {
        if (!refImage1 || !refImage2) {
          throw new Error("Please upload both Reference and Subject images.");
        }
        images = [refImage1, refImage2];
        
        // Simplified, direct prompt for better model stability
        finalPrompt = `
          Generate a hyper-realistic, premium lifestyle photograph merging these two references.
          
          REFERENCE 1 (Background/Style): Use this image's environment, lighting, and color palette.
          REFERENCE 2 (Subject): Use this person, preserving their exact clothing and identity.
          
          ACTION/CONTEXT: ${prompt || "A candid, high-end Instagram influencer shot."}
          
          REQUIREMENTS:
          1. Photorealism: Must look like a real photo (depth of field, texture, natural lighting).
          2. Clothing Fidelity: Keep the subject's outfit from Reference 2 EXACT, including any text or logos.
          3. Atmosphere: Premium, "quiet luxury" or high-end streetwear aesthetic.
          4. Composition: The subject should be naturally integrated into the background from Reference 1.
        `.trim();
        
      } else if (mode === AppMode.FACE_SWAP) {
        if (!refImage1 || !refImage2) {
            throw new Error("Please upload both Face Reference and Target Image.");
        }
        // Image Order: Target (Body) first, then Face Ref
        images = [refImage2, refImage1]; 

        finalPrompt = `
          Edit the first image (Target Image) by replacing the main subject's face with the face from the second image (Face Reference).
          
          INSTRUCTIONS:
          - Swap the face seamlessly.
          - Maintain the lighting, skin tone match, grain, and angle of the Target Image.
          - Preserve the facial identity (eyes, nose, mouth structure) of the Face Reference.
          - Ensure the expression matches the context of the target image unless specified otherwise.
          ${prompt ? `- User Note: ${prompt}` : ''}
        `.trim();

      } else if (mode === AppMode.EDIT) {
         if (!refImage1) {
            throw new Error("Please upload an image to edit.");
         }
         images = [refImage1];
         // Use 3.0 Pro Image for high quality editing as requested
         model = ModelVersion.GEMINI_3_PRO_IMAGE; 
         finalPrompt = `Edit this image: ${prompt}`;
      } else {
        // GENERATE
        if (!prompt) throw new Error("Please enter a text prompt.");
      }

      const result = await generateImageContent({
        prompt: finalPrompt,
        model: model,
        referenceImages: images,
        resolution: resolution,
        aspectRatio: aspectRatio
      });

      setResultImage(result);

    } catch (err: any) {
      console.error("Generation Error:", err);
      let msg = err.message || "An unexpected error occurred.";
      
      // Check for specific error types
      const isQuotaError = msg.includes("429") || msg.includes("Quota") || msg.includes("RESOURCE_EXHAUSTED");
      const isInternalError = msg.includes("500") || msg.includes("INTERNAL");
      
      if (isQuotaError) {
        msg = "Quota exceeded. The Gemini 3.0 Pro model requires a paid API key (Pay-as-you-go). Please select a paid key.";
      } else if (isInternalError) {
        msg = "Google Internal Server Error. The model is currently experiencing high traffic or instability. Please wait a moment and try again.";
      }
      
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = () => {
    if (resultImage) {
      const link = document.createElement('a');
      link.href = resultImage;
      link.download = `banana-studio-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <ApiKeyGuard>
      <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-banana-500 selection:text-white">
        
        {/* Header */}
        <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-banana-400 to-orange-500 flex items-center justify-center text-slate-900 font-bold shadow-lg shadow-banana-500/20">
                B
              </div>
              <span className="text-lg font-bold tracking-tight text-white">Banana<span className="text-banana-400">Studio</span> Pro</span>
            </div>
            
            <nav className="flex items-center p-1 bg-slate-800 rounded-lg overflow-x-auto no-scrollbar">
              {[
                { id: AppMode.STYLE_REMIX, label: 'Style Remix' },
                { id: AppMode.FACE_SWAP, label: 'Face Swap' },
                { id: AppMode.GENERATE, label: 'Generate' },
                { id: AppMode.EDIT, label: 'Edit' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setMode(m.id as AppMode);
                    setError(null);
                    setResultImage(null);
                    // Reset inputs when switching modes to avoid confusion
                    setRefImage1(null);
                    setRefImage2(null);
                    setPreview1(null);
                    setPreview2(null);
                    setPrompt('');
                  }}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                    mode === m.id 
                      ? 'bg-slate-700 text-white shadow-sm' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </nav>
          </div>
        </header>

        <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Panel: Controls */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Introduction Text based on Mode */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-xl font-semibold text-white mb-2">
                  {mode === AppMode.STYLE_REMIX && "Smart Style Remix"}
                  {mode === AppMode.FACE_SWAP && "Pro Face Swap"}
                  {mode === AppMode.GENERATE && "Pro Image Generation"}
                  {mode === AppMode.EDIT && "AI Image Editor"}
                </h2>
                <p className="text-sm text-slate-400">
                  {mode === AppMode.STYLE_REMIX && "Fuse style and subject with advanced AI. Creates a new background, adapts poses, and keeps clothing consistent."}
                  {mode === AppMode.FACE_SWAP && "Upload a target photo and a face reference. The AI will seamlessly replace the face in the target photo with the reference face."}
                  {mode === AppMode.GENERATE && "Create stunning visuals from text descriptions using the latest Gemini 3.0 Nano Banana Pro model."}
                  {mode === AppMode.EDIT && "Upload an image and describe changes. Add filters, remove objects, or change backgrounds."}
                </p>
              </div>

              {/* Input Area */}
              <div className="space-y-4">
                
                {mode === AppMode.STYLE_REMIX && (
                  <div className="grid grid-cols-2 gap-4">
                    <ImageUploader 
                      id="ref1" 
                      label="Style Ref (Background)" 
                      onChange={handleRef1Change} 
                      previewUrl={preview1} 
                    />
                    <ImageUploader 
                      id="ref2" 
                      label="Subject Ref (Person)" 
                      onChange={handleRef2Change} 
                      previewUrl={preview2} 
                    />
                  </div>
                )}

                {mode === AppMode.FACE_SWAP && (
                  <div className="grid grid-cols-2 gap-4">
                    <ImageUploader 
                      id="ref1" 
                      label="Face Reference" 
                      onChange={handleRef1Change} 
                      previewUrl={preview1} 
                    />
                    <ImageUploader 
                      id="ref2" 
                      label="Target Image (Body)" 
                      onChange={handleRef2Change} 
                      previewUrl={preview2} 
                    />
                  </div>
                )}

                {mode === AppMode.EDIT && (
                  <ImageUploader 
                    id="ref1" 
                    label="Image to Edit" 
                    onChange={handleRef1Change} 
                    previewUrl={preview1} 
                    className="w-full"
                  />
                )}

                {/* Prompt Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400 ml-1">
                    {mode === AppMode.STYLE_REMIX ? "Pose & Action Instructions (Optional)" : 
                     mode === AppMode.FACE_SWAP ? "Specific Adjustments (Optional)" :
                     "Prompt"}
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={
                      mode === AppMode.STYLE_REMIX ? "e.g., Sitting on a chair, looking at the camera, holding a coffee..." :
                      mode === AppMode.FACE_SWAP ? "e.g., Make the expression happier, ensure lighting matches..." :
                      mode === AppMode.GENERATE ? "e.g., A futuristic city with neon lights, 8k resolution..." :
                      "e.g., Change the background to a beach, add sunglasses..."
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-banana-500 focus:border-transparent outline-none resize-none h-32 transition-all"
                  />
                </div>

                {/* Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider ml-1">Resolution</label>
                    <select 
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value as ImageResolution)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-banana-500 outline-none appearance-none cursor-pointer"
                    >
                      <option value={ImageResolution.RES_1K}>1K Standard</option>
                      <option value={ImageResolution.RES_2K}>2K High Def</option>
                      <option value={ImageResolution.RES_4K}>4K Ultra</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider ml-1">Aspect Ratio</label>
                    <select 
                      value={aspectRatio}
                      onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-banana-500 outline-none appearance-none cursor-pointer"
                    >
                      <option value={AspectRatio.SQUARE}>1:1 Square</option>
                      <option value={AspectRatio.LANDSCAPE}>16:9 Landscape</option>
                      <option value={AspectRatio.PORTRAIT}>9:16 Portrait</option>
                      <option value={AspectRatio.STANDARD_LANDSCAPE}>4:3 Standard</option>
                      <option value={AspectRatio.STANDARD_PORTRAIT}>3:4 Standard</option>
                    </select>
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-4">
                  <Button 
                    onClick={handleGenerate} 
                    className="w-full py-3 text-lg font-semibold shadow-xl shadow-banana-500/10"
                    isLoading={loading}
                    disabled={
                      (mode === AppMode.STYLE_REMIX && (!refImage1 || !refImage2)) ||
                      (mode === AppMode.FACE_SWAP && (!refImage1 || !refImage2)) ||
                      (mode === AppMode.EDIT && (!refImage1 || !prompt)) ||
                      (mode === AppMode.GENERATE && !prompt)
                    }
                  >
                    {mode === AppMode.STYLE_REMIX ? "Remix & Create" : 
                     mode === AppMode.FACE_SWAP ? "Swap Face" :
                     mode === AppMode.EDIT ? "Edit Image" : 
                     "Generate Image"}
                  </Button>
                </div>
                
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-sm flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-start gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      <div className="flex-1">
                         <p className="font-medium text-red-100 mb-1">Generation Failed</p>
                         <p className="text-red-300/90 leading-relaxed">{error}</p>
                      </div>
                    </div>
                    
                    {(error.includes("Quota") || error.includes("key") || error.includes("Pay-as-you-go")) && (
                        <div className="pl-8">
                             <Button 
                                variant="outline"
                                onClick={() => window.aistudio?.openSelectKey()}
                                className="border-red-500/30 text-red-300 hover:bg-red-500/20 hover:text-white hover:border-red-500/50 text-xs h-8"
                            >
                                Change API Key
                            </Button>
                        </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel: Result */}
            <div className="lg:col-span-8">
              <div className="h-full bg-slate-900/30 border border-slate-800 rounded-2xl p-1 flex flex-col relative overflow-hidden min-h-[500px]">
                
                {resultImage ? (
                  <div className="relative w-full h-full flex items-center justify-center bg-black/40 rounded-xl overflow-hidden group">
                    <img 
                      src={resultImage} 
                      alt="Generated Result" 
                      className="max-w-full max-h-full object-contain shadow-2xl" 
                    />
                    
                    {/* Overlay Actions */}
                    <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button 
                        onClick={downloadImage}
                        className="bg-black/60 backdrop-blur text-white p-2 rounded-lg hover:bg-banana-500 transition-colors"
                        title="Download"
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      </button>
                      <button 
                        onClick={() => setResultImage(null)}
                        className="bg-black/60 backdrop-blur text-white p-2 rounded-lg hover:bg-slate-700 transition-colors"
                        title="Close"
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                    {loading ? (
                      <div className="text-center">
                         <div className="relative w-24 h-24 mb-6 mx-auto">
                            <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-t-banana-500 rounded-full animate-spin"></div>
                         </div>
                         <h3 className="text-lg font-medium text-white mb-1">Generating Masterpiece</h3>
                         <p className="text-sm text-slate-400">This might take a moment...</p>
                      </div>
                    ) : (
                      <>
                        <div className="w-20 h-20 bg-slate-800/50 rounded-2xl flex items-center justify-center mb-4">
                          <svg className="w-10 h-10 opacity-50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <p className="text-lg font-medium">Ready to Create</p>
                        <p className="text-sm max-w-xs text-center mt-2 opacity-70">
                          {mode === AppMode.STYLE_REMIX ? "Upload references to begin style transfer." : 
                           mode === AppMode.FACE_SWAP ? "Upload target body and face reference." :
                           "Enter a prompt to generate imagery."}
                        </p>
                      </>
                    )}
                  </div>
                )}

              </div>
              
              {/* Footer info */}
              <div className="mt-4 flex justify-between items-center text-xs text-slate-500 px-2">
                <div>Model: <span className="text-slate-400 font-mono">{ModelVersion.GEMINI_3_PRO_IMAGE}</span></div>
                <div>Powered by Gemini Nano Banana Pro</div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </ApiKeyGuard>
  );
};

export default App;