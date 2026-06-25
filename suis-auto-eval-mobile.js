(function () {
  'use strict';

  var MENT = '';
  function askMent() {
    var v = MENT;
    while (true) {
      v = prompt('주관식에 넣을 멘트를 입력하세요 (10글자 이상).', v || '');
      if (v === null) return null;
      v = v.trim();
      if (v.length >= 10) { MENT = v; return v; }
      alert('10글자 이상 입력해야 합니다. (현재 ' + v.length + '글자)');
    }
  }

  // ---------- 유틸 ----------
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function fireMouse(el, type) {
    var ev;
    try { ev = new MouseEvent(type, { bubbles: true, cancelable: true, view: window }); }
    catch (e) { ev = document.createEvent('MouseEvents'); ev.initEvent(type, true, true); }
    el.dispatchEvent(ev);
  }
  function fireEvt(el, type) {
    var ev;
    try { ev = new Event(type, { bubbles: true, cancelable: true }); }
    catch (e) { ev = document.createEvent('HTMLEvents'); ev.initEvent(type, true, true); }
    el.dispatchEvent(ev);
  }
  function fireTouch(el, type) {
    try { el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true })); } catch (e) {}
  }
  function clickEl(el) {
    if (!el) return false;
    var t = el.querySelector ? (el.querySelector('.nexacontentsbox') || el) : el;
    fireTouch(t, 'touchstart');
    ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(function (e) { fireMouse(t, e); });
    fireTouch(t, 'touchend');
    return true;
  }
  function collectDocs() {
    var docs = [document];
    (function walk(d) {
      var fr = d.querySelectorAll('iframe, frame');
      for (var i = 0; i < fr.length; i++) {
        try { var cd = fr[i].contentDocument; if (cd) { docs.push(cd); walk(cd); } } catch (e) {}
      }
    })(document);
    return docs;
  }
  async function waitFor(predicate, timeout, interval) {
    timeout = timeout || 8000; interval = interval || 200;
    var start = Date.now();
    while (Date.now() - start < timeout) {
      try { if (predicate()) return true; } catch (e) {}
      await sleep(interval);
    }
    return false;
  }

  // ---------- 채우기 ----------
  function radioGroupCount() {
    var n = 0;
    collectDocs().forEach(function (d) {
      var radios = d.querySelectorAll('.Radio');
      for (var i = 0; i < radios.length; i++) {
        var id = radios[i].id || '';
        if (/vdsf|vdfs/i.test(id)) continue;
        if ((radios[i].textContent || '').indexOf('보통') > -1) n++;
      }
    });
    return n;
  }
  function fillRadios(label) {
    label = label || '보통';
    var count = 0;
    collectDocs().forEach(function (d) {
      var items = d.querySelectorAll('.RadioItemControl');
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (/vdsf|vdfs/i.test(it.id || '')) continue;
        if ((it.textContent || '').replace(/\s+/g, '').indexOf(label) > -1) {
          clickEl(it); count++;
        }
      }
    });
    return count;
  }
  function fillTexts(text) {
    text = text || MENT;
    var count = 0;
    collectDocs().forEach(function (d) {
      var tas = d.querySelectorAll('textarea.nexatextarea, textarea.nexaedit');
      for (var i = 0; i < tas.length; i++) {
        var ta = tas[i];
        if (/vdsf|vdfs/i.test(ta.id || '')) continue;
        try { ta.focus(); } catch (e) {}
        ta.value = text;
        ['input', 'keyup', 'change'].forEach(function (t) { fireEvt(ta, t); });
        try { ta.blur(); } catch (e) {}
        fireEvt(ta, 'blur');
        count++;
      }
    });
    return count;
  }
  function textsAllFilled() {
    var ok = true;
    collectDocs().forEach(function (d) {
      var tas = d.querySelectorAll('textarea.nexatextarea, textarea.nexaedit');
      for (var i = 0; i < tas.length; i++) {
        if (/vdsf|vdfs/i.test(tas[i].id || '')) continue;
        if (!(tas[i].value && tas[i].value.length)) ok = false;
      }
    });
    return ok;
  }
  function fillCurrent() {
    var groups = radioGroupCount();
    var r = fillRadios('보통');
    var t = fillTexts(MENT);
    var ok = (groups > 0) && (r === groups) && textsAllFilled();
    return { ok: ok, radios: r, groups: groups, texts: t };
  }

  // ---------- 미평가 목록 ----------
  function unevalRows() {
    var rows = [];
    collectDocs().forEach(function (d) {
      var cells = d.querySelectorAll('.GridCellControl');
      for (var i = 0; i < cells.length; i++) {
        var c = cells[i];
        var lab = (c.getAttribute('aria-label') || '') + ' ' + (c.textContent || '');
        if (lab.indexOf('미평가') > -1) {
          var row = c.closest ? c.closest('.GridRowControl') : null;
          if (row && rows.indexOf(row) < 0) rows.push(row);
          else if (!row && rows.indexOf(c) < 0) rows.push(c);
        }
      }
    });
    return rows;
  }

  // ---------- 저장 & 팝업 ----------
  function clickSave() {
    var btn = null;
    collectDocs().forEach(function (d) {
      if (btn) return;
      btn = d.querySelector('[id$=".btn_save"]') || d.querySelector('[id*="btn_save"]');
    });
    if (!btn) return false;
    clickEl(btn);
    return true;
  }
  async function handlePopups(ms) {
    ms = ms || 4000;
    var start = Date.now(), clicked = 0;
    while (Date.now() - start < ms) {
      var hit = false;
      collectDocs().forEach(function (d) {
        var btns = d.querySelectorAll('.Button, .ButtonControl, [class*="Button"]');
        for (var i = 0; i < btns.length; i++) {
          var b = btns[i];
          if (b.offsetParent === null) continue;
          var inPopup = b.closest && (b.closest('[id*="PopupFrame"]') || b.closest('[id*="opup"]'));
          if (!inPopup) continue;
          var txt = (b.textContent || '').replace(/\s+/g, '');
          if (/^(예|확인|저장|Yes|OK)$/i.test(txt)) { clickEl(b); clicked++; hit = true; }
        }
      });
      await sleep(300);
      if (!hit) await sleep(200);
    }
    return clicked;
  }

  // ---------- 전체 자동 루프 ----------
  async function runAll(pauseEach, log) {
    var total = unevalRows().length;
    if (total === 0) { log('미평가 과목이 없습니다.'); return; }
    log('미평가 ' + total + '개 과목 처리 시작...');

    var done = 0, guard = 0;
    while (guard++ < 60) {
      var rows = unevalRows();
      if (rows.length === 0) break;
      var row = rows[0];

      clickEl(row);
      await sleep(400);
      var loaded = await waitFor(function () { return radioGroupCount() > 0; }, 8000, 200);
      await sleep(500);
      if (!loaded) { log('[중단] 과목 폼이 로드되지 않음'); return; }

      var res = fillCurrent();
      if (!res.ok) {
        log('[중단] 검증 실패 (라디오 ' + res.radios + '/' + res.groups + ', 주관식 ' + res.texts + '). 저장 안 함.');
        return;
      }
      log('채움 OK (라디오 ' + res.radios + ', 주관식 ' + res.texts + ')');

      if (pauseEach) {
        if (!confirm('이 과목 저장? (저장 후 수정 불가)\n라디오 ' + res.radios + ' / 주관식 ' + res.texts)) {
          log('[중단] 사용자 취소'); return;
        }
      }

      if (!clickSave()) { log('[중단] 저장 버튼 못 찾음'); return; }
      await handlePopups(4500);
      await sleep(800);

      var removed = await waitFor(function () { return unevalRows().length < rows.length; }, 6000, 300);
      if (!removed) {
        log('[중단] 저장 후 목록 미갱신. 중복저장 방지 위해 멈춤.'); return;
      }
      done++;
      log('저장 완료 (' + done + '/' + total + ')');
      await sleep(600);
    }
    log('끝. 저장 ' + done + '/' + total + '개 완료.');
  }

  // ---------- UI ----------
  function makePanel() {
    if (document.getElementById('suisAutoEvalPanel')) return;
    var box = document.createElement('div');
    box.id = 'suisAutoEvalPanel';
    box.style.cssText =
      'all:initial!important;position:fixed!important;right:10px!important;' +
      'top:50%!important;bottom:auto!important;left:auto!important;' +
      'transform:translateY(-50%)!important;' +
      'z-index:2147483647!important;display:block!important;' +
      'box-sizing:border-box!important;width:min(360px,calc(100vw - 20px))!important;' +
      'padding:16px!important;margin:0!important;background:#1f2937!important;color:#fff!important;' +
      'border-radius:14px!important;box-shadow:0 8px 28px rgba(0,0,0,.55)!important;' +
      'font:400 14px/1.45 NotoSansKR,Malgun Gothic,sans-serif!important;';

    var BTN =
      'display:block!important;position:static!important;float:none!important;box-sizing:border-box!important;' +
      'width:100%!important;height:auto!important;min-height:48px!important;margin:0 0 8px 0!important;padding:13px!important;' +
      'border:0!important;border-radius:10px!important;cursor:pointer!important;text-align:center!important;' +
      'pointer-events:auto!important;' +
      '-webkit-appearance:none!important;font:600 15px/1.3 NotoSansKR,Malgun Gothic,sans-serif!important;';

    var HEAD =
      'display:flex!important;position:static!important;align-items:center!important;' +
      'gap:8px!important;margin:0 0 10px 0!important;';

    var SMALLBTN =
      'display:inline-block!important;position:static!important;box-sizing:border-box!important;' +
      'width:34px!important;height:34px!important;min-height:34px!important;padding:0!important;margin:0!important;' +
      'border:0!important;border-radius:8px!important;cursor:pointer!important;' +
      'background:#374151!important;color:#fff!important;pointer-events:auto!important;' +
      'font:700 18px/1 NotoSansKR,sans-serif!important;-webkit-appearance:none!important;';

    var LOG =
      'display:block!important;position:static!important;margin:9px 0 0 0!important;padding:8px!important;' +
      'font:400 12.5px/1.45 NotoSansKR,Malgun Gothic,sans-serif!important;color:#cbd5e1!important;' +
      'min-height:40px!important;max-height:160px!important;overflow:auto!important;white-space:pre-wrap!important;' +
      'background:#111827!important;border-radius:8px!important;';

    box.innerHTML =
      '<div style="' + HEAD + '">' +
        '<span style="flex:1!important;font:700 16px/1.3 NotoSansKR,sans-serif!important;color:#fff!important;">강의평가 자동화</span>' +
        '<button id="seMin" style="' + SMALLBTN + '">–</button>' +
        '<button id="seX" style="' + SMALLBTN + '">×</button>' +
      '</div>' +
      '<div id="seBody">' +
        '<button id="seScan" style="' + BTN + 'background:#475569!important;color:#fff!important;">① 미평가 과목 스캔</button>' +
        '<button id="seDry"  style="' + BTN + 'background:#3b82f6!important;color:#fff!important;">② 현재 과목만 채우기(테스트)</button>' +
        '<button id="seSafe" style="' + BTN + 'background:#f59e0b!important;color:#111!important;">③ 전체 자동 (과목별 확인)</button>' +
        '<button id="seAuto" style="' + BTN + 'background:#ef4444!important;color:#fff!important;margin-bottom:0!important;">④ 전체 자동 (확인없이 저장)</button>' +
        '<div id="seLog" style="' + LOG + '"></div>' +
      '</div>';

    document.body.appendChild(box);

    var bodyEl = box.querySelector('#seBody');
    var logEl  = box.querySelector('#seLog');

    function log(m) { logEl.textContent = (m + '\n' + logEl.textContent).slice(0, 1500); }

    function bindBtn(id, fn) {
      var el = box.querySelector(id);
      el.addEventListener('touchend', function (e) { e.preventDefault(); fn(); }, { passive: false });
      el.addEventListener('click', fn);
    }

    bindBtn('#seMin', function () {
      bodyEl.style.setProperty('display', bodyEl.style.display === 'none' ? 'block' : 'none', 'important');
    });
    bindBtn('#seX', function () { box.remove(); });
    bindBtn('#seScan', function () {
      log('미평가 과목: ' + unevalRows().length + '개');
    });
    bindBtn('#seDry', function () {
      if (askMent() === null) return;
      var r = fillCurrent();
      log('테스트 → 라디오 ' + r.radios + '/' + r.groups + ', 주관식 ' + r.texts + (r.ok ? ' (검증 OK)' : ' (검증 실패!)'));
    });
    bindBtn('#seSafe', function () {
      if (!confirm('⚠ 저장하면 수정이 절대 불가합니다.\n②테스트로 값이 잘 들어가는지 먼저 확인했나요?\n\n계속하면 과목마다 저장 전 확인창이 뜹니다.')) return;
      if (askMent() === null) return;
      runAll(true, log);
    });
    bindBtn('#seAuto', function () {
      if (!confirm('⚠⚠ 확인 없이 모든 미평가 과목을 자동 저장합니다.\n저장 후 수정 절대 불가. 진행할까요?')) return;
      if (askMent() === null) return;
      if (!confirm('모두 보통 + 입력한 멘트로 영구 저장됩니다.\n멘트: ' + MENT + '\n진행?')) return;
      runAll(false, log);
    });
  }

  makePanel();
  setInterval(makePanel, 2000);
})();
