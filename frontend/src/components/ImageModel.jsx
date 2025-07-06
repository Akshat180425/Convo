import { X } from "lucide-react";

const ImageModel = ({ src, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
      <button
        className="absolute top-4 right-4 text-white text-xl hover:scale-110 transition"
        onClick={onClose}
      >
        <X />
      </button>

      <img
        src={src}
        alt="Full Screen"
        className="max-w-full max-h-full object-contain"
      />
    </div>
  );
};

export default ImageModel;
