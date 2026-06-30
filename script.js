/**
 * ============================================================
 *  📚 หนังสือต่างถิ่น - JavaScript หลัก
 *  จุดประสงค์: จัดการทุกฟังก์ชันของเว็บไซต์
 *  รวมถึงการดึงข้อมูล, การเรนเดอร์, การจัดการตะกร้า, การกรอง, ฯลฯ
 * ============================================================
 */

// -------- 1. ค่าคงที่และการตั้งค่า --------

// -------- 2. State (สถานะของแอป) --------
const state = {
    books: [],               // หนังสือทั้งหมด
    filteredBooks: [],       // หนังสือที่ผ่านการกรอง
    displayedBooks: [],      // หนังสือที่แสดงอยู่ (ใช้สำหรับ Load More)
    currentPage: 0,          // หน้าปัจจุบัน (0-based)
    cart: [],                // ตะกร้า: [{ book, quantity }]
    currentPageName: 'home', // หน้าปัจจุบัน
    isLoading: false,
    bookDetailId: null,      // ID ของหนังสือที่กำลังดูรายละเอียด
    categoryFilter: 'ทั้งหมด',
    levelFilter: 'ทั้งหมด',
    searchQuery: ''
};

// -------- 3. DOM References --------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const main = $('#mainContent');
const toast = $('#toast');
const toastMsg = $('#toastMessage');
const toastClose = $('#toastClose');
const cartBadge = $('#cartBadge');
const navLinks = $$('.nav-links a');
const menuToggle = $('#menuToggle');
const navLinksContainer = $('#navLinks');

// -------- 4. Toast Notification System --------
let toastTimeout = null;

/**
 * แสดงข้อความ Toast
 * @param {string} message - ข้อความที่ต้องการแสดง
 * @param {number} duration - ระยะเวลาแสดง (ms)
 */
function showToast(message, duration = 3000) {
    toastMsg.textContent = message;
    toast.classList.remove('hidden');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.add('hidden');
    }, duration);
}

// ปุ่มปิด Toast
toastClose.addEventListener('click', () => {
    toast.classList.add('hidden');
    clearTimeout(toastTimeout);
});

// -------- 5. การเชื่อมต่อ Google Sheets (API) --------
/**
 * ดึงข้อมูลหนังสือจาก Google Sheets ผ่าน Sheets API v4
 * ใช้ async/await เพื่อรอการตอบกลับ
 * หากเกิดข้อผิดพลาด จะใช้ข้อมูลสำรอง (Fallback)
 */
