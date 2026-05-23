(async function() {
    console.clear();
    console.log("═══ MiMo Studio Pro Scraper v4.0 Active ═══");
    
    const wait = ms => new Promise(res => setTimeout(res, ms));
    
    // Mount Status UI Overlay Box
    let old = document.getElementById('mimo-pro-panel');
    if (old) old.remove();
    let p = document.createElement('div');
    p.id = 'mimo-pro-panel';
    p.style.cssText = 'position:fixed;bottom:0;left:0;right:0;height:40%;background:#0d1117;color:#58a6ff;font:12px monospace;z-index:9999999;padding:15px;overflow-y:auto;border-top:3px solid #ff9e3b;box-shadow:0 -5px 20px rgba(0,0,0,0.5);';
    document.body.appendChild(p);

    function displayLog(text, color) {
        p.innerHTML += `<div style="color:${color || '#c9d1d9'}">> ${text}</div>`;
        p.scrollTop = p.scrollHeight;
    }

    displayLog("Analyzing MiMo Studio Layout Tree...", "#ff9e3b");

    // 1. Locate and isolate the authentic Sidebar Chat List Nodes
    let navElements = Array.from(document.querySelectorAll('aside *, nav *, [class*="sidebar"] *, [class*="history"] *'));
    let validSidebarItems = [];
    
    navElements.forEach(el => {
        if (el.children.length > 1) return;
        let text = el.innerText ? el.innerText.trim() : "";
        if (text.length > 2 && text.length < 100) {
            // Filter out system control action strings
            if (!/^(history|mimo chat|free trial|new chat|clear|sign in|api|settings)$/i.test(text)) {
                if (el.getBoundingClientRect().left < window.innerWidth * 0.4) {
                    validSidebarItems.push(el);
                }
            }
        }
    });

    // Deduplicate history tracking items
    validSidebarItems = validSidebarItems.filter((el, idx, self) => self.findIndex(t => t.innerText === el.innerText) === idx);
    displayLog(`Discovered ${validSidebarItems.length} structural chat history items.`, "lime");

    let finalPayload = "===== XIAOMI MIMO STUDIO CHAT EXPORT =====\n\n";

    if (validSidebarItems.length === 0) {
        displayLog("No multi-chat sidebar entries active. Falling back to targeted current view capture...", "orange");
        await processScrollHistory();
        finalPayload += `===== ACTIVE CONVERSATION SESSION =====\n\n${scrapeActiveMessages()}`;
    } else {
        // 2. Core Orchestrator: Auto-navigate sequentially through found history logs
        for (let i = 0; i < validSidebarItems.length; i++) {
            let sessionTitle = validSidebarItems[i].innerText.trim().split('\n')[0];
            displayLog(`[${i + 1}/${validSidebarItems.length}] Navigating to -> "${sessionTitle}"`, "#58a6ff");

            validSidebarItems[i].click();
            await wait(3000); // Wait for async database queries to populate the view layout

            await processScrollHistory();
            let parsedSession = scrapeActiveMessages();
            
            if (parsedSession.trim().length > 10) {
                finalPayload += `===== CHAT ${i + 1}: ${sessionTitle} =====\n\n${parsedSession}\n`;
            }
        }
    }

    // 3. Compile Data Streams & Save to Local Device Storage
    var blob = new Blob([finalPayload], { type: 'text/plain;charset=utf-8' });
    var dlLink = document.createElement('a');
    dlLink.href = URL.createObjectURL(blob);
    dlLink.download = 'mimo-comprehensive-chats.txt';
    document.body.appendChild(dlLink);
    dlLink.click();
    dlLink.remove();
    displayLog("EXPORT SUCCESSFUL: Clean output file downloaded successfully!", "lime");

    // --- Helper Logic Engines ---

    async function processScrollHistory() {
        displayLog("Unrolling deep message scroll vectors...", "#949494");
        let scroller = document.querySelector('[class*="chat-scroll"], [class*="message-list"], main') || window;
        let lastScrollHeight = scroller === window ? document.documentElement.scrollHeight : scroller.scrollHeight;
        
        for (let pass = 0; pass < 12; pass++) {
            if (scroller === window) window.scrollTo(0, 0);
            else scroller.scrollTop = 0;
            await wait(800);
            let currentScrollHeight = scroller === window ? document.documentElement.scrollHeight : scroller.scrollHeight;
            if (currentScrollHeight === lastScrollHeight) break;
            lastScrollHeight = currentScrollHeight;
        }
    }

    function scrapeActiveMessages() {
        let conversationBlockText = "";
        
        // Target structural message wrapper rows instead of stripping general text fragments
        let messageRows = document.querySelectorAll('[class*="message-item"], [class*="chat-item"], [class*="bubble-container"], [class*="msg-row"], article');
        
        if (messageRows.length === 0) {
            // Layout Fallback Rule: Pull straight from raw semantic block structures if exact row hooks missed
            messageRows = document.querySelectorAll('main div > div, [role="main"] div > div');
        }

        messageRows.forEach(row => {
            let rawString = (row.innerText || '').trim();
            if (rawString.length < 2) return;
            
            // Bypass global boilerplate blocks completely
            if (/^(Chat, create, and unleash|Ready to explore|Try asking:|Model demo platform)/i.test(rawString)) return;

            // Classify structural sender path layers
            let htmlSignature = row.outerHTML.toLowerCase();
            let styles = window.getComputedStyle(row);
            let isUserBubble = htmlSignature.includes('user') || 
                               htmlSignature.includes('human') || 
                               styles.textAlign === 'right' || 
                               styles.alignSelf === 'flex-end';

            if (isUserBubble) {
                // Strip sub-actions or button strings out of the pure message body
                let formattedUserText = rawString.replace(/^(edit|copy|delete)$/gmi, '').trim();
                if (formattedUserText) {
                    conversationBlockText += `USER:\n${formattedUserText}\n\n`;
                }
            } else {
                // AI Response Processing Path: Extract internal target segments explicitly
                let blockOutput = "";
                
                // Explicit Selector Capture Strategy for the Hidden 'Thinking Mode' Dropdown Container Modules
                let deepThinkingNodes = row.querySelectorAll('[class*="think"], [class*="reasoning"], [class*="thought"], summary');
                deepThinkingNodes.forEach(thinkNode => {
                    let textSegment = (thinkNode.innerText || '').trim();
                    // Clean out common UI toggle commands like "Expand Thinking Process"
                    let cleanThought = textSegment.replace(/^(thinking|expand thinking|thought process|hide reasoning)/i, '').trim();
                    if (cleanThought.length > 2) {
                        blockOutput += `[THINKING PROCESS]:\n${cleanThought}\n\n`;
                    }
                    // Destructive node modification to keep the thinking data from leaking into the final text block below
                    thinkNode.remove();
                });

                // Capture the remaining message content
                let finalAnswerText = (row.innerText || '').replace(/^(copy|regenerate|share|stop|citation)/gmi, '').trim();
                if (finalAnswerText.length > 0) {
                    blockOutput += `AI:\n${finalAnswerText}\n\n`;
                }

                if (blockOutput.trim().length > 0) {
                    conversationBlockText += blockOutput;
                }
            }
        });

        return conversationBlockText;
    }
})();
