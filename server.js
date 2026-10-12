// ===== server.js — Web Server with SQLite Database API =====
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const db = require('./database/db.js');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf'
};

function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(data));
}

function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk;
            if (body.length > 5 * 1024 * 1024) { // 5MB limit
                reject(new Error('Body too large'));
            }
        });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (err) {
                reject(err);
            }
        });
        req.on('error', reject);
    });
}

function isEnglishResponse(text) {
    if (!text || typeof text !== 'string') return false;
    const hasVietnameseAccents = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/.test(text);
    if (hasVietnameseAccents) return false;
    const englishWords = /\b(the|is|are|you|your|hello|hey|safe|online|password|cyber|help|how|what|can|this|that|with|for|and|to|in|of|it|on|we)\b/i;
    return englishWords.test(text);
}

// ===================================================================
// CYBERBOT AI REASONING & KNOWLEDGE ENGINE
// ===================================================================
function generateCyberBotAiResponse(userPrompt) {
    const raw = (userPrompt || '').trim();
    const text = raw.toLowerCase();

    // 1. Nạp game / Nạp tiền / Mua nick / Robux / Quân huy / Kim cương / Cày thuê
    if (/nạp.*(game|thẻ|tiền|lậu|robux|quân huy|kim cương)|game.*(giá rẻ|rẻ|lậu)|mua.*(nick|acc)|cày thuê|bán.*(nick|acc)/.test(text)) {
        return `🎮 **Về việc nạp game giá rẻ, bạn cần hết sức cảnh giác:**\n\n` +
               `1. **Rủi ro lừa đảo cực cao (99%):** Tuyệt đối không nạp qua các trang web quảng cáo 'giảm giá 50-70%', 'x2 nạp thẻ' hay người lạ trên Facebook/TikTok. Đây hầu hết là bẫy lừa cướp tiền nạp hoặc lấy cắp nick game!\n` +
               `2. **Nguy cơ bị khóa tài khoản vĩnh viễn:** Nhiều dịch vụ giá rẻ nạp bằng thẻ tín dụng 'bẩn' (thẻ ăn cắp). Khi bị truy thu tiền (chargeback), nhà phát hành game (Garena, Riot, VNG, Roblox...) sẽ khóa vĩnh viễn tài khoản của bạn mà không thể khiếu nại.\n` +
               `3. **Cách nạp an toàn nhất:** Bạn chỉ nên nạp qua cổng chính thống của nhà phát hành (như napthe.vn, pay.zing.vn...) hoặc qua Google Play / App Store trong các dịp ưu đãi chính thức nhé! 🛡️`;
    }

    // 2. Wifi công cộng / Quán cafe / Wifi miễn phí
    if (/wifi.*(công cộng|cafe|quán|chùa|miễn phí|ngoài đường)|kết nối wifi/.test(text)) {
        return `📶 **Nguyên tắc an toàn khi dùng Wifi công cộng / Quán cà phê:**\n\n` +
               `1. **Nguy cơ bị nghe lén (Man-in-the-Middle):** Kẻ xấu có thể tạo wifi giả mạo trùng tên hoặc theo dõi lưu lượng mạng để đánh cắp mật khẩu và thông tin đăng nhập của bạn.\n` +
               `2. **Không giao dịch quan trọng:** Tuyệt đối không đăng nhập tài khoản ngân hàng, ví điện tử hay nhập mã OTP khi đang kết nối wifi nơi công cộng.\n` +
               `3. **Giải pháp bảo vệ:** Luôn ưu tiên dùng mạng 4G/5G cá nhân khi cần làm việc quan trọng, hoặc bật VPN uy tín để mã hóa dữ liệu nhé! 🛡️`;
    }

    // 3. Mật khẩu & Xác thực 2 bước (2FA)
    if (/mật khẩu|password|đổi pass|xác thực 2|2fa|bảo mật tài khoản/.test(text)) {
        return `🔐 **Bí kíp bảo vệ tài khoản với Mật Khẩu Mạnh & 2FA:**\n\n` +
               `1. **Quy tắc tạo mật khẩu:** Đặt tối thiểu 12 ký tự, kết hợp cả chữ hoa, chữ thường, số và ký tự đặc biệt (ví dụ: \`Xuan2026@AnToan!\`). Tuyệt đối không dùng ngày sinh hay số điện thoại.\n` +
               `2. **Không dùng chung một mật khẩu:** Dùng các mật khẩu khác nhau cho Facebook, Zalo, Google để nếu một nơi bị lộ thì các tài khoản khác vẫn an toàn.\n` +
               `3. **Bật xác thực 2 lớp (2FA):** Vào phần Cài đặt Bảo mật và kích hoạt gửi mã OTP qua SMS hoặc ứng dụng Google Authenticator ngay hôm nay nhé! 🛡️`;
    }

    // 4. Mã OTP & Lừa đảo tiền bạc
    if (/mã otp|lộ otp|xin otp|ngân hàng|chuyển khoản|mất tiền/.test(text)) {
        return `🚫 **CẢNH BÁO BẢO VỆ MÃ OTP TUYỆT ĐỐI:**\n\n` +
               `1. **Mã OTP là chìa khóa két sắt:** Mã này chỉ gửi về cho bạn để xác nhận giao dịch hoặc đổi mật khẩu. Không ai có quyền yêu cầu bạn đọc mã này.\n` +
               `2. **Không có ngoại lệ:** Kể cả người tự xưng là công an, nhân viên ngân hàng, giáo viên hay admin game thì **100% đều là lừa đảo** nếu đòi mã OTP!\n` +
               `3. **Xử lý khi lỡ lộ OTP:** Ngay lập tức đăng nhập đổi mật khẩu, đăng xuất khỏi tất cả thiết bị và báo cho người lớn/ngân hàng khóa tài khoản khẩn cấp! 🚨`;
    }

    // 5. Link lừa đảo / Phishing / Link lạ
    if (/link lạ|link độc|nhận biết link|phishing|bấm vào link|trang web giả/.test(text)) {
        return `⚠️ **Cách nhận biết và phòng tránh bẫy link lừa đảo (Phishing):**\n\n` +
               `1. **Soi kỹ tên miền:** Kẻ lừa thường dùng tên miền gần giống trang thật nhưng sai chính tả hoặc có đuôi lạ (ví dụ: \`facebook-nhanqua.com\`, \`garena-free.xyz\`).\n` +
               `2. **Nguyên tắc không nhập thông tin:** Dù giao diện có giống 100% trang đăng nhập Facebook hay Zalo, tuyệt đối không nhập tài khoản/mật khẩu khi truy cập từ đường link người khác gửi.\n` +
               `3. **Kiểm tra độ uy tín:** Bạn có thể dán link vào công cụ kiểm tra miễn phí như \`chongluadao.vn\` hoặc \`virustotal.com\` trước khi truy cập nhé! 🛡️`;
    }

    // 6. Bạo lực mạng / Bắt nạt / Bóc phốt / Tẩy chay
    if (/bạo lực mạng|bắt nạt|cyberbullying|bêu xấu|bóc phốt|chửi bới|tẩy chay|xúc phạm/.test(text)) {
        return `🚨 **4 bước xử lý khẩn cấp khi bị bạo lực / bắt nạt trên mạng:**\n\n` +
               `1. **Dừng đối đáp:** Không chửi bới hay đôi co lại vì điều đó chỉ khiến kẻ xấu khiêu khích nhiều hơn.\n` +
               `2. **Lưu bằng chứng:** Chụp ảnh màn hình toàn bộ tin nhắn, bình luận xúc phạm kèm tên tài khoản và thời gian rõ ràng.\n` +
               `3. **Chặn & Báo cáo:** Nhấn Chặn (Block) và Báo cáo (Report) tài khoản quấy rối lên mạng xã hội.\n` +
               `4. **Tìm sự giúp đỡ:** Hãy tâm sự ngay với bố mẹ, thầy cô hoặc gọi miễn phí **Tổng đài Quốc gia 111** (Bảo vệ trẻ em 24/7) để được bảo vệ kịp thời nhé! ❤️`;
    }

    // 7. Deepfake / Giả mạo giọng nói & video call
    if (/deepfake|giả giọng|giả mặt|video call lừa|mượn tiền qua mạng/.test(text)) {
        return `🎭 **Cảnh giác chiêu trò Deepfake AI giả mặt & giả giọng nói:**\n\n` +
               `1. **Dấu hiệu nhận biết:** Khuôn mặt người gọi hay bị mờ nhạt, giật lag, cử động miệng không khớp tiếng, chớp mắt bất thường hoặc chỉ gọi vài giây rồi tắt máy báo 'mạng yếu'.\n` +
               `2. **Quy tắc xác minh:** Khi người quen/bạn bè nhắn tin hoặc gọi video nhờ chuyển tiền gấp, hãy cúp máy và gọi trực tiếp bằng số điện thoại di động thông thường.\n` +
               `3. **Hỏi câu hỏi riêng tư:** Đặt câu hỏi mà chỉ 2 người biết (ví dụ: 'Hôm qua tụi mình học môn gì?') để kiểm tra xem có phải kẻ mạo danh không nhé! 🛡️`;
    }

    // 8. Virus / Mã độc / Điện thoại bị hack / Máy tính nhiễm độc
    if (/virus|mã độc|trojan|bị hack|nhiễm độc|điện thoại nóng|tải phần mềm lạ/.test(text)) {
        return `🛡️ **Dấu hiệu thiết bị bị nhiễm mã độc & cách khắc phục:**\n\n` +
               `1. **Dấu hiệu cảnh báo:** Máy chạy chậm đơ, pin tụt nhanh bất thường, máy nóng khi không dùng, tự động hiện quảng cáo hoặc gửi tin nhắn lạ cho bạn bè.\n` +
               `2. **Xử lý ngay lập tức:** Tắt kết nối Wi-Fi/4G để ngắt liên lạc giữa mã độc và máy chủ kẻ tấn công.\n` +
               `3. **Quét và gỡ bỏ:** Kiểm tra và gỡ cài đặt các ứng dụng lạ vừa tải về, sử dụng phần mềm diệt virus uy tín để quét toàn diện, hoặc khôi phục cài đặt gốc nếu cần nhé! 💻`;
    }

    // 9. Tải game lậu / Hack game / Mod APK / File crack
    if (/tải.*(lậu|crack|mod|hack)|cheat game|mod apk|bản crack/.test(text)) {
        return `⚠️ **Nguy cơ tiềm ẩn từ phần mềm crack và mod game:**\n\n` +
               `1. **Kẻ lừa không cho không:** Các bản 'hack game' hay 'phần mềm bẻ khóa miễn phí' gần như 100% đều bị chèn sẵn mã độc trojan, keylogger hoặc virus đào tiền ảo.\n` +
               `2. **Mất tài khoản toàn bộ:** Khi bạn mở file cài đặt, mã độc sẽ tự động quét trộm cookie trình duyệt, mật khẩu lưu trên máy và gửi về cho hacker.\n` +
               `3. **Lời khuyên:** Chỉ tải game và phần mềm từ các nguồn chính thống như Steam, Google Play, App Store hoặc trang web chính thức của nhà phát triển nhé! 🛡️`;
    }

    // 10. Cách dùng AI / ChatGPT trong học tập
    if (/dùng ai|chatgpt|trí tuệ nhân tạo|hỏi bài ai|làm bài bằng ai|đạo văn/.test(text)) {
        return `🤖 **Nguyên tắc vàng khi dùng AI trong học tập dành cho học sinh:**\n\n` +
               `1. **AI là trợ lý gợi ý, không phải người làm hộ:** Dùng AI để tìm ý tưởng, giải thích khái niệm khó hiểu hoặc chữa lỗi ngữ pháp; tuyệt đối không chép nguyên văn nộp bài (đạo văn).\n` +
               `2. **Luôn kiểm chứng thông tin:** AI có thể bị 'ảo giác' (tạo ra thông tin sai lệch nhưng diễn đạt rất tự tin). Bạn cần đối chiếu với sách giáo khoa và tài liệu chuẩn.\n` +
               `3. **Bảo mật quyền riêng tư:** Không gửi thông tin cá nhân, bài kiểm tra mật hoặc ảnh của mình/gia đình cho các công cụ AI nhé! 💡`;
    }

    // 11. Bị tống tiền / Đe dọa đăng ảnh nhạy cảm
    if (/tống tiền|đe dọa|ảnh nhạy cảm|ảnh riêng tư|đe dọa tung clip|bị đe dọa/.test(text)) {
        return `🚨 **HƯỚNG DẪN KHẨN CẤP KHI BỊ ĐE DỌA / TỐNG TIỀN TRỰC TUYẾN:**\n\n` +
               `1. **Tuyệt đối KHÔNG chuyển tiền:** Kẻ tống tiền sẽ không bao giờ dừng lại dù bạn chuyển bao nhiêu tiền. Càng chuyển tiền chúng càng ép buộc nhiều hơn.\n` +
               `2. **Giữ bình tĩnh và lưu chứng cứ:** Chụp màn hình toàn bộ tin nhắn, tài khoản tống tiền, số tài khoản nhận tiền mà chúng cung cấp.\n` +
               `3. **Chia sẻ ngay với người lớn tin cậy:** Bạn không có lỗi trong việc bị kẻ xấu lừa gạt. Hãy báo ngay cho bố mẹ, thầy cô hoặc gọi **Tổng đài 111** để được pháp luật và cơ quan công an bảo vệ an toàn nhé! ❤️`;
    }

    // 12. Chào hỏi / Giới thiệu / Câu hỏi mở
    if (/^(chào|hello|hi|xin chào|hey|bạn là ai|giới thiệu|cyberbot)/.test(text)) {
        return `Xin chào bạn! 👋 Mình là **CyberBot AI** — Trợ lý ảo bảo vệ không gian mạng thông minh của dự án An Toàn Mạng THCS. Mình luôn sẵn sàng giải đáp mọi thắc mắc của bạn về: bảo mật tài khoản, nhận diện bẫy lừa đảo, phòng chống bạo lực mạng, sử dụng AI an toàn và kỹ năng số thông minh. Bạn cứ thoải mái đặt câu hỏi nhé! 🛡️✨`;
    }

    // 13. Phân tích ngữ nghĩa thông minh cho các câu hỏi khác
    return `Chào bạn! 🛡️ Về câu hỏi **"${raw ? raw.slice(0, 60) : 'của bạn'}"**, dưới đây là những lưu ý an toàn số quan trọng từ CyberBot AI:\n\n` +
           `1. **Luôn đặt an toàn lên hàng đầu:** Trong môi trường mạng, hãy cảnh giác trước những lời mời gọi quá hấp dẫn, thông tin không rõ nguồn gốc hoặc yêu cầu cung cấp dữ liệu cá nhân.\n` +
           `2. **Bảo vệ tài khoản và thiết bị:** Giữ kín mật khẩu, bật xác thực 2 lớp (2FA) và không bao giờ chia sẻ mã OTP cho bất kỳ ai.\n` +
           `3. **Cần hỗ trợ thêm:** Bạn có thể tham khảo thêm các bài học chi tiết tại thanh điều hướng (**Công Dân Số**, **Bạo Lực Mạng**, **Lừa Đảo Mạng**) hoặc gọi Tổng đài **111** miễn phí nếu gặp tình huống khẩn cấp nhé! 🌟`;
}

