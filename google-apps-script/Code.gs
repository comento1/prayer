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
const PRAYERS_SHEET_NAME = '기도_목록';

function doPost(e) {
  try {
    const payload = (e && e.postData && e.postData.contents)
      ? JSON.parse(e.postData.contents)
      : {};
    if (payload.action === 'auth') {
      const result = handleAuth(payload);
      return createResponse(200, result);
    }
    if (payload.action === 'save_user_groups') {
      const result = saveUserGroups(payload);
      return createResponse(200, result);
    }
    if (payload.action === 'prayer_create') {
      const result = prayerCreate(payload);
      return createResponse(200, result);
    }
    if (payload.action === 'prayers_list') {
      const result = prayersList(payload);
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
    sheet.appendRow(['닉네임', 'PIN', '생성일시', '선택한 조']);
    sheet.getRange('1:1').setFontWeight('bold');
  } else if (sheet.getLastRow() >= 0 && sheet.getLastColumn() < 4) {
    sheet.getRange(1, 4).setValue('선택한 조');
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
  const numCols = Math.max(4, sheet.getLastColumn());
  const data = lastRow >= 1 ? sheet.getRange(2, 1, lastRow, numCols).getValues() : [];
  var nickNorm = String(nickname).trim();
  var pinStr = String(pin);
  for (var i = 0; i < data.length; i++) {
    var rowNick = String(data[i][0] || '').trim();
    var rowPin = String(data[i][1] ?? '');
    if (rowNick === nickNorm) {
      if (rowPin === pinStr) {
        var id = i + 2;
        var groupIdsStr = (data[i][3] != null && data[i][3] !== '') ? String(data[i][3]).trim() : '';
        var groupIds = [];
        if (groupIdsStr) {
          groupIdsStr.split(',').forEach(function(s) {
            var n = parseInt(s, 10);
            if (!isNaN(n)) groupIds.push(n);
          });
        }
        return { success: true, user: { id: id, nickname: nickname, groupIds: groupIds } };
      }
      return { success: false, error: 'PIN이 일치하지 않습니다.' };
    }
  }
  var created = new Date().toISOString();
  sheet.appendRow([nickname, pin, created, '']);
  var newId = sheet.getLastRow();
  return { success: true, user: { id: newId, nickname: nickname, groupIds: [] }, isNew: true };
}

function saveUserGroups(payload) {
  var userId = payload.userId != null ? parseInt(payload.userId, 10) : NaN;
  var groupIds = payload.groupIds;
  if (isNaN(userId) || !Array.isArray(groupIds)) {
    return { success: false, error: 'userId와 groupIds가 필요합니다.' };
  }
  var sheet = getOrCreateUserSheet();
  var row = userId;
  if (row < 2 || row > sheet.getLastRow()) {
    return { success: false, error: '사용자를 찾을 수 없습니다.' };
  }
  sheet.getRange(row, 4).setValue(groupIds.join(','));
  return { success: true };
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

function getOrCreatePrayersSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(PRAYERS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(PRAYERS_SHEET_NAME);
    sheet.appendRow(['id', 'user_id', 'nickname', 'group_id', 'content', 'original_content', 'created_at', 'is_answered', 'answered_note']);
    sheet.getRange('1:1').setFontWeight('bold');
  }
  return sheet;
}

function prayerCreate(payload) {
  var userId = payload.userId != null ? payload.userId : '';
  var nickname = (payload.nickname || '').toString();
  if (!nickname && userId) {
    var userSheet = getOrCreateUserSheet();
    if (userSheet.getLastRow() >= userId) {
      var nickCell = userSheet.getRange(Number(userId), 1).getValue();
      nickname = (nickCell || '').toString();
    }
  }
  var groupId = payload.groupId != null ? payload.groupId : '';
  var content = (payload.content || '').toString();
  var originalContent = (payload.originalContent || payload.original_content || content).toString();
  var createdAt = (payload.created_at || payload.createdAt || new Date().toISOString()).toString();
  var sheet = getOrCreatePrayersSheet();
  var lastRow = sheet.getLastRow();
  var newId = lastRow + 1;
  sheet.appendRow([newId, userId, nickname, groupId, content, originalContent, createdAt, 0, '']);
  return { id: newId };
}

function prayersList(payload) {
  var sheet = getOrCreatePrayersSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { prayers: [] };
  var data = sheet.getRange(2, 1, lastRow, 9).getValues();
  var groupIdFilter = payload.groupId != null ? Number(payload.groupId) : null;
  var userIdFilter = payload.userId != null ? Number(payload.userId) : null;
  var prayers = [];
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var id = row[0];
    var userId = row[1];
    var nickname = row[2];
    var groupId = row[3] !== '' ? row[3] : null;
    var content = row[4];
    var originalContent = row[5];
    var createdAt = row[6];
    var isAnswered = row[7] === 1 || row[7] === '1' ? 1 : 0;
    var answeredNote = row[8] || '';
    if (groupIdFilter != null && groupId !== groupIdFilter) continue;
    if (userIdFilter != null && Number(userId) !== userIdFilter) continue;
    prayers.push({
      id: id,
      user_id: userId,
      user_nickname: nickname,
      group_id: groupId,
      content: content,
      original_content: originalContent,
      created_at: createdAt,
      updated_at: createdAt,
      is_answered: isAnswered,
      answered_note: answeredNote,
      pray_count: 0,
      comment_count: 0,
      group_name: groupId === 1 ? '창환 조' : groupId === 2 ? '은아 조' : null
    });
  }
  prayers.reverse();
  return { prayers: prayers };
}
