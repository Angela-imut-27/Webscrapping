impor axios dari "axios";
impor fs dari "fs/promises";
impor jalur dari "jalur";
impor tajam dari "tajam";

konstan UKURAN_MAKS = 5 * 1024 * 1024;

const handler = async (m, sock, { isBan, awalan, perintah }) => {
  mencoba {
    jika (isBan) kembalikan tunggu sock.sendMessage(m.chat, { bereaksi: { teks: '❌', kunci: m.kunci } });

    biarkan mediaMessage;
    if (m.message?.imageMessage) mediaMessage = m.message.imageMessage;
    jika tidak (m.pesan?.documentMessage dan m.pesan.documentMessage.mimetype.dimulaiDengan('gambar/')) {
      mediaMessage = m.pesan.pesandokumen;
    } jika tidak (m.pesan?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
      mediaMessage = m.pesan.extendedTextMessage.contextInfo.quotedMessage.imageMessage;
    } kalau tidak {
      return m.reply(`Contoh: ${prefix + command} dengan kirim foto/reply foto`);
    }

    const filePath = tunggu sock.downloadAndSaveMediaMessage(mediaMessage, './tmp');
    biarkan buffer = tunggu fs.readFile(jalurfile);

    if (buffer.length > MAX_SIZE) return m.reply('Ukuran gambar maksimal 5MB!');

    buffer = tunggu sharp(buffer)
      .ubah ukuran({ lebar: Math.floor(0.6 * 1024) })
      .toBuffer();
      
    fungsi async tinyOnce(buf, cookies = "") {
      const res = menunggu axios.post(
        "https://tinyjpg.com/backend/opt/shrink",
        buf,
        {
          judul: {
            "Jenis Konten": "gambar/png",
            "Agen Pengguna": "Mozilla/5.0",
            "Referensi": "https://tinyjpg.com/",
            "Asal": "https://tinyjpg.com",
            "Kue": kue kering
          },
          tiperespons: "json"
        }
      );
      kembalikan res.data;
    }

    fungsi async fetchOutput(url) {
      const res = tunggu axios.get(url, { tiperespons: "arraybuffer" });
      kembalikan Buffer.from(res.data);
    }

    fungsi async tinyCompress(buf, cookies = "", times = 3) {
      biarkan lastJson = null;
      untuk (misalkan i = 0; i < kali; i++) {
        const json = tunggu tinyOnce(buf, cookies);
        lastJson = json;
        buf = tunggu fetchOutput(json.output.url);
      }
      kembalikan { buffer: buf, lastJson };
    }

    const cookies = "PersetujuanKue=...; _ga=...; __stripe_mid=...";
    const { buffer: compressedBuffer, lastJson } = tunggu tinyCompress(buffer, cookies);
    tunggu sock.kirimPesan(m.obrolan, {
      gambar: compressedBuffer,
      keterangan:`*Berhasil mengompres gambar!*
      
- Ukuran awal: *${(buffer.length / 1024).toFixed(2)} KB*
- Ukuran setelah kompresi: *${(compressedBuffer.length / 1024).toFixed(2)} KB*`
    }, { dikutip: m });

    tunggu fs.unlink(jalurfile);

  } tangkap (e) {
    m.balasan(e.pesan);
  }
};
handler.command = ["cimg", "tiny", "kompresimg", "kompresfoto"];
ekspor penangan default;