async function fetchBooksFromSheet() {
    try {
        const url = CONFIG.API_URL;
        console.log('📡 กำลังดึงข้อมูลจาก:', url);
        
        const response = await fetch(url, {
            // สำคัญ: Sheet.best ต้องมี headers เหล่านี้
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const books = await response.json();
        
        if (!books || books.length === 0) {
            throw new Error('ไม่มีข้อมูลในชีต');
        }

        console.log('✅ ดึงข้อมูลสำเร็จ:', books.length, 'เล่ม');
        
        // แปลงข้อมูลให้ถูกต้อง
        return books.map(book => ({
            ...book,
            price: parseFloat(book.price) || 0,
            sales_count: parseInt(book.sales_count) || 0,
            search_count: parseInt(book.search_count) || 0,
            is_featured: book.is_featured === 'TRUE' || book.is_featured === 'true'
        }));

    } catch (error) {
        console.error('❌ ดึงข้อมูลล้มเหลว:', error);
        showToast('⚠️ ไม่สามารถเชื่อมต่อฐานข้อมูล ใช้ข้อมูลสำรอง');
        return getFallbackBooks();
    }
}

/**
 * ข้อมูลสำรอง (Fallback) กรณีเชื่อมต่อ Google Sheets ไม่ได้
 */
function getFallbackBooks() {
    return [
        {
            book_id: '001',
            title: 'หลักอิสลามเบื้องต้น',
            author: 'อ.สมชาย',
            category: 'อะกีดะฮ์',
            level: 'เริ่มต้น',
            price: 120,
            description: 'หนังสืออธิบายพื้นฐานอิสลามสำหรับผู้เริ่มต้น',
            table_of_contents: 'บทที่ 1: ...',
            cover_image: 'https://via.placeholder.com/300x400/2d5a4b/fff?text=หนังสือ',
            book_code: 'ISL-001',
            sales_count: 50,
            search_count: 30,
            is_featured: true,
            facebook_link: 'https://www.facebook.com/share/1F9EwWi7du/'
        },
        // ... เพิ่มข้อมูลสำรองเพิ่มเติมตามต้องการ
    ];
}

// -------- 6. ฟังก์ชันจัดการตะกร้า (Cart) --------
/**
 * โหลดตะกร้าจาก localStorage
 */
function loadCartFromStorage() {
    try {
        const saved = localStorage.getItem('nangsue_cart');
        if (saved) {
            state.cart = JSON.parse(saved);
        }
    } catch (e) {
        state.cart = [];
    }
    updateCartBadge();
}

/**
 * บันทึกตะกร้าลง localStorage
 */
function saveCartToStorage() {
    localStorage.setItem('nangsue_cart', JSON.stringify(state.cart));
    updateCartBadge();
}

/**
 * อัปเดตตัวเลขบนไอคอนตะกร้า
 */
/**
 * อัปเดตตัวเลขบนไอคอนตะกร้า (ทั้งในเมนูและ Quick Actions)
 */
function updateCartBadge() {
    const total = state.cart.reduce((sum, item) => sum + item.quantity, 0);

    // Badge ในเมนูหลัก
    const badge = document.getElementById('cartBadge');
    if (badge) badge.textContent = total;

    // Badge ใน Quick Actions (มือถือ)
    const badgeMobile = document.getElementById('cartBadgeMobile');
    if (badgeMobile) badgeMobile.textContent = total;
}
/**
 * เพิ่มหนังสือเข้าตะกร้า
 * @param {object} book - หนังสือที่ต้องการเพิ่ม
 */
function addToCart(book) {
    const existing = state.cart.find(item => item.book.book_id === book.book_id);
    if (existing) {
        existing.quantity += 1;
    } else {
        state.cart.push({ book, quantity: 1 });
    }
    saveCartToStorage();
    showToast(`✅ เพิ่ม "${book.title}" ลงตะกร้าแล้ว`);
    renderCurrentPage(); // รีเฟรชหน้า
}

/**
 * ลบหนังสือออกจากตะกร้า (ทีละ 1 ชิ้น)
 */
function removeFromCart(bookId) {
    const index = state.cart.findIndex(item => item.book.book_id === bookId);
    if (index === -1) return;
    if (state.cart[index].quantity > 1) {
        state.cart[index].quantity -= 1;
    } else {
        state.cart.splice(index, 1);
    }
    saveCartToStorage();
    showToast('🗑️ อัปเดตตะกร้าแล้ว');
    renderCurrentPage();
}

/**
 * ล้างตะกร้าทั้งหมด
 */
function clearCart() {
    if (state.cart.length === 0) {
        showToast('ตะกร้าว่างแล้ว');
        return;
    }
    state.cart = [];
    saveCartToStorage();
    showToast('🗑️ ล้างตะกร้าเรียบร้อย');
    renderCurrentPage();
}

/**
 * คัดลอกรายการหนังสือในตะกร้า พร้อมข้อความส่ง Messenger
 */
function copyCartForMessenger() {
    if (state.cart.length === 0) {
        showToast('⚠️ ตะกร้าว่าง ไม่มีรายการให้คัดลอก');
        return;
    }

    let totalPrice = 0;
    let lines = [];
    lines.push('📚 *ฉันสนใจหนังสือเหล่านี้*');
    lines.push('');

    state.cart.forEach((item, idx) => {
        const b = item.book;
        const subtotal = b.price * item.quantity;
        totalPrice += subtotal;
        lines.push(`${idx+1}. ${b.title}`);
        lines.push(`   รหัส: ${b.book_code || '-'}`);
        lines.push(`   ราคา: ${b.price} บาท × ${item.quantity} = ${subtotal} บาท`);
        lines.push('');
    });

    lines.push(`💰 *รวมทั้งหมด: ${totalPrice} บาท*`);
    lines.push('');
    lines.push('สามารถสอบถามเพิ่มเติมได้เลยค่ะ 🙏');

    const text = lines.join('\n');

    navigator.clipboard.writeText(text).then(() => {
        showToast('📋 คัดลอกรายการเรียบร้อย! ไปที่ Messenger เพื่อวาง');
    }).catch(() => {
        // Fallback: ใช้ prompt
        prompt('คัดลอกข้อความนี้ (กด Ctrl+C):', text);
        showToast('📋 คัดลอกสำเร็จ (ใช้ prompt)');
    });
}

/**
 * เปิด Messenger พร้อมข้อความที่คัดลอก (หรือลิงก์เปล่า)
 */
function openMessenger() {
    // ใช้ลิงก์ m.me แบบตายตัว
    window.open(CONFIG.MESSENGER_LINK, '_blank');
}

// -------- 7. ฟังก์ชันการกรองและค้นหา --------
/**
 * กรองหนังสือตามหมวดหมู่, ระดับ, และคำค้น
 */
function filterBooks() {
    const category = state.categoryFilter;
    const level = state.levelFilter;
    const query = state.searchQuery.trim().toLowerCase();

    let filtered = state.books.filter(book => {
        // กรองหมวดหมู่
        if (category !== 'ทั้งหมด' && book.category !== category) return false;
        // กรองระดับ
        if (level !== 'ทั้งหมด' && book.level !== level) return false;
        // ค้นหาคำ
        if (query) {
            const inTitle = book.title.toLowerCase().includes(query);
            const inAuthor = book.author.toLowerCase().includes(query);
            const inCategory = book.category.toLowerCase().includes(query);
            if (!(inTitle || inAuthor || inCategory)) return false;
        }
        return true;
    });

    state.filteredBooks = filtered;
    state.currentPage = 0;
    return filtered;
}

/**
 * โหลดหนังสือเพิ่ม (Load More)
 */
function loadMoreBooks() {
    if (state.isLoading) return;
    if (state.filteredBooks.length === 0) return;

    const start = state.currentPage * CONFIG.PAGE_SIZE;
    const end = start + CONFIG.PAGE_SIZE;
    const nextBatch = state.filteredBooks.slice(start, end);

    if (nextBatch.length === 0) {
        showToast('📖 แสดงหนังสือทั้งหมดแล้ว');
        return;
    }

    state.displayedBooks = [...state.displayedBooks, ...nextBatch];
    state.currentPage += 1;
    
    // ใช้ updateBookGridAndCount แทน renderAllBooks
    updateBookGridAndCount();
}

// -------- 8. ฟังก์ชันเรนเดอร์ (Render) หน้าต่างๆ --------
/**
 * เรนเดอร์หน้าตาม state.currentPageName
 */
function renderCurrentPage() {
    switch (state.currentPageName) {
        case 'home':
            renderHome();
            break;
        case 'books':
            renderAllBooks();
            break;
        case 'book-detail':
            renderBookDetail();
            break;
        case 'cart':
            renderCart();
            break;
        case 'categories':
            renderCategories();
            break;
        default:
            renderHome();
    }
    // อัปเดต active link
    updateActiveNav(state.currentPageName);
}

/**
 * อัปเดตปุ่ม Navigation ให้ active
 */
function updateActiveNav(page) {
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === page) {
            link.classList.add('active');
        }
    });
    // ปิดเมนู mobile
    navLinksContainer.classList.remove('open');
}

