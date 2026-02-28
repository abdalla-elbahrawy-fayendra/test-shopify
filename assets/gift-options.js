/* gift-options.js (Dawn 15.1.0)
   Handles modal open/close, toolbar actions, counters, color/emoji pickers,
   HTML hydration (decode escaped), paste/drop clamping to 150 chars,
   persistent color via inline markup, and saving/clearing Shopify cart attributes.
*/
(function () {
  function qs(id) { return document.getElementById(id); }
  function show(el, mode) { el && (el.style.display = mode); }
  function hide(el) { el && (el.style.display = 'none'); }
  var prevDocOverflow;
  var prevBodyOverflow;
  function lockScroll(lock) {
    if (lock) {
      if (prevDocOverflow === undefined) prevDocOverflow = document.documentElement.style.overflow;
      if (prevBodyOverflow === undefined) prevBodyOverflow = document.body.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    } else {
      if (prevDocOverflow !== undefined) document.documentElement.style.overflow = prevDocOverflow;
      if (prevBodyOverflow !== undefined) document.body.style.overflow = prevBodyOverflow;
      prevDocOverflow = undefined;
      prevBodyOverflow = undefined;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    var btn = qs('GiftOpenBtn');
    var modal = qs('GiftModal');
    var backdrop = qs('GiftBackdrop');
    var closeBtn = qs('GiftCloseBtn');
    var cancelBtn = qs('GiftCancelBtn');
    var saveBtn = qs('GiftSaveBtn');
    var clearBtn = qs('GiftClearBtn');
    var cardChk = qs('GiftCardChk');
    var wrapChk = qs('GiftWrapChk');
    var ribbonChk = qs('GiftRibbonChk');
    var ribbonMsgWrap = qs('GiftRibbonMsgWrap');
    var ribbonMsg = qs('GiftRibbonMsg');
    var ribbonMsgCount = qs('RibbonMsgCount');
    var editorWrap = qs('GiftEditorWrap');
    var editable = qs('GiftEditable');

    var sender = qs('GiftSender');
    var senderCount = qs('SenderCount');
    var msgCount = qs('MsgCount');

    // ===== Hydrate: decode any HTML-escaped content so rich text renders =====
    function decodeHtmlEntities(str){
      if (!str || typeof str !== 'string') return str || '';
      var ta = document.createElement('textarea');
      ta.innerHTML = str;
      return ta.value;
    }
    function hydrateEditableFromEscaped(){
      if (!editable) return;
      var raw = editable.innerHTML || '';
      if (raw.indexOf('&lt;') !== -1 || raw.indexOf('&amp;lt;') !== -1){
        editable.innerHTML = decodeHtmlEntities(raw);
      }
    }
    hydrateEditableFromEscaped();

    // ===== Limits & counters: visible chars only =====
    var MAX_CHARS = 150;
    function visibleLen() {
      return (editable && (editable.innerText || editable.textContent) || '').length;
    }
    function updateCounts() {
      if (sender && senderCount) senderCount.textContent = String(sender.value.length);
      if (editable && msgCount) msgCount.textContent = String(visibleLen());
      if (ribbonMsg && ribbonMsgCount) ribbonMsgCount.textContent = String(ribbonMsg.value.length);
    }

    // Enforce during typing
    if (editable) {
      editable.addEventListener('beforeinput', function(e){
        var insertingText = (e.inputType === 'insertText' || e.inputType === 'insertCompositionText');
        if (insertingText && visibleLen() >= MAX_CHARS) {
          e.preventDefault();
        }
      });
    }

    // Hard clamp while preserving formatting
    function clampToMax() {
      if (!editable) return;
      var len = visibleLen();
      if (len <= MAX_CHARS) { updateCounts(); return; }
      var walker = document.createTreeWalker(editable, NodeFilter.SHOW_TEXT, null);
      var consumed = 0, endNode = null, endOffset = 0, node;
      while ((node = walker.nextNode())) {
        var next = consumed + node.nodeValue.length;
        if (next >= MAX_CHARS) { endNode = node; endOffset = MAX_CHARS - consumed; break; }
        consumed = next;
      }
      if (endNode) {
        var range = document.createRange();
        range.setStart(endNode, endOffset);
        range.setEndAfter(editable.lastChild);
        range.deleteContents();
      }
      updateCounts();
    }

    // Intercept paste/drop so user cannot exceed limit
    function moveCaretToEventPoint(target, e) {
      if (!target) return;
      var range = null;
      if (document.caretRangeFromPoint) {
        range = document.caretRangeFromPoint(e.clientX, e.clientY);
      } else if (document.caretPositionFromPoint) {
        var pos = document.caretPositionFromPoint(e.clientX, e.clientY);
        if (pos && pos.offsetNode) {
          range = document.createRange();
          range.setStart(pos.offsetNode, pos.offset);
          range.collapse(true);
        }
      } else if (e.rangeParent) {
        range = document.createRange();
        range.setStart(e.rangeParent, e.rangeOffset || 0);
        range.collapse(true);
      }
      if (range && !target.contains(range.startContainer)) {
        range = null;
      }
      if (!range) {
        range = document.createRange();
        range.selectNodeContents(target);
        range.collapse(false);
      }
      var selection = window.getSelection && window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }

    if (editable) {
      editable.addEventListener('paste', function (e) {
        e.preventDefault();
        var data = (e.clipboardData || window.clipboardData).getData('text/plain') || '';
        var remaining = Math.max(0, MAX_CHARS - visibleLen());
        if (remaining <= 0) return;
        document.execCommand('insertText', false, data.slice(0, remaining));
        clampToMax();
      });
      editable.addEventListener('drop', function (e) {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) { e.preventDefault(); return; }
        var text = e.dataTransfer ? e.dataTransfer.getData('text/plain') : '';
        if (!text) return;
        e.preventDefault();
        moveCaretToEventPoint(editable, e);
        var remaining = Math.max(0, MAX_CHARS - visibleLen());
        if (remaining <= 0) return;
        editable.focus();
        document.execCommand('insertText', false, text.slice(0, remaining));
        clampToMax();
      });
      editable.addEventListener('input', function(){ clampToMax(); });
    }

    if (!btn || !modal || !backdrop) return;

    function trapFocus(e){
      var focusables = modal.querySelectorAll('button, [href], input, select, textarea, [contenteditable="true"], [tabindex]:not([tabindex="-1"])');
      if (!focusables.length) return;
      var first = focusables[0], last = focusables[focusables.length - 1];
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    function openModal() {
      show(backdrop, 'block');
      show(modal, 'grid');
      lockScroll(true);
      modal.setAttribute('aria-hidden', 'false');
      hydrateEditableFromEscaped();
      (qs('GiftSender') || qs('GiftCloseBtn') || modal).focus();
      document.addEventListener('keydown', trapFocus);
    }
    function closeModal() {
      hide(backdrop);
      hide(modal);
      lockScroll(false);
      modal.setAttribute('aria-hidden', 'true');
      document.removeEventListener('keydown', trapFocus);
      btn && btn.focus();
    }

    btn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    backdrop.addEventListener('click', function (e) { if (e.target === backdrop) closeModal(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

    // Ensure modal/backdrop are direct children of <body> to avoid stacking-context traps
    if (modal && modal.parentNode !== document.body) document.body.appendChild(modal);
    if (backdrop && backdrop.parentNode !== document.body) document.body.appendChild(backdrop);


    function toggleEditor() {
      if (!editorWrap) return;
      editorWrap.style.display = (cardChk && cardChk.checked) ? '' : 'none';
    }
    if (cardChk) cardChk.addEventListener('change', toggleEditor);
    toggleEditor();

    function toggleRibbonMessage() {
      if (!ribbonMsgWrap) return;
      ribbonMsgWrap.style.display = (ribbonChk && ribbonChk.checked) ? '' : 'none';
    }
    if (ribbonChk) ribbonChk.addEventListener('change', toggleRibbonMessage);
    toggleRibbonMessage();

    if (sender) {
      sender.addEventListener('input', function () {
        if (sender.value.length > 100) sender.value = sender.value.slice(0, 100);
        updateCounts();
      });
    }
    if (ribbonMsg) {
      ribbonMsg.addEventListener('input', function () {
        if (ribbonMsg.value.length > 50) ribbonMsg.value = ribbonMsg.value.slice(0, 50);
        updateCounts();
      });
    }
    if (editable) editable.addEventListener('input', updateCounts);
    updateCounts();

    // ===== Toolbar: bold/italic/underline =====
    document.querySelectorAll('.gift-toolbar [data-cmd]').forEach(function (el) {
      el.addEventListener('click', function () {
        var cmd = el.getAttribute('data-cmd');
        document.execCommand(cmd, false, null);
        el.setAttribute('aria-pressed', el.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
        updateCounts();
      });
    });

    // ===== Font size =====
    var fontSel = document.getElementById('GiftFontSize');
    var baseFontSize;
    function computeBaseFontSize(){
      if (!editable) return '';
      if (baseFontSize) return baseFontSize;
      var computed = window.getComputedStyle(editable).fontSize;
      baseFontSize = computed || '';
      return baseFontSize;
    }

    function applyFontSizePreset(preset){
      if (!editable) return;
      var base = computeBaseFontSize();
      if (!base) return;
      var match = base.match(/([0-9.]+)([a-z%]+)/i);
      if (!match) {
        if (preset === 'large') {
          editable.style.setProperty('font-size', '1.18em');
        } else {
          editable.style.removeProperty('font-size');
        }
        return;
      }
      var baseValue = parseFloat(match[1]);
      var unit = match[2];
      if (!baseValue || !unit) return;
      if (preset === 'default') {
        editable.style.removeProperty('font-size');
        return;
      }
      if (preset !== 'large') {
        editable.style.removeProperty('font-size');
        return;
      }
      editable.style.setProperty('font-size', (baseValue * 1.18) + unit);
    }

    if (fontSel) {
      computeBaseFontSize();
      applyFontSizePreset(fontSel.value || 'default');
      fontSel.addEventListener('change', function () {
        applyFontSizePreset(fontSel.value || 'default');
      });
    }

    // ===== Color palette (persist color inline so it saves/loads) =====
    var colorBtn = document.getElementById('GiftColorBtn');
    var colorPop = document.getElementById('GiftColorPop');
    var colorGrid = colorPop ? colorPop.querySelector('.gift-color-grid') : null;
    var swatch = document.getElementById('GiftColorSwatch');
    var colors = ['#111111', '#444444', '#777777', '#b91c1c', '#2563eb', '#047857', '#b45309', '#7c3aed', '#d97706', '#dc2626', '#16a34a', '#0ea5e9']; // applies ONLY to selected text

    function applyColorToEditable(c) {
      if (!editable) return;
      var sel = window.getSelection && window.getSelection();
      var hasSelection = !!(sel && sel.rangeCount && !sel.isCollapsed);
      if (!hasSelection) {
        // No selection: do nothing so color only applies to selected text
        // Optional UX nudge: briefly outline the editor
        editable.classList.add('outline-nudge');
        setTimeout(function(){ editable.classList.remove('outline-nudge'); }, 400);
        return;
      }
      // Ensure selection is inside the editor
      var range = sel.getRangeAt(0);
      if (!editable.contains(range.commonAncestorContainer)) return;
      editable.focus();
      document.execCommand('foreColor', false, c); // writes inline color into HTML
      if (swatch) swatch.style.setProperty('--sw', c);
    }

    if (colorGrid) {
      colors.forEach(function (c) {
        var d = document.createElement('button');
        d.type = 'button';
        d.className = 'gift-color-item';
        d.style.background = c;
        d.addEventListener('click', function () {
          applyColorToEditable(c);
          if (colorPop) colorPop.hidden = true;
          if (colorBtn) colorBtn.setAttribute('aria-expanded', 'false');
        });
        colorGrid.appendChild(d);
      });
    }
    if (colorBtn) {
      colorBtn.addEventListener('click', function () {
        if (!colorPop) return;
        colorPop.hidden = !colorPop.hidden;
        colorBtn.setAttribute('aria-expanded', String(!colorPop.hidden));
      });
    }

    // ===== Emoji picker =====
    var emojiBtn = document.getElementById('GiftEmojiBtn');
    var emojiPop = document.getElementById('GiftEmojiPop');
    var emojiGrid = emojiPop ? emojiPop.querySelector('.gift-emoji-grid') : null;
    var emojis = ['🎁','💖','✨','🎉','🎈','🎂','⭐','🌟','💐','🌹','🌸','💎','❤️','😍','🥰','😘','😊','🙏','👏','🙌','🤩','🥳','🫶','🌙','☀️','🍫','🍰','☕️'];
    if (emojiGrid) {
      emojis.forEach(function (e) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'gift-emoji-item';
        b.textContent = e;
        b.addEventListener('click', function () {
          if (editable) {
            editable.focus();
            document.execCommand('insertText', false, e);
          }
          if (emojiPop) emojiPop.hidden = true;
        });
        emojiGrid.appendChild(b);
      });
    }
    if (emojiBtn) {
      emojiBtn.addEventListener('click', function () {
        if (!emojiPop) return;
        emojiPop.hidden = !emojiPop.hidden;
      });
    }

    // ===== Save / Clear cart attributes =====
    function updateCartAttributes(attrs) {
      return fetch('/cart/update.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ attributes: attrs })
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        var messageText = (editable && (editable.innerText || editable.textContent) || '').slice(0, MAX_CHARS);
        var messageHTML = editable ? editable.innerHTML : '';
        var isWrap = !!(wrapChk && wrapChk.checked);
        var isRibbon = !!(ribbonChk && ribbonChk.checked); // ADD THIS LINE
        var hasSender = !!(sender && sender.value && sender.value.trim());
        var hasMessage = !!(messageText && messageText.trim());
        var isGiftCard = !!(cardChk && cardChk.checked) || hasSender || hasMessage;

        var attrs = {
          '_ldt_gw_giftwrap': isWrap ? 'Yes' : '',
          '_ldt_gw_information': (hasSender || hasMessage) ? 'sender,message' : '',

          'Gift wrapping': isWrap ? 'Yes' : '',
          'Gift ribbon': isRibbon ? 'Yes' : '', // ADD THIS LINE
          'Ribbon message': (ribbonMsg && ribbonMsg.value) ? ribbonMsg.value.trim() : '',
          'Gift card': isGiftCard ? 'Yes' : '',
          'Sender name': sender ? sender.value.trim() : '',
          'Card message': messageText || '',
          'Card message HTML': messageHTML || '',
          'Card message size': fontSel ? (fontSel.value || 'normal') : 'normal'
        };

        updateCartAttributes(attrs)
          .then(function () { location.reload(); })
          .catch(function () { closeModal(); });
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        updateCartAttributes({
          '_ldt_gw_giftwrap': '',
          '_ldt_gw_information': '',

          'Gift wrapping': '',
          'Gift ribbon': '', // ADD THIS LINE
          'Ribbon message': '',
          'Gift card': '',
          'Sender name': '',
          'Card message': '',
          'Card message HTML': '',
          'Card message size': 'normal'
        }).then(function () { location.reload(); });
      });
    }
  }
})();