// • Feature : Play Spotify
// • Credits : https://whatsapp.com/channel/0029Vb4fjWE1yT25R7epR110

import axios from 'axios';

async function spotifyPlay(query) {
  const { data } = await axios.get(
    `https://api.deline.web.id/downloader/spotifyplay?q=${encodeURIComponent(query)}`,
    { timeout: 20000 }
  );
  
  if (!data?.status || !data?.result) {
    throw new Error('Lagu tidak ditemukan');
  }
  
  return {
    title: data.result.metadata.title,
    artist: data.result.metadata.artist,
    duration: data.result.metadata.duration,
    cover: data.result.metadata.cover,
    url: data.result.metadata.url,
    audioUrl: data.result.dlink
  };
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) {
    throw `❌ Masukkan judul lagu!\n\nContoh:\n${usedPrefix + command} my city`;
  }

  const loadingMsg = await conn.reply(m.chat, "🔎 Mencari lagu di Spotify...", m);

  try {
    const track = await spotifyPlay(text);

    await conn.sendMessage(m.chat, {
      text: `⏳ Mengunduh: *${track.title}*\nArtist: ${track.artist}\n\n_Mohon tunggu..._`,
      edit: loadingMsg.key
    }).catch(() => {});

    const canvasUrl = `https://anabot.my.id/api/maker/spotify?apikey=freeApikey&author=${encodeURIComponent(track.artist)}&album=AlfiXD Playlist&title=${encodeURIComponent(track.title)}×tamp=10,0&image=${encodeURIComponent(track.cover)}&blur=5&overlayOpacity=0.7`;

    const caption = `🎵 *Spotify Play*\n\n` +
      `∘ *Title:* ${track.title}\n` +
      `∘ *Artist:* ${track.artist}\n` +
      `∘ *Duration:* ${track.duration}\n` +
      `∘ *Link:* ${track.url}\n\n` +
      `_Berhasil diunduh!_ ✅`;

    await conn.sendMessage(m.chat, {
      image: { url: canvasUrl },
      caption
    }, { quoted: m }).catch(() => conn.reply(m.chat, caption, m));

    await conn.sendMessage(m.chat, {
      audio: { url: track.audioUrl },
      mimetype: "audio/mpeg",
      fileName: `${track.title.replace(/[^\w\s]/gi, '')}.mp3`
    }, { quoted: m }).catch(() => {
      conn.reply(m.chat, `⚠️ Gagal mengirim audio.\n\n📥 Download manual:\n${track.audioUrl}`, m);
    });

  } catch (e) {
    try {
      if (loadingMsg?.key) await conn.sendMessage(m.chat, { delete: loadingMsg.key });
    } catch {}
    
    return conn.reply(
      m.chat,
      `❌ *Terjadi kesalahan*\n\n${e.message || e}\n\n_Silakan coba lagi dengan judul lain._`,
      m
    );
  }
};

handler.command = ["spotifyplay", "spplay", "splay"];
handler.help = ["spotifyplay <judul>"];
handler.tags = ["downloader"];
handler.limit = true;
handler.premium = false;

export default handler;
