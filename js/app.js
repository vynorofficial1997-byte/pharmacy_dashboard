/* Ausway admin panel - frontend interactions (no backend; navigation + validation only) */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var page = document.body.getAttribute('data-page');

  /* ---- smooth page transitions ---- */
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function go(url) {
    if (go.busy) return; go.busy = true;
    document.body.classList.add('leaving');
    setTimeout(function () { location.href = url; }, reduce ? 0 : 200);
  }
  window.ausGo = go;
  window.addEventListener('pageshow', function (e) { if (e.persisted) { go.busy = false; document.body.classList.remove('leaving'); } });
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented) return;
    var a = e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var h = a.getAttribute('href');
    if (!h || h.charAt(0) === '#' || a.target || e.ctrlKey || e.metaKey || e.shiftKey || !/\.html/.test(h)) return;
    e.preventDefault(); go(h);
  });

  /* ---- logout -> login ---- */
  $$('[data-logout]').forEach(function (a) {
    a.addEventListener('click', function () { try { sessionStorage.clear(); } catch (e) {} });
  });

  /* ---- generic popup helpers ---- */
  var veil = $('#veil');
  function openPop(p) { if (veil) veil.classList.add('show'); p.classList.add('show'); }
  function closePops() {
    $$('.pop.show').forEach(function (p) { p.classList.remove('show'); });
    if (veil) veil.classList.remove('show');
    var cr = $('#crumb'); if (cr) cr.style.display = 'none';
  }
  $$('[data-close]').forEach(function (b) { b.addEventListener('click', closePops); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closePops(); $$('.imgpop.show').forEach(function (p) { p.classList.remove('show'); }); }
  });

  /* ---- generic search / filter for list pages ---- */
  function wireFilter() {
    var q = $('#q'), st = $('#fStatus');
    if (!q && !st) return;
    function apply() {
      var t = q ? q.value.trim().toLowerCase() : '';
      var s = st ? st.value : '';
      $$('#rows [data-row]').forEach(function (r) {
        var ok = (!t || (r.getAttribute('data-text') || '').toLowerCase().indexOf(t) > -1);
        if (ok && st && s.indexOf('All') !== 0) ok = r.getAttribute('data-status') === s;
        r.style.display = ok ? '' : 'none';
      });
    }
    if (q) q.addEventListener('input', apply);
    if (st) st.addEventListener('change', apply);
  }

  /* ---- header search: live-filters whatever table / list is on the page ---- */
  (function wireHeaderSearch() {
    var h = $('#hq'); if (!h) return;
    h.addEventListener('input', function () {
      var t = h.value.trim().toLowerCase();
      $$('.tbl .row:not(.hd), .nlist .n').forEach(function (r) {
        if (!t || r.textContent.toLowerCase().indexOf(t) > -1) r.removeAttribute('data-hq'); else r.setAttribute('data-hq', '1');
      });
    });
  })();

  /* ---- numeric helpers ---- */
  function digitsOnly(el, max) {
    el.addEventListener('input', function () {
      var v = el.value.replace(/\D/g, '');
      if (max) v = v.slice(0, max);
      if (v !== el.value) el.value = v;
    });
    el.addEventListener('keydown', function (e) {
      if (e.ctrlKey || e.metaKey || e.key.length > 1) return;
      if (!/\d/.test(e.key)) e.preventDefault();
    });
  }
  function money(n) {
    n = Math.round(n * 100) / 100;
    return '\u20B9' + (n % 1 === 0 ? n : n.toFixed(2));
  }

  /* =============================== LOGIN =============================== */
  if (page === 'login') {
    var ph = $('#phone'), msg = $('#msg');
    digitsOnly(ph, 10);
    ph.addEventListener('paste', function (e) {
      e.preventDefault();
      var t = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
      if (t.length > 10) t = t.slice(-10);
      ph.value = (ph.value + t).slice(0, 10); ph.classList.remove('err'); msg.textContent = '';
    });
    function send() {
      if (!ph.value) { ph.classList.add('err'); msg.textContent = 'Please enter your phone number.'; ph.focus(); return; }
      if (!/^\d{10}$/.test(ph.value)) { ph.classList.add('err'); msg.textContent = 'Enter a valid 10-digit phone number.'; ph.focus(); return; }
      try { sessionStorage.setItem('ausway_phone', ph.value); } catch (e) {}
      go('otp.html');
    }
    $('#send').addEventListener('click', send);
    ph.addEventListener('keydown', function (e) { if (e.key === 'Enter') send(); });
    ph.addEventListener('input', function () { ph.classList.remove('err'); msg.textContent = ''; });
  }

  /* ================================ OTP ================================ */
  if (page === 'otp') {
    var boxes = $$('#otp input'), omsg = $('#msg');
    function otpValue() { return boxes.map(function (b) { return b.value; }).join(''); }
    function clearErr() { omsg.textContent = ''; boxes.forEach(function (b) { b.classList.remove('err'); }); }
    function fillFrom(start, digits) {
      var i = start;
      for (var k = 0; k < digits.length && i < boxes.length; k++, i++) boxes[i].value = digits[k];
      var next = Math.min(i, boxes.length - 1);
      boxes[next].focus();
    }
    boxes.forEach(function (b, idx) {
      b.addEventListener('keydown', function (e) {
        if (e.ctrlKey || e.metaKey) return;
        if (e.key === 'Backspace') {
          e.preventDefault();
          if (b.value) b.value = ''; else if (idx > 0) { boxes[idx - 1].value = ''; boxes[idx - 1].focus(); }
          clearErr();
        } else if (e.key === 'ArrowLeft' && idx > 0) { e.preventDefault(); boxes[idx - 1].focus(); }
        else if (e.key === 'ArrowRight' && idx < boxes.length - 1) { e.preventDefault(); boxes[idx + 1].focus(); }
        else if (e.key === 'Enter') { e.preventDefault(); submit(); }
        else if (e.key.length === 1) {
          e.preventDefault();
          if (/^\d$/.test(e.key)) { b.value = e.key; clearErr(); if (idx < boxes.length - 1) boxes[idx + 1].focus(); }
        }
      });
      // mobile keyboards / IME / drag-drop: sanitise whatever lands in the box
      b.addEventListener('input', function () {
        var d = b.value.replace(/\D/g, '');
        if (d.length > 1) { b.value = ''; fillFrom(idx, d); }
        else { b.value = d; if (d && idx < boxes.length - 1) boxes[idx + 1].focus(); }
        clearErr();
      });
      b.addEventListener('paste', function (e) {
        e.preventDefault();
        var d = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
        if (!d) return;                       // nothing numeric: block it
        fillFrom(idx, d.slice(0, boxes.length - idx)); clearErr();
      });
      b.addEventListener('drop', function (e) { e.preventDefault(); });
      b.addEventListener('focus', function () { b.select(); });
    });
    function submit() {
      var v = otpValue();
      if (v.length < boxes.length) {
        omsg.textContent = 'Please enter all 6 digits of the OTP.';
        boxes.forEach(function (b) { if (!b.value) b.classList.add('err'); });
        var first = boxes.filter(function (b) { return !b.value; })[0]; if (first) first.focus();
        return;
      }
      if (!/^\d{6}$/.test(v)) { omsg.textContent = 'OTP must contain digits only.'; return; }
      go('dashboard.html');
    }
    $('#enter').addEventListener('click', submit);
    boxes[0].focus();
  }

  /* ============================== SIGN-UP ============================== */
  if (page === 'signup') {
    var smsg = $('#msg');
    var g = function (id) { return document.getElementById(id); };
    ['dd', 'mm'].forEach(function (i) { digitsOnly(g(i), 2); });
    digitsOnly(g('yyyy'), 4); digitsOnly(g('ec'), 10); digitsOnly(g('cpin'), 6); digitsOnly(g('ppin'), 6);
    // gender: tick boxes behave as a single choice
    var gens = $$('input[name=gender]');
    gens.forEach(function (c) { c.addEventListener('change', function () { if (c.checked) gens.forEach(function (o) { if (o !== c) o.checked = false; }); gens.forEach(function (o) { o.classList.remove('err'); }); }); });
    // same as current address
    var same = g('same'), wasChecked = false;
    var pairs = [['ca1', 'pa1'], ['ca2', 'pa2'], ['cpin', 'ppin']];
    function syncAddr() { pairs.forEach(function (p) { g(p[1]).value = g(p[0]).value; }); }
    function setSame(on) {
      same.checked = on;
      pairs.forEach(function (p) { g(p[1]).readOnly = on; if (on) g(p[1]).classList.remove('err'); });
      if (on) syncAddr();
    }
    same.addEventListener('click', function () { var on = !wasChecked; wasChecked = on; setSame(on); });
    g('sameLbl').addEventListener('click', function () { var on = !wasChecked; wasChecked = on; setSame(on); });
    pairs.forEach(function (p) { g(p[0]).addEventListener('input', function () { if (same.checked) syncAddr(); }); });
    // uploads
    [['fA', 'upA'], ['fL', 'upL'], ['fP', 'upP']].forEach(function (p) {
      var inp = g(p[0]), lab = g(p[1]);
      inp.addEventListener('change', function () {
        var f = inp.files && inp.files[0];
        if (f) { lab.querySelector('.fn').textContent = f.name; lab.classList.remove('err'); }
      });
    });
    $$('.tx,.dt').forEach(function (el) { el.addEventListener('input', function () { el.classList.remove('err'); }); });

    function validDOB() {
      var d = +g('dd').value, m = +g('mm').value, y = +g('yyyy').value;
      if (!g('dd').value || !g('mm').value || g('yyyy').value.length !== 4) return false;
      var dt = new Date(y, m - 1, d);
      if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return false;
      if (dt > new Date() || y < 1900) return false;
      return true;
    }
    var nameRe = /^[A-Za-z][A-Za-z .'\-]*$/;
    g('confirm').addEventListener('click', function () {
      var errs = [], firstEl = null;
      function bad(el, text) { if (el.length) el.forEach(function (e) { e.classList.add('err'); }); else el.classList.add('err'); if (!firstEl) firstEl = el.length ? el[0] : el; errs.push(text); }
      $$('.err').forEach(function (e) { e.classList.remove('err'); });
      if (!nameRe.test(g('fn').value.trim())) bad(g('fn'), 'Enter your first name (letters only).');
      if (!nameRe.test(g('ln').value.trim())) bad(g('ln'), 'Enter your last name (letters only).');
      if (!gens.some(function (c) { return c.checked; })) bad(gens, 'Select your gender.');
      if (!validDOB()) { bad([g('dd'), g('mm'), g('yyyy')], 'Enter a valid date of birth.'); }
      if (!/^\d{10}$/.test(g('ec').value)) bad(g('ec'), 'Enter a valid 10-digit emergency contact number.');
      if (!g('ca1').value.trim()) bad(g('ca1'), 'Enter your current house / street.');
      if (!g('ca2').value.trim()) bad(g('ca2'), 'Enter your current area / city.');
      if (!/^\d{6}$/.test(g('cpin').value)) bad(g('cpin'), 'Enter a valid 6-digit current pin code.');
      if (!g('pa1').value.trim()) bad(g('pa1'), 'Enter your permanent house / street.');
      if (!g('pa2').value.trim()) bad(g('pa2'), 'Enter your permanent area / city.');
      if (!/^\d{6}$/.test(g('ppin').value)) bad(g('ppin'), 'Enter a valid 6-digit permanent pin code.');
      if (!g('fA').files.length) bad(g('upA'), 'Upload your Aadhar.');
      if (!g('fL').files.length) bad(g('upL'), 'Upload your shop license.');
      if (!g('fP').files.length) bad(g('upP'), 'Add a current photo.');
      if (errs.length) {
        smsg.textContent = errs[0] + (errs.length > 1 ? ' (' + (errs.length - 1) + ' more to fix)' : '');
        if (firstEl && firstEl.scrollIntoView) firstEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      smsg.textContent = '';
      try { sessionStorage.setItem('ausway_phone', g('ec').value); } catch (e) {}
      go('otp.html');
    });
  }

  /* ============================== DASHBOARD ============================ */
  if (page === 'dashboard') {
    var pNew = $('#pNew'), pCalc = $('#pCalc');
    $$('[data-view]').forEach(function (b) {
      b.addEventListener('click', function () {
        go('orders.html?n=' + encodeURIComponent(b.dataset.name) + '&oid=' + encodeURIComponent(b.dataset.oid) + '&amt=' + encodeURIComponent(b.dataset.amt.replace(/\s/g, '')));
      });
    });
    $$('[data-card]').forEach(function (c) {
      c.addEventListener('click', function () {
        if (c.dataset.card === 'active') go('driver.html');
      });
    });
    $('[data-accept]').addEventListener('click', closePops);
    $('[data-reject]').addEventListener('click', closePops);
    // new-order popup appears once per login session
    var seen = false; try { seen = sessionStorage.getItem('ausway_new_order') === '1'; } catch (e) {}
    if (!seen) {
      setTimeout(function () { openPop(pNew); }, 800);
      try { sessionStorage.setItem('ausway_new_order', '1'); } catch (e) {}
    }
  }

  /* ========== medicine row builder (calculator + add medicine) ========== */
  function MedForm(pop, mode) {
    var host = $('[data-rows]', pop), shifts = [];
    var base = mode === 'calc' ? { top: 148, pitch: 108, popH: 654, inH: 605 } : { top: 150, pitch: 107, popH: 656, inH: 608 };
    var cols = mode === 'calc'
      ? { name: [39, 144], step: [194, 60], amt: [266, 121], x: [393, 60] }
      : { name: [39, 144], step: [194, 60], amt: [406, 121], cat: [272, 121] };
    ['[data-add]', '[data-tot]', '[data-done]', '[data-msg]', '.addlink'].forEach(function () {});
    $$('[data-add],[data-tot],[data-done],[data-msg]', pop).concat($$('div[style*="Total:"]', pop)).forEach(function (el) {
      shifts.push({ el: el, top: parseFloat(el.style.top) });
    });
    var totalRow = $$('div', pop).filter(function (d) { return d.firstChild && d.firstChild.nodeType === 1 && d.firstChild.textContent === 'Total:' && d.querySelector('[data-f=total]') && mode === 'add'; })[0];
    if (totalRow) shifts.push({ el: totalRow, top: parseFloat(totalRow.style.top) });
    var inner = $('.in', pop);
    var rows = [];
    function mk(tag, cls, st) { var e = document.createElement(tag); if (cls) e.className = cls; if (st) e.style.cssText = st; return e; }
    function addRow() {
      var i = rows.length, top = base.top + i * base.pitch;
      var wrap = mk('div', 'mrow', 'position:absolute;left:0;top:0;width:100%');
      var lbl = mk('div', 'lbl', 'position:absolute;left:36px;top:' + (top - 9) + 'px;font-size:16px;color:#1c1b1f');
      lbl.textContent = 'Medicine ' + (i + 1) + ':';
      var ft = top + 33;
      var name = mk('input', 'inp', 'position:absolute;left:' + cols.name[0] + 'px;top:' + ft + 'px;width:' + cols.name[1] + 'px;height:42px;font-size:17px;padding:0 12px');
      name.placeholder = 'medicine...'; name.maxLength = 40; name.setAttribute('aria-label', 'Medicine ' + (i + 1));
      var stp = mk('div', 'stp', 'position:absolute;left:' + cols.step[0] + 'px;top:' + (ft + 9) + 'px;width:' + cols.step[1] + 'px');
      var minus = mk('button'); minus.type = 'button'; minus.textContent = '-'; minus.setAttribute('aria-label', 'Decrease');
      var qty = mk('span'); qty.textContent = '5';
      var plus = mk('button'); plus.type = 'button'; plus.textContent = '+'; plus.setAttribute('aria-label', 'Increase');
      stp.appendChild(minus); stp.appendChild(qty); stp.appendChild(plus);
      var amt = mk('input', 'inp', 'position:absolute;left:' + cols.amt[0] + 'px;top:' + ft + 'px;width:' + cols.amt[1] + 'px;height:42px;font-size:17px;padding:0 12px');
      amt.placeholder = '\u20B9...'; amt.inputMode = 'decimal'; amt.setAttribute('aria-label', 'Amount ' + (i + 1));
      var extra = null;
      if (mode === 'calc') {
        extra = mk('input', 'inp', 'position:absolute;left:' + cols.x[0] + 'px;top:' + ft + 'px;width:' + cols.x[1] + 'px;height:42px;font-size:17px;padding:0 8px;text-align:center');
        extra.inputMode = 'decimal'; extra.setAttribute('aria-label', 'Tax % ' + (i + 1));
      } else {
        extra = mk('input', 'inp', 'position:absolute;left:' + cols.cat[0] + 'px;top:' + ft + 'px;width:' + cols.cat[1] + 'px;height:42px;font-size:17px;padding:0 12px');
        extra.maxLength = 20; extra.setAttribute('aria-label', 'Category ' + (i + 1));
      }
      [amt].concat(mode === 'calc' ? [extra] : []).forEach(function (el) {
        el.addEventListener('input', function () {
          var v = el.value.replace(/[^\d.]/g, ''); var p = v.split('.'); if (p.length > 2) v = p[0] + '.' + p.slice(1).join('');
          if (el === extra && parseFloat(v) > 100) v = '100';
          if (v !== el.value) el.value = v;
          el.classList.remove('err'); recalc();
        });
      });
      name.addEventListener('input', function () { name.classList.remove('err'); });
      extra.addEventListener('input', function () { extra.classList.remove('err'); });
      minus.addEventListener('click', function () { var q = +qty.textContent; if (q > 1) qty.textContent = q - 1; recalc(); });
      plus.addEventListener('click', function () { var q = +qty.textContent; if (q < 9999) qty.textContent = q + 1; recalc(); });
      [lbl, name, stp, amt, extra].forEach(function (e) { wrap.appendChild(e); });
      host.appendChild(wrap);
      rows.push({ name: name, qty: qty, amt: amt, extra: extra });
      relayout();
    }
    function relayout() {
      var d = (rows.length - 2) * base.pitch;
      pop.style.height = (base.popH + d) + 'px';
      if (inner) inner.style.height = (base.inH + d) + 'px';
      shifts.forEach(function (s) { s.el.style.top = (s.top + d) + 'px'; });
    }
    function recalc() {
      var total = 0, gst = 0;
      rows.forEach(function (r) {
        var line = (+r.qty.textContent) * (parseFloat(r.amt.value) || 0);
        total += line;
        if (mode === 'calc') gst += line * (parseFloat(r.extra.value) || 0) / 100;
      });
      var cg = gst / 2;
      var set = function (k, v) { var e = $('[data-f=' + k + ']', pop); if (e) e.textContent = money(v); };
      set('total', total);
      if (mode === 'calc') { set('gst', gst); set('cgst', cg); set('grand', total + gst + cg); }
    }
    function reset() { host.innerHTML = ''; rows.length = 0; addRow(); addRow(); recalc(); var m = $('[data-msg]', pop); if (m) m.textContent = ''; }
    $('[data-add]', pop).addEventListener('click', function () { if (rows.length < 12) addRow(); });
    reset();
    return { rows: rows, reset: reset, relayout: relayout, recalc: recalc };
  }

  var calc;
  if (page === 'dashboard') {
    calc = MedForm($('#pCalc'), 'calc');
    $('#pCalc [data-done]').addEventListener('click', function () { closePops(); });
    $('#pCalc [data-close]').addEventListener('click', function () { });
  }

  /* ================================ ORDERS ============================= */
  if (page === 'orders') {
    wireFilter();
    var pOrder = $('#pOrder');
    function showOrder(o) {
      $$('[data-o]', pOrder).forEach(function (e) { if (o[e.dataset.o]) e.textContent = o[e.dataset.o]; });
      openPop(pOrder);
    }
    $$('[data-eye]').forEach(function (b) {
      b.addEventListener('click', function () {
        showOrder({ n: b.dataset.n, oid: b.dataset.oid, amt: b.dataset.amt, d: b.dataset.d, t: b.dataset.t });
      });
    });
    var qs = new URLSearchParams(location.search);
    if (qs.get('oid')) {
      // arrived from the dashboard "View" button
      showOrder({ n: qs.get('n'), oid: qs.get('oid'), amt: (qs.get('amt') || '').replace('\u20B9', '\u20B9') });
    }
    $$('[data-img]').forEach(function (b) {
      b.addEventListener('click', function () { $(b.dataset.img === 'bill' ? '#imgBill' : '#imgPresc').classList.add('show'); });
    });
    $$('.imgpop').forEach(function (p) {
      p.addEventListener('click', function (e) { if (e.target === p) p.classList.remove('show'); });
      $('[data-imgclose]', p).addEventListener('click', function () { p.classList.remove('show'); });
    });
  }

  /* =============================== INVENTORY =========================== */
  if (page === 'inventory') {
    wireFilter();
    var pAdd = $('#pAdd'), form = MedForm(pAdd, 'add'), tbody = $('#rows');
    $('[data-open-add]').addEventListener('click', function () { form.reset(); openPop(pAdd); form.relayout(); });
    $('[data-done]', pAdd).addEventListener('click', function () {
      var m = $('[data-msg]', pAdd), ok = true, any = false;
      form.rows.forEach(function (r) {
        var filled = r.name.value.trim() || r.extra.value.trim() || r.amt.value;
        [r.name, r.extra, r.amt].forEach(function (e) { e.classList.remove('err'); });
        if (!filled) return;
        any = true;
        if (!r.name.value.trim()) { r.name.classList.add('err'); ok = false; }
        if (!r.extra.value.trim()) { r.extra.classList.add('err'); ok = false; }
        if (!(parseFloat(r.amt.value) > 0)) { r.amt.classList.add('err'); ok = false; }
      });
      if (!any) { m.textContent = 'Enter at least one medicine.'; form.rows[0].name.classList.add('err'); return; }
      if (!ok) { m.textContent = 'Fill in the medicine, category and amount.'; return; }
      m.textContent = '';
      form.rows.forEach(function (r) {
        if (!r.name.value.trim()) return;
        var stock = +r.qty.textContent, cls = stock === 0 ? 's-bad' : (stock < 50 ? 's-orange' : 's-ok'), st = stock === 0 ? 'Out' : (stock < 50 ? 'Low' : 'In Stock');
        var row = document.createElement('div');
        row.className = 'row r sm';
        row.setAttribute('data-row', ''); row.setAttribute('data-text', (r.name.value + ' ' + r.extra.value).toLowerCase());
        [r.name.value.trim(), r.extra.value.trim(), '-', stock, money(parseFloat(r.amt.value)), st].forEach(function (v, i) {
          var s = document.createElement('span'); s.textContent = v; if (i === 5) s.className = cls; row.appendChild(s);
        });
        tbody.appendChild(row);
      });
      closePops();
    });
  }

  /* ================================ REPORTS ============================ */
  if (page === 'reports') {
    $$('[data-tab]').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('.rp').forEach(function (s) { s.classList.remove('show'); });
        $('#rp-' + b.dataset.tab).classList.add('show');
        var m = $('.main'); if (m) m.scrollTop = 0;
      });
    });
    $$('[data-export]').forEach(function (b) {
      b.addEventListener('click', function () {
        var sec = b.closest('.rp'), tbl = $('[data-table]', sec), out = [];
        $$('.row', tbl).forEach(function (r) {
          out.push($$('span', r).map(function (s) { return '"' + s.textContent.replace(/"/g, '""') + '"'; }).join(','));
        });
        var blob = new Blob([out.join('\n')], { type: 'text/csv' }), a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'ausway-report-' + sec.id.replace('rp-', '') + '.csv';
        document.body.appendChild(a); a.click(); a.remove();
      });
    });
  }

  /* ========================= NOTIFICATIONS / SETTINGS ================== */
  if (page === 'notifications') {
    wireFilter();
    $$('[data-ntab]').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('[data-ntab]').forEach(function (o) { o.classList.remove('on'); });
        b.classList.add('on');
      });
    });
    var back = $('[data-back]');
    back.addEventListener('click', function (e) {
      if (history.length > 1 && document.referrer && document.referrer.indexOf(location.host) > -1 || (document.referrer && location.protocol === 'file:')) {
        e.preventDefault(); history.back();
      }
    });
  }

  /* ================================ DRIVER ============================= */
  if (page === 'driver') {
    wireFilter();
    var pDrv = $('#pDrv');
    $$('[data-eye]').forEach(function (b) {
      b.addEventListener('click', function () { openPop(pDrv); $('#crumb').style.display = 'block'; });
    });
  }

  /* ============================ EDIT PROFILE ============================ */
  (function () {
    var panel = $('#prof'), pill = $('#pillBtn');
    if (!panel || !pill) return;
    var f = function (id) { return document.getElementById(id); };
    var KEY = 'ausway_profile', data = {};
    try { data = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
    function paint() {
      if (data.name) $('#pname').textContent = data.name;
      ['pName:name', 'pId:id', 'pMail:mail', 'pPhone:phone', 'pDob:dob', 'pGen:gen'].forEach(function (p) {
        var a = p.split(':'); if (data[a[1]]) f(a[0]).value = data[a[1]];
      });
      if (data.photo) f('pAv').innerHTML = '<img alt="Profile photo" src="' + data.photo + '">';
    }
    paint();
    function setOpen(on) { panel.classList.toggle('show', on); pill.classList.toggle('open', on); panel.setAttribute('aria-hidden', on ? 'false' : 'true'); }
    pill.addEventListener('click', function (e) { e.stopPropagation(); setOpen(!panel.classList.contains('show')); });
    pill.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(!panel.classList.contains('show')); } });
    panel.addEventListener('click', function (e) { e.stopPropagation(); });
    document.addEventListener('click', function () { setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
    digitsOnly(f('pPhone'), 15);
    // DOB: digits with automatic slashes (DD/MM/YYYY)
    f('pDob').addEventListener('input', function () {
      var d = this.value.replace(/\D/g, '').slice(0, 8), o = d.slice(0, 2);
      if (d.length > 2) o += '/' + d.slice(2, 4); if (d.length > 4) o += '/' + d.slice(4);
      this.value = o;
    });
    var photo = data.photo || '';
    f('pPhoto').addEventListener('change', function () {
      var file = this.files && this.files[0], msg = f('pMsg');
      if (!file) return;
      if (!/^image\//.test(file.type)) { msg.textContent = 'Please choose an image file.'; return; }
      var r = new FileReader();
      r.onload = function () { photo = r.result; f('pAv').innerHTML = '<img alt="Profile photo" src="' + photo + '">'; msg.textContent = ''; };
      r.readAsDataURL(file);
    });
    $$('#prof input,#prof select').forEach(function (el) { el.addEventListener('input', function () { el.classList.remove('err'); f('pMsg').textContent = ''; }); });
    f('pSave').addEventListener('click', function () {
      var errs = [];
      $$('#prof .err').forEach(function (e) { e.classList.remove('err'); });
      function bad(id, t) { f(id).classList.add('err'); errs.push(t); }
      if (!/^[A-Za-z][A-Za-z .'\-]*$/.test(f('pName').value.trim())) bad('pName', 'Enter a valid name (letters only).');
      if (!/^[A-Za-z0-9][A-Za-z0-9\-_]*$/.test(f('pId').value.trim())) bad('pId', 'Enter a valid user ID.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f('pMail').value.trim())) bad('pMail', 'Enter a valid email address.');
      if (!/^\d{7,15}$/.test(f('pPhone').value)) bad('pPhone', 'Enter a valid phone number (digits only).');
      var dob = f('pDob').value;
      if (dob) {
        var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dob), ok = false;
        if (m) { var d = +m[1], mo = +m[2], y = +m[3], dt = new Date(y, mo - 1, d); ok = dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d && dt <= new Date() && y >= 1900; }
        if (!ok) bad('pDob', 'Enter a valid date of birth (DD/MM/YYYY).');
      }
      if (!f('pGen').value) bad('pGen', 'Select your gender.');
      if (errs.length) { f('pMsg').textContent = errs[0]; return; }
      data = { name: f('pName').value.trim(), id: f('pId').value.trim(), mail: f('pMail').value.trim(), phone: f('pPhone').value, dob: dob, gen: f('pGen').value, photo: photo };
      try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { data.photo = ''; try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e2) {} }
      paint(); f('pMsg').textContent = ''; setOpen(false);
    });
  })();

  /* ============================== SETTINGS ============================== */
  var SKEY = 'ausway_settings';
  var DEF = { twofa: true, alerts: false, vis: true, loc: false, data: true, theme: 'light', lang: 'English', fs: 'Medium' };
  function loadSet() { var o = {}; try { o = JSON.parse(localStorage.getItem(SKEY) || '{}'); } catch (e) {} var r = {}; for (var k in DEF) r[k] = (k in o) ? o[k] : DEF[k]; return r; }
  function saveSet(o) { try { localStorage.setItem(SKEY, JSON.stringify(o)); } catch (e) {} }
  function applyFs(fs) { var v = fs === 'Small' ? 'small' : (fs === 'Large' ? 'large' : ''); if (v) document.documentElement.setAttribute('data-fs', v); else document.documentElement.removeAttribute('data-fs'); }
  applyFs(loadSet().fs);                                   // font size applies on every page

  if (page === 'settings') {
    var st = loadSet(), draft = {};
    function setTg(id, on) { var b = document.getElementById(id); b.classList.toggle('on', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); }
    function isOn(id) { return document.getElementById(id).classList.contains('on'); }
    var TG = { tg2fa: 'twofa', tgAlert: 'alerts', tgVis: 'vis', tgLoc: 'loc', tgData: 'data' };
    function paintAll() {
      Object.keys(TG).forEach(function (id) { setTg(id, !!st[TG[id]]); });
      $$('[data-theme]').forEach(function (c) { var on = c.dataset.theme === st.theme; c.classList.toggle('sel', on); c.setAttribute('aria-checked', on ? 'true' : 'false'); });
      $$('[data-fs]').forEach(function (b) { b.classList.toggle('on', b.dataset.fs === st.fs); });
      $('#selLang').value = st.lang;
    }
    paintAll();
    function flash(id, text, ok) {
      var m = document.getElementById(id); m.textContent = text; m.classList.toggle('ok', !!ok);
      clearTimeout(flash.t); if (text) flash.t = setTimeout(function () { m.textContent = ''; }, 3000);
    }

    // ---- section switching
    var sitems = $$('.sitem');
    function showSec(k) {
      sitems.forEach(function (b) { b.classList.toggle('on', b.dataset.sec === k); });
      $$('.sp').forEach(function (s) { s.classList.toggle('show', s.id === 'sp-' + k); });
    }
    sitems.forEach(function (b) {
      b.addEventListener('click', function (e) {
        if (b.dataset.sec === 'account') {                 // Account -> the existing Edit Profile panel
          e.stopPropagation(); var p = $('#pillBtn'); if (p && !$('#prof').classList.contains('show')) p.click(); return;
        }
        showSec(b.dataset.sec);
      });
    });

    // ---- toggles (privacy toggles save instantly; security ones save with the button)
    Object.keys(TG).forEach(function (id) {
      document.getElementById(id).addEventListener('click', function () {
        var on = !isOn(id); setTg(id, on);
        if (id === 'tgVis' || id === 'tgLoc' || id === 'tgData') { st[TG[id]] = on; saveSet(st); flash('msgPriv', 'Preference saved', true); }
      });
    });

    // ---- password eye buttons
    $$('[data-eye-for]').forEach(function (b) {
      b.addEventListener('click', function () {
        var i = document.getElementById(b.dataset.eyeFor), show = i.type === 'password';
        i.type = show ? 'text' : 'password'; b.classList.toggle('on', show); b.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      });
    });
    ['pwCur', 'pwNew', 'pwCon'].forEach(function (id) { document.getElementById(id).addEventListener('input', function () { this.classList.remove('err'); flash('msgSec', ''); }); });
    function clearPw() { ['pwCur', 'pwNew', 'pwCon'].forEach(function (id) { var i = document.getElementById(id); i.value = ''; i.type = 'password'; i.classList.remove('err'); }); $$('.eye').forEach(function (e) { e.classList.remove('on'); }); }

    // ---- save / cancel
    $$('[data-save]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.dataset.save === 'security') {
          var cur = $('#pwCur'), nw = $('#pwNew'), cf = $('#pwCon'), any = cur.value || nw.value || cf.value, err = '', bad = null;
          [cur, nw, cf].forEach(function (i) { i.classList.remove('err'); });
          if (any) {
            if (!cur.value) { err = 'Enter your current password.'; bad = cur; }
            else if (nw.value.length < 8) { err = 'New password must be at least 8 characters.'; bad = nw; }
            else if (!/[A-Za-z]/.test(nw.value) || !/\d/.test(nw.value)) { err = 'New password needs letters and numbers.'; bad = nw; }
            else if (nw.value === cur.value) { err = 'New password must differ from the current one.'; bad = nw; }
            else if (cf.value !== nw.value) { err = 'Passwords do not match.'; bad = cf; }
          }
          if (bad) { bad.classList.add('err'); bad.focus(); flash('msgSec', err, false); return; }
          st.twofa = isOn('tg2fa'); st.alerts = isOn('tgAlert'); saveSet(st);
          clearPw(); flash('msgSec', any ? 'Password updated and changes saved' : 'Changes saved', true);
        } else {
          st.theme = ($('[data-theme].sel') || {}).dataset ? $('[data-theme].sel').dataset.theme : st.theme;
          st.fs = ($('[data-fs].on') || {}).dataset ? $('[data-fs].on').dataset.fs : st.fs;
          st.lang = $('#selLang').value; saveSet(st); applyFs(st.fs); flash('msgApp', 'Changes saved', true);
        }
      });
    });
    $$('[data-cancel]').forEach(function (b) {
      b.addEventListener('click', function () {
        st = loadSet(); paintAll(); applyFs(st.fs);
        if (b.dataset.cancel === 'security') { clearPw(); flash('msgSec', ''); } else flash('msgApp', '');
      });
    });

    // ---- appearance controls
    $$('[data-theme]').forEach(function (c) {
      c.addEventListener('click', function () { $$('[data-theme]').forEach(function (o) { var on = o === c; o.classList.toggle('sel', on); o.setAttribute('aria-checked', on ? 'true' : 'false'); }); });
    });
    $$('[data-fs]').forEach(function (b) {
      b.addEventListener('click', function () { $$('[data-fs]').forEach(function (o) { o.classList.toggle('on', o === b); }); applyFs(b.dataset.fs); });   // live preview
    });

    // ---- data download / delete account
    $('#btnDl').addEventListener('click', function () {
      var prof = {}; try { prof = JSON.parse(localStorage.getItem('ausway_profile') || '{}'); } catch (e) {}
      delete prof.photo;
      var blob = new Blob([JSON.stringify({ profile: prof, settings: st }, null, 2)], { type: 'application/json' }), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'ausway-personal-data.json'; document.body.appendChild(a); a.click(); a.remove();
      flash('msgPriv', 'Your data has been downloaded', true);
    });
    var dlg = $('#cdlg');
    function dlgOpen(on) { dlg.classList.toggle('show', on); $('#veil').classList.toggle('show', on); dlg.setAttribute('aria-hidden', on ? 'false' : 'true'); }
    $('#btnDel').addEventListener('click', function () { dlgOpen(true); });
    $('#cdNo').addEventListener('click', function () { dlgOpen(false); });
    $('#veil').addEventListener('click', function () { dlgOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') dlgOpen(false); });
    $('#cdYes').addEventListener('click', function () { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} go('login.html'); });

    // ---- search settings: filters the section list, jumps to the first match
    var q = $('#q');
    q.addEventListener('input', function () {
      var t = q.value.trim().toLowerCase(), first = null, shown = 0;
      sitems.forEach(function (b) {
        var sec = $('#sp-' + b.dataset.sec), hay = (b.textContent + ' ' + (sec ? (sec.getAttribute('data-keys') || '') + ' ' + sec.textContent : '')).toLowerCase();
        var ok = !t || hay.indexOf(t) > -1;
        b.style.display = ok ? '' : 'none'; if (ok) { shown++; if (!first) first = b.dataset.sec; }
      });
      $('#snone').style.display = shown ? 'none' : 'block';
      if (t && first) { var cur = $('.sitem.on'); if (!cur || cur.style.display === 'none') showSec(first); }
    });
    var back = $('[data-back]');
    back.addEventListener('click', function (e) {
      if (history.length > 1 && document.referrer) { e.preventDefault(); history.back(); }
    });
  }
})();