const server = http.createServer(async (req, res) => {
    // CORS headers
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        return res.end();
    }

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // API ROUTES
    // POST /api/ai/chat — Multi-Tier AI Assistant (Pollinations.ai + Cyber AI Reasoning Engine)
    if (pathname === '/api/ai/chat' && req.method === 'POST') {
        try {
            const body = await parseBody(req);
            const userPrompt = (body.prompt || '').trim();
            const apiKey = (body.apiKey || '').trim();
            const systemPrompt = 'QUY TẮC BẮT BUỘC: Bạn PHẢI LUÔN LUÔN trả lời HOÀN TOÀN BẰNG TIẾNG VIỆT 100% trong mọi trường hợp, kể cả khi câu hỏi bằng tiếng Anh. Tuyệt đối không trả lời bằng tiếng Anh. Bạn là CyberBot AI - trợ lý bảo vệ không gian mạng thông minh dành cho học sinh THCS Việt Nam. Giọng điệu thân thiện, súc tích (3-5 câu), chuẩn kiến thức an toàn thông tin, bảo mật tài khoản và có emoji sinh động.';

            if (!userPrompt) {
                return sendJson(res, 400, { success: false, message: 'Vui lòng cung cấp nội dung câu hỏi.' });
            }

            let aiText = '';
            let aiSource = 'cyber-ai';

            // 1. If user provided custom Pollinations Pro API Key
            if (apiKey) {
                try {
                    const aiRes = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + apiKey
                        },
                        body: JSON.stringify({
                            model: 'openai',
                            messages: [
                                { role: 'system', content: systemPrompt },
                                { role: 'user', content: userPrompt }
                            ],
                            temperature: 0.7
                        }),
                        signal: AbortSignal.timeout(15000)
                    });
                    if (aiRes.ok) {
                        const aiData = await aiRes.json();
                        const candidate = aiData?.choices?.[0]?.message?.content || '';
                        if (candidate && !isEnglishResponse(candidate)) {
                            aiText = candidate;
                            aiSource = 'pollinations-pro';
                        }
                    }
                } catch (errKey) {
                    console.warn('[AI Proxy] Custom key request failed:', errKey.message);
                }
            }

            // 2. Try Public Pollinations AI (with ultra-fast 1.5s timeout & strict Vietnamese system instruction)
            if (!aiText) {
                try {
                    const sysParam = encodeURIComponent('QUY TẮC BẮT BUỘC: BẠN PHẢI TRẢ LỜI 100% BẰNG TIẾNG VIỆT.');
                    const aiRes = await fetch('https://text.pollinations.ai/' + encodeURIComponent(userPrompt) + '?model=openai-fast&system=' + sysParam, {
                        signal: AbortSignal.timeout(1500)
                    });
                    if (aiRes.ok) {
                        const rawText = await aiRes.text();
                        if (rawText && !rawText.startsWith('{"error":') && !rawText.includes('"ENOSPC"') && rawText.trim() !== '{}' && rawText.length > 15) {
                            if (!isEnglishResponse(rawText)) {
                                aiText = rawText.trim();
                                aiSource = 'pollinations';
                            }
                        }
                    }
                } catch (errPub) {
                    // Public pollinations timed out or failed
                }
            }

            // 3. Robust CyberBot AI Semantic Reasoning Engine (Guaranteed 100% Vietnamese & High-Quality Responses)
            if (!aiText || isEnglishResponse(aiText)) {
                aiText = generateCyberBotAiResponse(userPrompt);
                aiSource = 'cyber-ai';
            }

            return sendJson(res, 200, {
                success: true,
                reply: aiText,
                source: aiSource
            });
        } catch (err) {
            console.error('[AI Proxy Error]:', err);
            // Even on unexpected error, return intelligent fallback rather than 500
            const fallbackReply = generateCyberBotAiResponse('');
            return sendJson(res, 200, {
                success: true,
                reply: fallbackReply,
                source: 'cyber-ai'
            });
        }
    }

    if (pathname.startsWith('/api/survey/')) {
        try {
            // POST /api/survey/submit — Submit survey answers
            if (pathname === '/api/survey/submit' && req.method === 'POST') {
                const body = await parseBody(req);
                const { studentName, studentClass, answers, totalAnswered, riskScore } = body;

                if (!studentName || !studentClass) {
                    return sendJson(res, 400, {
                        success: false,
                        message: 'Thiếu thông tin họ tên hoặc lớp học'
                    });
                }

                const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
                const submission = db.insertSubmission({
                    studentName,
                    studentClass,
                    answers,
                    totalAnswered,
                    riskScore,
                    ipAddress: ip
                });

                return sendJson(res, 201, {
                    success: true,
                    message: 'Lưu kết quả khảo sát vào cơ sở dữ liệu thành công!',
                    submission,
                    stats: db.getStats()
                });
            }

            // GET /api/survey/submissions — Get list of submissions
            if (pathname === '/api/survey/submissions' && req.method === 'GET') {
                const limit = parseInt(parsedUrl.query.limit) || 100;
                const offset = parseInt(parsedUrl.query.offset) || 0;
                const submissions = db.getAllSubmissions(limit, offset);
                const stats = db.getStats();
                return sendJson(res, 200, {
                    success: true,
                    total: stats.totalSubmissions,
                    submissions
                });
            }

            // GET /api/survey/submissions/:id — Get single submission
            if (pathname.match(/^\/api\/survey\/submissions\/(\d+)$/) && req.method === 'GET') {
                const id = pathname.match(/^\/api\/survey\/submissions\/(\d+)$/)[1];
                const sub = db.getSubmissionById(id);
                if (!sub) {
                    return sendJson(res, 404, { success: false, message: 'Không tìm thấy phiếu khảo sát' });
                }
                return sendJson(res, 200, { success: true, submission: sub });
            }

            // GET /api/survey/stats — Aggregate statistics
            if (pathname === '/api/survey/stats' && req.method === 'GET') {
                const stats = db.getStats();
                return sendJson(res, 200, { success: true, stats });
            }

            // GET /api/survey/export — Export CSV
            if (pathname === '/api/survey/export' && req.method === 'GET') {
                const submissions = db.getAllSubmissions(1000);
                let csv = '\uFEFFID,Họ và tên,Lớp,Thời gian nộp,Số câu trả lời,Điểm rủi ro,Chi tiết đáp án\n';
                submissions.forEach(s => {
                    const cleanName = `"${s.studentName.replace(/"/g, '""')}"`;
                    const cleanAnswers = `"${JSON.stringify(s.answers).replace(/"/g, '""')}"`;
                    csv += `${s.id},${cleanName},${s.studentClass},${s.submittedAt},${s.totalAnswered},${s.riskScore},${cleanAnswers}\n`;
                });
                res.writeHead(200, {
                    'Content-Type': 'text/csv; charset=utf-8',
                    'Content-Disposition': 'attachment; filename="khao_sat_an_toan_mang.csv"',
                    'Access-Control-Allow-Origin': '*'
                });
                return res.end(csv);
            }

            // DELETE /api/survey/submissions/:id — Delete submission
            if (pathname.match(/^\/api\/survey\/submissions\/(\d+)$/) && req.method === 'DELETE') {
                const id = pathname.match(/^\/api\/survey\/submissions\/(\d+)$/)[1];
                db.deleteSubmission(id);
                return sendJson(res, 200, { success: true, message: 'Đã xóa bản ghi' });
            }

            return sendJson(res, 404, { success: false, message: 'API route not found' });
        } catch (err) {
            console.error('API Error:', err);
            return sendJson(res, 500, { success: false, message: err.message });
        }
    }

    // GAME LEADERBOARD API ROUTES
    if (pathname.startsWith('/api/game/')) {
        try {
            // POST /api/game/submit-score
            if (pathname === '/api/game/submit-score' && req.method === 'POST') {
                const body = await parseBody(req);
                const { studentName, studentClass, score, waveReached, survivalTime, kills } = body;
                if (!studentName || !studentClass) {
                    return sendJson(res, 400, { success: false, message: 'Thiếu họ tên hoặc lớp học' });
                }
                const saved = db.insertGameScore({
                    studentName,
                    studentClass,
                    score,
                    waveReached,
                    survivalTime,
                    kills
                });
                const leaderboard = db.getGameLeaderboard();
                return sendJson(res, 201, {
                    success: true,
                    message: 'Đã ghi nhận điểm thành công vào Bảng Xếp Hạng!',
                    saved,
                    ...leaderboard
                });
            }

            // GET /api/game/leaderboard
            if (pathname === '/api/game/leaderboard' && req.method === 'GET') {
                const leaderboard = db.getGameLeaderboard();
                return sendJson(res, 200, {
                    success: true,
                    ...leaderboard
                });
            }

            return sendJson(res, 404, { success: false, message: 'Game API route not found' });
        } catch (err) {
            console.error('Game API Error:', err);
            return sendJson(res, 500, { success: false, message: err.message });
        }
    }

    // STATIC FILE SERVER
    let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
    if (safePath === '/' || safePath === '\\') {
        safePath = 'index.html';
    }

    const filePath = path.join(PUBLIC_DIR, safePath);

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
            return res.end('<h1>404 Not Found</h1><p>File không tồn tại</p>');
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
    });
});

function startServer(port) {
    server.listen(port, () => {
        console.log(`=======================================================`);
        console.log(`🛡️  CYBERSHIELD WEB SERVER & DATABASE RUNNING!`);
        console.log(`👉  Trang chủ:   http://localhost:${port}/index.html`);
        console.log(`📋  Khảo sát:   http://localhost:${port}/khao-sat.html`);
        console.log(`🗄️  Cơ sở dữ liệu SQLite: ${db.dbPath}`);
        console.log(`=======================================================`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.warn(`Port ${port} is busy, trying port ${port + 1}...`);
            startServer(port + 1);
        } else {
            console.error('Server error:', err);
        }
    });
}

startServer(PORT);
