const fs = require('fs').promises;
const cheerio = require('cheerio');
const path = require("path");


async function deleteFileFS(filePath) {
    if (!filePath || !filePath.startsWith('/uploads/')) {
        return;
    }
    try {
        const fullPath = path.join(__dirname, '..', 'public', filePath);
        await fs.access(fullPath);
        await fs.unlink(fullPath);
    } catch (err) {

        console.error(`Error deleting file ${filePath}:`, err.message);
    }
}

// Допоміжна функція для вилучення шляхів зображень з HTML
function extractImagePaths(htmlString) {
    if (!htmlString) return new Set();
    const $ = cheerio.load(htmlString);
    const paths = new Set();
    $('img').each((_, img) => {
        const src = $(img).attr('src');
        // Розглядаємо тільки локально завантажені зображення
        if (src && src.startsWith('/uploads/')) {
            paths.add(src);
        }
    });
    return paths;
}
module.exports = {
    deleteFileFS,
    extractImagePaths
};