# Peta animasi (R4b)

> DIBUAT OTOMATIS dari `docs/fitur/peta-animasi.json` oleh `node scripts/buat-peta-animasi.mjs`. Ubah sumbernya, bukan berkas ini.

Tiap butir milestone (KPSP) dan tiap aktivitas stimulasi dipetakan ke **satu gerakan dasar** atau ditandai **tanpa animasi** beserta alasannya.
Pemetaan hanya mengacu pada **isi butir** di konten; tidak ada konten medis yang ditambah atau diubah. Teks butir tetap informasi utama dan animasi hanya ilustrasi pendamping.
Semua gerakan bertanda `perluReview`: dicek tenaga kesehatan sebelum dipakai ke pengguna (flag `animasiTumbuh` default mati).

## Aturan pemetaan

1. Butir dipetakan hanya bila **bentuk gerakan atau tindakannya** sama dengan yang digambar. Ukuran seperti detik, langkah, atau jumlah tetap di teks butir.
2. Kriteria yang berupa **sudut atau seberapa jauh** tidak dianimasikan, karena animasi akan menunjukkan satu ukuran tetap yang bisa disangka patokan.
3. Tidak ada pose tidur (D6), tidak ada benda kecil yang bisa tertelan, dan tidak ada wajah, suara, atau ekspresi.
4. Satu tangan orang dewasa melayang adalah satu-satunya figur dewasa. Butir yang butuh lebih dari itu tanpa animasi.
5. Umur 30 bulan ke atas tanpa animasi: karakter dibuat sebagai bayi (D6).

## Ringkasan

| | Total | Punya gerakan | Tanpa animasi |
|---|---|---|---|
| Butir milestone | 160 | 19 | 141 |
| Aktivitas stimulasi | 12 | 6 | 6 |

## Alasan tanpa animasi

| Kode | Jumlah | Arti |
|---|---|---|
| `wajah-suara` | 16 | Butuh ekspresi wajah, arah tatapan, atau suara. Karakter tidak punya wajah detail (D6) dan animasi tidak bersuara. |
| `bahasa-konsep` | 7 | Menilai pemahaman bahasa atau konsep (gambar, bagian tubuh, warna, angka, perintah). Bukan gerakan tubuh. |
| `kegiatan-harian` | 6 | Kemandirian sehari-hari (makan, minum, berpakaian, menyikat gigi, meniru pekerjaan rumah). Bukan gerakan dasar. |
| `menggambar` | 3 | Menggambar atau mencoret dengan pensil dan kertas. Bukan gerakan dasar. |
| `sejauh-sudut` | 5 | Yang dinilai adalah seberapa jauh atau berapa derajat (sudut kepala, sejauh mana kepala menoleh). Animasi menunjukkan satu ukuran tetap yang bisa disangka patokan; patokannya ada di teks dan gambar Pedoman. |
| `benda-kecil` | 4 | Memakai benda kecil (kismis, kacang, biskuit) yang bisa tertelan. Ilustrasi tidak menampilkannya. |
| `butuh-orang` | 4 | Butuh orang dewasa lebih dari satu tangan (dua tangan, mengangkat lewat ketiak, orang di belakang atau yang bersembunyi). |
| `butuh-perabot` | 4 | Butuh perabot atau benda besar (meja, kain penutup, pegangan) yang belum ada propertinya. |
| `belum-dibuat` | 15 | Gerakan dasarnya belum dibuat (bangkit ke berdiri, berdiri dari duduk, berlari, menendang, naik tangga, membungkuk memungut, menyusun balok, merangkak). Kandidat tahap berikutnya. |
| `emosi-sosial` | 3 | Perilaku sosial atau emosi tanpa gerakan tubuh yang khas (membedakan orang, menunjukkan keinginan). |
| `di-luar-karakter` | 80 | Umur 30 bulan ke atas: karakter dibuat sebagai bayi (D6); sosok anak prasekolah belum ada. |

## Gerakan dasar

| Id | Judul | Benda | Dipakai oleh |
|---|---|---|---|
| `tengkurap-angkat-kepala` | Tengkurap, mengangkat kepala | tanganDewasa | 1 |
| `tengkurap-topang-lengan` | Tengkurap, dada terangkat bertumpu pada lengan | - | 1 |
| `telentang-tendang` | Telentang, lengan dan tungkai bergerak | - | 1 |
| `telentang-raih-gantung` | Telentang, meraih mainan gantung | gantung | 1 |
| `berguling` | Berguling dari telentang ke tengkurap | - | 1 |
| `genggam-benda` | Menggenggam benda | kerincingan | 3 |
| `duduk-ditopang` | Duduk dengan topangan | tanganDewasa | 2 |
| `duduk-sendiri` | Duduk | - | 1 |
| `raih-depan` | Duduk, meraih bola | bola | 3 |
| `pertemukan-balok` | Mempertemukan dua balok | balokA, balokB | 4 |
| `pindah-tangan` | Memindahkan balok dari tangan ke tangan | balokA | 1 |
| `masukkan-wadah` | Memasukkan balok ke dalam cangkir | wadah, balokA | 2 |
| `berdiri-sendiri` | Berdiri sendiri | - | 1 |
| `melangkah` | Berjalan beberapa langkah | - | 2 |
| `lambai-tepuk` | Bertepuk tangan | - | 1 |

## Yang tidak dibuat

