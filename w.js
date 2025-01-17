require('dotenv').config();
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');

// Google API 키 불러오기
const apiKey = process.env.GOOGLE_API_KEY;
console.log(apiKey)
if (!apiKey) {
    console.error('❌ GOOGLE_API_KEY가 설정되어 있지 않습니다. .env 파일을 확인하세요.');
    process.exit(1);
}

// Google Gemini API 초기화
const genAI = new GoogleGenerativeAI(apiKey);

// article.json 파일 경로
const articleFilePath = path.join(__dirname, 'articles', 'article.json');

// article.json 파일 읽기
function loadArticleData() {
    if (!fs.existsSync(articleFilePath)) {
        console.error('❌ article.json 파일이 존재하지 않습니다.');
        process.exit(1);
    }

    const data = fs.readFileSync(articleFilePath, 'utf-8');
    return JSON.parse(data);
}

// Google Gemini API를 활용해 글 작성
async function generateArticleContent(articleData) {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

        // 프롬프트 (한글)
        const prompt = `
다음 정보를 참고하여 블로그 글을 작성해 주세요. 제묙은 새로운 제목으로 만들어 주세요. 
그리고 글은 문단과 문단으로 분리하고 가각 문단이 끝나면 이미지를 추가해 주세요. 

제목: ${articleData.title}

내용:
${articleData.content}

이미지 설명: 아래 이미지를 참고하여 내용을 풍부하게 작성해 주세요.
${articleData.images.map(img => img.url).join('\n')}

블로그 글은 독자가 흥미를 느낄 수 있도록 친절하고 자세하게 작성해 주세요. 구글 검색 SEO 에 준수하여 작성해 주세요.
포커스 키워드를 선정해서 포커스 키워드 중심으로 작성하고 사람이 작성한 것 처럼 해주세요. 디자인 서식이 있어야 하며, 소제목은 h2로 만들어 주세요.
각 문단을 분리해서 Json 파일로 저장해야 합니다. 
        `;

        // Google Gemini API 호출
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const generatedText = response.text();

        return generatedText;
    } catch (error) {
        console.error('❌ 글 작성 중 오류 발생:', error.message);
        return null;
    }
}

// 생성된 글 저장
// 생성된 글 JSON 파일로 저장
function saveGeneratedContent(content) {
    const outputFilePath = path.join(__dirname, 'articles', 'generated_article.json');

    try {
        // content가 JSON이 아니라 문자열이면 JSON으로 변환
        const jsonData = typeof content === 'string' ? JSON.parse(content) : content;

        // JSON 형식으로 저장 (들여쓰기 2칸)
        fs.writeFileSync(outputFilePath, JSON.stringify(jsonData, null, 2), 'utf-8');
        console.log(`📂 생성된 글이 ${outputFilePath}에 JSON 형식으로 저장되었습니다.`);
    } catch (error) {
        console.error('❌ JSON 파일 저장 중 오류 발생:', error.message);
    }
}


// 전체 실행 함수
async function main() {
    const articleData = loadArticleData();
    console.log('🔍 article.json 파일에서 데이터를 불러왔습니다.');

    const generatedContent = await generateArticleContent(articleData);

    if (generatedContent) {
        saveGeneratedContent(generatedContent);
    }
}

// 실행
main();
