/**
 * ===================================================================
 * GOOGLE APPS SCRIPT — TỰ ĐỘNG LƯU KẾT QUẢ KHẢO SÁT VÀO GOOGLE SHEETS
 * Bảng tính: https://docs.google.com/spreadsheets/d/1nwBfuqhkltbaIvvhKjICcoLz3gQ7dm0nFJYn8d_Z1mk
 * ===================================================================
 * 
 * HƯỚNG DẪN CÀI ĐẶT TRONG 1 PHÚT:
 * 1. Mở link Google Sheet ở trên.
 * 2. Trên thanh menu, chọn: Tiện ích mở rộng (Extensions) -> Apps Script.
 * 3. Xóa hết code cũ trong khung soạn thảo, DÁN TOÀN BỘ CODE NÀY VÀO.
 * 4. Nhấn nút "Lưu" (biểu tượng đĩa mềm 💾).
 * 5. Nhấn nút "Triển khai" (Deploy) ở góc trên bên phải -> Chọn "Triển khai mới" (New deployment).
 * 6. Chọn loại: "Ứng dụng web" (Web app).
 *    - Mô tả: Survey Webhook
 *    - Thực thi dưới dạng (Execute as): "Tôi" (Me)
 *    - Ai có quyền truy cập (Who has access): "Bất kỳ ai" (Anyone) -> RẤT QUAN TRỌNG!
 * 7. Nhấn "Triển khai" (Deploy) -> Cấp quyền truy cập nếu Google hỏi -> Sao chép URL ứng dụng web (Web App URL có đuôi /exec).
 * 8. Dán URL đó vào website hoặc file js/survey-db.js.
 */

// Tên trang tính lưu trữ
const SHEET_NAME = "Phiếu_Khảo_Sát";

// Khởi tạo tiêu đề cột nếu chưa có
function setupSheetHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    const headers = [
      "Thời gian nộp",
      "Mã số",
      "Họ và tên học sinh",
      "Lớp học",
      "Số câu đã làm",
      "Điểm rủi ro (0-40)",
      "Đánh giá mức độ an toàn"
    ];
    // Thêm tiêu đề từ Câu 1 đến Câu 40
    for (let i = 1; i <= 40; i++) {
      headers.push("Câu " + i);
    }
    
    sheet.appendRow(headers);
    
    // Định dạng tiêu đề đẹp mắt
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#4f46e5");
    headerRange.setFontColor("#ffffff");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
  }
}

// Xử lý khi Website gửi dữ liệu nộp bài (POST)
function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
    }
    setupSheetHeaders(sheet);

    // Đọc dữ liệu JSON gửi lên từ website
    const data = JSON.parse(e.postData.contents);
    const timestamp = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "yyyy-MM-dd HH:mm:ss");
    const id = sheet.getLastRow(); // Tạo mã số thứ tự tự tăng
    
    const studentName = data.studentName || "Ẩn danh";
    const studentClass = data.studentClass || "N/A";
    const totalAnswered = data.totalAnswered || Object.keys(data.answers || {}).length;
    const riskScore = data.riskScore || 0;
    
    let riskEvaluation = "🟢 An toàn cao";
    if (riskScore > 12) {
      riskEvaluation = "🔴 Nguy cơ cao — Cần can thiệp";
    } else if (riskScore > 5) {
      riskEvaluation = "🟡 Cần lưu ý rủi ro";
    }

    const row = [
      timestamp,
      id,
      studentName,
      studentClass,
      totalAnswered,
      riskScore,
      riskEvaluation
    ];

    // Điền đáp án 40 câu hỏi vào các cột từ H đến AU
    const answers = data.answers || {};
    for (let i = 1; i <= 40; i++) {
      const ansVal = answers[i] !== undefined ? answers[i] : "";
      row.push(ansVal);
    }

    sheet.appendRow(row);

    // Trả về JSON thông báo thành công
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: "Đã lưu thành công vào Google Sheet!",
        id: id,
        timestamp: timestamp
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Xử lý khi Website truy vấn lấy dữ liệu thống kê (GET)
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet || sheet.getLastRow() <= 1) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: true,
          total: 0,
          submissions: []
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const data = sheet.getDataRange().getValues();
    const rows = data.slice(1); // Bỏ qua dòng tiêu đề
    
    const submissions = rows.map((r, index) => {
      const answers = {};
      for (let i = 1; i <= 40; i++) {
        if (r[6 + i] !== "") {
          answers[i] = r[6 + i];
        }
      }
      return {
        id: r[1] || (index + 1),
        submittedAt: r[0],
        studentName: r[2],
        studentClass: r[3],
        totalAnswered: r[4],
        riskScore: r[5],
        riskEvaluation: r[6],
        answers: answers
      };
    });

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        total: submissions.length,
        submissions: submissions
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
