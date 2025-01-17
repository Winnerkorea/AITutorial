require("dotenv").config();
const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require("path");

// Google API 키 불러오기
const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error(
    "❌ GOOGLE_API_KEY가 설정되어 있지 않습니다. .env 파일을 확인하세요."
  );
  process.exit(1);
}

// Google Gemini API 초기화
const genAI = new GoogleGenerativeAI(apiKey);

// article.json 파일 경로
const articleFilePath = path.join(__dirname, "articles", "article.json");

// article.json 파일 읽기
function loadArticleData() {
  if (!fs.existsSync(articleFilePath)) {
    console.error("❌ article.json 파일이 존재하지 않습니다.");
    process.exit(1);
  }
  const data = fs.readFileSync(articleFilePath, "utf-8");
  return JSON.parse(data);
}

// Google Gemini API를 활용해 글 작성
async function generateArticleContent(articleData) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // 프롬프트 수정 (Markdown 코드 블록 사용 금지)
    const prompt = `
다음 정보를 참고하여 블로그 글을 작성해 주세요.

1. 제목은 기존 제목을 참고하여 새롭게 작성해 주세요.  
2. 글은 문단별로 구분하고, 각 문단 뒤에는 관련 이미지를 추가해 주세요.  
3. SEO 최적화를 위해 포커스 키워드를 선정하고, 이를 중심으로 자연스럽게 작성해 주세요.  
4. 디자인 서식을 적용하고, 소제목은 h2 태그를 사용해 주세요.  
5. **결과는 반드시 순수한 JSON 형식**으로 작성해 주세요. Markdown 코드 블록은 사용하지 마세요.

{
  "title": "새로운 제목",
  "paragraphs": [
    {
      "subtitle": "소제목 1",
      "content": "첫 번째 문단 내용",
      "image": "이미지 URL"
    }
  ]
}

6. 글은 한국어로 작성하되, 외국어 표기는 "[한국어 발음대로 번역(원어)]" 형식으로 작성해 주세요.  
7. 이모지나 이모티콘은 사용하지 말아 주세요.  
8. 뉴스 기사 스타일이 아닌, 블로그 글처럼 자연스럽고 친절하게 작성해 주세요.
9. 문장의 길이는 최소 200자이어야 합니다.

제목: ${articleData.title}  
내용: ${articleData.content}  
이미지 설명: 아래 이미지를 참고해 내용을 풍부하게 작성해 주세요.  
${articleData.images.map((img) => img.url).join("\n")}  
`;

    // Google Gemini API 호출
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const generatedText = response.text();

    // Markdown 코드 블록 제거
    const cleanText = generatedText.replace(/```json|```/g, "").trim();

    return cleanText;
  } catch (error) {
    console.error("❌ 글 작성 중 오류 발생:", error.message);
    return null;
  }
}

// 생성된 글 JSON 파일로 저장
function saveGeneratedContent(content) {
  const outputFilePath = path.join(
    __dirname,
    "articles",
    "generated_article.json"
  );

  try {
    const jsonData = JSON.parse(content);

    // JSON 형식으로 저장 (들여쓰기 2칸)
    fs.writeFileSync(
      outputFilePath,
      JSON.stringify(jsonData, null, 2),
      "utf-8"
    );
    console.log(
      `📂 생성된 글이 ${outputFilePath}에 JSON 형식으로 저장되었습니다.`
    );
  } catch (error) {
    console.error("❌ JSON 파일 저장 중 오류 발생:", error.message);
    console.error("⚠️ 생성된 내용:", content);
  }
}

// 전체 실행 함수
async function main() {
  const articleData = loadArticleData();
  console.log("🔍 article.json 파일에서 데이터를 불러왔습니다.");

  const generatedContent = await generateArticleContent(articleData);

  if (generatedContent) {
    saveGeneratedContent(generatedContent);
  }
}

// 실행
main();