// -------- 8.1 หน้าแรก (Home) --------
function renderHome() {
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
            <div class="hero" style="background: linear-gradient(135deg, var(--primary), var(--primary-light)); color:#fff; padding:1.8rem 1.5rem; border-radius:var(--radius); margin:1rem 0 1.5rem;">
                <h1 style="font-size:1.6rem; margin-bottom:0.3rem;">📖 หนังสือต่างถิ่น</h1>
                <p style="opacity:0.9;">ร้านหนังสือออนไลน์สำหรับทุกคน</p>
            </div>

            ${renderBookSection('🌟 หนังสือแนะนำ', featured)}
            ${renderBookSection('🔥 ขายดีที่สุด', bestSellers)}
            ${renderBookSection('🔍 ค้นหามากที่สุด', mostSearched)}
        </div>
    `;
    main.innerHTML = html;
}

/**
 * สร้าง HTML สำหรับส่วนแสดงหนังสือ
 */
// ============================================================
//  📸 ระบบสำรองรูปภาพ (Image Fallback System)
// ============================================================

/**
 * สร้าง HTML สำหรับแสดงรูปภาพ พร้อมระบบสำรอง
 * @param {string} imageUrl - URL รูปภาพจาก Google Sheets
 * @param {string} altText - ข้อความแสดงแทน
 * @param {string} className - CSS class สำหรับรูป
 * @param {object} options - ตัวเลือกเพิ่มเติม
 * @returns {string} HTML string
 */
function renderBookImage(imageUrl, altText, className = 'book-cover', options = {}) {
    const {
        useEmoji = CONFIG.USE_EMOJI_FALLBACK,
        emoji = CONFIG.FALLBACK_EMOJI,
        fallbackImage = CONFIG.FALLBACK_IMAGE_URL,
        bgColor = CONFIG.FALLBACK_BG_COLOR
    } = options;

    // ถ้าไม่มี URL รูป หรือ URL ว่างเปล่า
    if (!imageUrl || imageUrl.trim() === '') {
        if (useEmoji) {
            return `
                <div class="${className}" style="
                    background: ${bgColor};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 4rem;
                    color: white;
                    min-height: 200px;
                    border-radius: 12px;
                ">
                    <span>${emoji}</span>
                </div>
            `;
        } else {
            return `<img src="${fallbackImage}" alt="${altText}" class="${className}" loading="lazy">`;
        }
    }

    // มี URL รูป ใช้ img พร้อม onerror
    return `
        <img 
            src="${imageUrl}" 
            alt="${altText}" 
            class="${className}" 
            loading="lazy"
            onerror="handleImageError(this, '${altText}')"
        >
    `;
}

/**
 * จัดการเมื่อรูปโหลดไม่สำเร็จ (ใช้กับ onerror)
 * @param {HTMLImageElement} imgElement - element รูปที่โหลดไม่สำเร็จ
 * @param {string} altText - ข้อความแสดงแทน
 */
function handleImageError(imgElement, altText) {
    // ตรวจสอบว่าใช้งาน emoji หรือ fallback image
    if (CONFIG.USE_EMOJI_FALLBACK) {
        // เปลี่ยนเป็น div แสดงอิโมจิ
        const container = document.createElement('div');
        container.className = imgElement.className;
        container.style.cssText = `
            background: ${CONFIG.FALLBACK_BG_COLOR};
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 4rem;
            color: white;
            min-height: ${imgElement.height || 200}px;
            border-radius: 12px;
        `;
        container.innerHTML = `<span>${CONFIG.FALLBACK_EMOJI}</span>`;
        imgElement.replaceWith(container);
    } else {
        // ใช้ fallback image
        imgElement.src = CONFIG.FALLBACK_IMAGE_URL;
        imgElement.onerror = null; // ป้องกัน loop
    }
    
    // บันทึกข้อผิดพลาด (debug)
    console.warn(`⚠️ รูปภาพโหลดไม่สำเร็จ: ${altText} (${imgElement.src})`);
}
/**
 * สร้าง HTML สำหรับการ์ดหนังสือ (คลิกเพื่อดูรายละเอียด)
 */
/**
 * สร้าง HTML สำหรับการ์ดหนังสือ (พร้อมระบบสำรองรูป)
 */
function renderBookCard(book) {
    const cover = book.cover_image || '';
    const title = book.title || 'หนังสือ';
    
    // ใช้ฟังก์ชัน renderBookImage แทนการใส่ img โดยตรง
    const imageHtml = renderBookImage(cover, title, 'book-cover', {
        useEmoji: CONFIG.USE_EMOJI_FALLBACK,
        emoji: CONFIG.FALLBACK_EMOJI,
        fallbackImage: CONFIG.FALLBACK_IMAGE_URL,
        bgColor: CONFIG.FALLBACK_BG_COLOR
    });

    return `
        <div class="book-card" onclick="navigateTo('book-detail', '${book.book_id}')">
            ${imageHtml}
            <div class="info">
                <div class="title">${book.title}</div>
                <div class="author">${book.author || 'ไม่ระบุ'}</div>
                <div class="price">${book.price ? book.price.toLocaleString() : 0} ฿</div>
                ${book.level ? `<span class="level-tag">${book.level}</span>` : ''}
            </div>
        </div>
    `;
}

// -------- 8.2 หน้ารายละเอียดหนังสือ (Book Detail) --------
function renderBookDetail() {
    const bookId = state.bookDetailId;
    const book = state.books.find(b => b.book_id === bookId);

    if (!book) {
        main.innerHTML = `<div class="container"><p style="text-align:center;padding:2rem;">❌ ไม่พบหนังสือ</p></div>`;
        return;
    }

    // ใช้ฟังก์ชัน renderBookImage สำหรับรูปปกขนาดใหญ่
    const coverImageHtml = renderBookImage(
        book.cover_image || '', 
        book.title, 
        'detail-cover',
        {
            useEmoji: CONFIG.USE_EMOJI_FALLBACK,
            emoji: CONFIG.FALLBACK_EMOJI,
            fallbackImage: CONFIG.FALLBACK_IMAGE_URL,
            bgColor: CONFIG.FALLBACK_BG_COLOR
        }
    );

    const html = `
        <div class="container">
            <button class="btn btn-outline btn-sm" onclick="navigateTo('books')" style="margin:0.5rem 0 1rem;">
                <i class="fas fa-arrow-left"></i> กลับ
            </button>
            <div class="detail-container">
                ${coverImageHtml}

                <h1 class="detail-title">${book.title}</h1>
                <div class="detail-author">✍️ ${book.author || 'ไม่ระบุ'}</div>

                <div class="detail-price">${book.price ? book.price.toLocaleString() : 0} ฿</div>

                <div class="detail-meta">
                    <span>📂 ${book.category || 'ไม่ระบุ'}</span>
                    <span>📊 ${book.level || 'ไม่ระบุ'}</span>
                </div>

                <div class="detail-description">${book.description || 'ไม่มีคำอธิบาย'}</div>

                ${book.table_of_contents ? `<div><strong>📑 สารบัญ</strong><pre style="white-space:pre-wrap;background:var(--bg);padding:0.8rem;border-radius:12px;">${book.table_of_contents}</pre></div>` : ''}

                <div class="detail-code">
                    <span><i class="fas fa-hashtag"></i> รหัสหนังสือ: <strong>${book.book_code || '-'}</strong></span>
                    <button onclick="copyBookCode('${book.book_code || ''}')"><i class="far fa-copy"></i> คัดลอก</button>
                </div>

                <div class="btn-group">
                    <button class="btn btn-primary" onclick="addToCartFromDetail('${book.book_id}')">
                        <i class="fas fa-cart-plus"></i> หยิบใส่ตะกร้า
                    </button>
                    <button class="btn btn-accent" onclick="copyBookInfo('${book.book_id}')">
                        <i class="fas fa-share-alt"></i> คัดลอกข้อมูล
                    </button>
                    <button class="btn btn-outline" onclick="openMessenger()">
                        <i class="fab fa-facebook-messenger"></i> สอบถามผ่านเพจ
                    </button>
                </div>
            </div>
        </div>
    `;
    main.innerHTML = html;
}
/**
 * คัดลอกรหัสหนังสือ
 */
function copyBookCode(code) {
    if (!code) {
        showToast('⚠️ ไม่มีรหัสหนังสือ');
        return;
    }
    navigator.clipboard.writeText(code).then(() => {
        showToast(`📋 คัดลอกรหัส "${code}" เรียบร้อย`);
    }).catch(() => {
        prompt('คัดลอกรหัส:', code);
        showToast('📋 คัดลอกแล้ว');
    });
}

/**
 * คัดลอกข้อมูลหนังสือ (ชื่อ, ผู้แต่ง, ราคา, ระดับ) + ข้อความสนใจ
 */
function copyBookInfo(bookId) {
    const book = state.books.find(b => b.book_id === bookId);
    if (!book) return;

    const text = `📖 ฉันสนใจหนังสือเล่มนี้\n\nชื่อ: ${book.title}\nผู้แต่ง: ${book.author || '-'}\nราคา: ${book.price ? book.price.toLocaleString() : 0} ฿\nระดับ: ${book.level || '-'}\nรหัส: ${book.book_code || '-'}`;

    navigator.clipboard.writeText(text).then(() => {
        showToast('📋 คัดลอกข้อมูลเรียบร้อย');
    }).catch(() => {
        prompt('คัดลอกข้อมูล:', text);
        showToast('📋 คัดลอกแล้ว');
    });
}

/**
 * เพิ่มหนังสือจากหน้ารายละเอียด
 */
function addToCartFromDetail(bookId) {
    const book = state.books.find(b => b.book_id === bookId);
    if (book) {
        addToCart(book);
    }
}

// -------- 8.3 หน้ารายการหนังสือทั้งหมด (All Books) --------
function renderAllBooks() {
    const filtered = state.filteredBooks;
    const displayed = state.displayedBooks;
    const total = filtered.length;

    // ----- สร้าง Filter Bar (แยกจาก grid) -----
    const filterHtml = `
        <div class="filter-bar" id="filterBar">
            <select id="categoryFilter" onchange="applyFilters()">
                <option value="ทั้งหมด">📂 หมวดทั้งหมด</option>
                ${getCategoryOptions(state.categoryFilter)}
            </select>
            <select id="levelFilter" onchange="applyFilters()">
                <option value="ทั้งหมด">📊 ระดับทั้งหมด</option>
                <option value="เริ่มต้น">เริ่มต้น</option>
                <option value="ปานกลาง">ปานกลาง</option>
                <option value="ยาก">ยาก</option>
            </select>
            <input type="text" id="searchInput" placeholder="🔍 ค้นหา..." value="${state.searchQuery}" oninput="handleSearchInput(this.value)">
        </div>
        <div class="book-count" id="bookCount">พบ <strong>${total}</strong> รายการ</div>
    `;

    // ----- สร้าง Book Grid (ส่วนที่เปลี่ยนบ่อย) -----
    let bookGridHtml = '';
    if (displayed.length === 0) {
        bookGridHtml = `<p style="text-align:center;padding:2rem;">ไม่พบหนังสือที่ตรงกับเงื่อนไข</p>`;
    } else {
        bookGridHtml = `<div class="book-grid" id="bookGrid">${displayed.map(book => renderBookCard(book)).join('')}</div>`;
    }

    const loadMoreBtn = (displayed.length < total) ? `
        <button class="load-more-btn" onclick="loadMoreBooks()" id="loadMoreBtn">
            <i class="fas fa-chevron-down"></i> โหลดเพิ่ม
        </button>
    ` : (total > 0 ? `<p style="text-align:center;color:var(--text-light);">✅ แสดงทั้งหมด ${total} เล่ม</p>` : '');

    // ----- รวมเป็น HTML ทั้งหมด -----
    const html = `
        <div class="container">
            <h2 class="section-title"><i class="fas fa-book"></i> รายการหนังสือทั้งหมด</h2>
            ${filterHtml}
            ${bookGridHtml}
            ${loadMoreBtn}
        </div>
    `;
    
    // แทนที่ main content
    main.innerHTML = html;

    // ตั้งค่า dropdown ให้ตรงกับ state (ต้องทำหลังจาก DOM ถูกสร้าง)
    const catSelect = document.getElementById('categoryFilter');
    const levelSelect = document.getElementById('levelFilter');
    if (catSelect) catSelect.value = state.categoryFilter;
    if (levelSelect) levelSelect.value = state.levelFilter;
}

/**
 * สร้าง options สำหรับ dropdown หมวดหมู่
 */
function getCategoryOptions(selected) {
    const categories = ['อะกีดะฮ์', 'ฟิกฮ์', 'อูโซล ลุลฟิกฮ์', 'หะดีษ', 'ตัฟซีร', 'ภาษา', 'ซีเราะฮ์', 'ตรรกะ', 'อื่นๆ'];
    return categories.map(cat =>
        `<option value="${cat}" ${selected === cat ? 'selected' : ''}>${cat}</option>`
    ).join('');
}

/**
 * ใช้ฟังก์ชันนี้เมื่อมีการกรองหรือค้นหา
 */
function applyFilters() {
    const catSelect = document.getElementById('categoryFilter');
    const levelSelect = document.getElementById('levelFilter');
    const searchInput = document.getElementById('searchInput');

    state.categoryFilter = catSelect ? catSelect.value : 'ทั้งหมด';
    state.levelFilter = levelSelect ? levelSelect.value : 'ทั้งหมด';
    state.searchQuery = searchInput ? searchInput.value : '';

    filterBooks();
    state.displayedBooks = state.filteredBooks.slice(0, CONFIG.PAGE_SIZE);
    state.currentPage = 1;
    renderAllBooks();
}

// -------- 8.4 หน้าตะกร้า (Cart) --------
function renderCart() {
    const items = state.cart;
    if (items.length === 0) {
        main.innerHTML = `
            <div class="container" style="text-align:center;padding:3rem 1rem;">
                <i class="fas fa-shopping-cart" style="font-size:3rem;color:var(--border);"></i>
                <h3 style="margin-top:0.5rem;">ตะกร้าว่าง</h3>
                <p style="color:var(--text-light);">เพิ่มหนังสือจากหน้ารายการหรือหน้าแรก</p>
                <button class="btn btn-primary" onclick="navigateTo('books')" style="margin-top:1rem;">เลือกหนังสือ</button>
            </div>
        `;
        return;
    }

    let totalPrice = 0;
    const itemsHtml = items.map(item => {
        const b = item.book;
        const subtotal = b.price * item.quantity;
        totalPrice += subtotal;
        
        // ใช้ฟังก์ชัน renderBookImage สำหรับรูปขนาดเล็กในตะกร้า
        const imageHtml = renderBookImage(
            b.cover_image || '',
            b.title,
            'cart-cover',
            {
                useEmoji: CONFIG.USE_EMOJI_FALLBACK,
                emoji: CONFIG.FALLBACK_EMOJI,
                fallbackImage: CONFIG.FALLBACK_IMAGE_URL,
                bgColor: CONFIG.FALLBACK_BG_COLOR
            }
        );

        return `
            <div class="cart-item">
                <div style="width:60px;height:80px;flex-shrink:0;">
                    ${imageHtml}
                </div>
                <div class="info">
                    <div class="title">${b.title}</div>
                    <div class="meta">${b.author || ''} • ${b.book_code || ''}</div>
                    <div class="meta">${b.price ? b.price.toLocaleString() : 0} ฿</div>
                </div>
                <div class="qty">
                    <button onclick="removeFromCart('${b.book_id}')">−</button>
                    <span>${item.quantity}</span>
                    <button onclick="addToCartFromDetail('${b.book_id}')">+</button>
                </div>
                <button class="remove-btn" onclick="removeAllFromCart('${b.book_id}')"><i class="fas fa-trash-alt"></i></button>
            </div>
        `;
    }).join('');

    const html = `
        <div class="container">
            <h2 class="section-title"><i class="fas fa-shopping-cart"></i> ตะกร้าของฉัน</h2>
            ${itemsHtml}
            <div class="cart-total">💰 รวมทั้งสิ้น: <span style="color:var(--primary-dark);">${totalPrice.toLocaleString()} ฿</span></div>
            <div class="cart-actions">
                <button class="btn btn-primary" onclick="copyCartForMessenger()"><i class="far fa-copy"></i> คัดลอกรายการ</button>
                <button class="btn btn-accent" onclick="openMessenger()"><i class="fab fa-facebook-messenger"></i> ไปที่ Messenger</button>
                <button class="btn btn-danger" onclick="clearCart()"><i class="fas fa-trash-alt"></i> ล้างตะกร้า</button>
            </div>
        </div>
    `;
    main.innerHTML = html;
}

/**
 * ลบหนังสือออกจากตะกร้าหมดทั้งเล่ม
 */
function removeAllFromCart(bookId) {
    state.cart = state.cart.filter(item => item.book.book_id !== bookId);
    saveCartToStorage();
    showToast('🗑️ ลบรายการเรียบร้อย');
    renderCart();
}

// -------- 8.5 หน้าหมวดหมู่ (Categories) --------
function renderCategories() {
    const categories = ['อะกีดะฮ์', 'ฟิกฮ์', 'อูโซล ลุลฟิกฮ์', 'หะดีษ', 'ตัฟซีร', 'ภาษา', 'ซีเราะฮ์', 'ตรรกะ', 'อื่นๆ'];

    // นับจำนวนหนังสือในแต่ละหมวด
    const countMap = {};
    state.books.forEach(book => {
        const cat = book.category || 'อื่นๆ';
        countMap[cat] = (countMap[cat] || 0) + 1;
    });

    const itemsHtml = categories.map(cat => {
        const count = countMap[cat] || 0;
        return `
            <div class="category-item" onclick="navigateToCategory('${cat}')">
                <div style="font-size:1.4rem;">📂</div>
                <div style="font-weight:600;">${cat}</div>
                <div class="count">${count} เล่ม</div>
            </div>
        `;
    }).join('');

    const html = `
        <div class="container">
            <h2 class="section-title"><i class="fas fa-tags"></i> หมวดหมู่หนังสือ</h2>
            <div class="category-grid">${itemsHtml}</div>
        </div>
    `;
    main.innerHTML = html;
}

/**
 * นำทางไปหน้ารายการหนังสือพร้อมกรองหมวดหมู่
 */
function navigateToCategory(category) {
    state.categoryFilter = category;
    state.levelFilter = 'ทั้งหมด';
    state.searchQuery = '';
    filterBooks();
    state.displayedBooks = state.filteredBooks.slice(0, CONFIG.PAGE_SIZE);
    state.currentPage = 1;
    state.currentPageName = 'books';
    renderAllBooks();
    updateActiveNav('books');
    // เลื่อนไป top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// -------- 9. Navigation (การนำทาง) --------
/**
 * เปลี่ยนหน้า (ใช้ hash-based routing)
 * @param {string} page - ชื่อหน้า (home, books, book-detail, cart, categories)
 * @param {string} param - พารามิเตอร์ (เช่น book_id)
 */
function navigateTo(page, param = null) {
    state.currentPageName = page;
    if (page === 'book-detail' && param) {
        state.bookDetailId = param;
        window.location.hash = `#book-detail?book_id=${param}`;
    } else if (page === 'home') {
        window.location.hash = '#home';
    } else if (page === 'books') {
        window.location.hash = '#books';
    } else if (page === 'cart') {
        window.location.hash = '#cart';
    } else if (page === 'categories') {
        window.location.hash = '#categories';
    } else {
        window.location.hash = '#home';
    }
    renderCurrentPage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// จัดการ hash change
