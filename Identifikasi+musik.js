const acrcloud = require("acrcloud");

// key & Secret gratis 
// Jangan di abuse, kalo abis bisa kunjungi halaman docs
// https://npmjs.com/package/acrcloud untuk ambil key & secret baru

const acr = new acrcloud({
    host: "identify-ap-southeast-1.acrcloud.com",
    access_key: "ee1b81b47cf98cd73a0072a761558ab1",
    access_secret: "ya9OPe8onFAnNkyf9xMTK8qRyMGmsghfuHrIMmUI",
});

async function whatmusic(buffer) {
    const data = (await acr.identify(buffer)).metadata;
    if (!data?.music || data.music.length === 0) throw new Error("Song data not found!");

    return data.music.map((a) => ({
        title: a?.title || "Unknown",
        artist: a?.artists?.[0]?.name || "Unknown",
        score: a?.score || 0,
        release: a?.release_date ? new Date(a.release_date).toLocaleDateString("id-ID") : "Unknown",
        duration: a?.duration_ms ? toTime(a.duration_ms) : "00:00",
        url: Object.keys(a?.external_metadata || {}).map((i) => {
            if (i === "youtube") return "https://youtu.be/" + a.external_metadata[i].vid;
            if (i === "deezer") return "https://www.deezer.com/us/track/" + a.external_metadata[i].track.id;
            if (i === "spotify") return "https://open.spotify.com/track/" + a.external_metadata[i].track.id;
            return "";
        }).filter(Boolean),
    }));
}

function toTime(ms) {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor(ms / 60000) % 60;
    const s = Math.floor(ms / 1000) % 60;
    return [m, s].map((v) => v.toString().padStart(2, "0")).join(":");
}

let handler = async (m, { Func }) => {
    const target = m.quoted || m;
    if (!/audio/.test(target.msg?.mimetype)) return m.reply("*Oops!* Harap balas pesan audio yang ingin dicari judul lagunya.");

    const buffer = await target.download();
    let data;
    try {
        data = await whatmusic(buffer);
    } catch (err) {
        return m.reply(`*Maaf!* ${err.message}`);
    }

    let caption = `*What Music - Finder*\n\n`;
    for (const result of data) {
        caption += `- *Judul:* ${result.title}\n`;
        caption += `- *Artis:* ${result.artist}\n`;
        caption += `- *Durasi:* ${result.duration}\n`;
        caption += `- *Sumber:* ${result.url.join("\n") || "Tidak ditemukan"}\n\n`;
    }

    m.reply(caption);
};

handler.help = ["whatmusic"];
handler.tags = ["tools"];
handler.command = /^(whatmusic)$/i;

module.exports = handler;