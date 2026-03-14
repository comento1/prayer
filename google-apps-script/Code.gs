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
const INTERACTIONS_SHEET_NAME = '기도_상호작용';

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
    if (payload.action === 'prayer_get') {
      const result = prayerGet(payload);
      return createResponse(200, result);
    }
    if (payload.action === 'prayer_delete') {
      const result = prayerDelete(payload);
      return createResponse(200, result);
    }
    if (payload.action === 'prayer_pray') {
      const result = prayerPray(payload);
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

function getPrayCountsByPrayerId() {
  var sheet = getOrCreateInteractionsSheet();
  var lastRow = sheet.getLastRow();
  var counts = {};
  if (lastRow >= 2) {
    var rows = sheet.getRange(2, 1, lastRow, 3).getValues();
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][2]) === 'PRAYING') {
        var pid = Number(rows[i][0]);
        counts[pid] = (counts[pid] || 0) + 1;
      }
    }
  }
  return counts;
}

function prayersList(payload) {
  var sheet = getOrCreatePrayersSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { prayers: [] };
  var prayCounts = getPrayCountsByPrayerId();
  var data = sheet.getRange(2, 1, lastRow, 9).getValues();
  var groupIdFilter = payload.groupId != null ? Number(payload.groupId) : null;
  var userIdFilter = payload.userId != null ? Number(payload.userId) : null;
  var periodFilter = payload.period || '';
  var prayers = [];
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var content = (row[4] != null && row[4] !== '') ? String(row[4]).trim() : '';
    if (!content) continue;
    var id = row[0];
    var userId = row[1];
    var nickname = row[2];
    var groupIdRaw = row[3];
    var groupId = groupIdRaw !== '' && groupIdRaw != null ? groupIdRaw : null;
    var groupIdNum = groupId != null ? Number(groupId) : null;
    var originalContent = row[5];
    var rawCreated = row[6];
    var createdAt = (typeof rawCreated === 'object' && rawCreated && rawCreated.toISOString)
      ? rawCreated.toISOString()
      : String(rawCreated || '');
    if (periodFilter === 'week' || periodFilter === 'month') {
      var createdDate = new Date(createdAt);
      if (isNaN(createdDate.getTime())) continue;
      var now = new Date();
      if (periodFilter === 'week' && (now - createdDate) > 7 * 24 * 60 * 60 * 1000) continue;
      if (periodFilter === 'month' && (now - createdDate) > 30 * 24 * 60 * 60 * 1000) continue;
    }
    var isAnswered = row[7] === 1 || row[7] === '1' ? 1 : 0;
    var answeredNote = row[8] || '';
    if (groupIdFilter != null && groupIdNum !== groupIdFilter) continue;
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
      pray_count: prayCounts[Number(id)] || 0,
      comment_count: 0,
      group_name: groupIdNum === 1 ? '창환 조' : groupIdNum === 2 ? '은아 조' : null
    });
  }
  prayers.reverse();
  return { prayers: prayers };
}

function getOrCreateInteractionsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(INTERACTIONS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(INTERACTIONS_SHEET_NAME);
    sheet.appendRow(['prayer_id', 'user_id', 'type', 'content', 'created_at']);
    sheet.getRange('1:1').setFontWeight('bold');
  }
  return sheet;
}