window.addEventListener('hashchange', handleHashChange);

function handleHashChange() {
    const hash = window.location.hash.slice(1) || 'home';
    if (hash === 'home') {
        state.currentPageName = 'home';
        renderHome();
        updateActiveNav('home');
    } else if (hash === 'books') {
        state.currentPageName = 'books';
        // ถ้ายังไม่ได้กรอง ให้กรองใหม่
        if (state.filteredBooks.length === 0 || state.displayedBooks.length === 0) {
            filterBooks();
            state.displayedBooks = state.filteredBooks.slice(0, CONFIG.PAGE_SIZE);
            state.currentPage = 1;
        }
        renderAllBooks();
        updateActiveNav('books');
    } else if (hash === 'cart') {
        state.currentPageName = 'cart';
        renderCart();
        updateActiveNav('cart');
    } else if (hash === 'categories') {
        state.currentPageName = 'categories';
        renderCategories();
        updateActiveNav('categories');
    } else if (hash.startsWith('book-detail')) {
        const params = new URLSearchParams(hash.split('?')[1]);
        const bookId = params.get('book_id');
        if (bookId) {
            state.currentPageName = 'book-detail';
            state.bookDetailId = bookId;
            renderBookDetail();
            updateActiveNav('book-detail');
        } else {
            navigateTo('home');
        }
    } else {
        navigateTo('home');
    }
}

