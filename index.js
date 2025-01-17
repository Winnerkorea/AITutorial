const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
    // 브라우저 실행
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // 블로그 페이지 접속
    await page.goto('https://migrationology.com/blog/', { waitUntil: 'load' });

    const allPosts = new Set();  // 중복 방지를 위해 Set 사용

    // 페이지네이션을 따라가며 글 수집
    let hasNextPage = true;

    while (hasNextPage) {
        // 현재 페이지의 글 정보 수집
        const posts = await page.$$eval('article.four.columns.post-excerpt', articles =>
            articles.map(article => {
                const titleElement = article.querySelector('a > h3');
                const linkElement = article.querySelector('a');

                return {
                    title: titleElement ? titleElement.innerText.trim() : '제목 없음',
                    url: linkElement ? linkElement.href : 'URL 없음'
                };
            })
        );

        // 수집한 글을 Set에 추가 (중복 방지)
        posts.forEach(post => allPosts.add(JSON.stringify(post)));

        console.log(`✅ 현재 페이지에서 ${posts.length}개의 글을 수집했습니다.`);

        // 페이지네이션 버튼(다음 페이지) 찾기
        const nextPageButton = await page.$('body > main > section > div.post-navigation.row > div:nth-child(3) > a');

        if (nextPageButton) {
            // 다음 페이지 버튼 클릭 및 로딩 대기
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'load' }),
                nextPageButton.click()
            ]);
            console.log('➡️ 다음 페이지로 이동합니다...');
        } else {
            hasNextPage = false;  // 더 이상 다음 페이지가 없으면 종료
            console.log('📄 마지막 페이지입니다.');
        }
    }

    // 최종 결과 배열로 변환
    const result = Array.from(allPosts).map(post => JSON.parse(post));

    // JSON 파일 경로 설정
    const dirPath = path.join(__dirname, 'location');
    const filePath = path.join(dirPath, 'migrationology.json');

    // 디렉토리가 없으면 생성
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }

    // JSON 파일로 저장
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`\n📁 크롤링 결과가 ${filePath}에 저장되었습니다.`);

    await browser.close();
})();
