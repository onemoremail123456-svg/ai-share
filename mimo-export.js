(function(){
'use strict';

var old = document.getElementById('uni-panel');
if(old) old.remove();

var P = document.createElement('div');
P.id = 'uni-panel';
P.style.cssText = 'position:fixed;bottom:0;left:0;right:0;height:45%;background:#0d1117;color:#c9d1d9;font:11px monospace;z-index:2147483647;padding:12px;overflow-y:auto;border-top:3px solid #58a6ff;box-shadow:0 -8px 24px rgba(0,0,0,0.6);';
document.body.appendChild(P);

function log(t, c){
  var d = document.createElement('div');
  d.style.cssText = 'color:' + (c || '#c9d1d9') + ';margin-bottom:2px;';
  d.textContent = t;
  P.appendChild(d);
  P.scrollTop = P.scrollHeight;
}

const wait = ms => new Promise(res => setTimeout(res, ms));

async function main() {
  log("═══ MiMo Batch Engine v3.0 ═══", "#58a6ff");
  
  // 1. Target all sidebar elements based on the exact titles found in your text file
  var allElements = Array.from(document.querySelectorAll('div, p, span, li, a'));
  var sidebarItems = allElements.filter(function(el) {
    if (el.children.length > 1) return false;
    var txt = el.innerText ? el.innerText.trim() : '';
    // This matches the exact history titles discovered in your log file
    return el.getBoundingClientRect().left < window.innerWidth * 0.4 && 
           txt.length > 3 && 
           !/^(History|MiMo Chat|Free Trial)$/i.test(txt);
  });

  // Deduplicate nested nodes
  sidebarItems = sidebarItems.filter((el, idx, self) => self.findIndex(t => t.innerText === el.innerText) === idx);

  log("Identified " + sidebarItems.length + " individual chat history slots.");

  if (sidebarItems.length === 0) {
    log("Directly scraping currently active text frame...", "orange");
    var singleData = extractVisibleChat();
    downloadFile("mimo-single-chat.txt", singleData);
    return;
  }

  var masterPayload = "===== XIAOMI MIMO MULTI-CHAT EXPORT =====\n\n";
  var processedCount = 0;

  // 2. Loop and navigate through the target chats automatically
  for (var i = 0; i < sidebarItems.length; i++) {
    try {
      var title = sidebarItems[i].innerText.trim().split('\n')[0];
      log("\n[" + (i + 1) + "/" + sidebarItems.length + "] Switching to: " + title, "#58a6ff");
      
      sidebarItems[i].click();
      await wait(3000); // Allow new DOM fragments to compile and clear transitions

      // Scroll up to catch long history tracks
      var chatContainer = document.querySelector('[class*="chat"], [class*="message"], main') || window;
      if (chatContainer === window) window.scrollTo(0, 0);
      else chatContainer.scrollTop = 0;
      await wait(1000);

      var chatContent = extractVisibleChat();
      if (chatContent.trim().length > 0) {
        masterPayload += "===== CHAT " + (i + 1) + ": " + title + " =====\n\n" + chatContent + "\n";
        processedCount++;
      }
    } catch (err) {
      log("Item error processing index " + i + ": " + err.message, "red");
    }
  }

  // 3. Final Export Output Sequence
  if (processedCount > 0) {
    downloadFile("mimo-all-chats.txt", masterPayload);
    log("\nSUCCESS: Compiled " + processedCount + " histories into file!", "lime");
  } else {
    log("\nProcessing complete but output string generation failed.", "red");
  }
}

function extractVisibleChat() {
  var output = "";
  var seenBlocks = new Set();
  
  // Targets standard Markdown content containers, chat text elements, and text bubbles
  var textElements = document.querySelectorAll('p, pre, code, span, div, article, [class*="markdown"]');
  
  textElements.forEach(function(el) {
    if (el.children.length > 2) return; // Drop broad outer structural elements
    
    var rawText = (el.innerText || el.textContent || '').trim();
    
    // Hard filter out global page layout boilerplate strings found in your log text file
    if (rawText.length < 2 || seenBlocks.has(rawText)) return;
    if (/^(Chat, create, and unleash|Ready to explore endless|Try asking:|What to do if you can't stop|Is art still art|How can I eat something|Model demo platform|AI-generated content only|Citation sources|History|MiMo Chat|Free Trial)/i.test(rawText)) return;
    if (/^(stop|regenerate|clear|share|copy|delete|\?)$/i.test(rawText)) return;

    seenBlocks.add(rawText);

    // Identify message author roles based on system styling standards
    var computed = window.getComputedStyle(el);
    var isUserMsg = computed.textAlign === 'right' || 
                    computed.alignSelf === 'flex-end' || 
                    el.className.toString().toLowerCase().includes('user') ||
                    (el.parentElement && el.parentElement.className.toString().toLowerCase().includes('user'));

    if (isUserMsg) {
      output += "USER:\n" + rawText + "\n\n";
    } else {
      output += "AI:\n" + rawText + "\n\n";
    }
  });

  return output;
}

function downloadFile(filename, content) {
  var blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(function() { a.remove(); URL.revokeObjectURL(url); }, 1500);
}

main().catch(function(e) {
  log("Fatal Engine Break: " + e.message, "red");
});

})();
