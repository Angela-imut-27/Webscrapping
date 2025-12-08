-- ==========================================
-- Author  : If you like content like this, you can join this channel. 📲
-- Contact : https://t.me/jieshuo_materials
-- ==========================================

const axios = require("axios");

class InstagramScraper {
    constructor() {
        this.apiUrl = "https://host.optikl.ink/download/instagram";

        this.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        };
    }

    async fetch(instagramUrl) {
        try {
            const encoded = encodeURIComponent(instagramUrl);
            const target = `${this.apiUrl}?url=${encoded}`;

            const { data } = await axios.get(target, { headers: this.headers });

            if (!data || !data.ok || !data.downloadUrls) {
                return { success: false, error: "Failed to extract media" };
            }

            return {
                success: true,
                detail: data.detail,
                media: data.downloadUrls
            };

        } catch (err) {
            return {
                success: false,
                error: err.message
            };
        }
    }

    async getInfo(instagramUrl) {
        const result = await this.fetch(instagramUrl);
        if (!result.success) return result;

        const detail = result.detail;
        const media = result.media;

        return {
            success: true,
            title: detail.title,
            username: detail.username,
            likes: detail.like_count,
            comments: detail.comment_count,
            taken_at: detail.taken_at,
            media_count: media.length,
            media_types: media.map(item => item.type || "image"),
            download_links: media.map(item => item.url)
        };
    }
}

module.exports = InstagramScraper;