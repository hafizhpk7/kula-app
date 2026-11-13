import { useToast } from "../../../components/common/Toast";

/** Salin teks ke clipboard (dengan cadangan execCommand) lalu tampilkan toast. */
export function useCopy() {
  const { showToast } = useToast();
  return async (text: string, msg = "Kode disalin.") => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      showToast(msg);
    } catch {
      showToast("Gagal menyalin teks.");
    }
  };
}
