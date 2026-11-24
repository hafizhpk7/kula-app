// DIBUAT OTOMATIS oleh scripts/buat-peta-animasi.mjs dari docs/fitur/peta-animasi.json. Jangan diubah tangan.
// Hanya butir dan aktivitas yang punya gerakan. Yang tanpa animasi, beserta alasannya, ada di docs/fitur/PETA-ANIMASI.md.

/** id butir KPSP → id gerakan. */
export const PETA_BUTIR: Readonly<Record<string, string>> = {
  "kpsp-03-01": "telentang-tendang",
  "kpsp-03-08": "tengkurap-angkat-kepala",
  "kpsp-06-03": "tengkurap-topang-lengan",
  "kpsp-06-04": "duduk-ditopang",
  "kpsp-06-05": "genggam-benda",
  "kpsp-06-07": "raih-depan",
  "kpsp-06-08": "berguling",
  "kpsp-09-02": "pertemukan-balok",
  "kpsp-09-04": "raih-depan",
  "kpsp-09-08": "pindah-tangan",
  "kpsp-09-09": "duduk-sendiri",
  "kpsp-12-01": "genggam-benda",
  "kpsp-12-03": "pertemukan-balok",
  "kpsp-15-01": "pertemukan-balok",
  "kpsp-15-02": "masukkan-wadah",
  "kpsp-15-06": "lambai-tepuk",
  "kpsp-15-08": "berdiri-sendiri",
  "kpsp-15-10": "melangkah",
  "kpsp-18-08": "melangkah"
};

/** id aktivitas stimulasi → id gerakan. */
export const PETA_AKTIVITAS: Readonly<Record<string, string>> = {
  "stim-0-2-meraba": "genggam-benda",
  "stim-0-2-gantung": "telentang-raih-gantung",
  "stim-3-5-duduk": "duduk-ditopang",
  "stim-6-8-wadah": "masukkan-wadah",
  "stim-6-8-bunyi": "pertemukan-balok",
  "stim-9-11-mainan": "raih-depan"
};

/** Catatan singkat tentang apa yang digambar dan apa yang tidak, per butir atau aktivitas. */
export const CATATAN_PETA: Readonly<Record<string, string>> = {
  "kpsp-03-01": "Yang dinilai adalah lengan dan tungkai bergerak mudah dan terarah; animasi menunjukkan gerak yang lancar.",
  "kpsp-03-08": "Gambar acuan di buku Pedoman tetap yang menentukan; animasi hanya menunjukkan gerakan mengangkat kepala.",
  "kpsp-06-03": "Gambar acuan di buku Pedoman tetap yang menentukan.",
  "kpsp-06-04": "Digambar duduk di alas dengan topangan, bukan dipangku.",
  "kpsp-06-05": "Digambar sebagai mainan bertangkai yang digenggam; pensil sengaja tidak ditampilkan.",
  "kpsp-06-07": "Digambar sebagai meraih bola.",
  "kpsp-06-08": "Digambar sekali berguling; yang dinilai adalah pernah berbalik minimal 2 kali (tanya orang tua).",
  "kpsp-09-02": "Animasi memperlihatkan memegang satu balok di tiap tangan, lalu mempertemukannya.",
  "kpsp-09-04": "Digambar sebagai meraih bola di luar jangkauan tangan.",
  "kpsp-09-08": "Digambar dengan balok; benda panjang seperti sendok tidak dinilai.",
  "kpsp-09-09": "Lamanya (60 detik) ada di teks butir.",
  "kpsp-12-01": "Digambar sebagai mainan bertangkai yang digenggam; pensil sengaja tidak ditampilkan. Kuat genggaman ada di teks butir.",
  "kpsp-12-03": "Digambar dengan balok.",
  "kpsp-15-01": "Digambar dengan balok.",
  "kpsp-15-02": "Digambar dengan balok dan cangkir.",
  "kpsp-15-06": "Hanya bertepuk yang digambar; melambai tidak.",
  "kpsp-15-08": "Lamanya (30 detik) ada di teks butir.",
  "kpsp-15-10": "Digambar berjalan di tempat; yang dinilai adalah berjalan tanpa terhuyung atau jatuh.",
  "kpsp-18-08": "Digambar berjalan di tempat; yang dinilai adalah berjalan tanpa terhuyung atau jatuh.",
  "stim-0-2-meraba": "Digambar sebagai mainan bertangkai di tangan bayi.",
  "stim-0-2-gantung": "Jarak gantung ±30 cm ada di langkah aktivitas.",
  "stim-3-5-duduk": "Digambar duduk di alas dengan satu tangan menopang punggung; versi kursi bersandar tidak digambar.",
  "stim-6-8-wadah": "Digambar dengan balok dan cangkir.",
  "stim-6-8-bunyi": "Digambar dengan dua balok yang dipertemukan.",
  "stim-9-11-mainan": "Digambar sebagai meraih bola."
};
