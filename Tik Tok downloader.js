-- ==========================================
-- Author  : If you like content like this, you can join this channel. 📲
-- Contact : https://t.me/jieshuo_materials
-- ==========================================

import axios from "axios";
import qs from "qs";
import * as cheerio from "cheerio";

async function ssstik(url) {
  const html = await axios.post(
    "https://ssstik.io/abc?url=dl",
    qs.stringify({
      id: url,
      locale: "en",
      tt: "Taka Aja Ya Ges Yak",
      debug: "ab=0&loc=ID&ip=1.1.1.1.1"
    }),
    {
      headers: {
        "HX-Request": "true",
        "HX-Trigger": "_gcaptcha_pt",
        "HX-Target": "target",
        "HX-Current-URL": "https://ssstik.io/en-1",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36",
        Referer: "https://ssstik.io/en-1"
      }
    }
  );
  const $ = cheerio.load(html.data);
  const images = [];
  $("img[data-splide-lazy]").each((i, el) => {
    const u = $(el).attr("data-splide-lazy");
    if (u) images.push(u);
  });
  const mp3 = $("a.music").attr("href") || null;
  const author = $("h2").first().text().trim() || null;
  const author_avatar = $("img.result_author").attr("src") || null;
  const likes = $("#trending-actions div:nth-child(1) div:nth-child(2)")
    .text()
    .trim() || null;
  const comments = $("#trending-actions div:nth-child(2) div:nth-child(2)")
    .text()
    .trim() || null;
  const shares = $("#trending-actions div:nth-child(3) div:nth-child(2)")
    .text()
    .trim() || null;
  const video_hd = $("#hd_download").attr("data-directurl") || null;
  const video_nowm = $("a.without_watermark").attr("href") || null;
  if (images.length > 0) {
    return {
      status: 200,
      type: "image",
      author,
      author_avatar,
      mp3,
      images,
      stats: {
        likes,
        comments,
        shares
      }
    };
  }
  return {
    status: 200,
    type: "video",
    author,
    author_avatar,
    mp3,
    video: {
      hd: video_hd,
      no_watermark: video_nowm
    },
    stats: {
      likes,
      comments,
      shares
    }
  };
}
//Example Use
ssstik("https://vt.tiktok.com/ZSUcTHuYS/").then(console.log);