// -------- 10. Event Listeners สำหรับ Navbar --------
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        if (page) {
            navigateTo(page);
        }
    });
});

// Toggle mobile menu
menuToggle.addEventListener('click', () => {
    navLinksContainer.classList.toggle('open');
});

// คลิกภายนอกปิดเมนู
document.addEventListener('click', (e) => {
    if (!e.target.closest('#navbar')) {
        navLinksContainer.classList.remove('open');
    }
});

// -------- 11. ฟังก์ชันเริ่มต้น (Initialization) --------
/**
 * ฟังก์ชันหลักที่เรียกเมื่อโหลดเว็บ
 */
async function init() {
    showToast('⏳ กำลังโหลดข้อมูล...', 2000);

    // โหลดตะกร้าจาก localStorage
    loadCartFromStorage();

    // ดึงข้อมูลจาก Google Sheets
    const books = await fetchBooksFromSheet();
    state.books = books;

    // ตั้งค่าการกรองเริ่มต้น
    state.categoryFilter = 'ทั้งหมด';
    state.levelFilter = 'ทั้งหมด';
    state.searchQuery = '';
    filterBooks();
    state.displayedBooks = state.filteredBooks.slice(0, CONFIG.PAGE_SIZE);
    state.currentPage = 1;

    // ตรวจสอบ hash เริ่มต้น
    if (window.location.hash) {
        handleHashChange();
    } else {
        navigateTo('home');
    }

    showToast('✅ พร้อมใช้งาน!', 1500);
}