function prayerGet(payload) {
  var prayerId = payload.prayerId != null ? Number(payload.prayerId) : NaN;
  var currentUserId = payload.currentUserId != null ? Number(payload.currentUserId) : null;
  if (isNaN(prayerId)) return { error: 'prayerId 필요' };
  var sheet = getOrCreatePrayersSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { error: 'Not found' };
  var data = sheet.getRange(2, 1, lastRow, 9).getValues();
  for (var i = 0; i < data.length; i++) {
    if (Number(data[i][0]) === prayerId) {
      var row = data[i];
      var rawCreated = row[6];
      var createdAt = (typeof rawCreated === 'object' && rawCreated && rawCreated.toISOString)
        ? rawCreated.toISOString() : String(rawCreated || '');
      var groupId = row[3] !== '' ? row[3] : null;
      var intSheet = getOrCreateInteractionsSheet();
      var intRows = intSheet.getLastRow() < 2 ? [] : intSheet.getRange(2, 1, intSheet.getLastRow(), 5).getValues();
      var prayCount = 0;
      var userHasPrayed = false;
      var comments = [];
      for (var j = 0; j < intRows.length; j++) {
        if (Number(intRows[j][0]) !== prayerId) continue;
        var typ = String(intRows[j][2] || '');
        if (typ === 'PRAYING') {
          prayCount++;
          if (currentUserId != null && Number(intRows[j][1]) === currentUserId) userHasPrayed = true;
        } else if (typ === 'COMMENT') {
          var commentUserId = intRows[j][1];
          var commentNick = '';
          try {
            var uSheet = getOrCreateUserSheet();
            if (uSheet.getLastRow() >= commentUserId) {
              commentNick = String(uSheet.getRange(Number(commentUserId), 1).getValue() || '');
            }
          } catch (e) {}
          comments.push({
            id: j + 2,
            prayer_request_id: prayerId,
            user_id: commentUserId,
            type: 'COMMENT',
            content: intRows[j][3] || '',
            created_at: (intRows[j][4] && intRows[j][4].toISOString) ? intRows[j][4].toISOString() : String(intRows[j][4] || ''),
            user_nickname: commentNick
          });
        }
      }
      var prayer = {
        id: row[0],
        user_id: row[1],
        user_nickname: row[2],
        group_id: groupId,
        content: row[4],
        original_content: row[5],
        created_at: createdAt,
        updated_at: createdAt,
        is_answered: row[7] === 1 || row[7] === '1' ? 1 : 0,
        answered_note: row[8] || '',
        pray_count: prayCount,
        comments: comments,
        user_has_prayed: userHasPrayed,
        group_name: groupId === 1 ? '창환 조' : groupId === 2 ? '은아 조' : null
      };
      return prayer;
    }
  }
  return { error: 'Not found' };
}

function prayerDelete(payload) {
  var prayerId = payload.prayerId != null ? Number(payload.prayerId) : NaN;
  if (isNaN(prayerId)) return { success: false, error: 'prayerId 필요' };
  var sheet = getOrCreatePrayersSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: false, error: 'Not found' };
  var data = sheet.getRange(2, 1, lastRow, 9).getValues();
  for (var i = 0; i < data.length; i++) {
    if (Number(data[i][0]) === prayerId) {
      sheet.deleteRow(i + 2);
      var intSheet = getOrCreateInteractionsSheet();
      var ir = intSheet.getLastRow();
      for (var j = ir; j >= 2; j--) {
        if (Number(intSheet.getRange(j, 1).getValue()) === prayerId) {
          intSheet.deleteRow(j);
        }
      }
      return { success: true };
    }
  }
  return { success: false, error: 'Not found' };
}

function prayerPray(payload) {
  var prayerId = payload.prayerId != null ? Number(payload.prayerId) : NaN;
  var userId = payload.userId != null ? Number(payload.userId) : NaN;
  if (isNaN(prayerId) || isNaN(userId)) return { error: 'prayerId, userId 필요' };
  var sheet = getOrCreateInteractionsSheet();
  var lastRow = sheet.getLastRow();
  var now = new Date().toISOString();
  if (lastRow >= 2) {
    var rows = sheet.getRange(2, 1, lastRow, 5).getValues();
    for (var i = 0; i < rows.length; i++) {
      if (Number(rows[i][0]) === prayerId && Number(rows[i][1]) === userId && String(rows[i][2]) === 'PRAYING') {
        sheet.deleteRow(i + 2);
        return { praying: false };
      }
    }
  }
  sheet.appendRow([prayerId, userId, 'PRAYING', '', now]);
  return { praying: true };
}
