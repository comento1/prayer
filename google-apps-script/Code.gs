/**
 * 중보기도 웹 서비스 - 구글 시트 연동
 * 
 * 사용 방법:
 * 1. 구글 시트를 새로 만든다.
 * 2. 확장 프로그램 > Apps Script 열기
 * 3. 이 코드를 붙여넣고 저장
 * 4. deploy > 새 배포 > 유형: 웹 앱
 *    - 실행 사용자: 나
 *    - 앱에 액세스할 수 있는 사용자: 모든 사용자 (또는 조직 내)
 * 5. URL을 복사하여 서버 .env에 GOOGLE_SHEETS_WEBHOOK_URL 로 설정
 * 6. 첫 실행 시 권한 허용
 */

const SHEET_NAME = '중보기도_기록';
const USERS_SHEET_NAME = '사용자';

function doPost(e) {
  try {
    const payload = (e && e.postData && e.postData.contents)
      ? JSON.parse(e.postData.contents)
      : {};
    if (payload.action === 'auth') {
      const result = handleAuth(payload);
      return createResponse(200, result);
    }
    const row = toRow(payload);
    if (row && row.length && payload.action) {
      const sheet = getOrCreateSheet();
      sheet.appendRow(row);
    }
    return createResponse(200, { success: true });
  } catch (err) {
    console.error(err);
    return createResponse(500, { error: String(err.message) });
  }
}

function getOrCreateUserSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(USERS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(USERS_SHEET_NAME);
    sheet.appendRow(['닉네임', 'PIN', '생성일시']);
    sheet.getRange('1:1').setFontWeight('bold');
  }
  return sheet;
}

function handleAuth(payload) {
  const nickname = String(payload.nickname || '').trim();
  const pin = String(payload.pin || '').trim();
  if (!nickname || !pin) {
    return { success: false, error: '닉네임과 PIN을 입력해주세요.' };
  }
  const sheet = getOrCreateUserSheet();
  const lastRow = sheet.getLastRow();
  const data = lastRow >= 1 ? sheet.getRange(2, 1, lastRow, 3).getValues() : [];
  var nickNorm = String(nickname).trim();
  var pinStr = String(pin);
  for (var i = 0; i < data.length; i++) {
    var rowNick = String(data[i][0] || '').trim();
    var rowPin = String(data[i][1] ?? '');
    if (rowNick === nickNorm) {
      if (rowPin === pinStr) {
        var id = i + 2;
        return { success: true, user: { id: id, nickname: nickname } };
      }
      return { success: false, error: 'PIN이 일치하지 않습니다.' };
    }
  }
  var created = new Date().toISOString();
  sheet.appendRow([nickname, pin, created]);
  var newId = sheet.getLastRow();
  return { success: true, user: { id: newId, nickname: nickname }, isNew: true };
}

function doGet(e) {
  return createResponse(200, {
    message: '중보기도 시트 연동 엔드포인트입니다. POST로 이벤트를 보내주세요.',
    sheet: SHEET_NAME,
  });
}

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['시각', '동작', '사용자ID', '닉네임', '기도ID', '상세1', '상세2']);
    sheet.getRange('1:1').setFontWeight('bold');
  }
  return sheet;
}

function toRow(payload) {
  const action = payload.action || '';
  const timestamp = payload.timestamp || new Date().toISOString();
  const userId = payload.userId ?? payload.user_id ?? '';
  const nickname = payload.nickname ?? '';
  const prayerId = payload.prayerId ?? payload.prayer_id ?? '';
  let detail1 = '';
  let detail2 = '';

  switch (action) {
    case 'prayer_created':
      detail1 = (payload.content || '').toString().slice(0, 200);
      detail2 = payload.groupId != null ? 'groupId:' + payload.groupId : '';
      break;
    case 'pray':
      detail1 = payload.praying === true ? '함께 기도함' : '함께 기도 취소';
      break;
    case 'comment':
      detail1 = (payload.content || '').toString().slice(0, 200);
      break;
    case 'answered':
      detail1 = (payload.answeredNote || '').toString().slice(0, 200);
      break;
    case 'prayer_updated':
      detail1 = (payload.content || '').toString().slice(0, 200);
      break;
    case 'prayer_deleted':
      break;
    default:
      detail1 = JSON.stringify(payload).slice(0, 200);
  }

  return [timestamp, action, userId, nickname, prayerId, detail1, detail2];
}

function createResponse(code, body) {
  const out = ContentService.createTextOutput(JSON.stringify(body));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}