// เริ่มต้นเมื่อ DOM พร้อม
document.addEventListener('DOMContentLoaded', init);

// แก้ปัญหา Fallback หาก API ล้มเหลวให้ยังทำงานได้
window.addEventListener('error', (e) => {
    console.warn('⚠️ เกิดข้อผิดพลาด, ใช้ข้อมูลสำรอง');
});

/**
 * จัดการการพิมพ์ในช่องค้นหา (ไม่ต้อง Re-render ทั้งหน้า)
 * @param {string} value - ค่าที่พิมพ์
 */
function handleSearchInput(value) {
    // อัปเดต state
    state.searchQuery = value;
    
    // กรองหนังสือใหม่
    filterBooks();
    
    // รีเซ็ตหน้า
    state.displayedBooks = state.filteredBooks.slice(0, CONFIG.PAGE_SIZE);
    state.currentPage = 1;
    
    // อัปเดตเฉพาะ Book Grid + จำนวน (ไม่ต้องสร้างใหม่ทั้งหน้า)
    updateBookGridAndCount();
}

/**
 * อัปเดตเฉพาะส่วน Book Grid และจำนวนหนังสือ (ไม่ต้อง Re-render ทั้งหน้า)
 */
function updateBookGridAndCount() {
    const filtered = state.filteredBooks;
    const displayed = state.displayedBooks;
    const total = filtered.length;
    
    // อัปเดตจำนวนหนังสือ
    const countEl = document.getElementById('bookCount');
    if (countEl) {
        countEl.innerHTML = `พบ <strong>${total}</strong> รายการ`;
    }
    
    // อัปเดต Book Grid
    const gridEl = document.getElementById('bookGrid');
    if (gridEl) {
        if (displayed.length === 0) {
            gridEl.innerHTML = `<p style="text-align:center;padding:2rem;">ไม่พบหนังสือที่ตรงกับเงื่อนไข</p>`;
        } else {
            gridEl.innerHTML = displayed.map(book => renderBookCard(book)).join('');
        }
    }
    
    // อัปเดตปุ่ม Load More (ถ้ามี)
    const loadMoreBtn = document.querySelector('.load-more-btn');
    const totalEl = document.querySelector('.book-count + *'); // ตัวถัดไปจาก book-count
    
    if (loadMoreBtn) {
        if (displayed.length >= total) {
            loadMoreBtn.remove();
            // แสดงข้อความ "แสดงทั้งหมด"
            const parent = loadMoreBtn.parentNode;
            if (parent && total > 0) {
                const doneMsg = document.createElement('p');
                doneMsg.style.cssText = 'text-align:center;color:var(--text-light);';
                doneMsg.textContent = `✅ แสดงทั้งหมด ${total} เล่ม`;
                parent.appendChild(doneMsg);
            }
        }
    }
}

