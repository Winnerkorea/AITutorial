const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const urlModule = require('url');

// 경로 설정
const tripBlogPath = path.join(__dirname, 'location', 'tripBlog.json');
const selectedPath = path.join(__dirname, 'location', 'selected.json');
const articlesFilePath = path.join(__dirname, 'articles', 'article.json');
const imagesDir = path.join(__dirname, 'images');

// 폴더 및 파일 생성
function ensureFileAndDirectory() {
    [path.dirname(articlesFilePath), imagesDir, path.dirname(selectedPath)].forEach(dir => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    if (!fs.existsSync(selectedPath)) {
        fs.writeFileSync(selectedPath, JSON.stringify([]), 'utf-8');
    }

    fs.writeFileSync(articlesFilePath, JSON.stringify([], null, 2), 'utf-8');
}

// JSON 파일 로드
function loadJson(filePath) {
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
}

// 중복 제거 랜덤 URL 선택
function getRandomUrl() {
    const allPosts = loadJson(tripBlogPath);
    const selectedPosts = loadJson(selectedPath);

    const unselectedPosts = allPosts.filter(post =>
        !selectedPosts.some(selected => selected.url === post.url)
    );

    if (unselectedPosts.length === 0) {
        console.log('✅ 모든 URL을 이미 크롤링했습니다.');
        process.exit();
    }

    return unselectedPosts[Math.floor(Math.random() * unselectedPosts.length)];
}

// 딜레이 추가 (ms)
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 이미지 다운로드 (재시도 로직 포함)
async function downloadImage(imageUrl, fileName, retryCount = 3) {
    try {
        const response = await axios.get(imageUrl, {
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const filePath = path.join(imagesDir, fileName);
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                console.log(`🖼️ 이미지 저장 완료: ${filePath}`);
                resolve(filePath);
            });
            writer.on('error', reject);
        });
    } catch (error) {
        if (error.response && error.response.status === 429 && retryCount > 0) {
            console.warn(`⚠️ 요청이 너무 많습니다. 3초 후 재시도합니다... (${retryCount}회 남음)`);
            await delay(3000);
            return downloadImage(imageUrl, fileName, retryCount - 1);
        } else {
            console.error(`❌ 이미지 다운로드 실패: ${imageUrl}`, error.message);
        }
    }
}

// 제목, 본문, 이미지 크롤링
async function fetchContent(url) {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        // 제목 및 본문 추출
        const title = $('body > section > div > div > h1').text().trim();
        const content = $('#content > div > p')
            .map((i, el) => $(el).text().trim())
            .get()
            .join('\n\n');

        // 이미지 URL 추출
        const imageUrls = $('#content > div > figure > img')
            .map((i, el) => $(el).attr('src'))
            .get()
            .filter(src => src && (src.startsWith('http') || src.startsWith('//')));

        let downloadedImages = [];

        if (imageUrls.length > 0) {
            for (const imgUrl of imageUrls) {
                const absoluteUrl = imgUrl.startsWith('//') ? `https:${imgUrl}` : imgUrl;
                const imgFileName = Date.now() + '-' + path.basename(urlModule.parse(absoluteUrl).pathname);

                // 이미지 다운로드 및 딜레이 추가
                await downloadImage(absoluteUrl, imgFileName);
                await delay(1000);  // 1초 대기

                downloadedImages.push({ url: absoluteUrl, file: imgFileName });
            }
        } else {
            console.log('⚠️ 이미지가 없습니다.');
            downloadedImages.push({ message: '이미지 없음' });
        }

        return { title, url, content, images: downloadedImages };
    } catch (error) {
        console.error(`❌ 크롤링 실패 (${url}):`, error.message);
        return null;
    }
}

// article.json 저장
function saveArticleToFile(article) {
    fs.writeFileSync(articlesFilePath, JSON.stringify(article, null, 2), 'utf-8');
    console.log(`📂 글이 ${articlesFilePath}에 저장되었습니다.`);
}

// 선택한 URL 기록
function updateSelected(post) {
    const selectedPosts = loadJson(selectedPath);
    selectedPosts.push(post);
    fs.writeFileSync(selectedPath, JSON.stringify(selectedPosts, null, 2), 'utf-8');
}

// 전체 실행 함수
async function startCrawling() {
    ensureFileAndDirectory();

    const randomPost = getRandomUrl();
    console.log(`🔍 선택된 URL: ${randomPost.url}`);

    const article = await fetchContent(randomPost.url);
    if (article) {
        saveArticleToFile(article);
        updateSelected(randomPost);
    }
}

// 크롤링 시작
startCrawling();
