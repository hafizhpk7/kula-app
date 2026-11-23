import Foundation
import PDFKit

// Pemakaian:
//   swift pdfteks.swift ringkas <berkas.pdf>            -> jumlah halaman dan halaman tanpa teks
//   swift pdfteks.swift teks <berkas.pdf> <awal> <akhir> -> teks halaman (1-based)
//   swift pdfteks.swift cari <berkas.pdf> <kata>         -> nomor halaman yang memuat kata (tanpa huruf besar/kecil)

let args = CommandLine.arguments
guard args.count >= 3, let doc = PDFDocument(url: URL(fileURLWithPath: args[2])) else {
    FileHandle.standardError.write("PDF tidak bisa dibuka\n".data(using: .utf8)!)
    exit(1)
}

switch args[1] {
case "ringkas":
    var kosong = 0
    var total = 0
    for i in 0..<doc.pageCount {
        let n = (doc.page(at: i)?.string ?? "").trimmingCharacters(in: .whitespacesAndNewlines).count
        total += n
        if n < 20 { kosong += 1 }
    }
    print("halaman=\(doc.pageCount) tanpaTeks(<20 huruf)=\(kosong) totalHuruf=\(total) terkunci=\(doc.isLocked)")
case "teks":
    let awal = Int(args[3])!, akhir = Int(args[4])!
    for p in awal...min(akhir, doc.pageCount) {
        print("=== halaman \(p) ===")
        print(doc.page(at: p - 1)?.string ?? "")
    }
case "cari":
    let kata = args[3].lowercased()
    var hasil: [Int] = []
    for i in 0..<doc.pageCount {
        if (doc.page(at: i)?.string ?? "").lowercased().contains(kata) { hasil.append(i + 1) }
    }
    print("\(kata): \(hasil.count) halaman -> \(hasil.prefix(60).map(String.init).joined(separator: ","))")
default:
    exit(2)
}