Dari 20 gerakan yang diusulkan di R0 (SKEMA-REVISI.md bagian 4), 13 dibuat (`genggam-goyang` menjadi `genggam-benda`) dan 2 gerakan baru ditambah (`pertemukan-balok`, `masukkan-wadah`). Tujuh belum dibuat: `merangkak`, `tarik-berdiri`, `rambatan`, `ambil-jari`, `tumpuk-balok`, `menoleh-suara`, dan `gelinding-bola`. Butir dan aktivitas yang membutuhkannya bertanda `belum-dibuat` atau `butuh-perabot`.
`ambil-jari` sengaja tidak dibuat: ia memakai benda kecil dan aturan 3 melarangnya. `menoleh-suara` tidak dibuat karena butuh suara dan orang di belakang bayi.

## Aktivitas stimulasi

| Aktivitas | Umur (bulan) | Gerakan atau alasan | Catatan |
|---|---|---|---|
| `stim-0-2-meraba` Melatih bayi meraba dan memegang benda | 0-2 | `genggam-benda` | Digambar sebagai mainan bertangkai di tangan bayi. |
| `stim-0-2-gantung` Menggantung benda berwarna dan berbunyi | 0-2 | `telentang-raih-gantung` | Jarak gantung ±30 cm ada di langkah aktivitas. |
| `stim-3-5-cermin` Mengajak bayi melihat dirinya di kaca | 3-5 | tanpa animasi: `wajah-suara` |  |
| `stim-3-5-duduk` Melatih bayi duduk | 3-5 | `duduk-ditopang` | Digambar duduk di alas dengan satu tangan menopang punggung; versi kursi bersandar tidak digambar. |
| `stim-3-5-benda-kecil` Melatih bayi mengamati dan mengambil benda kecil | 3-5 | tanpa animasi: `benda-kecil` |  |
| `stim-6-8-wadah` Melatih bayi memasukkan benda ke dalam wadah | 6-8 | `masukkan-wadah` | Digambar dengan balok dan cangkir. |
| `stim-6-8-bunyi` Melatih bayi membuat bunyi-bunyian | 6-8 | `pertemukan-balok` | Digambar dengan dua balok yang dipertemukan. |
| `stim-9-11-mainan` Melatih bayi mengambil mainan | 9-11 | `raih-depan` | Digambar sebagai meraih bola. |
| `stim-3-5-cilukba` Mengajak bayi bermain cilukba | 3-5 | tanpa animasi: `butuh-orang` |  |
| `stim-6-8-merangkak` Melatih bayi merangkak | 6-8 | tanpa animasi: `belum-dibuat` |  |
| `stim-6-8-cari-mainan` Melatih bayi mencari dan menemukan mainan | 6-8 | tanpa animasi: `butuh-perabot` |  |
| `stim-6-8-buku` Membacakan buku cerita | 6-8 | tanpa animasi: `bahasa-konsep` |  |

## Milestone (butir KPSP)

### 3 bulan

| Butir | Isi (ringkas) | Gerakan atau alasan | Catatan |
|---|---|---|---|
| `03-01` | Pada saat bayi terlentang, apakah masing-masing lengan dan tungkai bergerak dengan mudah? Jawab ‘Tidak’ bila… | `telentang-tendang` | Yang dinilai adalah lengan dan tungkai bergerak mudah dan terarah; animasi menunjukkan gerak yang lancar. |
| `03-02` | Jangan membuat suara apapun. Pada saat bayi terlentang apakah ia melihat dan menatap wajah Anda? | tanpa: `wajah-suara` |  |
| `03-03` | Pada saat Anda mengajak bayi berbicara dan tersenyum, apakah ia tersenyum kembali kepada Anda? | tanpa: `wajah-suara` |  |
| `03-04` | Apakah bayi dapat mengeluarkan suara-suara lain (mengoceh) selain menangis? | tanpa: `wajah-suara` |  |
| `03-05` | Apakah bayi suka tertawa keras walau tidak digelitik atau diraba-raba? | tanpa: `wajah-suara` |  |
| `03-06` | Ambil gulungan wool merah, lalu letakkan di atas wajah di depan mata bayi. Gerakkan wool dari samping kiri ke… | tanpa: `sejauh-sudut` |  |
| `03-07` | Ambil gulungan wool merah, lalu letakkan di atas wajah di depan mata bayi. Gerakkan wool dari samping kiri ke… | tanpa: `sejauh-sudut` |  |
| `03-08` | Pada saat bayi tengkurap di alas yang datar, apakah ia dapat mengangkat kepalanya seperti pada gambar? | `tengkurap-angkat-kepala` | Gambar acuan di buku Pedoman tetap yang menentukan; animasi hanya menunjukkan gerakan mengangkat kepala. |
| `03-09` | Pada saat bayi tengkurap di alas yang datar, apakah ia dapat mengangkat kepalanya sehingga membentuk sudut 45… | tanpa: `sejauh-sudut` |  |
| `03-10` | Pada saat bayi tengkurap di alas yang datar, apakah ia dapat mengangkat kepalanya dengan tegak seperti pada g… | tanpa: `sejauh-sudut` |  |

### 6 bulan

