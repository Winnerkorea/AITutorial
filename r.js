require("dotenv").config();
const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require("path");

// Google API 키 불러오기
const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error("❌ GOOGLE_API_KEY가 설정되어 있지 않습니다. .env 파일을 확인하세요.");
  process.exit(1);
}

// Google Gemini API 초기화
const genAI = new GoogleGenerativeAI(apiKey);

// generated_article.json 파일 경로
const generatedArticlePath = path.join(__dirname, "articles", "generated_article.json");

// generated_article.json 파일 읽기
function loadGeneratedArticle() {
  if (!fs.existsSync(generatedArticlePath)) {
    console.error("❌ generated_article.json 파일이 존재하지 않습니다.");
    process.exit(1);
  }
  const data = fs.readFileSync(generatedArticlePath, "utf-8");
  return JSON.parse(data);
}

// Google Gemini API를 활용해 글 작성
async function generateContentFromParagraph(paragraph) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // 프롬프트 작성
    const prompt = `
다음 정보를 참고하여 블로그 글을 작성해 주세요.

소제목: ${paragraph.subtitle}
내용: ${paragraph.content}
이미지: ${paragraph.image}

위 정보를 기반으로 자연스럽고 많은 사람들이 볼 수 있게 만들어 주세요. 새로운 글 처럼 보여야 하며, 유머기 있으며, 재치 있는 글이어야 합니다. 
그리고 구글 검색 시 첫페이지에 등록 수 있게 SEO 최적화 하고, 최소 200자 이상 작성해야 하며, 많은 사람들이 좋아할 수 있게 글을 작성하고 JSON 형식으로 작성해 주세요.
응답은 아래와 같은 순수 JSON 형식으로 작성해 주세요. Markdown 코드 블록(\`\`\`)이나 추가 설명 없이 JSON만 반환해 주세요.
{
  "title": "${paragraph.subtitle}",
  "content": "${paragraph.content}",
  "image": "${paragraph.image}"
}`;

    // Google Gemini API 호출
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const generatedText = response.text();

    // 불필요한 문자 제거 (Markdown 코드 블록, 공백)
    const cleanText = generatedText.replace(/```json|```/g, "").trim();

    // JSON 파싱
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("❌ 글 작성 중 오류 발생:", error.message);
    return null;
  }
}

// 전체 글을 하나의 JSON 파일로 저장
function saveGeneratedContent(allContent) {
  const outputFilePath = path.join(__dirname, "articles", "final_generated_article.json");

  try {
    fs.writeFileSync(outputFilePath, JSON.stringify(allContent, null, 2), "utf-8");
    console.log(`📂 모든 문단이 ${outputFilePath}에 JSON 형식으로 저장되었습니다.`);
  } catch (error) {
    console.error("❌ JSON 파일 저장 중 오류 발생:", error.message);
  }
}

// 10초 대기 함수
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 전체 실행 함수
async function main() {
  const articleData = loadGeneratedArticle();
  const paragraphs = articleData.paragraphs;
  const allGeneratedContent = { paragraphs: [] };

  for (let i = 0; i < paragraphs.length; i++) {
    console.log(`⏳ ${i + 1}번째 문단을 생성 중입니다... 10초 대기 중`);
    await delay(10000); // 10초 대기

    const generatedContent = await generateContentFromParagraph(paragraphs[i]);

    if (generatedContent) {
      allGeneratedContent.paragraphs.push(generatedContent);
    } else {
      console.error(`⚠️ ${i + 1}번째 문단 생성 실패. 건너뜁니다.`);
    }
  }

  saveGeneratedContent(allGeneratedContent);
}

// 실행
main();
