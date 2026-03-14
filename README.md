<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/57c7c7a6-6b43-4681-8f39-cf708402a35b

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. (선택) 기도 등록·함께 기도·댓글 등을 구글 시트에 기록하려면 [google-apps-script/README.md](google-apps-script/README.md)를 참고해 웹 앱 URL을 만든 뒤, `.env`에 `GOOGLE_SHEETS_WEBHOOK_URL` 로 설정하세요.
4. Run the app (API 서버 + 프론트가 함께 동작합니다. **반드시 이 한 가지만 실행**하고 브라우저는 `http://localhost:3000` 으로 접속하세요):
   `npm run dev`