| Butir | Isi (ringkas) | Gerakan atau alasan | Catatan |
|---|---|---|---|
| `06-01` | Bayi diposisikan terlentang. Ambil gulungan wool merah, letakkan di atas wajah di depan mata bayi. Gerakkan w… | tanpa: `sejauh-sudut` |  |
| `06-02` | Pada posisi bayi terlentang, pegang kedua tangannya lalu tarik perlahan ke posisi duduk. Dapatkah bayi memper… | tanpa: `butuh-orang` |  |
| `06-03` | Ketika bayi tengkurap di alas yang datar, apakah ia dapat mengangkat dada dengan kedua lengannya sebagai peny… | `tengkurap-topang-lengan` | Gambar acuan di buku Pedoman tetap yang menentukan. |
| `06-04` | Bayi dipangku orang tua atau pengasuh. Dapatkah bayi mempertahankan posisi kepala dalam keadaan tegak dan sta… | `duduk-ditopang` | Digambar duduk di alas dengan topangan, bukan dipangku. |
| `06-05` | Bayi dipangku orang tua atau pengasuh. Sentuhkan pensil di punggung tangan atau ujung jari bayi (jangan melet… | `genggam-benda` | Digambar sebagai mainan bertangkai yang digenggam; pensil sengaja tidak ditampilkan. |
| `06-06` | Bayi dipangku orang tua atau pengasuh. Dapatkah bayi mengarahkan matanya pada benda kecil sebesar kacang, kis… | tanpa: `wajah-suara` |  |
| `06-07` | Bayi dipangku orang tua atau pengasuh. Dapatkah bayi meraih mainan yang diletakkan agak jauh namun masih bera… | `raih-depan` | Digambar sebagai meraih bola. |
| `06-08` | Tanyakan kepada orang tua atau pengasuh, pernahkah bayi berbalik paling sedikit 2 kali, dari terlentang ke te… | `berguling` | Digambar sekali berguling; yang dinilai adalah pernah berbalik minimal 2 kali (tanya orang tua). |
| `06-09` | Tanyakan kepada orang tua atau pengasuh, pernahkah bayi mengeluarkan suara gembira bernada tinggi atau memeki… | tanpa: `wajah-suara` |  |
| `06-10` | Tanyakan kepada orang tua atau pengasuh, pernahkah orang tua atau pengasuh melihat bayi tersenyum ketika meli… | tanpa: `wajah-suara` |  |

### 9 bulan

| Butir | Isi (ringkas) | Gerakan atau alasan | Catatan |
|---|---|---|---|
| `09-01` | Bayi dipangku orang tua atau pengasuh, Taruh kismis di atas meja. Dapatkah bayi memungut dengan tangannya ben… | tanpa: `benda-kecil` |  |
| `09-02` | Bayi dipangku orang tua atau pengasuh. Taruh 2 kubus di atas meja, buat agar bayi dapat memungut dan memegang… | `pertemukan-balok` | Animasi memperlihatkan memegang satu balok di tiap tangan, lalu mempertemukannya. |
| `09-03` | Bayi dipangku orang tua atau pengasuh. Tarik perhatian bayi dengan memperlihatkan gulungan wool merah, kemudi… | tanpa: `butuh-perabot` |  |
| `09-04` | Bayi dipangku orang tua atau pengasuh. Letakkan suatu mainan yang diinginkan bayi di luar jangkauannya, apaka… | `raih-depan` | Digambar sebagai meraih bola di luar jangkauan tangan. |
| `09-05` | Tanyakan kepada orang tua atau pengasuh, apakah bayi menengok ke belakang seperti mendengar kedatangan seseor… | tanpa: `wajah-suara` |  |
| `09-06` | Tanyakan kepada orang tua atau pengasuh, apakah anak dapat mengatakan 2 suku kata yang sama, misalnya: “Ma-ma… | tanpa: `wajah-suara` |  |
| `09-07` | Tanyakan kepada orang tua atau pengasuh, apakah bayi dapat makan kue kering sendiri? | tanpa: `benda-kecil` |  |
| `09-08` | Tanyakan kepada orang tua atau pengasuh apakah pernah melihat bayi memindahkan mainan atau kue kering dari sa… | `pindah-tangan` | Digambar dengan balok; benda panjang seperti sendok tidak dinilai. |
| `09-09` | Tanpa disangga oleh bantal, kursi atau dinding, dapatkah bayi duduk sendiri selama 60 detik? | `duduk-sendiri` | Lamanya (60 detik) ada di teks butir. |
| `09-10` | Jika Anda mengangkat bayi melalui ketiaknya ke posisi berdiri, dapatkah ia menyangga sebagian berat badan den… | tanpa: `butuh-orang` |  |

### 12 bulan

| Butir | Isi (ringkas) | Gerakan atau alasan | Catatan |
|---|---|---|---|
| `12-01` | Bayi dipangku orang tua atau pengasuh. Letakkan pensil di telapak tangan anak. Coba ambil pensil tersebut den… | `genggam-benda` | Digambar sebagai mainan bertangkai yang digenggam; pensil sengaja tidak ditampilkan. Kuat genggaman ada di teks butir. |
| `12-02` | Bayi dipangku orang tua atau pengasuh. Letakkan kismis di atas meja. Dapatkah anak memungut dengan tangannya… | tanpa: `benda-kecil` |  |
| `12-03` | Bayi dipangku orang tua atau pengasuh. Berikan 2 kubus kepada bayi. Tanpa bantuan, apakah anak dapat memperte… | `pertemukan-balok` | Digambar dengan balok. |
| `12-04` | Sebut 2−3 kata yang dapat ditiru oleh anak (tidak perlu kata−kata yang lengkap). Apakah ia mencoba meniru kat… | tanpa: `wajah-suara` |  |
| `12-05` | Tanyakan kepada ibu atau pengasuh, apakah anak dapat mengangkat badannya ke posisi berdiri tanpa bantuan? | tanpa: `belum-dibuat` |  |
| `12-06` | Tanyakan kepada ibu atau pengasuh, apakah anak dapat duduk sendiri tanpa bantuan dari posisi tidur atau tengk… | tanpa: `belum-dibuat` |  |
| `12-07` | Tanyakan kepada ibu atau pengasuh, apakah anak dapat memahami makna kata ’jangan’? | tanpa: `bahasa-konsep` |  |
| `12-08` | Tanyakan kepada ibu atau pengasuh, apakah anak akan mencari atau terlihat mengharapkan muncul kembali jika ib… | tanpa: `butuh-orang` |  |
| `12-09` | Tanyakan kepada ibu atau pengasuh, apakah anak dapat membedakan ibu atau pengasuh dengan orang yang belum ia… | tanpa: `emosi-sosial` |  |
| `12-10` | Berdirikan anak. Apakah anak dapat berdiri dengan berpegangan pada kursi atau meja selama 30 detik atau lebih? | tanpa: `butuh-perabot` |  |

### 15 bulan

| Butir | Isi (ringkas) | Gerakan atau alasan | Catatan |
|---|---|---|---|
| `15-01` | Bayi dipangku orang tua atau pengasuh. Berikan 2 kubus kepada anak. Tanpa bantuan, apakah anak dapat memperte… | `pertemukan-balok` | Digambar dengan balok. |
| `15-02` | Bayi dipangku orang tua atau pengasuh. Berikan sebuah kubus dan cangkir. Apakah anak dapat memasukkan 1 kubus… | `masukkan-wadah` | Digambar dengan balok dan cangkir. |
| `15-03` | Tanyakan kepada orang tua atau pengasuh, apakah anak dapat berjalan dengan berpegangan? | tanpa: `butuh-perabot` |  |
| `15-04` | Tanyakan kepada orang tua atau pengasuh, apakah anak dapat mengatakan ‘papa’ ketika ia memanggil atau melihat… | tanpa: `wajah-suara` |  |
| `15-05` | Tanyakan kepada orang tua atau pengasuh, apakah anak dapat mengucapkan 1 kata yang bermakna selain ‘mama’, ‘p… | tanpa: `wajah-suara` |  |
| `15-06` | Tanyakan kepada orang tua atau pengasuh, apakah anak dapat bertepuk tangan atau melambai-lambai tanpa bantuan… | `lambai-tepuk` | Hanya bertepuk yang digambar; melambai tidak. |
| `15-07` | Tanyakan kepada orang tua atau pengasuh, apakah anak dapat menunjukkan apa yang diinginkannya tanpa menangis… | tanpa: `emosi-sosial` |  |
| `15-08` | Coba berdirikan anak. Apakah anak dapat berdiri sendiri tanpa berpegangan selama 30 detik atau lebih? | `berdiri-sendiri` | Lamanya (30 detik) ada di teks butir. |
| `15-09` | Letakkan kubus di lantai, tanpa berpegangan atau menyentuh lantai, apakah anak dapat membungkuk untuk memungu… | tanpa: `belum-dibuat` |  |
| `15-10` | Apakah anak dapat berjalan di sepanjang ruangan tanpa jatuh atau terhuyung-huyung? o 2 kubus o Cangkir | `melangkah` | Digambar berjalan di tempat; yang dinilai adalah berjalan tanpa terhuyung atau jatuh. |

### 18 bulan

| Butir | Isi (ringkas) | Gerakan atau alasan | Catatan |
|---|---|---|---|
| `18-01` | Bayi dipangku orang tua atau pengasuh. Berikan anak sebuah pensil dan kertas. Apakah anak dapat mencoret-core… | tanpa: `menggambar` |  |
| `18-02` | Tanyakan kepada orang tua atau pengasuh, apakah anak dapat menyebutkan sedikitnya 3 kata yang bermakna? | tanpa: `wajah-suara` |  |
| `18-03` | Tanyakan kepada orang tua atau pengasuh, apakah anak dapat menunjukkan apa yang diinginkannya tanpa menangis… | tanpa: `emosi-sosial` |  |
| `18-04` | Tanyakan kepada orang tua atau pengasuh, apakah anak dapat minum dari cangkir atau gelas sendiri tanpa banyak… | tanpa: `kegiatan-harian` |  |
| `18-05` | Tanyakan kepada orang tua atau pengasuh, apakah anak suka meniru bila ibu atau pengasuh sedang melakukan peke… | tanpa: `kegiatan-harian` |  |
| `18-06` | Gelindingkan bola tenis ke arah anak. Apakah anak dapat menggelindingkan atau melempar bola tersebut kembali… | tanpa: `belum-dibuat` |  |
| `18-07` | Letakkan kubus di lantai, tanpa berpegangan atau menyentuh lantai, apakah anak dapat membungkuk untuk memungu… | tanpa: `belum-dibuat` |  |
| `18-08` | Minta anak untuk berjalan sepanjang ruangan. Dapatkah ia berjalan tanpa terhuyung-huyung atau terjatuh? | `melangkah` | Digambar berjalan di tempat; yang dinilai adalah berjalan tanpa terhuyung atau jatuh. |
| `18-09` | Dapatkah anak berjalan mundur minimal 5 langkah tanpa kehilangan keseimbangan? | tanpa: `belum-dibuat` |  |
| `18-10` | Berikan anak perintah berikut ini dengan bantuan telunjuk atau isyarat: “Ambil kertas” “Ambil pensil” “Tutup… | tanpa: `bahasa-konsep` |  |

### 21 bulan

| Butir | Isi (ringkas) | Gerakan atau alasan | Catatan |
|---|---|---|---|
| `21-01` | Bayi dipangku orang tua atau pengasuh. Berikan anak sebuah pensil dan kertas. Apakah anak dapat mencoret-core… | tanpa: `menggambar` |  |
| `21-02` | Bayi dipangku orang tua atau pengasuh. Minta anak untuk menyusun kubus. Apakah anak dapat menyusun 2 kubus? | tanpa: `belum-dibuat` |  |
| `21-03` | Bayi dipangku orang tua atau pengasuh. Tunjukkan gambar di bawah pada anak dan minta ia untuk menunjuk gambar… | tanpa: `bahasa-konsep` |  |
| `21-04` | Bayi dipangku orang tua atau pengasuh. Tanpa bimbingan, petunjuk, atau bantuan Anda, dapatkah anak menunjuk p… | tanpa: `bahasa-konsep` |  |
| `21-05` | Tanyakan kepada orang tua atau pengasuh, apakah anak dapat mengucapkan minimal 7 kata yang mempunyai arti (se… | tanpa: `wajah-suara` |  |
| `21-06` | Tanyakan kepada orang tua atau pengasuh, apakah anak dapat minum dari cangkir atau gelas sendiri tanpa banyak… | tanpa: `kegiatan-harian` |  |
| `21-07` | Tanyakan kepada orang tua atau pengasuh, apakah anak suka meniru bila ibu atau pengasuh sedang melakukan peke… | tanpa: `kegiatan-harian` |  |
| `21-08` | Tanyakan kepada orang tua atau pengasuh, apakah anak dapat berlari tanpa terjatuh? | tanpa: `belum-dibuat` |  |
| `21-09` | Letakkan kubus di lantai, tanpa berpegangan atau menyentuh lantai, apakah anak dapat membungkuk untuk memungu… | tanpa: `belum-dibuat` |  |
| `21-10` | Dapatkah anak berjalan mundur minimal 5 langkah tanpa kehilangan keseimbangan? | tanpa: `belum-dibuat` |  |

### 24 bulan

| Butir | Isi (ringkas) | Gerakan atau alasan | Catatan |
|---|---|---|---|
| `24-01` | Bayi dipangku orang tua atau pengasuh. Berikan anak sebuah pensil dan kertas. Apakah anak dapat mencoret-core… | tanpa: `menggambar` |  |
| `24-02` | Bayi dipangku orang tua atau pengasuh. Minta anak untuk menyusun kubus. Apakah anak dapat menyusun 4 kubus? | tanpa: `belum-dibuat` |  |
| `24-03` | Bayi dipangku orang tua atau pengasuh. Tanpa bimbingan, petunjuk, atau bantuan Anda, dapatkah anak menunjuk p… | tanpa: `bahasa-konsep` |  |
| `24-04` | Tanyakan kepada orang tua atau pengasuh, apakah anak mampu menggabungkan 2 kata berbeda ketika berbicara, mis… | tanpa: `wajah-suara` |  |
| `24-05` | Tanyakan kepada orang tua atau pengasuh, apakah anak dapat melepas pakaiannya seperti baju, rok, atau celana? | tanpa: `kegiatan-harian` |  |
| `24-06` | Tanyakan kepada orang tua atau pengasuh, apakah anak dapat makan dengan menggunakan sendok sendiri tanpa bany… | tanpa: `kegiatan-harian` |  |
| `24-07` | Tanyakan kepada orang tua atau pengasuh, apakah anak dapat berlari tanpa terjatuh? | tanpa: `belum-dibuat` |  |
| `24-08` | Tanyakan kepada orang tua atau pengasuh, apakah anak dapat berjalan naik tangga sendiri? Jawab ‘Ya’ jika ia n… | tanpa: `belum-dibuat` |  |
| `24-09` | Letakkan bola tenis di depan kaki anak. Apakah ia dapat menendang ke depan tanpa berpegangan pada apapun? | tanpa: `belum-dibuat` |  |
| `24-10` | Ikuti perintah dengan seksama. Jangan memberi isyarat dengan telunjuk atau mata pada saat memberikan perintah… | tanpa: `bahasa-konsep` |  |

### 30 bulan

| Butir | Isi (ringkas) | Gerakan atau alasan | Catatan |
|---|---|---|---|
| `30-01` | Beri kubus di depan anak. Dapatkah anak menyusun 4 buah kubus menyerupai kereta api dengan cerobong asap (dic… | tanpa: `di-luar-karakter` |  |
| `30-02` | Buat garis lurus ke bawah sepanjang sekurang-kurangnya 2,5 cm. Minta anak untuk menggambar garis lain di samp… | tanpa: `di-luar-karakter` |  |
| `30-03` | Tanpa bimbingan, petunjuk, atau bantuan Anda, dapatkah anak menyebut 2 gambar di antara gambar-gambar di bawa… | tanpa: `di-luar-karakter` |  |
| `30-04` | Tanpa bimbingan, petunjuk, atau bantuan Anda, dapatkah anak menunjuk 4 gambar di antara gambar-gambar di atas… | tanpa: `di-luar-karakter` |  |
| `30-05` | Tanpa bimbingan, petunjuk, atau bantuan Anda, dapatkah anak menunjuk paling sedikit 6 bagian tubuhnya? | tanpa: `di-luar-karakter` |  |
| `30-06` | Tanyakan kepada orang tua atau pengasuh, apakah anak dapat memahami perintah yang terdiri dari 2 langkah, mis… | tanpa: `di-luar-karakter` |  |
| `30-07` | Tanyakan kepada orang tua atau pengasuh, dapatkah anak berpakaian sendiri seperti baju, rok, celana (topi dan… | tanpa: `di-luar-karakter` |  |
| `30-08` | Tanyakan kepada orang tua atau pengasuh, dapatkah anak bermain peran, misalnya menyuapi boneka? | tanpa: `di-luar-karakter` |  |
| `30-09` | Letakkan bola tenis di depan kaki anak. Dapatkah anak menendang ke depan tanpa berpegangan pada apapun? Mendo… | tanpa: `di-luar-karakter` |  |
| `30-10` | Minta anak untuk melompat atau mengangkat kedua kakinya pada saat bersamaan. Dapatkah ia melakukannya? | tanpa: `di-luar-karakter` |  |

### 36 bulan

| Butir | Isi (ringkas) | Gerakan atau alasan | Catatan |
|---|---|---|---|
| `36-01` | Beri kubus di depan anak. Dapatkah anak menyusun 6 buah kubus satu persatu di atas kubus yang lain tanpa menj… | tanpa: `di-luar-karakter` |  |
| `36-02` | Buat garis lurus ke bawah sepanjang sekurang-kurangnya 2,5 cm. Minta anak untuk menggambar garis lain di samp… | tanpa: `di-luar-karakter` |  |
| `36-03` | Tanpa bimbingan, petunjuk, atau bantuan Anda, dapatkah anak menyebut 4 gambar di antara gambar-gambar di bawa… | tanpa: `di-luar-karakter` |  |
| `36-04` | Tanyakan kepada orang tua atau pengasuh, apakah anak dapat memahami perintah yang terdiri dari 2 langkah, mis… | tanpa: `di-luar-karakter` |  |
| `36-05` | Tanyakan kepada orang tua atau pengasuh, apakah sebagian dari bicara anak dapat dipahami oleh orang asing (ya… | tanpa: `di-luar-karakter` |  |
| `36-06` | Tanyakan kepada orang tua atau pengasuh, dapatkah anak merangkai kalimat sederhana yang terdiri dari minimal… | tanpa: `di-luar-karakter` |  |
| `36-07` | Tanyakan kepada orang tua atau pengasuh, dapatkah anak menggosok gigi dengan bantuan? | tanpa: `di-luar-karakter` |  |
| `36-08` | Tanyakan kepada orang tua atau pengasuh, dapatkah anak mengenakan baju, celana, atau sepatu sendiri (tidak te… | tanpa: `di-luar-karakter` |  |
| `36-09` | Berikan kepada anak sebuah bola tenis. Minta ia untuk melemparkan ke arah dada Anda. Dapatkah anak melempar b… | tanpa: `di-luar-karakter` |  |
| `36-10` | Letakkan selembar kertas seukuran buku ini di atas lantai. Apakah anak dapat melompati bagian lebar kertas de… | tanpa: `di-luar-karakter` |  |

### 42 bulan

| Butir | Isi (ringkas) | Gerakan atau alasan | Catatan |
|---|---|---|---|
| `42-01` | Buat garis lurus ke bawah sepanjang sekurang-kurangnya 2,5 cm. Minta anak untuk menggambar garis lain di samp… | tanpa: `di-luar-karakter` |  |
| `42-02` | Beri kubus di depan anak. Dapatkah anak menyusun 8 buah kubus satu persatu di atas kubus yang lain tanpa menj… | tanpa: `di-luar-karakter` |  |
| `42-03` | Tunjukkan anak gambar di bawah ini dan tanyakan: “Mana yang dapat terbang?” “Mana yang dapat mengeong?” “Mana… | tanpa: `di-luar-karakter` |  |
| `42-04` | Tanyakan kepada anak pertanyaan berikut ini satu persatu: “Apa yang kamu lakukan bila kedinginan?” Jawaban: p… | tanpa: `di-luar-karakter` |  |
| `42-05` | Minta anak untuk menyebut 1 warna. Dapatkah anak menyebut 1 warna dengan benar? | tanpa: `di-luar-karakter` |  |
| `42-06` | Tanyakan kepada orang tua atau pengasuh, apakah anak dapat mencuci tangannya sendiri dengan baik setelah maka… | tanpa: `di-luar-karakter` |  |
| `42-07` | Tanyakan kepada orang tua atau pengasuh, dapatkah anak menyebut nama teman bermain di luar rumah atau saudara… | tanpa: `di-luar-karakter` |  |
| `42-08` | Tanyakan kepada orang tua atau pengasuh, dapatkah anak mengenakan kaos (T-shirt) tanpa dibantu? | tanpa: `di-luar-karakter` |  |
| `42-09` | Letakkan selembar kertas seukuran buku ini di atas lantai. Apakah anak dapat melompati bagian lebar kertas de… | tanpa: `di-luar-karakter` |  |
| `42-10` | Minta anak untuk berdiri 1 kaki tanpa berpegangan. Jika perlu tunjukkan caranya dan beri anak kesempatan seba… | tanpa: `di-luar-karakter` |  |

### 48 bulan

| Butir | Isi (ringkas) | Gerakan atau alasan | Catatan |
|---|---|---|---|
| `48-01` | Berikan contoh membuat jembatan dari 3 buah kubus, yaitu dengan meletakkan 2 kubus dengan sedikit jarak (kira… | tanpa: `di-luar-karakter` |  |
| `48-02` | Beri pensil dan kertas. Jangan membantu anak dan jangan menyebut lingkaran. Buatlah lingkaran di atas kertas… | tanpa: `di-luar-karakter` |  |
| `48-03` | Tunjukkan anak gambar di bawah ini dan tanyakan: “Yang mana yang dapat terbang?” “Yang mana yang dapat mengeo… | tanpa: `di-luar-karakter` |  |
| `48-04` | Dapatkah anak menyebut nama lengkapnya tanpa dibantu? Jawab ‘Tidak’ jika ia menyebut sebagian namanya atau uc… | tanpa: `di-luar-karakter` |  |
| `48-05` | Mengenal konsep angka satu Letakkan 5 kubus di atas meja dan selembar kertas di samping kubus. Katakan kepada… | tanpa: `di-luar-karakter` |  |
| `48-06` | Tanyakan kepada anak pertanyaan di bawah satu persatu: “Apa kegunaan kursi?” Jawaban: untuk duduk “Apa keguna… | tanpa: `di-luar-karakter` |  |
| `48-07` | Tanyakan kepada orang tua atau pengasuh, dapatkah anak mengikuti peraturan permainan saat bermain dengan tema… | tanpa: `di-luar-karakter` |  |
| `48-08` | Tanyakan kepada orang tua atau pengasuh, dapatkah anak mengenakan kaos (T-shirt) tanpa dibantu? | tanpa: `di-luar-karakter` |  |
| `48-09` | Letakkan selembar kertas seukuran buku ini di atas lantai. Apakah anak dapat melompati bagian lebar kertas de… | tanpa: `di-luar-karakter` |  |
| `48-10` | Minta anak untuk berdiri 1 kaki tanpa berpegangan. Jika perlu tunjukkan caranya dan beri anak kesempatan seba… | tanpa: `di-luar-karakter` |  |

### 54 bulan

| Butir | Isi (ringkas) | Gerakan atau alasan | Catatan |
|---|---|---|---|
| `54-01` | Jangan mengoreksi atau membantu anak. Jangan menyebut kata “Lebih panjang”. Perlihatkan gambar kedua garis in… | tanpa: `di-luar-karakter` |  |
| `54-02` | Jangan membantu anak dan jangan memberitahu nama gambar ini. Minta anak untuk menggambar seperti contoh di ke… | tanpa: `di-luar-karakter` |  |
| `54-03` | Berikan anak pensil dan kertas lalu katakan kepada anak “Buatlah gambar orang” (anak laki-laki, anak perempua… | tanpa: `di-luar-karakter` |  |
| `54-04` | Memahami konsep 2 warna Minta anak untuk menyebutkan 2 warna. Dapatkah anak menyebut 2 warna dengan benar? | tanpa: `di-luar-karakter` |  |
| `54-05` | Tanyakan kepada orang tua atau pengasuh, apakah bicara anak mampu dipahami seluruhnya oleh orang lain (yang t… | tanpa: `di-luar-karakter` |  |
| `54-06` | Tanyakan kepada orang tua atau pengasuh, dapatkah anak mengikuti peraturan permainan saat bermain dengan tema… | tanpa: `di-luar-karakter` |  |
| `54-07` | Tanyakan kepada orang tua atau pengasuh, dapatkah anak menggosok gigi tanpa dibantu? | tanpa: `di-luar-karakter` |  |
| `54-08` | Tanyakan kepada orang tua atau pengasuh, apakah anak dapat mengancingkan bajunya atau pakaian boneka? | tanpa: `di-luar-karakter` |  |
| `54-09` | Mengenal konsep 2 kata depan Minta anak untuk mengikuti perintah di bawah, jangan memberi isyarat. “Ambil ben… | tanpa: `di-luar-karakter` |  |
| `54-10` | Minta anak untuk berdiri 1 kaki tanpa berpegangan. Jika perlu tunjukkan caranya dan beri anak kesempatan seba… | tanpa: `di-luar-karakter` |  |

### 60 bulan

| Butir | Isi (ringkas) | Gerakan atau alasan | Catatan |
|---|---|---|---|
| `60-01` | Perlihatkan gambar kedua garis ini pada anak. Tanyakan: “Mana garis yang lebih panjang?” Minta anak menunjuk… | tanpa: `di-luar-karakter` |  |
| `60-02` | Berikan anak pensil dan kertas lalu katakan kepada anak “Buatlah gambar orang” (anak laki-laki, anak perempua… | tanpa: `di-luar-karakter` |  |
| `60-03` | Memahami konsep 4 warna Minta anak untuk menyebutkan 4 warna. Dapatkah anak menyebut keempat warna tersebut d… | tanpa: `di-luar-karakter` |  |
| `60-04` | Tanyakan kepada anak pertanyaan berikut ini satu persatu: “Apa yang kamu lakukan saat kedinginan?” Jawaban: p… | tanpa: `di-luar-karakter` |  |
| `60-05` | Tanyakan kepada orang tua atau pengasuh, apakah anak dapat mengancingkan bajunya atau pakaian boneka? | tanpa: `di-luar-karakter` |  |
| `60-06` | Tanyakan kepada orang tua atau pengasuh, apakah anak bereaksi dengan tenang dan tidak rewel (tanpa menangis a… | tanpa: `di-luar-karakter` |  |
| `60-07` | Tanyakan kepada orang tua atau pengasuh, dapatkah anak sepenuhnya berpakaian sendiri tanpa dibantu? | tanpa: `di-luar-karakter` |  |
| `60-08` | Mengenal konsep 4 kata depan Minta anak untuk mengikuti perintah di bawah, jangan memberi isyarat: “Ambil ben… | tanpa: `di-luar-karakter` |  |
| `60-09` | Minta anak untuk berdiri 1 kaki tanpa berpegangan. Jika perlu tunjukkan caranya dan beri anak kesempatan seba… | tanpa: `di-luar-karakter` |  |
| `60-10` | Minta anak untuk melompat dengan 1 kaki beberapa kali tanpa berpegangan (lompatan dengan 2 kaki tidak ikut di… | tanpa: `di-luar-karakter` |  |

### 66 bulan

| Butir | Isi (ringkas) | Gerakan atau alasan | Catatan |
|---|---|---|---|
| `66-01` | Menggambar + Jangan membantu anak dan jangan memberitahu nama gambar ini. Minta anak untuk menggambar seperti… | tanpa: `di-luar-karakter` |  |
| `66-02` | Menggambar kotak dengan dicontohkan Berikan kepada anak pensil dan kertas. Tunjukkan kepada anak contoh gamba… | tanpa: `di-luar-karakter` |  |
| `66-03` | Menggambar orang dengan sedikitnya 6 bagian tubuh Berikan anak pensil dan kertas lalu katakan kepada anak “Bu… | tanpa: `di-luar-karakter` |  |
| `66-04` | Mengetahui konsep angka 5 Letakkan 8 kubus di atas meja dan selembar kertas di samping kubus. Katakan kepada… | tanpa: `di-luar-karakter` |  |
| `66-05` | Memahami/mengartikan 5 kata Pastikan anak mendengar pemeriksa lalu katakan “Saya akan mengucapkan 1 kata dan… | tanpa: `di-luar-karakter` |  |
| `66-06` | Mengetahui konsep analogi berlawanan Minta anak untuk melengkapi kalimat di bawah ini, jangan membantu kecual… | tanpa: `di-luar-karakter` |  |
| `66-07` | Tanyakan kepada orang tua atau pengasuh, apakah anak bereaksi dengan tenang dan tidak rewel (tanpa menangis a… | tanpa: `di-luar-karakter` |  |
| `66-08` | Tanyakan kepada orang tua atau pengasuh, dapatkah anak sepenuhnya berpakaian sendiri tanpa dibantu? | tanpa: `di-luar-karakter` |  |
| `66-09` | Minta anak untuk berdiri 1 kaki tanpa berpegangan. Jika perlu tunjukkan caranya dan beri anak kesempatan seba… | tanpa: `di-luar-karakter` |  |
| `66-10` | Apakah anak dapat menangkap bola kecil sebesar bola tenis atau bola kasti hanya dengan menggunakan kedua tang… | tanpa: `di-luar-karakter` |  |

### 72 bulan

| Butir | Isi (ringkas) | Gerakan atau alasan | Catatan |
|---|---|---|---|
| `72-01` | Menggambar kotak tanpa dicontohkan Berikan kepada anak pensil dan kertas. Tunjukkan kepada anak contoh gambar… | tanpa: `di-luar-karakter` |  |
| `72-02` | Menggambar orang dengan sedikitnya 6 bagian tubuh Berikan anak pensil dan kertas lalu katakan kepada anak “Bu… | tanpa: `di-luar-karakter` |  |
| `72-03` | Mengetahui konsep analogi berlawanan Minta anak untuk melengkapi kalimat di bawah ini, jangan membantu kecual… | tanpa: `di-luar-karakter` |  |
| `72-04` | Memahami/mengartikan 7 kata Pastikan anak mendengar pemeriksa lalu katakan “Saya akan mengucapkan 1 kata dan… | tanpa: `di-luar-karakter` |  |
| `72-05` | Mengetahui komposisi benda Isi titik−titik di bawah ini dengan jawaban anak. Jangan membantu kecuali mengulan… | tanpa: `di-luar-karakter` |  |
| `72-06` | Tanyakan kepada orang tua atau pengasuh, apakah anak dapat menggosok giginya tanpa bantuan? | tanpa: `di-luar-karakter` |  |
| `72-07` | Tanyakan kepada orang tua atau pengasuh, apakah anak dapat menyiapkan dan mengambil makanan tanpa bantuan, te… | tanpa: `di-luar-karakter` |  |
| `72-08` | Apakah anak dapat menangkap bola kecil sebesar bola tenis atau bola kasti hanya dengan menggunakan kedua tang… | tanpa: `di-luar-karakter` |  |
| `72-09` | Tunjukkan kepada anak bagaimana cara berjalan di garis lurus dengan menempatkan tumit dari 1 kaki di depan ja… | tanpa: `di-luar-karakter` |  |
| `72-10` | Minta anak untuk berdiri 1 kaki tanpa berpegangan. Jika perlu tunjukkan caranya dan beri anak kesempatan seba… | tanpa: `di-luar-karakter` |  |
