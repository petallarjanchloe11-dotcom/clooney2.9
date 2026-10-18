import React from 'react';
import { X, Download, Sparkles, RefreshCw } from 'lucide-react';

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  prompt?: string;
  onRefinePrompt?: (prompt: string) => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  prompt,
  onRefinePrompt,
}) => {
  if (!isOpen || !imageUrl) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `clooney-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full bg-[#16202b] rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-700/60 bg-[#1c2734]">
          <div className="flex items-center gap-2 truncate pr-4">
            <Sparkles size={16} className="text-[#85dfc7] shrink-0" />
            <span className="text-sm font-medium text-slate-200 truncate">
              {prompt || 'Generated Image'}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDownload}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
              title="Download Image"
            >
              <Download size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
              title="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Image Content */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-[#0f1721] min-h-[300px]">
          <img
            src={imageUrl}
            alt={prompt || 'Clooney visual'}
            className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg shadow-lg"
          />
        </div>

        {/* Footer with refinement options */}
        {prompt && onRefinePrompt && (
          <div className="p-4 bg-[#1c2734] border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="text-slate-400">
              <span className="font-semibold text-slate-300">Prompt:</span> {prompt}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onRefinePrompt(`Refine this image to make it more vibrant and detailed: "${prompt}"`);
                  onClose();
                }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors flex items-center gap-1.5"
              >
                <RefreshCw size={12} className="text-[#85dfc7]" />
                <span>Refine / Enhance</span>
              </button>
              <button
                onClick={() => {
                  onRefinePrompt(`Change the style of "${prompt}" to watercolor and soft lighting`);
                  onClose();
                }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors flex items-center gap-1.5"
              >
                <Sparkles size={12} className="text-[#85dfc7]" />
                <span>Watercolor Style</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
