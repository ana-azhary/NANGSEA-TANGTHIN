
// ============================================================
//  📄 config.js - ไฟล์ตั้งค่าทั้งหมด
// ============================================================

const CONFIG = {
    // -------- Google Sheets (ใช้ Sheet.best หรือ GAS) --------
    API_URL: 'https://api.sheetbest.com/sheets/d55963b7-5673-4392-98b9-8f1ca80606fb',
    SHEET_NAME: 'Books',

    // -------- ฟังก์ชันการทำงาน --------
    PAGE_SIZE: 10,
    MESSENGER_LINK: 'http://m.me/548132778932419',

    // -------- หมวดหมู่ทั้งหมด --------
    CATEGORIES: ['อะกีดะฮ์', 'ฟิกฮ์', 'อูโซล ลุลฟิกฮ์', 'หะดีษ', 'ตัฟซีร', 'ภาษา', 'ซีเราะฮ์', 'ตรรกะ', 'อื่นๆ'],
    LEVELS: ['เริ่มต้น', 'ปานกลาง', 'ยาก'],

    // ==========================================================
    //  📸 ระบบสำรองรูปภาพ (IMAGE FALLBACK)
    // ==========================================================
    
    // รูปภาพสำรอง (ถ้าไม่มีให้ใช้ emoji แทน)
    // เปลี่ยน URL นี้เป็นรูปภาพที่คุณต้องการให้แสดงแทน
    FALLBACK_IMAGE_URL: 'https://pngimg.com/uploads/book/book_PNG51093.png',
    
    // หรือถ้าต้องการใช้อิโมจิอย่างเดียว (ไม่ต้องโหลดรูปภาพ)
    USE_EMOJI_FALLBACK: false,   // true = ใช้อิโมจิ, false = ใช้ FALLBACK_IMAGE_URL
    
    // อิโมจิที่ใช้แทนรูป (สามารถเปลี่ยนได้)
    FALLBACK_EMOJI: '📖',
    
    // สีพื้นหลังของการ์ดเมื่อใช้อิโมจิ
    FALLBACK_BG_COLOR: '#2d5a4b'
};


// เปิดให้ไฟล์อื่นเข้าถึงได้ (global)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;  // สำหรับ Node.js (ถ้าใช้)
} else {
    window.CONFIG = CONFIG;   // สำหรับเบราว์เซอร์
}
/**
 * สร้าง HTML สำหรับส่วนแสดงหนังสือ (ใช้ในหน้า Home)
 * @param {string} title - หัวข้อของส่วน (เช่น "หนังสือแนะนำ")
 * @param {Array} books - รายการหนังสือที่จะแสดง
 * @returns {string} HTML string
 */
function renderBookSection(title, books) {
    if (!books || books.length === 0) {
        return `
            <div class="section-title">${title}</div>
            <p style="color: var(--text-light); padding: 1rem 0;">暂无ข้อมูล</p>
        `;
    }
    
    const cards = books.map(book => renderBookCard(book)).join('');
    return `
        <div class="section-title">${title}</div>
        <div class="book-grid">${cards}</div>
    `;
}

/**
 * หน้าแรก (Home) - แสดงหนังสือแนะนำ, ขายดี, ค้นหามากที่สุด
 */
function renderHome() {
    // หนังสือแนะนำ (is_featured = true)
    const featured = state.books.filter(b => b.is_featured).slice(0, 5);
    
    // ขายดี: เรียงตาม sales_count มากสุด
    const bestSellers = [...state.books]
        .sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0))
        .slice(0, 5);
    
    // ค้นหามากที่สุด: เรียงตาม search_count มากสุด
    const mostSearched = [...state.books]
        .sort((a, b) => (b.search_count || 0) - (a.search_count || 0))
        .slice(0, 5);

    const html = `
        <div class="container">
            <!-- Hero Section -->
            <div class="hero" style="
                background: linear-gradient(135deg, var(--primary), var(--primary-light));
                color: #fff;
                padding: 1.8rem 1.5rem;
                border-radius: var(--radius);
                margin: 1rem 0 1.5rem;
            ">
                <h1 style="font-size: 1.6rem; margin-bottom: 0.3rem;">📖 หนังสือต่างถิ่น</h1>
                <p style="opacity: 0.9;">ร้านหนังสือออนไลน์สำหรับทุกคน</p>
                <div style="margin-top: 0.8rem;">
                    <button class="btn btn-accent" onclick="navigateTo('books')" style="background: rgba(255,255,255,0.2); color: #fff; border: 1px solid rgba(255,255,255,0.3);">
                        ดูหนังสือทั้งหมด →
                    </button>
                </div>
            </div>

            ${renderBookSection('🌟 หนังสือแนะนำ', featured)}
            ${renderBookSection('🔥 ขายดีที่สุด', bestSellers)}
            ${renderBookSection('🔍 ค้นหามากที่สุด', mostSearched)}
        </div>
    `;
    main.innerHTML = html;
}
